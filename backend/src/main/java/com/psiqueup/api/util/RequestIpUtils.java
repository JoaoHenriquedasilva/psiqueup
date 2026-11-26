package com.psiqueup.api.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public final class RequestIpUtils {

    private static final int MAX_IP_LENGTH = 64;

    private RequestIpUtils() {
    }

    public static String resolveCurrentClientIp() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            return resolveClientIp(attrs.getRequest());
        }
        return null;
    }

    /**
     * Resolve o IP do cliente utilizando exclusivamente {@code request.getRemoteAddr()}.
     * O processamento de {@code X-Forwarded-For} deve ser delegado ao servlet container
     * via {@code server.forward-headers-strategy=native} e proxies confiáveis.
     */
    public static String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String ip = request.getRemoteAddr();
        if (ip == null || ip.isBlank()) {
            return null;
        }
        String trimmed = ip.trim();
        return trimmed.length() > MAX_IP_LENGTH ? trimmed.substring(0, MAX_IP_LENGTH) : trimmed;
    }
}
