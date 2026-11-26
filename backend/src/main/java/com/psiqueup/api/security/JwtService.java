package com.psiqueup.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32;
    private static final String TOKEN_VERSION_CLAIM = "tv";

    @Value("${api.security.token.secret}")
    private String secretKey;

    @Value("${api.security.token.expiration}")
    private long jwtExpiration;

    @PostConstruct
    void validateSecretKey() {
        if (secretKey == null || secretKey.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT secret must be configured with at least 32 bytes (256 bits).");
        }
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        Map<String, Object> claims = extraClaims != null ? new HashMap<>(extraClaims) : new HashMap<>();
        claims.put(TOKEN_VERSION_CLAIM, resolveUserTokenVersion(userDetails));

        return Jwts.builder()
                .claims(claims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSignInKey(), Jwts.SIG.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        return isTokenValid(extractAllClaims(token), userDetails);
    }

    public boolean isTokenValid(Claims claims, UserDetails userDetails) {
        if (claims == null || userDetails == null || !userDetails.isEnabled()) {
            return false;
        }
        Integer tokenVersion = claims.get(TOKEN_VERSION_CLAIM, Integer.class);
        Integer expectedVersion = resolveUserTokenVersion(userDetails);
        if (tokenVersion == null || !Objects.equals(tokenVersion, expectedVersion)) {
            return false;
        }
        Date expiration = claims.getExpiration();
        return Objects.equals(claims.getSubject(), userDetails.getUsername())
                && expiration != null
                && !expiration.before(new Date());
    }

    private Integer resolveUserTokenVersion(UserDetails userDetails) {
        if (userDetails instanceof UserPrincipal principal && principal.getUser().getTokenVersion() != null) {
            return principal.getUser().getTokenVersion();
        }
        return 0;
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}