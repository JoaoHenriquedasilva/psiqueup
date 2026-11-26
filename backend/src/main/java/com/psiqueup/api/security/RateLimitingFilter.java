package com.psiqueup.api.security;

import com.psiqueup.api.dto.error.ErrorResponse;
import com.psiqueup.api.util.RequestIpUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@RequiredArgsConstructor
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final int MAX_COUNTERS = 10_000;
    private static final int CLEANUP_INTERVAL_REQUESTS = 256;

    private final ObjectMapper objectMapper;

    @Value("${app.security.rate-limit.enabled:true}")
    private boolean enabled;

    @Value("${app.security.rate-limit.max-requests:30}")
    private int maxRequests;

    @Value("${app.security.rate-limit.window-seconds:60}")
    private long windowSeconds;

    private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();
    private final AtomicInteger requestCounter = new AtomicInteger(0);

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String bucketGroup = resolveBucketGroup(request);
        if (bucketGroup == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = buildRateLimitKey(bucketGroup, request);
        long nowSeconds = Instant.now().getEpochSecond();
        long window = Math.max(1L, windowSeconds);
        int limit = Math.max(1, maxRequests);

        evictExpiredIfNeeded(nowSeconds, window, key);

        WindowCounter counter = counters.computeIfAbsent(key, k -> new WindowCounter(nowSeconds));
        long retryAfter = counter.tryConsume(nowSeconds, window, limit);

        if (retryAfter > 0) {
            ErrorResponse errorResponse = new ErrorResponse(
                    Instant.now(),
                    HttpStatus.TOO_MANY_REQUESTS.value(),
                    HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase(),
                    "Muitas requisições. Tente novamente em instantes.",
                    request.getRequestURI()
            );
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(retryAfter));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void evictExpiredIfNeeded(long nowSeconds, long window, String incomingKey) {
        int count = requestCounter.incrementAndGet();
        boolean overLimit = counters.size() >= MAX_COUNTERS && !counters.containsKey(incomingKey);
        if (count % CLEANUP_INTERVAL_REQUESTS != 0 && !overLimit) {
            return;
        }
        counters.entrySet().removeIf(entry -> entry.getValue().isExpired(nowSeconds, window));

        if (counters.size() >= MAX_COUNTERS && !counters.containsKey(incomingKey)) {
            Iterator<String> iterator = counters.keySet().iterator();
            while (counters.size() >= MAX_COUNTERS && iterator.hasNext()) {
                iterator.next();
                iterator.remove();
            }
        }
    }

    private String resolveBucketGroup(HttpServletRequest request) {
        String path = stripMatrixParameters(request.getRequestURI());
        String method = request.getMethod();
        if (path != null && path.startsWith("/api/auth/")) {
            return "auth";
        }
        if ("POST".equalsIgnoreCase(method) && "/api/links".equals(path)) {
            return "links";
        }
        if ("POST".equalsIgnoreCase(method) && "/api/admin/triage".equals(path)) {
            return "triage";
        }
        return null;
    }

    public static String stripMatrixParameters(String rawPath) {
        if (rawPath == null || rawPath.indexOf(';') < 0) {
            return rawPath;
        }
        StringBuilder sanitized = new StringBuilder(rawPath.length());
        boolean skippingMatrix = false;
        for (int i = 0; i < rawPath.length(); i++) {
            char c = rawPath.charAt(i);
            if (c == '/') {
                skippingMatrix = false;
                sanitized.append(c);
            } else if (c == ';') {
                skippingMatrix = true;
            } else if (!skippingMatrix) {
                sanitized.append(c);
            }
        }
        return sanitized.toString();
    }

    private String buildRateLimitKey(String bucketGroup, HttpServletRequest request) {
        String ip = RequestIpUtils.resolveClientIp(request);
        if (ip == null || ip.isBlank()) {
            ip = "unknown";
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getName() != null
                && !"anonymousUser".equals(authentication.getName())) {
            return bucketGroup + ":" + ip + ":" + authentication.getName();
        }
        return bucketGroup + ":" + ip;
    }

    private static final class WindowCounter {
        private long windowStartEpochSecond;
        private int count;

        private WindowCounter(long windowStartEpochSecond) {
            this.windowStartEpochSecond = windowStartEpochSecond;
            this.count = 0;
        }

        private synchronized boolean isExpired(long nowSeconds, long windowSeconds) {
            return nowSeconds - windowStartEpochSecond >= windowSeconds;
        }

        private synchronized long tryConsume(long nowSeconds, long windowSeconds, int limit) {
            if (nowSeconds - windowStartEpochSecond >= windowSeconds) {
                windowStartEpochSecond = nowSeconds;
                count = 1;
                return 0L;
            }
            if (count < limit) {
                count++;
                return 0L;
            }
            long remaining = windowSeconds - (nowSeconds - windowStartEpochSecond);
            return Math.max(1L, remaining);
        }
    }
}
