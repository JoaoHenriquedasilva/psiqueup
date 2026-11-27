package com.psiqueup.api.controller;

import com.psiqueup.api.domain.entity.AuditLog;
import com.psiqueup.api.domain.entity.AuthActionToken;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.AuthTokenType;
import com.psiqueup.api.domain.enums.PublicUserRole;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.dto.auth.RegisterRequest;
import com.psiqueup.api.dto.link.CreateLinkRequest;
import com.psiqueup.api.dto.profile.UpsertPsychologistProfileRequest;
import com.psiqueup.api.repository.AuditLogRepository;
import com.psiqueup.api.repository.AuthActionTokenRepository;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.service.AuthService;
import com.psiqueup.api.service.EmailSenderService;
import com.psiqueup.api.service.LinkService;
import com.psiqueup.api.service.ProfileDomainService;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class AuthRecoveryAndLgpdTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    @Qualifier("springSecurityFilterChain")
    private Filter springSecurityFilterChain;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthActionTokenRepository authActionTokenRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private ProfileDomainService profileDomainService;

    @Autowired
    private LinkService linkService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoSpyBean
    private EmailSenderService emailSenderService;

    private MockMvc mockMvc() {
        return MockMvcBuilders.webAppContextSetup(context)
                .addFilters(springSecurityFilterChain)
                .build();
    }

    private String uniqueSuffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    private String extractTokenFromLink(String link) {
        int idx = link.indexOf("token=");
        assertThat(idx).isGreaterThanOrEqualTo(0);
        return link.substring(idx + "token=".length());
    }

    @Test
    void shouldRejectRegisterWithoutAcceptedTerms() throws Exception {
        String suffix = uniqueSuffix();
        mockMvc().perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Sem Termos",
                                  "email": "no.terms.%s@psiqueup.test",
                                  "password": "secret123",
                                  "role": "PSYCHOLOGIST",
                                  "acceptedTerms": false
                                }
                                """.formatted(suffix)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.acceptedTerms").exists());

        mockMvc().perform(post("/api/auth/register-clinic")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "clinicName": "Clínica Sem Termos",
                                  "cnpj": "11222333000181",
                                  "adminName": "Admin Sem Termos",
                                  "adminEmail": "admin.noterms.%s@psiqueup.test",
                                  "password": "secret123"
                                }
                                """.formatted(suffix)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.acceptedTerms").exists());
    }

    @Test
    void shouldCompleteEmailVerificationResendAndPasswordResetFlows() throws Exception {
        String suffix = uniqueSuffix();
        String email = "lgpd.user." + suffix + "@psiqueup.test";

        // 1. Register -> 201 without JWT, emailVerified=false, LGPD fields saved
        mockMvc().perform(post("/api/auth/register")
                        .with(req -> {
                            req.setRemoteAddr("198.51.100.42");
                            return req;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Dra. Verificação",
                                  "email": "%s",
                                  "password": "secret123",
                                  "role": "PSYCHOLOGIST",
                                  "acceptedTerms": true
                                }
                                """.formatted(email)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.verificationRequired").value(true))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.token").doesNotExist());

        User savedUser = userRepository.findByEmail(email).orElseThrow();
        assertThat(savedUser.getEmailVerified()).isFalse();
        assertThat(savedUser.getTermsVersion()).isEqualTo("2026-11");
        assertThat(savedUser.getPrivacyVersion()).isEqualTo("2026-11");
        assertThat(savedUser.getTermsAcceptedAt()).isNotNull();
        assertThat(savedUser.getTermsAcceptedIp()).isEqualTo("198.51.100.42");

        ArgumentCaptor<String> verifyLinkCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailSenderService, timeout(3000)).sendEmailVerification(eq(email), eq("Dra. Verificação"), verifyLinkCaptor.capture());
        String firstToken = extractTokenFromLink(verifyLinkCaptor.getValue());

        // Raw token must NOT be stored in DB (only SHA-256 hex)
        List<AuthActionToken> tokens = authActionTokenRepository.findAll();
        assertThat(tokens).noneMatch(t -> t.getTokenHash().equals(firstToken));
        assertThat(tokens).anyMatch(t -> t.getUser().getId().equals(savedUser.getId())
                && t.getTokenType() == AuthTokenType.EMAIL_VERIFICATION
                && t.getTokenHash().length() == 64);

        // 2. Login before verification -> 403 Forbidden
        mockMvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "password": "secret123"
                                }
                                """.formatted(email)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Confirme seu e-mail antes de acessar a plataforma."));

        // 3. Resend verification -> 202 Accepted (and anti-enumeration for unknown email)
        mockMvc().perform(post("/api/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"unknown." + suffix + "@psiqueup.test\"}"))
                .andExpect(status().isAccepted());

        mockMvc().perform(post("/api/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isAccepted());

        verify(emailSenderService, timeout(3000).atLeastOnce())
                .sendEmailVerification(eq(email), eq("Dra. Verificação"), verifyLinkCaptor.capture());
        String secondToken = extractTokenFromLink(verifyLinkCaptor.getValue());
        assertThat(secondToken).isNotEqualTo(firstToken);

        // First token should now be invalidated
        mockMvc().perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + firstToken + "\"}"))
                .andExpect(status().isBadRequest());

        // 4. Verify email with latest token -> 200 OK
        mockMvc().perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + secondToken + "\"}"))
                .andExpect(status().isOk());

        assertThat(userRepository.findByEmail(email).orElseThrow().getEmailVerified()).isTrue();

        // Reuse token -> 400 Bad Request
        mockMvc().perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + secondToken + "\"}"))
                .andExpect(status().isBadRequest());

        // 5. Login after verification -> 200 OK with HttpOnly cookies (no token in body)
        MvcResult loginResult = mockMvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "password": "secret123"
                                }
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(cookie().exists("psiqueup_access_token"))
                .andExpect(cookie().exists("psiqueup_refresh_token"))
                .andReturn();

        String oldJwt = loginResult.getResponse().getCookie("psiqueup_access_token").getValue();

        mockMvc().perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + oldJwt))
                .andExpect(status().isOk());

        // 6. Forgot password -> 202 Accepted
        mockMvc().perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isAccepted());

        ArgumentCaptor<String> resetLinkCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailSenderService, timeout(3000)).sendPasswordReset(eq(email), eq("Dra. Verificação"), resetLinkCaptor.capture());
        String resetToken = extractTokenFromLink(resetLinkCaptor.getValue());

        // 7. Reset password -> 200 OK + AuditLog AUTH_RESET_PASSWORD + old JWT invalidated
        mockMvc().perform(post("/api/auth/reset-password")
                        .with(req -> {
                            req.setRemoteAddr("203.0.113.10");
                            return req;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "token": "%s",
                                  "newPassword": "newSecret456"
                                }
                                """.formatted(resetToken)))
                .andExpect(status().isOk());

        // Old JWT must be rejected after password reset (token_version incremented)
        mockMvc().perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + oldJwt))
                .andExpect(status().isUnauthorized());

        // Reuse reset token -> 400 Bad Request
        mockMvc().perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "token": "%s",
                                  "newPassword": "anotherPassword"
                                }
                                """.formatted(resetToken)))
                .andExpect(status().isBadRequest());

        // Old password fails -> 401
        mockMvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"secret123\"}"))
                .andExpect(status().isUnauthorized());

        // New password succeeds -> 200
        mockMvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"newSecret456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(cookie().exists("psiqueup_access_token"));

        List<AuditLog> resetLogs = auditLogRepository.findAllByActionOrderByCreatedAtDesc("AUTH_RESET_PASSWORD");
        assertThat(resetLogs).anyMatch(log ->
                email.equals(log.getActorEmail())
                        && "USER".equals(log.getTargetType())
                        && "203.0.113.10".equals(log.getIpAddress())
        );
    }

    @Test
    void shouldRecordAuditLogsForCriticalLinkActionsAndEmitSecurityHeaders() throws Exception {
        String suffix = uniqueSuffix();
        String psychEmail = "psy.audit." + suffix + "@psiqueup.test";
        String patEmail = "pat.audit." + suffix + "@psiqueup.test";
        String patCpf = generateValidCpf();

        authService.register(new RegisterRequest("Psicólogo Audit", psychEmail, "secret123", PublicUserRole.PSYCHOLOGIST, null, true, null, null));
        authService.register(new RegisterRequest("Paciente Audit", patEmail, "secret123", PublicUserRole.PATIENT, patCpf, true, null, null));

        String crp = "06/" + String.format("%05d", Math.abs(suffix.hashCode() % 90000) + 10000);
        profileDomainService.upsertPsychologistProfile(
                psychEmail,
                new UpsertPsychologistProfileRequest(crp, 1L, "TCC")
        );
        linkService.createLink(psychEmail, new CreateLinkRequest(patCpf));

        List<AuditLog> linkLogs = auditLogRepository.findAllByActionOrderByCreatedAtDesc("LINK_REQUEST");
        assertThat(linkLogs).anyMatch(l -> psychEmail.equals(l.getActorEmail()) && "PATIENT_LINK".equals(l.getTargetType()));

        mockMvc().perform(get("/api/health").secure(true))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'"))
                .andExpect(header().exists("Strict-Transport-Security"));
    }

    @Test
    void shouldRejectOutdatedLegalVersions() throws Exception {
        String suffix = uniqueSuffix();
        mockMvc().perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Versão Antiga",
                                  "email": "outdated.terms.%s@psiqueup.test",
                                  "password": "secret123",
                                  "role": "PSYCHOLOGIST",
                                  "acceptedTerms": true,
                                  "termsVersion": "2020-01",
                                  "privacyVersion": "2026-11"
                                }
                                """.formatted(suffix)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        mockMvc().perform(post("/api/auth/register-clinic")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "clinicName": "Clínica Versão Antiga",
                                  "cnpj": "11222333000181",
                                  "adminName": "Admin Versão Antiga",
                                  "adminEmail": "admin.outdated.%s@psiqueup.test",
                                  "password": "secret123",
                                  "acceptedTerms": true,
                                  "termsVersion": "2026-11",
                                  "privacyVersion": "2019-05"
                                }
                                """.formatted(suffix)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void shouldIgnoreUntrustedXForwardedForHeader() throws Exception {
        String suffix = uniqueSuffix();
        String email = "ip.spoof." + suffix + "@psiqueup.test";

        mockMvc().perform(post("/api/auth/register")
                        .header("X-Forwarded-For", "198.51.100.99")
                        .with(req -> {
                            req.setRemoteAddr("192.0.2.55");
                            return req;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Teste IP Confiável",
                                  "email": "%s",
                                  "password": "secret123",
                                  "role": "PSYCHOLOGIST",
                                  "acceptedTerms": true
                                }
                                """.formatted(email)))
                .andExpect(status().isCreated());

        User savedUser = userRepository.findByEmail(email).orElseThrow();
        assertThat(savedUser.getTermsAcceptedIp()).isEqualTo("192.0.2.55");
    }

    @Test
    void shouldReturn401WithGenericMessageForDisabledUserOnLogin() throws Exception {
        String suffix = uniqueSuffix();
        String email = "disabled.user." + suffix + "@psiqueup.test";

        userRepository.save(User.builder()
                .name("Conta Inativa")
                .email(email)
                .passwordHash(passwordEncoder.encode("secret123"))
                .role(UserRole.PSYCHOLOGIST)
                .active(false)
                .emailVerified(true)
                .build());

        mockMvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "password": "secret123"
                                }
                                """.formatted(email)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("E-mail ou senha inválidos."));
    }

    private String generateValidCpf() {
        int[] digits = new int[11];
        for (int i = 0; i < 9; i++) {
            digits[i] = ThreadLocalRandom.current().nextInt(10);
        }
        int sum1 = 0;
        for (int i = 0; i < 9; i++) {
            sum1 += digits[i] * (10 - i);
        }
        int rem1 = sum1 % 11;
        digits[9] = rem1 < 2 ? 0 : 11 - rem1;

        int sum2 = 0;
        for (int i = 0; i < 10; i++) {
            sum2 += digits[i] * (11 - i);
        }
        int rem2 = sum2 % 11;
        digits[10] = rem2 < 2 ? 0 : 11 - rem2;

        StringBuilder sb = new StringBuilder(11);
        for (int d : digits) {
            sb.append(d);
        }
        return sb.toString();
    }
}
