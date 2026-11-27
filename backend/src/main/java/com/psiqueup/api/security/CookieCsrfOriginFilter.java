package com.psiqueup.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Proteção CSRF complementar para autenticação via cookies HttpOnly (fail-closed):
 * em requisições state-changing com cookies de autenticação, exige cabeçalho Origin ou Referer
 * pertencente às origens explicitamente permitidas em CORS.
 */
@Component
public class CookieCsrfOriginFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final List<String> allowedOrigins;
    private final HandlerExceptionResolver exceptionResolver;

    public CookieCsrfOriginFilter(
            @Value("${api.security.cors.allowed-origins:http://localhost:5173,http://localhost:3000}") List<String> allowedOrigins,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver
    ) {
        this.allowedOrigins = allowedOrigins.stream()
                .map(CookieCsrfOriginFilter::normalizeOrigin)
                .filter(origin -> !origin.isEmpty())
                .toList();
        this.exceptionResolver = exceptionResolver;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String method = request.getMethod();
        if (method == null || SAFE_METHODS.contains(method.toUpperCase(Locale.ROOT))) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!hasAuthCookie(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String originHeader = request.getHeader("Origin");
        if (originHeader != null && !originHeader.isBlank()) {
            if (!isAllowedOrigin(originHeader)) {
                rejectForbidden(request, response, "Origem não permitida para esta requisição.");
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }

        String refererHeader = request.getHeader("Referer");
        if (refererHeader != null && !refererHeader.isBlank()) {
            String refererOrigin = extractOriginFromReferer(refererHeader);
            if (refererOrigin == null || !isAllowedOrigin(refererOrigin)) {
                rejectForbidden(request, response, "Referer não permitido para esta requisição.");
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }

        rejectForbidden(request, response, "Cabeçalho Origin ou Referer obrigatório para esta requisição.");
    }

    private boolean hasAuthCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return false;
        }
        for (Cookie cookie : cookies) {
            String name = cookie.getName();
            if (AuthCookieService.ACCESS_TOKEN_COOKIE.equals(name)
                    || AuthCookieService.REFRESH_TOKEN_COOKIE.equals(name)) {
                return true;
            }
        }
        return false;
    }

    private boolean isAllowedOrigin(String origin) {
        String normalized = normalizeOrigin(origin);
        return !normalized.isEmpty() && allowedOrigins.contains(normalized);
    }

    private void rejectForbidden(HttpServletRequest request, HttpServletResponse response, String message) {
        exceptionResolver.resolveException(request, response, null, new AccessDeniedException(message));
    }

    private static String extractOriginFromReferer(String referer) {
        try {
            URI uri = URI.create(referer.trim());
            if (uri.getScheme() == null || uri.getHost() == null) {
                return null;
            }
            int port = uri.getPort();
            return port > 0
                    ? uri.getScheme() + "://" + uri.getHost() + ":" + port
                    : uri.getScheme() + "://" + uri.getHost();
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static String normalizeOrigin(String origin) {
        if (origin == null) {
            return "";
        }
        String trimmed = origin.trim().toLowerCase(Locale.ROOT);
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
