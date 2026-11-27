package com.psiqueup.api.security;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class AuthCookieService {

    public static final String ACCESS_TOKEN_COOKIE = "psiqueup_access_token";
    public static final String REFRESH_TOKEN_COOKIE = "psiqueup_refresh_token";
    public static final String ACCESS_COOKIE_PATH = "/api";
    public static final String REFRESH_COOKIE_PATH = "/api/auth";

    @Value("${api.security.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${api.security.cookie.same-site:Lax}")
    private String cookieSameSite;

    @Value("${api.security.token.expiration:900000}")
    private long accessTokenExpirationMs;

    @Value("${api.security.refresh-token.expiration:604800000}")
    private long refreshTokenExpirationMs;

    @PostConstruct
    public void validateCookieConfiguration() {
        if (cookieSameSite != null && "None".equalsIgnoreCase(cookieSameSite.trim()) && !cookieSecure) {
            throw new IllegalStateException(
                    "Configuração inválida de cookies: SameSite=None exige api.security.cookie.secure=true."
            );
        }
    }

    public void addAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        ResponseCookie accessCookie = buildCookie(
                ACCESS_TOKEN_COOKIE,
                accessToken,
                ACCESS_COOKIE_PATH,
                Duration.ofMillis(accessTokenExpirationMs)
        );
        ResponseCookie refreshCookie = buildCookie(
                REFRESH_TOKEN_COOKIE,
                refreshToken,
                REFRESH_COOKIE_PATH,
                Duration.ofMillis(refreshTokenExpirationMs)
        );

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }

    public void clearAuthCookies(HttpServletResponse response) {
        ResponseCookie clearAccess = buildCookie(ACCESS_TOKEN_COOKIE, "", ACCESS_COOKIE_PATH, Duration.ZERO);
        ResponseCookie clearRefresh = buildCookie(REFRESH_TOKEN_COOKIE, "", REFRESH_COOKIE_PATH, Duration.ZERO);

        response.addHeader(HttpHeaders.SET_COOKIE, clearAccess.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, clearRefresh.toString());
    }

    public String extractCookieValue(HttpServletRequest request, String cookieName) {
        if (request == null || request.getCookies() == null || cookieName == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private ResponseCookie buildCookie(String name, String value, String path, Duration maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path(path)
                .maxAge(maxAge)
                .build();
    }
}
