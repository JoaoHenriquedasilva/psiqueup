package com.psiqueup.api.controller;

import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.PublicUserRole;
import com.psiqueup.api.domain.enums.SessionStatus;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.dto.auth.RegisterRequest;
import com.psiqueup.api.dto.link.CreateLinkRequest;
import com.psiqueup.api.dto.link.LinkResponse;
import com.psiqueup.api.dto.profile.UpsertPsychologistProfileRequest;
import com.psiqueup.api.dto.session.CreateSessionRequest;
import com.psiqueup.api.dto.session.SessionResponse;
import com.psiqueup.api.dto.session.UpdateSessionStatusRequest;
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
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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

    private User createAdminUser(String suffix) {
        User admin = User.builder()
                .name("Admin Teste " + suffix)
                .email("admin." + suffix + "@psiqueup.test")
                .passwordHash(passwordEncoder.encode("admin123"))
                .role(UserRole.ADMIN)
                .active(true)
                .build();
        return userRepository.save(admin);
    }

    @Test
    void shouldDenyAdminEndpointsForPatientAndPsychologist() throws Exception {
        String suffix = uniqueSuffix();
        var patientAuth = authService.register(new RegisterRequest(
                "Paciente Bloqueado",
                "pat.block." + suffix + "@psiqueup.test",
                "secret123",
                PublicUserRole.PATIENT
        ));
        var psychAuth = authService.register(new RegisterRequest(
                "Psicologo Bloqueado",
                "psy.block." + suffix + "@psiqueup.test",
                "secret123",
                PublicUserRole.PSYCHOLOGIST
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

        var psychAuth = authService.register(new RegisterRequest("Dra. Clara", psychEmail, "secret123", PublicUserRole.PSYCHOLOGIST));
        authService.register(new RegisterRequest("Dr. Pendente", pendingPsychEmail, "secret123", PublicUserRole.PSYCHOLOGIST));
        authService.register(new RegisterRequest("Carlos Paciente", patientEmail, "secret123", PublicUserRole.PATIENT));

        String crp = uniqueCrp();
        profileDomainService.upsertPsychologistProfile(psychEmail, new UpsertPsychologistProfileRequest(crp, 1L, "TCC"));
        LinkResponse link = linkService.createLink(psychEmail, new CreateLinkRequest(patientEmail));

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

        // 2. Lista psicólogos inclui quem tem CRP e quem está com CRP pendente (null)
        mockMvc().perform(get("/api/admin/psychologists")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].crp", hasItem(crp)))
                .andExpect(jsonPath("$[*].crp", hasItem(nullValue())));

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
}
