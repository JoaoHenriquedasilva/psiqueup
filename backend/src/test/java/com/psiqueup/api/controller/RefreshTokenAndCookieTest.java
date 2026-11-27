package com.psiqueup.api.controller;

import com.psiqueup.api.domain.entity.AuditLog;
import com.psiqueup.api.domain.entity.RefreshToken;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.PublicUserRole;
import com.psiqueup.api.dto.auth.RegisterRequest;
import com.psiqueup.api.repository.AuditLogRepository;
import com.psiqueup.api.repository.RefreshTokenRepository;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.security.AuthCookieService;
import com.psiqueup.api.service.AuthService;
import com.psiqueup.api.service.EmailSenderService;
import com.psiqueup.api.service.RefreshTokenService;
import com.psiqueup.api.util.HashUtils;
import jakarta.persistence.LockModeType;
import jakarta.servlet.Filter;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class RefreshTokenAndCookieTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    @Qualifier("springSecurityFilterChain")
    private Filter springSecurityFilterChain;

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @MockitoSpyBean
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @MockitoSpyBean
    private EmailSenderService emailSenderService;

    private MockMvc mockMvc() {
        return MockMvcBuilders.webAppContextSetup(context)
                .addFilters(springSecurityFilterChain)
                .build();
    }

    private User createVerifiedPsychologist(String emailPrefix) {
        String email = emailPrefix + "." + UUID.randomUUID().toString().substring(0, 8) + "@psiqueup.test";
        authService.register(new RegisterRequest(
                "Dra. Cookie",
                email,
                "secret123",
                PublicUserRole.PSYCHOLOGIST,
                null,
                true,
                null,
                null
        ));
        User user = userRepository.findByEmail(email).orElseThrow();
        user.setEmailVerified(true);
        return userRepository.save(user);
    }

    @Test
    void shouldLoginWithHttpOnlyCookiesAndAuthenticateViaCookieOnly() throws Exception {
        User user = createVerifiedPsychologist("cookie.login");

        MvcResult loginResult = mockMvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getEmail() + "\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Dra. Cookie"))
                .andExpect(jsonPath("$.email").value(user.getEmail()))
                .andExpect(jsonPath("$.role").value("PSYCHOLOGIST"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(cookie().httpOnly(AuthCookieService.ACCESS_TOKEN_COOKIE, true))
                .andExpect(cookie().path(AuthCookieService.ACCESS_TOKEN_COOKIE, AuthCookieService.ACCESS_COOKIE_PATH))
                .andExpect(cookie().httpOnly(AuthCookieService.REFRESH_TOKEN_COOKIE, true))
                .andExpect(cookie().path(AuthCookieService.REFRESH_TOKEN_COOKIE, AuthCookieService.REFRESH_COOKIE_PATH))
                .andReturn();

        Cookie accessCookie = loginResult.getResponse().getCookie(AuthCookieService.ACCESS_TOKEN_COOKIE);
        assertThat(accessCookie).isNotNull();
        assertThat(accessCookie.getValue()).isNotBlank();

        // Requisição autenticada apenas via cookie (sem header Authorization)
        mockMvc().perform(get("/api/users/me")
                        .cookie(accessCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(user.getEmail()));
    }

    @Test
    void shouldRotateRefreshTokenAndDetectReuseRevokingEntireFamily() throws Exception {
        User user = createVerifiedPsychologist("cookie.rotate");

        MvcResult loginResult = mockMvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getEmail() + "\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk())
                .andReturn();

        Cookie initialRefreshCookie = loginResult.getResponse().getCookie(AuthCookieService.REFRESH_TOKEN_COOKIE);
        assertThat(initialRefreshCookie).isNotNull();
        String initialHash = HashUtils.sha256Hex(initialRefreshCookie.getValue());

        // Garante que o método de rotação usa LockModeType.PESSIMISTIC_WRITE
        Lock lockAnnotation = RefreshTokenRepository.class
                .getMethod("findByTokenHashForUpdate", String.class)
                .getAnnotation(Lock.class);
        assertThat(lockAnnotation).isNotNull();
        assertThat(lockAnnotation.value()).isEqualTo(LockModeType.PESSIMISTIC_WRITE);

        // 1. Refresh com token válido -> rotaciona e emite novos cookies
        MvcResult refreshResult = mockMvc().perform(post("/api/auth/refresh")
                        .cookie(initialRefreshCookie)
                        .header("Origin", "http://localhost:5173"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(user.getEmail()))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(cookie().exists(AuthCookieService.ACCESS_TOKEN_COOKIE))
                .andExpect(cookie().exists(AuthCookieService.REFRESH_TOKEN_COOKIE))
                .andReturn();

        verify(refreshTokenRepository).findByTokenHashForUpdate(initialHash);

        Cookie rotatedRefreshCookie = refreshResult.getResponse().getCookie(AuthCookieService.REFRESH_TOKEN_COOKIE);
        assertThat(rotatedRefreshCookie).isNotNull();
        assertThat(rotatedRefreshCookie.getValue()).isNotEqualTo(initialRefreshCookie.getValue());

        RefreshToken oldEntity = refreshTokenRepository.findByTokenHash(initialHash).orElseThrow();
        assertThat(oldEntity.getRevokedAt()).isNotNull();
        assertThat(oldEntity.getReplacedByHash()).isEqualTo(HashUtils.sha256Hex(rotatedRefreshCookie.getValue()));

        // 2. Reuso do refresh token antigo -> 401 + revoga toda a família + AuditLog AUTH_REFRESH_REUSE_DETECTED
        mockMvc().perform(post("/api/auth/refresh")
                        .cookie(initialRefreshCookie)
                        .header("Origin", "http://localhost:5173"))
                .andExpect(status().isUnauthorized())
                .andExpect(cookie().maxAge(AuthCookieService.ACCESS_TOKEN_COOKIE, 0))
                .andExpect(cookie().maxAge(AuthCookieService.REFRESH_TOKEN_COOKIE, 0));

        List<RefreshToken> familyTokens = refreshTokenRepository.findAllByFamilyId(oldEntity.getFamilyId());
        assertThat(familyTokens).isNotEmpty();
        assertThat(familyTokens).allMatch(t -> t.getRevokedAt() != null);

        // O token rotacionado também foi revogado pela detecção de reuso
        mockMvc().perform(post("/api/auth/refresh")
                        .cookie(rotatedRefreshCookie)
                        .header("Origin", "http://localhost:5173"))
                .andExpect(status().isUnauthorized());

        List<AuditLog> reuseLogs = auditLogRepository.findAllByActionOrderByCreatedAtDesc("AUTH_REFRESH_REUSE_DETECTED");
        assertThat(reuseLogs).anyMatch(log -> user.getEmail().equals(log.getActorEmail()));
    }

    @Test
    void shouldRevokeRefreshTokenAndClearCookiesOnLogout() throws Exception {
        User user = createVerifiedPsychologist("cookie.logout");

        MvcResult loginResult = mockMvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getEmail() + "\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie = loginResult.getResponse().getCookie(AuthCookieService.REFRESH_TOKEN_COOKIE);
        assertThat(refreshCookie).isNotNull();

        mockMvc().perform(post("/api/auth/logout")
                        .cookie(refreshCookie)
                        .header("Origin", "http://localhost:5173"))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge(AuthCookieService.ACCESS_TOKEN_COOKIE, 0))
                .andExpect(cookie().maxAge(AuthCookieService.REFRESH_TOKEN_COOKIE, 0));

        RefreshToken stored = refreshTokenRepository
                .findByTokenHash(HashUtils.sha256Hex(refreshCookie.getValue()))
                .orElseThrow();
        assertThat(stored.getRevokedAt()).isNotNull();

        mockMvc().perform(post("/api/auth/refresh")
                        .cookie(refreshCookie)
                        .header("Origin", "http://localhost:5173"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldRevokeAllRefreshTokensOnPasswordReset() throws Exception {
        User user = createVerifiedPsychologist("cookie.reset");

        MvcResult loginResult = mockMvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getEmail() + "\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie = loginResult.getResponse().getCookie(AuthCookieService.REFRESH_TOKEN_COOKIE);
        assertThat(refreshCookie).isNotNull();

        mockMvc().perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getEmail() + "\"}"))
                .andExpect(status().isAccepted());

        ArgumentCaptor<String> resetLinkCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailSenderService, timeout(3000))
                .sendPasswordReset(eq(user.getEmail()), eq("Dra. Cookie"), resetLinkCaptor.capture());
        String link = resetLinkCaptor.getValue();
        String resetToken = link.substring(link.indexOf("token=") + "token=".length());

        mockMvc().perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + resetToken + "\",\"newPassword\":\"newSecret456\"}"))
                .andExpect(status().isOk());

        List<RefreshToken> userTokens = refreshTokenRepository.findAllByUserId(user.getId());
        assertThat(userTokens).isNotEmpty();
        assertThat(userTokens).allMatch(t -> t.getRevokedAt() != null);

        mockMvc().perform(post("/api/auth/refresh")
                        .cookie(refreshCookie)
                        .header("Origin", "http://localhost:5173"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldRejectStateChangingRequestWithDisallowedOrigin() throws Exception {
        User user = createVerifiedPsychologist("cookie.csrf");

        MvcResult loginResult = mockMvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getEmail() + "\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie = loginResult.getResponse().getCookie(AuthCookieService.REFRESH_TOKEN_COOKIE);
        assertThat(refreshCookie).isNotNull();

        mockMvc().perform(post("/api/auth/refresh")
                        .cookie(refreshCookie)
                        .header("Origin", "https://evil.example.com"))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldRejectStateChangingRequestWithCookieAndMissingOriginAndReferer() throws Exception {
        User user = createVerifiedPsychologist("cookie.failclosed");

        MvcResult loginResult = mockMvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getEmail() + "\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie = loginResult.getResponse().getCookie(AuthCookieService.REFRESH_TOKEN_COOKIE);
        assertThat(refreshCookie).isNotNull();

        mockMvc().perform(post("/api/auth/refresh")
                        .cookie(refreshCookie))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldFailFastWhenSameSiteNoneWithoutSecure() {
        AuthCookieService cookieService = new AuthCookieService();
        ReflectionTestUtils.setField(cookieService, "cookieSameSite", "None");
        ReflectionTestUtils.setField(cookieService, "cookieSecure", false);

        assertThatThrownBy(cookieService::validateCookieConfiguration)
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void shouldCleanupExpiredAndRevokedRefreshTokensOlderThan30Days() {
        User user = createVerifiedPsychologist("cookie.cleanup");
        OffsetDateTime now = OffsetDateTime.now();

        RefreshToken oldExpired = refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(HashUtils.sha256Hex("old-expired-" + UUID.randomUUID()))
                .familyId(UUID.randomUUID().toString())
                .expiresAt(now.minusDays(31))
                .build());

        RefreshToken oldRevoked = refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(HashUtils.sha256Hex("old-revoked-" + UUID.randomUUID()))
                .familyId(UUID.randomUUID().toString())
                .expiresAt(now.plusDays(7))
                .revokedAt(now.minusDays(31))
                .build());

        RefreshToken recentActive = refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(HashUtils.sha256Hex("recent-active-" + UUID.randomUUID()))
                .familyId(UUID.randomUUID().toString())
                .expiresAt(now.plusDays(7))
                .build());

        refreshTokenService.cleanupExpiredAndRevokedTokens();

        assertThat(refreshTokenRepository.findById(oldExpired.getId())).isEmpty();
        assertThat(refreshTokenRepository.findById(oldRevoked.getId())).isEmpty();
        assertThat(refreshTokenRepository.findById(recentActive.getId())).isPresent();
    }
}
