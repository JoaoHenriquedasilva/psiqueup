package com.psiqueup.api.controller;

import com.psiqueup.api.domain.entity.Clinic;
import com.psiqueup.api.domain.entity.ClinicPsychologist;
import com.psiqueup.api.domain.entity.PatientProfile;
import com.psiqueup.api.domain.entity.PatientPsychologistLink;
import com.psiqueup.api.domain.entity.PsychologistProfile;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.ClinicPsychologistStatus;
import com.psiqueup.api.domain.enums.LinkStatus;
import com.psiqueup.api.domain.enums.PublicUserRole;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.dto.auth.LoginRequest;
import com.psiqueup.api.dto.auth.RegisterRequest;
import com.psiqueup.api.dto.link.NeutralActionResponse;
import com.psiqueup.api.dto.profile.UpsertPsychologistProfileRequest;
import com.psiqueup.api.repository.ClinicPsychologistRepository;
import com.psiqueup.api.repository.ClinicRepository;
import com.psiqueup.api.repository.PatientProfileRepository;
import com.psiqueup.api.repository.PatientPsychologistLinkRepository;
import com.psiqueup.api.repository.PsychologistProfileRepository;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.security.CpfCryptoService;
import com.psiqueup.api.service.AuthService;
import com.psiqueup.api.service.LinkService;
import com.psiqueup.api.service.ProfileDomainService;
import com.psiqueup.api.util.CpfUtils;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PatientConsentAndCpfTest {

    private static final AtomicInteger CPF_SEQ = new AtomicInteger(400000001);

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    @Qualifier("springSecurityFilterChain")
    private Filter springSecurityFilterChain;

    @Autowired
    private AuthService authService;

    @Autowired
    private ProfileDomainService profileDomainService;

    @Autowired
    private LinkService linkService;

    @Autowired
    private CpfCryptoService cpfCryptoService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientProfileRepository patientProfileRepository;

    @Autowired
    private PatientPsychologistLinkRepository linkRepository;

    @Autowired
    private ClinicRepository clinicRepository;

    @Autowired
    private ClinicPsychologistRepository clinicPsychologistRepository;

    @Autowired
    private PsychologistProfileRepository psychologistProfileRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private MockMvc mockMvc() {
        return MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .addFilters(springSecurityFilterChain)
                .build();
    }

    private String uniqueSuffix() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private String uniqueCrp() {
        int number = 100000 + Math.abs(UUID.randomUUID().hashCode() % 899999);
        return "06/" + number;
    }

    private String uniqueCpf() {
        String base = String.format("%09d", CPF_SEQ.getAndIncrement());
        int d1 = calcCpfDigit(base, 10);
        int d2 = calcCpfDigit(base + d1, 11);
        return base + d1 + d2;
    }

    private String formatCpf(String digits) {
        return digits.substring(0, 3) + "." + digits.substring(3, 6) + "."
                + digits.substring(6, 9) + "-" + digits.substring(9, 11);
    }

    private int calcCpfDigit(String digits, int initialWeight) {
        int sum = 0;
        for (int i = 0; i < digits.length(); i++) {
            sum += Character.getNumericValue(digits.charAt(i)) * (initialWeight - i);
        }
        int rem = sum % 11;
        return rem < 2 ? 0 : 11 - rem;
    }

    @Test
    void shouldValidateMaskAndHashCpfWithHmacSha256AndRequireNonEmptyPepper() {
        String rawCpf = uniqueCpf();
        String formattedCpf = formatCpf(rawCpf);

        assertThat(CpfUtils.isValid(rawCpf)).isTrue();
        assertThat(CpfUtils.isValid(formattedCpf)).isTrue();
        assertThat(CpfUtils.isValid("00000000000")).isFalse();
        assertThat(CpfUtils.isValid("11111111111")).isFalse();
        assertThat(CpfUtils.isValid("12345678900")).isFalse();
        assertThat(CpfUtils.isValid("12345")).isFalse();

        String expectedMask = "***." + rawCpf.substring(3, 6) + "." + rawCpf.substring(6, 9) + "-**";
        assertThat(CpfUtils.mask(formattedCpf)).isEqualTo(expectedMask);

        String hash1 = cpfCryptoService.hashCpf(rawCpf);
        String hash2 = cpfCryptoService.hashCpf(formattedCpf);
        assertThat(hash1).hasSize(64).matches("^[0-9a-f]{64}$");
        assertThat(hash1).isEqualTo(hash2);

        CpfCryptoService emptyPepperService = new CpfCryptoService("   ");
        assertThatThrownBy(() -> invokeCpfInit(emptyPepperService))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("cpf-pepper");

        CpfCryptoService shortPepperService = new CpfCryptoService("short-pepper-less-than-32-bytes");
        assertThatThrownBy(() -> invokeCpfInit(shortPepperService))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("cpf-pepper");
    }

    private void invokeCpfInit(CpfCryptoService service) throws Throwable {
        var method = CpfCryptoService.class.getDeclaredMethod("init");
        method.setAccessible(true);
        try {
            method.invoke(service);
        } catch (java.lang.reflect.InvocationTargetException e) {
            throw e.getCause();
        }
    }

    private AuthService.AuthSession registerAndVerify(
            String name, String email, String password, PublicUserRole role, String cpf) {
        authService.register(new RegisterRequest(name, email, password, role, cpf, true, null, null));
        User user = userRepository.findByEmail(email.trim().toLowerCase()).orElseThrow();
        user.setEmailVerified(true);
        userRepository.save(user);
        return authService.login(new LoginRequest(email, password), "127.0.0.1");
    }

    @Test
    void shouldRequireValidUniqueCpfOnPatientRegisterAndSupportLegacyPatientProfileCompletion() throws Exception {
        String suffix = uniqueSuffix();
        String patCpf = uniqueCpf();
        String patEmail = "pat.reg." + suffix + "@psiqueup.test";

        // 1. Paciente sem CPF -> 400
        mockMvc().perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Paciente Sem CPF",
                                  "email": "%s",
                                  "password": "secret123",
                                  "role": "PATIENT",
                                  "acceptedTerms": true
                                }
                                """.formatted(patEmail)))
                .andExpect(status().isBadRequest());

        // 2. Paciente com CPF inválido -> 400 sem ecoar o CPF
        mockMvc().perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Paciente CPF Invalido",
                                  "email": "%s",
                                  "password": "secret123",
                                  "role": "PATIENT",
                                  "cpf": "000.000.000-00",
                                  "acceptedTerms": true
                                }
                                """.formatted(patEmail)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("00000000000"))));

        // 3. Paciente com CPF válido -> 201 Created e PatientProfile salvo com hash + máscara
        mockMvc().perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Paciente Valido",
                                  "email": "%s",
                                  "password": "secret123",
                                  "role": "PATIENT",
                                  "cpf": "%s",
                                  "acceptedTerms": true
                                }
                                """.formatted(patEmail, formatCpf(patCpf))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.verificationRequired").value(true));

        User savedPat = userRepository.findByEmail(patEmail).orElseThrow();
        PatientProfile savedProfile = patientProfileRepository.findById(savedPat.getId()).orElseThrow();
        assertThat(savedProfile.getCpfHash()).isEqualTo(cpfCryptoService.hashCpf(patCpf));
        assertThat(savedProfile.getCpfMasked()).isEqualTo(CpfUtils.mask(patCpf));

        // 4. Novo paciente com mesmo CPF -> 409 Conflict sem ecoar o CPF
        mockMvc().perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Paciente Duplicado",
                                  "email": "dup.%s@psiqueup.test",
                                  "password": "secret123",
                                  "role": "PATIENT",
                                  "cpf": "%s",
                                  "acceptedTerms": true
                                }
                                """.formatted(suffix, patCpf)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Este CPF já está cadastrado."));

        // 5. Conta pré-L2 sem CPF pode consultar GET /api/profiles/patient/me e completar via PUT /api/profiles/patient/me
        String legacyEmail = "legacy." + suffix + "@psiqueup.test";
        User legacyUser = userRepository.save(User.builder()
                .name("Paciente Legado")
                .email(legacyEmail)
                .passwordHash(passwordEncoder.encode("secret123"))
                .role(UserRole.PATIENT)
                .active(true)
                .emailVerified(true)
                .build());
        patientProfileRepository.save(PatientProfile.builder().user(legacyUser).build());

        var legacyLogin = authService.login(new com.psiqueup.api.dto.auth.LoginRequest(legacyEmail, "secret123"), "127.0.0.1");

        mockMvc().perform(get("/api/profiles/patient/me")
                        .header("Authorization", "Bearer " + legacyLogin.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasCpf").value(false))
                .andExpect(jsonPath("$.cpfMasked").value(nullValue()));

        // Tentar completar com CPF já usado por outro paciente -> 409
        mockMvc().perform(put("/api/profiles/patient/me")
                        .header("Authorization", "Bearer " + legacyLogin.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cpf\":\"" + patCpf + "\"}"))
                .andExpect(status().isConflict());

        // Completar com CPF próprio válido -> 200 OK
        String legacyCpf = uniqueCpf();
        mockMvc().perform(put("/api/profiles/patient/me")
                        .header("Authorization", "Bearer " + legacyLogin.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cpf\":\"" + formatCpf(legacyCpf) + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasCpf").value(true))
                .andExpect(jsonPath("$.cpfMasked").value(CpfUtils.mask(legacyCpf)));

        // Tentar alterar CPF novamente após já cadastrado -> 409 Conflict
        mockMvc().perform(put("/api/profiles/patient/me")
                        .header("Authorization", "Bearer " + legacyLogin.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cpf\":\"" + uniqueCpf() + "\"}"))
                .andExpect(status().isConflict());

        // Psicólogo tentando acessar /api/profiles/patient/me -> 403 Forbidden
        var psychAuth = registerAndVerify(
                "Dra. Teste", "psy.prof." + suffix + "@psiqueup.test", "secret123", PublicUserRole.PSYCHOLOGIST, null);
        mockMvc().perform(get("/api/profiles/patient/me")
                        .header("Authorization", "Bearer " + psychAuth.accessToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldEnforcePendingConsentPiiHidingAntiEnumerationAndSchedulingBlock() throws Exception {
        String suffix = uniqueSuffix();
        String psychEmail = "psy.consent." + suffix + "@psiqueup.test";
        String patEmail = "pat.consent." + suffix + "@psiqueup.test";
        String otherPatEmail = "pat.other." + suffix + "@psiqueup.test";
        String inactivePatEmail = "pat.inactive." + suffix + "@psiqueup.test";

        String patCpf = uniqueCpf();
        String otherPatCpf = uniqueCpf();
        String inactivePatCpf = uniqueCpf();
        String nonExistentCpf = uniqueCpf();

        var psychAuth = registerAndVerify("Dra. Consent", psychEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null);
        var patAuth = registerAndVerify("Paciente Consent", patEmail, "secret123", PublicUserRole.PATIENT, patCpf);
        var otherPatAuth = registerAndVerify("Outro Paciente", otherPatEmail, "secret123", PublicUserRole.PATIENT, otherPatCpf);
        registerAndVerify("Paciente Inativo", inactivePatEmail, "secret123", PublicUserRole.PATIENT, inactivePatCpf);

        User inactiveUser = userRepository.findByEmail(inactivePatEmail).orElseThrow();
        inactiveUser.setActive(false);
        userRepository.save(inactiveUser);

        // 1. Psicólogo sem CRP -> 400 Bad Request
        mockMvc().perform(post("/api/links")
                        .header("Authorization", "Bearer " + psychAuth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cpf\":\"" + patCpf + "\"}"))
                .andExpect(status().isBadRequest());

        profileDomainService.upsertPsychologistProfile(
                psychEmail,
                new UpsertPsychologistProfileRequest(uniqueCrp(), 1L, "TCC")
        );

        // 2. Anti-enumeração em POST /api/links: CPF inexistente e CPF de paciente inativo retornam 202 neutro
        mockMvc().perform(post("/api/links")
                        .header("Authorization", "Bearer " + psychAuth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cpf\":\"" + nonExistentCpf + "\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value(NeutralActionResponse.LINK_REQUEST_ACCEPTED_MESSAGE));

        mockMvc().perform(post("/api/links")
                        .header("Authorization", "Bearer " + psychAuth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cpf\":\"" + inactivePatCpf + "\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value(NeutralActionResponse.LINK_REQUEST_ACCEPTED_MESSAGE));

        // 3. Solicitação válida -> 202 Accepted, cria vínculo PENDING
        mockMvc().perform(post("/api/links")
                        .header("Authorization", "Bearer " + psychAuth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cpf\":\"" + formatCpf(patCpf) + "\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value(NeutralActionResponse.LINK_REQUEST_ACCEPTED_MESSAGE));

        // 4. Enquanto PENDING, psicólogo vê apenas patientCpfMasked (patientId, patientName e patientEmail são null)
        mockMvc().perform(get("/api/links")
                        .header("Authorization", "Bearer " + psychAuth.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PENDING"))
                .andExpect(jsonPath("$[0].patientId").value(nullValue()))
                .andExpect(jsonPath("$[0].patientName").value(nullValue()))
                .andExpect(jsonPath("$[0].patientEmail").value(nullValue()))
                .andExpect(jsonPath("$[0].patientCpfMasked").value(CpfUtils.mask(patCpf)));

        // Paciente vê os dados do psicólogo normalmente enquanto PENDING
        mockMvc().perform(get("/api/links")
                        .header("Authorization", "Bearer " + patAuth.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PENDING"))
                .andExpect(jsonPath("$[0].psychologistName").value("Dra. Consent"))
                .andExpect(jsonPath("$[0].patientCpfMasked").value(CpfUtils.mask(patCpf)));

        Long linkId = linkService.listMyLinks(patEmail).getFirst().id();
        Long patId = userRepository.findByEmail(patEmail).orElseThrow().getId();

        // 5. Agendamento bloqueado enquanto vínculo está PENDING -> 400 Bad Request
        OffsetDateTime start = OffsetDateTime.now().plusDays(2);
        mockMvc().perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + psychAuth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "patientId": %d,
                                  "startTime": "%s",
                                  "endTime": "%s"
                                }
                                """.formatted(patId, start, start.plusHours(1))))
                .andExpect(status().isBadRequest());

        // 6. Outro paciente não pode aceitar o vínculo -> 403 Forbidden
        mockMvc().perform(patch("/api/links/" + linkId + "/accept")
                        .header("Authorization", "Bearer " + otherPatAuth.accessToken()))
                .andExpect(status().isForbidden());

        // 7. Paciente aceita o vínculo -> 200 OK, status = ACTIVE
        mockMvc().perform(patch("/api/links/" + linkId + "/accept")
                        .header("Authorization", "Bearer " + patAuth.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        // Agora psicólogo vê nome, e-mail e CPF mascarado
        mockMvc().perform(get("/api/links")
                        .header("Authorization", "Bearer " + psychAuth.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].patientName").value("Paciente Consent"))
                .andExpect(jsonPath("$[0].patientEmail").value(patEmail))
                .andExpect(jsonPath("$[0].patientCpfMasked").value(CpfUtils.mask(patCpf)));

        // E agora agendamento funciona -> 201 Created
        mockMvc().perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + psychAuth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "patientId": %d,
                                  "startTime": "%s",
                                  "endTime": "%s"
                                }
                                """.formatted(patId, start, start.plusHours(1))))
                .andExpect(status().isCreated());

        // 8. Rejeição de vínculo PENDING pelo outro paciente -> status = REJECTED, e nova tentativa retorna 202 sem reabrir
        mockMvc().perform(post("/api/links")
                        .header("Authorization", "Bearer " + psychAuth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cpf\":\"" + otherPatCpf + "\"}"))
                .andExpect(status().isAccepted());

        Long otherLinkId = linkService.listMyLinks(otherPatEmail).getFirst().id();
        mockMvc().perform(patch("/api/links/" + otherLinkId + "/reject")
                        .header("Authorization", "Bearer " + otherPatAuth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Não solicitei\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        mockMvc().perform(post("/api/links")
                        .header("Authorization", "Bearer " + psychAuth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cpf\":\"" + otherPatCpf + "\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value(NeutralActionResponse.LINK_REQUEST_ACCEPTED_MESSAGE));

        PatientPsychologistLink rejectedLink = linkRepository.findById(otherLinkId).orElseThrow();
        assertThat(rejectedLink.getStatus()).isEqualTo(LinkStatus.REJECTED);

        // Em vínculo REJECTED, GET /api/links também oculta patientId, patientName e patientEmail para o psicólogo
        mockMvc().perform(get("/api/links")
                        .header("Authorization", "Bearer " + psychAuth.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + otherLinkId + ")].status").value(org.hamcrest.Matchers.contains("REJECTED")))
                .andExpect(jsonPath("$[?(@.id == " + otherLinkId + ")].patientId").value(org.hamcrest.Matchers.contains(nullValue())))
                .andExpect(jsonPath("$[?(@.id == " + otherLinkId + ")].patientName").value(org.hamcrest.Matchers.contains(nullValue())))
                .andExpect(jsonPath("$[?(@.id == " + otherLinkId + ")].patientEmail").value(org.hamcrest.Matchers.contains(nullValue())))
                .andExpect(jsonPath("$[?(@.id == " + otherLinkId + ")].patientCpfMasked").value(org.hamcrest.Matchers.contains(CpfUtils.mask(otherPatCpf))));
    }

    @Test
    void shouldCreatePendingClinicLinkAndHidePiiOnAdminTriage() throws Exception {
        String suffix = uniqueSuffix();
        String adminEmail = "admin.triage." + suffix + "@psiqueup.test";
        String psychEmail = "psy.triage." + suffix + "@psiqueup.test";
        String patEmail = "pat.triage." + suffix + "@psiqueup.test";
        String patCpf = uniqueCpf();
        String nonExistentCpf = uniqueCpf();

        User adminUser = userRepository.save(User.builder()
                .name("Admin Triagem")
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode("secret123"))
                .role(UserRole.ADMIN)
                .active(true)
                .emailVerified(true)
                .build());
        String cnpj = String.format("%014d", 20000000000000L + Math.abs(suffix.hashCode() % 999999));
        Clinic clinic = clinicRepository.save(Clinic.builder()
                .name("Clínica Triagem " + suffix)
                .cnpj(cnpj)
                .ownerUser(adminUser)
                .active(true)
                .build());

        var psychAuth = registerAndVerify("Dra. Triagem", psychEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null);
        profileDomainService.upsertPsychologistProfile(
                psychEmail,
                new UpsertPsychologistProfileRequest(uniqueCrp(), 1L, "TCC")
        );
        User psychUser = userRepository.findByEmail(psychEmail).orElseThrow();
        PsychologistProfile psychProfile = psychologistProfileRepository.findById(psychUser.getId()).orElseThrow();
        clinicPsychologistRepository.save(ClinicPsychologist.builder()
                .clinic(clinic)
                .psychologist(psychProfile)
                .status(ClinicPsychologistStatus.APPROVED)
                .build());

        var patAuth = registerAndVerify("Paciente Triagem", patEmail, "secret123", PublicUserRole.PATIENT, patCpf);
        Long patId = userRepository.findByEmail(patEmail).orElseThrow().getId();
        var adminAuth = authService.login(new LoginRequest(adminEmail, "secret123"));

        // Anti-enumeração: CPF inexistente retorna 202 neutro
        mockMvc().perform(post("/api/admin/triage")
                        .header("Authorization", "Bearer " + adminAuth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "psychologistId": %d,
                                  "cpf": "%s"
                                }
                                """.formatted(psychUser.getId(), nonExistentCpf)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value(NeutralActionResponse.LINK_REQUEST_ACCEPTED_MESSAGE));

        // Triagem válida -> 202 neutro e cria vínculo PENDING com clinic_id preenchido
        mockMvc().perform(post("/api/admin/triage")
                        .header("Authorization", "Bearer " + adminAuth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "psychologistId": %d,
                                  "cpf": "%s"
                                }
                                """.formatted(psychUser.getId(), formatCpf(patCpf))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value(NeutralActionResponse.LINK_REQUEST_ACCEPTED_MESSAGE));

        PatientPsychologistLink createdLink = linkRepository
                .findByPsychologistUserIdAndPatientUserId(psychUser.getId(), patId)
                .orElseThrow();
        assertThat(createdLink.getStatus()).isEqualTo(LinkStatus.PENDING);
        assertThat(createdLink.getClinic()).isNotNull();
        assertThat(createdLink.getClinic().getId()).isEqualTo(clinic.getId());

        // Enquanto PENDING, psicólogo não vê patientId, patientName ou patientEmail
        mockMvc().perform(get("/api/links")
                        .header("Authorization", "Bearer " + psychAuth.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PENDING"))
                .andExpect(jsonPath("$[0].patientId").value(nullValue()))
                .andExpect(jsonPath("$[0].patientName").value(nullValue()))
                .andExpect(jsonPath("$[0].patientEmail").value(nullValue()))
                .andExpect(jsonPath("$[0].patientCpfMasked").value(CpfUtils.mask(patCpf)));

        // Após aceite do paciente, psicólogo passa a ver PII e patientId
        mockMvc().perform(patch("/api/links/" + createdLink.getId() + "/accept")
                        .header("Authorization", "Bearer " + patAuth.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        mockMvc().perform(get("/api/links")
                        .header("Authorization", "Bearer " + psychAuth.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].patientId").value(patId.intValue()))
                .andExpect(jsonPath("$[0].patientName").value("Paciente Triagem"))
                .andExpect(jsonPath("$[0].patientEmail").value(patEmail))
                .andExpect(jsonPath("$[0].patientCpfMasked").value(CpfUtils.mask(patCpf)));
    }
}
