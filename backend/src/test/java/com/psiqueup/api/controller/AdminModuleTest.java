package com.psiqueup.api.controller;

import com.psiqueup.api.domain.entity.Clinic;
import com.psiqueup.api.domain.entity.ClinicPsychologist;
import com.psiqueup.api.domain.entity.PatientPsychologistLink;
import com.psiqueup.api.domain.entity.PsychologistProfile;
import com.psiqueup.api.domain.entity.Session;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.ClinicPsychologistStatus;
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
import com.psiqueup.api.repository.ClinicPsychologistRepository;
import com.psiqueup.api.repository.ClinicRepository;
import com.psiqueup.api.repository.PatientPsychologistLinkRepository;
import com.psiqueup.api.repository.PsychologistProfileRepository;
import com.psiqueup.api.repository.SessionRepository;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.security.JwtService;
import com.psiqueup.api.security.UserPrincipal;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AdminModuleTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    @Qualifier("springSecurityFilterChain")
    private Filter springSecurityFilterChain;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClinicRepository clinicRepository;

    @Autowired
    private ClinicPsychologistRepository clinicPsychologistRepository;

    @Autowired
    private PsychologistProfileRepository psychologistProfileRepository;

    @Autowired
    private PatientPsychologistLinkRepository linkRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

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
        d[8] = 0; d[9] = 0; d[10] = 0; d[11] = 1;
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

    private static final java.util.concurrent.atomic.AtomicInteger CPF_SEQ = new java.util.concurrent.atomic.AtomicInteger(200000001);

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

    private User createAdminUser(String suffix) {
        User admin = User.builder()
                .name("Admin Teste " + suffix)
                .email("admin." + suffix + "@psiqueup.test")
                .passwordHash(passwordEncoder.encode("admin123"))
                .role(UserRole.ADMIN)
                .active(true)
                .build();
        User savedAdmin = userRepository.save(admin);
        clinicRepository.save(Clinic.builder()
                .name("Clinica Teste " + suffix)
                .cnpj(uniqueCnpj())
                .ownerUser(savedAdmin)
                .active(true)
                .build());
        return savedAdmin;
    }

    @Test
    void shouldDenyAdminEndpointsForPatientAndPsychologist() throws Exception {
        String suffix = uniqueSuffix();
        var patientAuth = authService.register(new RegisterRequest(
                "Paciente Bloqueado",
                "pat.block." + suffix + "@psiqueup.test",
                "secret123",
                PublicUserRole.PATIENT,
                uniqueCpf()
        ));
        var psychAuth = authService.register(new RegisterRequest(
                "Psicologo Bloqueado",
                "psy.block." + suffix + "@psiqueup.test",
                "secret123",
                PublicUserRole.PSYCHOLOGIST,
                null
        ));

        mockMvc().perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + patientAuth.token()))
                .andExpect(status().isForbidden());

        mockMvc().perform(get("/api/admin/psychologists")
                        .header("Authorization", "Bearer " + psychAuth.token()))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldReturnDashboardPsychologistsToggleStatusAndResolveDisputedSession() throws Exception {
        String suffix = uniqueSuffix();
        User admin = createAdminUser(suffix);
        String adminToken = jwtService.generateToken(new UserPrincipal(admin));

        String psychEmail = "psy.ok." + suffix + "@psiqueup.test";
        String pendingPsychEmail = "psy.pending." + suffix + "@psiqueup.test";
        String patientEmail = "pat.ok." + suffix + "@psiqueup.test";
        String patientCpf = uniqueCpf();

        var psychAuth = authService.register(new RegisterRequest("Dra. Clara", psychEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null));
        authService.register(new RegisterRequest("Dr. Pendente", pendingPsychEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null));
        authService.register(new RegisterRequest("Carlos Paciente", patientEmail, "secret123", PublicUserRole.PATIENT, patientCpf));

        String crp = uniqueCrp();
        profileDomainService.upsertPsychologistProfile(psychEmail, new UpsertPsychologistProfileRequest(crp, 1L, "TCC"));
        User psychEntity = userRepository.findByEmail(psychEmail).orElseThrow();
        PsychologistProfile psychProfile = psychologistProfileRepository.findById(psychEntity.getId()).orElseThrow();
        Clinic clinic = clinicRepository.findByOwnerUserId(admin.getId()).orElseThrow();
        clinicPsychologistRepository.save(ClinicPsychologist.builder()
                .clinic(clinic)
                .psychologist(psychProfile)
                .status(ClinicPsychologistStatus.APPROVED)
                .build());
        linkService.createLink(psychEmail, new CreateLinkRequest(patientCpf));
        LinkResponse pendingLink = linkService.listMyLinks(patientEmail).getFirst();
        LinkResponse link = linkService.acceptLink(patientEmail, pendingLink.id());

        OffsetDateTime start = OffsetDateTime.now().plusHours(4);
        SessionResponse session = sessionService.scheduleSession(
                psychEmail,
                new CreateSessionRequest(link.patientId(), start, start.plusHours(1))
        );
        sessionService.updateStatus(psychEmail, session.id(), new UpdateSessionStatusRequest(SessionStatus.COMPLETED, true));
        sessionService.updateStatus(patientEmail, session.id(), new UpdateSessionStatusRequest(SessionStatus.DISPUTED, false));

        // 1. Dashboard retorna métricas e contagem DISPUTED
        mockMvc().perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activePsychologists").isNumber())
                .andExpect(jsonPath("$.averagePatientsPerPsychologist").isNumber())
                .andExpect(jsonPath("$.disputedSessions").isNumber());

        // 2. Lista psicólogos aprovados da clínica inclui quem tem vínculo APPROVED e omite autônomo sem vínculo
        mockMvc().perform(get("/api/admin/psychologists")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].crp", hasItem(crp)));

        // 3. Filtro de sessões DISPUTED + resolução pelo Admin
        mockMvc().perform(get("/api/admin/sessions")
                        .param("status", "DISPUTED")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + session.id() + ")].status").value(hasItem("DISPUTED")));

        mockMvc().perform(patch("/api/admin/sessions/" + session.id() + "/resolve")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resolutionStatus\":\"COMPLETED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        // 4. Desativar conta de psicólogo bloqueia o JWT dele imediatamente (401)
        User psychUser = userRepository.findByEmail(psychEmail).orElseThrow();
        mockMvc().perform(patch("/api/admin/users/" + psychUser.getId() + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc().perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + psychAuth.token()))
                .andExpect(status().isUnauthorized());

        // 5. Admin não pode desativar a própria conta
        mockMvc().perform(patch("/api/admin/users/" + admin.getId() + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturnUniformAntiEnumerationMessageOnTriageAndExcludeAutonomousRecordsFromClinic() throws Exception {
        String suffix = uniqueSuffix();
        User admin = createAdminUser(suffix);
        String adminToken = jwtService.generateToken(new UserPrincipal(admin));
        Clinic clinic = clinicRepository.findByOwnerUserId(admin.getId()).orElseThrow();

        String psychEmail = "psy.anti." + suffix + "@psiqueup.test";
        authService.register(new RegisterRequest("Dr. Anti", psychEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null));
        String crp = uniqueCrp();
        profileDomainService.upsertPsychologistProfile(psychEmail, new UpsertPsychologistProfileRequest(crp, 1L, "TCC"));
        User psychUser = userRepository.findByEmail(psychEmail).orElseThrow();
        PsychologistProfile psychProfile = psychologistProfileRepository.findById(psychUser.getId()).orElseThrow();

        // Psicólogo cria vínculo e sessão autônoma ANTES de entrar na clínica (clinic_id = null)
        String patAutoEmail = "pat.auto.hist." + suffix + "@psiqueup.test";
        String patAutoCpf = uniqueCpf();
        authService.register(new RegisterRequest("Paciente Autônomo", patAutoEmail, "secret123", PublicUserRole.PATIENT, patAutoCpf));
        linkService.createLink(psychEmail, new CreateLinkRequest(patAutoCpf));
        LinkResponse autoPending = linkService.listMyLinks(patAutoEmail).getFirst();
        LinkResponse autoLink = linkService.acceptLink(patAutoEmail, autoPending.id());
        OffsetDateTime start = OffsetDateTime.now().plusHours(6);
        SessionResponse autoSession = sessionService.scheduleSession(
                psychEmail, new CreateSessionRequest(autoLink.patientId(), start, start.plusHours(1)));
        sessionService.updateStatus(psychEmail, autoSession.id(), new UpdateSessionStatusRequest(SessionStatus.COMPLETED, true));
        sessionService.updateStatus(patAutoEmail, autoSession.id(), new UpdateSessionStatusRequest(SessionStatus.DISPUTED, false));

        // Agora psicólogo é aprovado na clínica
        clinicPsychologistRepository.save(ClinicPsychologist.builder()
                .clinic(clinic)
                .psychologist(psychProfile)
                .status(ClinicPsychologistStatus.APPROVED)
                .build());

        // Dashboard, listPsychologists, listSessions e resolveDisputedSession NÃO devem enxergar registros autônomos (clinic_id IS NULL)
        mockMvc().perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activePsychologists").value(1))
                .andExpect(jsonPath("$.totalPatients").value(0))
                .andExpect(jsonPath("$.activeLinks").value(0))
                .andExpect(jsonPath("$.disputedSessions").value(0));

        mockMvc().perform(get("/api/admin/psychologists")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].activePatientsCount").value(0))
                .andExpect(jsonPath("$[0].totalSessionsCount").value(0));

        mockMvc().perform(get("/api/admin/sessions")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        mockMvc().perform(patch("/api/admin/sessions/" + autoSession.id() + "/resolve")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resolutionStatus\":\"COMPLETED\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Você não tem permissão para resolver sessões de outro consultório ou de psicólogo autônomo."));

        // Anti-enumeração na triagem: CPF inexistente, paciente já vinculado e paciente inativo retornam 202 Accepted com a mesma mensagem neutra
        String expectedAntiEnumMessage = NeutralActionResponse.LINK_REQUEST_ACCEPTED_MESSAGE;
        String nonExistentCpf = uniqueCpf();

        mockMvc().perform(post("/api/admin/triage")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"psychologistId\":" + psychUser.getId() + ",\"cpf\":\"" + nonExistentCpf + "\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value(expectedAntiEnumMessage));

        mockMvc().perform(post("/api/admin/triage")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"psychologistId\":" + psychUser.getId() + ",\"cpf\":\"" + patAutoCpf + "\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value(expectedAntiEnumMessage));

        String inactivePatEmail = "pat.inativo." + suffix + "@psiqueup.test";
        String inactivePatCpf = uniqueCpf();
        authService.register(new RegisterRequest("Paciente Inativo", inactivePatEmail, "secret123", PublicUserRole.PATIENT, inactivePatCpf));
        User inactivePat = userRepository.findByEmail(inactivePatEmail).orElseThrow();
        inactivePat.setActive(false);
        userRepository.save(inactivePat);

        mockMvc().perform(post("/api/admin/triage")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"psychologistId\":" + psychUser.getId() + ",\"cpf\":\"" + inactivePatCpf + "\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value(expectedAntiEnumMessage));
    }
}
