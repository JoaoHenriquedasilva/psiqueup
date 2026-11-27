package com.psiqueup.api.service;

import com.psiqueup.api.domain.entity.RefreshToken;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.repository.RefreshTokenRepository;
import com.psiqueup.api.util.HashUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditLogService auditLogService;

    @Value("${api.security.refresh-token.expiration:604800000}")
    private long refreshTokenExpirationMs;

    public record RotationResult(User user, String refreshToken) {
    }

    @Transactional
    public String issueRefreshToken(User user, String clientIp) {
        return createToken(user, UUID.randomUUID().toString(), clientIp).rawToken();
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public RotationResult rotate(String rawRefreshToken, String clientIp) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token ausente ou inválido.");
        }

        String tokenHash = HashUtils.sha256Hex(rawRefreshToken.trim());
        RefreshToken existing = refreshTokenRepository.findByTokenHashForUpdate(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Refresh token inválido ou expirado."
                ));

        OffsetDateTime now = OffsetDateTime.now();
        User user = existing.getUser();

        if (existing.getRevokedAt() != null) {
            Long userId = user.getId();
            String userEmail = user.getEmail();
            refreshTokenRepository.revokeAllByFamilyId(existing.getFamilyId(), now);
            auditLogService.record(
                    userId,
                    userEmail,
                    "AUTH_REFRESH_REUSE_DETECTED",
                    "USER",
                    userId.toString(),
                    null,
                    "Reuso de refresh token detectado; família revogada: " + existing.getFamilyId()
            );
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Sessão revogada por segurança. Faça login novamente."
            );
        }

        if (existing.getExpiresAt().isBefore(now)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expirado.");
        }

        if (!Boolean.TRUE.equals(user.getActive()) || !Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Conta inativa ou e-mail não verificado.");
        }

        IssuedToken nextToken = createToken(user, existing.getFamilyId(), clientIp);
        existing.setRevokedAt(now);
        existing.setReplacedByHash(nextToken.tokenHash());
        refreshTokenRepository.save(existing);

        return new RotationResult(user, nextToken.rawToken());
    }

    @Transactional
    public void revokeToken(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        String hash = HashUtils.sha256Hex(rawRefreshToken.trim());
        refreshTokenRepository.revokeByTokenHash(hash, OffsetDateTime.now());
    }

    @Transactional
    public void revokeAllForUser(Long userId) {
        if (userId == null) {
            return;
        }
        refreshTokenRepository.revokeAllByUserId(userId, OffsetDateTime.now());
    }

    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpiredAndRevokedTokens() {
        refreshTokenRepository.deleteExpiredOrRevokedBefore(OffsetDateTime.now().minusDays(30));
    }

    private IssuedToken createToken(User user, String familyId, String clientIp) {
        byte[] randomBytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        String tokenHash = HashUtils.sha256Hex(rawToken);

        OffsetDateTime now = OffsetDateTime.now();
        RefreshToken entity = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .familyId(familyId)
                .expiresAt(now.plus(Duration.ofMillis(refreshTokenExpirationMs)))
                .createdIp(clientIp)
                .build();
        refreshTokenRepository.save(entity);

        return new IssuedToken(rawToken, tokenHash);
    }

    private record IssuedToken(String rawToken, String tokenHash) {
    }
}
