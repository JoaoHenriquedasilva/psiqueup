package com.psiqueup.api.controller;

import com.jayway.jsonpath.JsonPath;
import com.psiqueup.api.config.AdminBootstrapRunner;
import com.psiqueup.api.domain.entity.Clinic;
import com.psiqueup.api.domain.entity.PatientPsychologistLink;
import com.psiqueup.api.domain.entity.Session;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.ClinicPsychologistStatus;
import com.psiqueup.api.domain.enums.LinkStatus;
import com.psiqueup.api.domain.enums.PublicUserRole;
import com.psiqueup.api.domain.enums.SessionStatus;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.dto.auth.RegisterRequest;
import com.psiqueup.api.dto.link.CreateLinkRequest;
import com.psiqueup.api.dto.link.LinkResponse;
import com.psiqueup.api.dto.link.NeutralActionResponse;
import com.psiqueup.api.dto.profile.UpsertPsychologistProfileRequest;
import com.psiqueup.api.dto.session.CreateSessionRequest;
import com.psiqueup.api.dto.session.SessionResponse;
import com.psiqueup.api.dto.session.UpdateSessionStatusRequest;
import com.psiqueup.api.repository.ClinicRepository;
import com.psiqueup.api.repository.PatientPsychologistLinkRepository;
import com.psiqueup.api.repository.SessionRepository;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.service.AuthService;
import com.psiqueup.api.service.LinkService;
import com.psiqueup.api.service.ProfileDomainService;
import com.psiqueup.api.service.SessionService;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MultiTenantClinicTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    @Qualifier("springSecurityFilterChain")
    private Filter springSecurityFilterChain;

    @Autowired
    private ClinicRepository clinicRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientPsychologistLinkRepository linkRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthService authService;

    @Autowired
    private ProfileDomainService profileDomainService;

    @Autowired
    private LinkService linkService;

    @Autowired
    private SessionService sessionService;

    private MockMvc mockMvc() {
        return MockMvcBuilders.webAppContextSetup(context)
                .addFilters(springSecurityFilterChain)
                .build();
    }

    private String uniqueSuffix() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private String uniqueCrp() {
        int num = 100000 + Math.abs(UUID.randomUUID().hashCode() % 899999);
        return "06/" + num;
    }

    private String uniqueCnpj() {
        int[] d = new int[14];
        int base = 10000000 + Math.abs(UUID.randomUUID().hashCode() % 89999999);
        for (int i = 0; i < 8; i++) {
            d[7 - i] = base % 10;
            base /= 10;
        }
        d[8] = 0;
        d[9] = 0;
        d[10] = 0;
        d[11] = 1;

        int[] w1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int sum1 = 0;
        for (int i = 0; i < 12; i++) sum1 += d[i] * w1[i];
        int rem1 = sum1 % 11;
        d[12] = rem1 < 2 ? 0 : 11 - rem1;

        int[] w2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int sum2 = 0;
        for (int i = 0; i < 13; i++) sum2 += d[i] * w2[i];
        int rem2 = sum2 % 11;
        d[13] = rem2 < 2 ? 0 : 11 - rem2;

        StringBuilder sb = new StringBuilder(14);
        for (int digit : d) sb.append(digit);
        return sb.toString();
    }

    private static final java.util.concurrent.atomic.AtomicInteger CPF_SEQ = new java.util.concurrent.atomic.AtomicInteger(300000001);

    private String uniqueCpf() {
        String base = String.format("%09d", CPF_SEQ.getAndIncrement());
        int d1 = calcCpfDigit(base, 10);
        int d2 = calcCpfDigit(base + d1, 11);
        return base + d1 + d2;
    }

    private int calcCpfDigit(String digits, int initialWeight) {
        int sum = 0;
        for (int i = 0; i < digits.length(); i++) {
            sum += Character.getNumericValue(digits.charAt(i)) * (initialWeight - i);
        }
        int rem = sum % 11;
        return rem < 2 ? 0 : 11 - rem;
    }

    private String formatCnpj(String digits) {
        return digits.substring(0, 2) + "." + digits.substring(2, 5) + "." +
                digits.substring(5, 8) + "/" + digits.substring(8, 12) + "-" + digits.substring(12, 14);
    }

    private String registerClinicAndGetToken(String clinicName, String cnpj, String adminEmail) throws Exception {
        String body = """
                {
                  "clinicName": "%s",
                  "cnpj": "%s",
                  "adminName": "Admin %s",
                  "adminEmail": "%s",
                  "password": "secret123",
                  "acceptedTerms": true
                }
                """.formatted(clinicName, cnpj, clinicName, adminEmail);

        mockMvc().perform(post("/api/auth/register-clinic")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.verificationRequired").value(true));

        User adminUser = userRepository.findByEmail(adminEmail.trim().toLowerCase()).orElseThrow();
        adminUser.setEmailVerified(true);
        userRepository.save(adminUser);
        return authService.login(new com.psiqueup.api.dto.auth.LoginRequest(adminEmail, "secret123")).token();
    }

    private com.psiqueup.api.dto.auth.AuthResponse registerAndVerify(
            String name, String email, String password, PublicUserRole role, String cpf) {
        authService.register(new RegisterRequest(name, email, password, role, cpf, true, null, null));
        User user = userRepository.findByEmail(email.trim().toLowerCase()).orElseThrow();
        user.setEmailVerified(true);
        userRepository.save(user);
        return authService.login(new com.psiqueup.api.dto.auth.LoginRequest(email, password));
    }

    @Test
    void shouldRegisterClinicWithFormattedCnpjAndRejectInvalidOrDuplicateCnpj() throws Exception {
        String suffix = uniqueSuffix();
        String cnpjDigits = uniqueCnpj();
        String formattedCnpj = formatCnpj(cnpjDigits);
        String adminEmail = "clinic.owner." + suffix + "@psiqueup.test";

        registerClinicAndGetToken("Clínica Mente Sã " + suffix, formattedCnpj, adminEmail);

        Clinic savedClinic = clinicRepository.findByCnpj(cnpjDigits).orElseThrow();
        assertThat(savedClinic.getCnpj()).isEqualTo(cnpjDigits);
        assertThat(savedClinic.getActive()).isTrue();

        // Duplicidade de CNPJ -> 409 Conflict
        mockMvc().perform(post("/api/auth/register-clinic")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "clinicName": "Outra Clínica",
                                  "cnpj": "%s",
                                  "adminName": "Outro Admin",
                                  "adminEmail": "outro.%s@psiqueup.test",
                                  "password": "secret123",
                                  "acceptedTerms": true
                                }
                                """.formatted(cnpjDigits, suffix)))
                .andExpect(status().isConflict());

        // Duplicidade de e-mail -> 409 Conflict
        mockMvc().perform(post("/api/auth/register-clinic")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "clinicName": "Mais Uma Clínica",
                                  "cnpj": "%s",
                                  "adminName": "Admin Repetido",
                                  "adminEmail": "%s",
                                  "password": "secret123",
                                  "acceptedTerms": true
                                }
                                """.formatted(uniqueCnpj(), adminEmail)))
                .andExpect(status().isConflict());

        // CNPJ sequência repetida -> 400 Bad Request
        mockMvc().perform(post("/api/auth/register-clinic")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "clinicName": "Clínica Inválida",
                                  "cnpj": "00.000.000/0000-00",
                                  "adminName": "Admin Inválido",
                                  "adminEmail": "invalido1.%s@psiqueup.test",
                                  "password": "secret123",
                                  "acceptedTerms": true
                                }
                                """.formatted(suffix)))
                .andExpect(status().isBadRequest());

        // CNPJ com dígito verificador inválido -> 400 Bad Request
        String invalidCheckDigit = cnpjDigits.substring(0, 13) + ((Character.getNumericValue(cnpjDigits.charAt(13)) + 1) % 10);
        mockMvc().perform(post("/api/auth/register-clinic")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "clinicName": "Clínica DV Inválido",
                                  "cnpj": "%s",
                                  "adminName": "Admin DV",
                                  "adminEmail": "invalido2.%s@psiqueup.test",
                                  "password": "secret123",
                                  "acceptedTerms": true
                                }
                                """.formatted(invalidCheckDigit, suffix)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldHandlePsychologistJoinClinicApproveRejectAndPreventDuplicates() throws Exception {
        String suffix = uniqueSuffix();
        String cnpjA = uniqueCnpj();
        String tokenAdminA = registerClinicAndGetToken("Clínica A " + suffix, cnpjA, "adminA." + suffix + "@psiqueup.test");

        String psychEmail = "psy.join." + suffix + "@psiqueup.test";
        var psychAuth = registerAndVerify("Dra. Ana", psychEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null);
        profileDomainService.upsertPsychologistProfile(psychEmail, new UpsertPsychologistProfileRequest(uniqueCrp(), 1L, "TCC"));

        // Psicólogo autônomo inicialmente sem vínculos
        mockMvc().perform(get("/api/clinics/my-links")
                        .header("Authorization", "Bearer " + psychAuth.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // CNPJ inexistente -> 404
        mockMvc().perform(post("/api/clinics/join")
                        .header("Authorization", "Bearer " + psychAuth.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cnpj\":\"" + uniqueCnpj() + "\"}"))
                .andExpect(status().isNotFound());

        // Solicita vínculo à Clínica A -> 201 PENDING
        MvcResult joinResult = mockMvc().perform(post("/api/clinics/join")
                        .header("Authorization", "Bearer " + psychAuth.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cnpj\":\"" + formatCnpj(cnpjA) + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.clinicCnpj").value(cnpjA))
                .andReturn();

        String joinJson = joinResult.getResponse().getContentAsString();
        Long requestId = ((Number) JsonPath.read(joinJson, "$.id")).longValue();

        // Impedir duplicidade enquanto PENDING -> 409
        mockMvc().perform(post("/api/clinics/join")
                        .header("Authorization", "Bearer " + psychAuth.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cnpj\":\"" + cnpjA + "\"}"))
                .andExpect(status().isConflict());

        // Admin A lista solicitações e vê PENDING
        mockMvc().perform(get("/api/admin/psychologist-requests")
                        .param("status", "PENDING")
                        .header("Authorization", "Bearer " + tokenAdminA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(requestId.intValue())));

        // Admin A aprova
        mockMvc().perform(patch("/api/admin/psychologist-requests/" + requestId + "/approve")
                        .header("Authorization", "Bearer " + tokenAdminA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(ClinicPsychologistStatus.APPROVED.name()));

        // Impedir duplicidade enquanto APPROVED -> 409
        mockMvc().perform(post("/api/clinics/join")
                        .header("Authorization", "Bearer " + psychAuth.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cnpj\":\"" + cnpjA + "\"}"))
                .andExpect(status().isConflict());

        // Psicólogo vê APPROVED em /api/clinics/my-links
        mockMvc().perform(get("/api/clinics/my-links")
                        .header("Authorization", "Bearer " + psychAuth.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("APPROVED"));
    }

    @Test
    void shouldEnforceStrictMultiTenantIsolationBetweenClinicsAndAutonomousPsychologists() throws Exception {
        String suffix = uniqueSuffix();
        String cnpjA = uniqueCnpj();
        String cnpjB = uniqueCnpj();

        String tokenAdminA = registerClinicAndGetToken("Clínica Alpha " + suffix, cnpjA, "admin.alpha." + suffix + "@psiqueup.test");
        String tokenAdminB = registerClinicAndGetToken("Clínica Beta " + suffix, cnpjB, "admin.beta." + suffix + "@psiqueup.test");

        // Psicólogo A (aprovado na Clínica A)
        String psyAEmail = "psya." + suffix + "@psiqueup.test";
        var psyAAuth = registerAndVerify("Dr. Alpha", psyAEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null);
        String crpA = uniqueCrp();
        profileDomainService.upsertPsychologistProfile(psyAEmail, new UpsertPsychologistProfileRequest(crpA, 1L, "TCC"));

        // Psicólogo B (aprovado na Clínica B)
        String psyBEmail = "psyb." + suffix + "@psiqueup.test";
        var psyBAuth = registerAndVerify("Dra. Beta", psyBEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null);
        String crpB = uniqueCrp();
        profileDomainService.upsertPsychologistProfile(psyBEmail, new UpsertPsychologistProfileRequest(crpB, 1L, "Psicanálise"));

        // Psicólogo Autônomo (sem vínculo com clínica)
        String psyAutoEmail = "psyauto." + suffix + "@psiqueup.test";
        registerAndVerify("Dr. Autônomo", psyAutoEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null);
        String crpAuto = uniqueCrp();
        profileDomainService.upsertPsychologistProfile(psyAutoEmail, new UpsertPsychologistProfileRequest(crpAuto, 1L, "Humanista"));

        // Solicitar e aprovar Psy A na Clínica A
        MvcResult joinA = mockMvc().perform(post("/api/clinics/join")
                        .header("Authorization", "Bearer " + psyAAuth.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cnpj\":\"" + cnpjA + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        Long reqIdA = ((Number) JsonPath.read(joinA.getResponse().getContentAsString(), "$.id")).longValue();

        // Admin B tenta aprovar solicitação da Clínica A -> 403 Forbidden
        mockMvc().perform(patch("/api/admin/psychologist-requests/" + reqIdA + "/approve")
                        .header("Authorization", "Bearer " + tokenAdminB))
                .andExpect(status().isForbidden());

        mockMvc().perform(patch("/api/admin/psychologist-requests/" + reqIdA + "/approve")
                        .header("Authorization", "Bearer " + tokenAdminA))
                .andExpect(status().isOk());

        // Solicitar e aprovar Psy B na Clínica B
        MvcResult joinB = mockMvc().perform(post("/api/clinics/join")
                        .header("Authorization", "Bearer " + psyBAuth.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cnpj\":\"" + cnpjB + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        Long reqIdB = ((Number) JsonPath.read(joinB.getResponse().getContentAsString(), "$.id")).longValue();

        mockMvc().perform(patch("/api/admin/psychologist-requests/" + reqIdB + "/approve")
                        .header("Authorization", "Bearer " + tokenAdminB))
                .andExpect(status().isOk());

        // Pacientes e sessões em Clínica B e Autônomo
        String patBEmail = "patb." + suffix + "@psiqueup.test";
        String patAutoEmail = "patauto." + suffix + "@psiqueup.test";
        String patBCpf = uniqueCpf();
        String patAutoCpf = uniqueCpf();
        registerAndVerify("Paciente Beta", patBEmail, "secret123", PublicUserRole.PATIENT, patBCpf);
        registerAndVerify("Paciente Auto", patAutoEmail, "secret123", PublicUserRole.PATIENT, patAutoCpf);

        linkService.createLink(psyBEmail, new CreateLinkRequest(patBCpf));
        LinkResponse linkB = linkService.acceptLink(patBEmail, linkService.listMyLinks(patBEmail).getFirst().id());
        linkService.createLink(psyAutoEmail, new CreateLinkRequest(patAutoCpf));
        LinkResponse linkAuto = linkService.acceptLink(patAutoEmail, linkService.listMyLinks(patAutoEmail).getFirst().id());

        OffsetDateTime start = OffsetDateTime.now().plusHours(5);
        SessionResponse sessionB = sessionService.scheduleSession(
                psyBEmail, new CreateSessionRequest(linkB.patientId(), start, start.plusHours(1)));
        sessionService.updateStatus(psyBEmail, sessionB.id(), new UpdateSessionStatusRequest(SessionStatus.COMPLETED, true));
        sessionService.updateStatus(patBEmail, sessionB.id(), new UpdateSessionStatusRequest(SessionStatus.DISPUTED, false));

        SessionResponse sessionAuto = sessionService.scheduleSession(
                psyAutoEmail, new CreateSessionRequest(linkAuto.patientId(), start.plusHours(2), start.plusHours(3)));
        sessionService.updateStatus(psyAutoEmail, sessionAuto.id(), new UpdateSessionStatusRequest(SessionStatus.COMPLETED, true));
        sessionService.updateStatus(patAutoEmail, sessionAuto.id(), new UpdateSessionStatusRequest(SessionStatus.DISPUTED, false));

        // Admin A só vê Psy A em /api/admin/psychologists (não vê Psy B nem Autônomo)
        mockMvc().perform(get("/api/admin/psychologists")
                        .header("Authorization", "Bearer " + tokenAdminA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].crp").value(crpA));

        // Admin A tem 0 sessões e 0 pacientes no dashboard
        mockMvc().perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + tokenAdminA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activePsychologists").value(1))
                .andExpect(jsonPath("$.totalPatients").value(0))
                .andExpect(jsonPath("$.disputedSessions").value(0));

        // Admin A não vê sessões de B ou Autônomo
        mockMvc().perform(get("/api/admin/sessions")
                        .header("Authorization", "Bearer " + tokenAdminA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // Admin A não pode desativar Psy B, Pat B ou Psy Autônomo -> 403 Forbidden
        Long psyBId = userRepository.findByEmail(psyBEmail).orElseThrow().getId();
        Long psyAutoId = userRepository.findByEmail(psyAutoEmail).orElseThrow().getId();
        Long patBId = userRepository.findByEmail(patBEmail).orElseThrow().getId();

        mockMvc().perform(patch("/api/admin/users/" + psyBId + "/status")
                        .header("Authorization", "Bearer " + tokenAdminA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isForbidden());

        mockMvc().perform(patch("/api/admin/users/" + psyAutoId + "/status")
                        .header("Authorization", "Bearer " + tokenAdminA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isForbidden());

        mockMvc().perform(patch("/api/admin/users/" + patBId + "/status")
                        .header("Authorization", "Bearer " + tokenAdminA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isForbidden());

        // Admin A não pode resolver sessão DISPUTED da Clínica B ou Autônomo -> 403 Forbidden
        mockMvc().perform(patch("/api/admin/sessions/" + sessionB.id() + "/resolve")
                        .header("Authorization", "Bearer " + tokenAdminA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resolutionStatus\":\"COMPLETED\"}"))
                .andExpect(status().isForbidden());

        mockMvc().perform(patch("/api/admin/sessions/" + sessionAuto.id() + "/resolve")
                        .header("Authorization", "Bearer " + tokenAdminA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resolutionStatus\":\"COMPLETED\"}"))
                .andExpect(status().isForbidden());

        // Admin B consegue resolver a sessão da Clínica B normalmente -> 200 OK
        mockMvc().perform(patch("/api/admin/sessions/" + sessionB.id() + "/resolve")
                        .header("Authorization", "Bearer " + tokenAdminB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resolutionStatus\":\"COMPLETED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    void shouldAllowAdminTriageForApprovedClinicPsychologistAndRespectRejectionLock() throws Exception {
        String suffix = uniqueSuffix();
        String cnpjA = uniqueCnpj();
        String tokenAdminA = registerClinicAndGetToken("Clínica Triagem " + suffix, cnpjA, "admin.triage." + suffix + "@psiqueup.test");

        String psyAEmail = "psy.triage." + suffix + "@psiqueup.test";
        var psyAAuth = registerAndVerify("Dra. Triagem", psyAEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null);
        profileDomainService.upsertPsychologistProfile(psyAEmail, new UpsertPsychologistProfileRequest(uniqueCrp(), 1L, "TCC"));
        Long psyAId = userRepository.findByEmail(psyAEmail).orElseThrow().getId();

        String psyAutoEmail = "psy.auto.triage." + suffix + "@psiqueup.test";
        registerAndVerify("Dr. Sem Clinica", psyAutoEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null);
        profileDomainService.upsertPsychologistProfile(psyAutoEmail, new UpsertPsychologistProfileRequest(uniqueCrp(), 1L, "TCC"));
        Long psyAutoId = userRepository.findByEmail(psyAutoEmail).orElseThrow().getId();

        String patEmail = "pat.triage." + suffix + "@psiqueup.test";
        String patCpf = uniqueCpf();
        registerAndVerify("Paciente Triagem", patEmail, "secret123", PublicUserRole.PATIENT, patCpf);

        // Solicitar e aprovar Psy A na Clínica A
        MvcResult joinA = mockMvc().perform(post("/api/clinics/join")
                        .header("Authorization", "Bearer " + psyAAuth.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cnpj\":\"" + cnpjA + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        Long reqIdA = ((Number) JsonPath.read(joinA.getResponse().getContentAsString(), "$.id")).longValue();

        mockMvc().perform(patch("/api/admin/psychologist-requests/" + reqIdA + "/approve")
                        .header("Authorization", "Bearer " + tokenAdminA))
                .andExpect(status().isOk());

        // Admin A tenta triar para psicólogo autônomo -> 403 Forbidden
        mockMvc().perform(post("/api/admin/triage")
                        .header("Authorization", "Bearer " + tokenAdminA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "psychologistId": %d,
                                  "cpf": "%s"
                                }
                                """.formatted(psyAutoId, patCpf)))
                .andExpect(status().isForbidden());

        // Admin A realiza triagem para psicólogo aprovado da clínica -> 202 Accepted (resposta neutra)
        mockMvc().perform(post("/api/admin/triage")
                        .header("Authorization", "Bearer " + tokenAdminA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "psychologistId": %d,
                                  "cpf": "%s"
                                }
                                """.formatted(psyAId, patCpf)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value(NeutralActionResponse.LINK_REQUEST_ACCEPTED_MESSAGE));

        LinkResponse createdPending = linkService.listMyLinks(patEmail).getFirst();
        assertThat(createdPending.status()).isEqualTo(LinkStatus.PENDING);
        assertThat(createdPending.psychologistId()).isEqualTo(psyAId);

        // Paciente rejeita o vínculo pendente
        linkService.rejectLink(patEmail, createdPending.id(), null);

        // Nova triagem para o mesmo par após REJECTED retorna 202 neutro, mas NÃO reabre o vínculo (anti-enumeração + trava)
        mockMvc().perform(post("/api/admin/triage")
                        .header("Authorization", "Bearer " + tokenAdminA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "psychologistId": %d,
                                  "cpf": "%s"
                                }
                                """.formatted(psyAId, patCpf)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value(NeutralActionResponse.LINK_REQUEST_ACCEPTED_MESSAGE));

        assertThat(linkRepository.findById(createdPending.id()).orElseThrow().getStatus()).isEqualTo(LinkStatus.REJECTED);
    }

    @Test
    void shouldEnforceOneToOneClinicLockAndPreventReopeningOrSecondClinicJoin() throws Exception {
        String suffix = uniqueSuffix();
        String cnpjA = uniqueCnpj();
        String cnpjB = uniqueCnpj();
        String tokenAdminA = registerClinicAndGetToken("Clínica Lock A " + suffix, cnpjA, "admin.lock.a." + suffix + "@psiqueup.test");
        String tokenAdminB = registerClinicAndGetToken("Clínica Lock B " + suffix, cnpjB, "admin.lock.b." + suffix + "@psiqueup.test");

        String psyEmail = "psy.lock." + suffix + "@psiqueup.test";
        var psyAuth = registerAndVerify("Dr. Lock", psyEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null);
        profileDomainService.upsertPsychologistProfile(psyEmail, new UpsertPsychologistProfileRequest(uniqueCrp(), 1L, "TCC"));

        // Solicita vínculo à Clínica B -> PENDING, depois Admin B rejeita
        MvcResult joinB = mockMvc().perform(post("/api/clinics/join")
                        .header("Authorization", "Bearer " + psyAuth.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cnpj\":\"" + cnpjB + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        Long reqBId = ((Number) JsonPath.read(joinB.getResponse().getContentAsString(), "$.id")).longValue();

        mockMvc().perform(patch("/api/admin/psychologist-requests/" + reqBId + "/reject")
                        .header("Authorization", "Bearer " + tokenAdminB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        // Não pode aprovar uma solicitação já REJECTED -> 400 Bad Request
        mockMvc().perform(patch("/api/admin/psychologist-requests/" + reqBId + "/approve")
                        .header("Authorization", "Bearer " + tokenAdminB))
                .andExpect(status().isBadRequest());

        // Como foi REJECTED em B, pode solicitar vínculo na Clínica A -> 201 PENDING
        MvcResult joinA = mockMvc().perform(post("/api/clinics/join")
                        .header("Authorization", "Bearer " + psyAuth.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cnpj\":\"" + cnpjA + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        Long reqAId = ((Number) JsonPath.read(joinA.getResponse().getContentAsString(), "$.id")).longValue();

        // Enquanto PENDING em A, tentar reabrir B deve ser bloqueado -> 409 Conflict
        mockMvc().perform(post("/api/clinics/join")
                        .header("Authorization", "Bearer " + psyAuth.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cnpj\":\"" + cnpjB + "\"}"))
                .andExpect(status().isConflict());

        // Admin A aprova -> APPROVED
        mockMvc().perform(patch("/api/admin/psychologist-requests/" + reqAId + "/approve")
                        .header("Authorization", "Bearer " + tokenAdminA))
                .andExpect(status().isOk());

        // Enquanto APPROVED em A, tentar solicitar B deve ser bloqueado -> 409 Conflict
        mockMvc().perform(post("/api/clinics/join")
                        .header("Authorization", "Bearer " + psyAuth.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cnpj\":\"" + cnpjB + "\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void shouldScopeLinksAndSessionsByClinicAndPreventCrossTenantPatientDeactivation() throws Exception {
        String suffix = uniqueSuffix();
        String cnpjA = uniqueCnpj();
        String tokenAdminA = registerClinicAndGetToken("Clínica Scope A " + suffix, cnpjA, "admin.scope." + suffix + "@psiqueup.test");

        String psyAEmail = "psy.scope." + suffix + "@psiqueup.test";
        var psyAAuth = registerAndVerify("Dra. Scope", psyAEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null);
        profileDomainService.upsertPsychologistProfile(psyAEmail, new UpsertPsychologistProfileRequest(uniqueCrp(), 1L, "TCC"));
        Long psyAId = userRepository.findByEmail(psyAEmail).orElseThrow().getId();

        String psyAutoEmail = "psy.auto.scope." + suffix + "@psiqueup.test";
        registerAndVerify("Dr. Auto Scope", psyAutoEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null);
        profileDomainService.upsertPsychologistProfile(psyAutoEmail, new UpsertPsychologistProfileRequest(uniqueCrp(), 1L, "TCC"));

        String patSharedEmail = "pat.shared." + suffix + "@psiqueup.test";
        String patOnlyAEmail = "pat.onlya." + suffix + "@psiqueup.test";
        String patSharedCpf = uniqueCpf();
        String patOnlyACpf = uniqueCpf();
        registerAndVerify("Paciente Compartilhado", patSharedEmail, "secret123", PublicUserRole.PATIENT, patSharedCpf);
        registerAndVerify("Paciente Exclusivo A", patOnlyAEmail, "secret123", PublicUserRole.PATIENT, patOnlyACpf);
        Long patSharedId = userRepository.findByEmail(patSharedEmail).orElseThrow().getId();
        Long patOnlyAId = userRepository.findByEmail(patOnlyAEmail).orElseThrow().getId();

        // Psy Auto cria vínculo autônomo (clinic = null) e paciente aceita
        linkService.createLink(psyAutoEmail, new CreateLinkRequest(patSharedCpf));
        LinkResponse autoLink = linkService.acceptLink(patSharedEmail, linkService.listMyLinks(patSharedEmail).getFirst().id());
        PatientPsychologistLink savedAutoLink = linkRepository.findById(autoLink.id()).orElseThrow();
        assertThat(savedAutoLink.getClinic()).isNull();

        OffsetDateTime autoStart = OffsetDateTime.now().plusHours(10);
        SessionResponse autoSession = sessionService.scheduleSession(
                psyAutoEmail, new CreateSessionRequest(patSharedId, autoStart, autoStart.plusHours(1)));
        Session savedAutoSession = sessionRepository.findById(autoSession.id()).orElseThrow();
        assertThat(savedAutoSession.getClinic()).isNull();

        // Psy A entra e é aprovado na Clínica A
        MvcResult joinA = mockMvc().perform(post("/api/clinics/join")
                        .header("Authorization", "Bearer " + psyAAuth.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cnpj\":\"" + cnpjA + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        Long reqAId = ((Number) JsonPath.read(joinA.getResponse().getContentAsString(), "$.id")).longValue();
        mockMvc().perform(patch("/api/admin/psychologist-requests/" + reqAId + "/approve")
                        .header("Authorization", "Bearer " + tokenAdminA))
                .andExpect(status().isOk());

        // Triagem na Clínica A vincula patShared e patOnlyA com clinic = Clínica A (PENDING) e pacientes aceitam
        mockMvc().perform(post("/api/admin/triage")
                        .header("Authorization", "Bearer " + tokenAdminA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"psychologistId\":" + psyAId + ",\"cpf\":\"" + patSharedCpf + "\"}"))
                .andExpect(status().isAccepted());
        Long sharedLinkId = linkService.listMyLinks(patSharedEmail).stream()
                .filter(l -> l.psychologistId().equals(psyAId))
                .findFirst().orElseThrow().id();
        linkService.acceptLink(patSharedEmail, sharedLinkId);
        Clinic clinicA = clinicRepository.findByCnpj(cnpjA).orElseThrow();
        assertThat(linkRepository.findById(sharedLinkId).orElseThrow().getClinic().getId()).isEqualTo(clinicA.getId());

        mockMvc().perform(post("/api/admin/triage")
                        .header("Authorization", "Bearer " + tokenAdminA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"psychologistId\":" + psyAId + ",\"cpf\":\"" + patOnlyACpf + "\"}"))
                .andExpect(status().isAccepted());
        Long onlyALinkId = linkService.listMyLinks(patOnlyAEmail).getFirst().id();
        linkService.acceptLink(patOnlyAEmail, onlyALinkId);

        // Admin A NÃO pode desativar patShared porque possui vínculo autônomo ativo (DoS cross-tenant) -> 403 com mensagem clara
        mockMvc().perform(patch("/api/admin/users/" + patSharedId + "/status")
                        .header("Authorization", "Bearer " + tokenAdminA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Não é possível desativar globalmente uma conta com atuação externa ou autônoma."));

        // Admin A PODE desativar patOnlyA pois só atua nesta clínica -> 200 OK
        mockMvc().perform(patch("/api/admin/users/" + patOnlyAId + "/status")
                        .header("Authorization", "Bearer " + tokenAdminA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));
    }

    @Test
    void shouldProvisionAdminAndClinicInAdminBootstrapRunnerIdempotently() {
        String suffix = uniqueSuffix();
        String seedEmail = "seed.admin." + suffix + "@psiqueup.test";
        String seedCnpj = uniqueCnpj();

        AdminBootstrapRunner runner = new AdminBootstrapRunner(userRepository, clinicRepository, passwordEncoder);
        ReflectionTestUtils.setField(runner, "adminName", "Admin Seed " + suffix);
        ReflectionTestUtils.setField(runner, "adminEmail", seedEmail);
        ReflectionTestUtils.setField(runner, "adminPassword", "seedSecret123");
        ReflectionTestUtils.setField(runner, "clinicName", "Clínica Seed " + suffix);
        ReflectionTestUtils.setField(runner, "clinicCnpj", seedCnpj);

        // 1ª execução: cria usuário ADMIN e Clinic vinculada
        runner.run(null);

        User seededAdmin = userRepository.findByEmail(seedEmail).orElseThrow();
        assertThat(seededAdmin.getRole()).isEqualTo(UserRole.ADMIN);
        Clinic seededClinic = clinicRepository.findByOwnerUserId(seededAdmin.getId()).orElseThrow();
        assertThat(seededClinic.getCnpj()).isEqualTo(seedCnpj);

        // 2ª execução: idempotente, não duplica nem falha
        runner.run(null);
        assertThat(clinicRepository.findByOwnerUserId(seededAdmin.getId())).isPresent();
    }
}
