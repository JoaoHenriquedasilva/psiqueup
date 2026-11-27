package com.psiqueup.api.dto.auth;

public record AuthResponse(
        String name,
        String email,
        String role
) {
}
