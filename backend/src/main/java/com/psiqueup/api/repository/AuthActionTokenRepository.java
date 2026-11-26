package com.psiqueup.api.repository;

import com.psiqueup.api.domain.entity.AuthActionToken;
import com.psiqueup.api.domain.enums.AuthTokenType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface AuthActionTokenRepository extends JpaRepository<AuthActionToken, Long> {

    Optional<AuthActionToken> findByTokenHashAndTokenType(String tokenHash, AuthTokenType tokenType);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE AuthActionToken t SET t.usedAt = :now WHERE t.user.id = :userId AND t.tokenType = :tokenType AND t.usedAt IS NULL")
    int invalidateActiveTokens(
            @Param("userId") Long userId,
            @Param("tokenType") AuthTokenType tokenType,
            @Param("now") OffsetDateTime now
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE AuthActionToken t SET t.usedAt = :now WHERE t.tokenHash = :hash AND t.tokenType = :type AND t.usedAt IS NULL AND t.expiresAt > :now")
    int consumeTokenIfValid(
            @Param("hash") String hash,
            @Param("type") AuthTokenType type,
            @Param("now") OffsetDateTime now
    );
}
