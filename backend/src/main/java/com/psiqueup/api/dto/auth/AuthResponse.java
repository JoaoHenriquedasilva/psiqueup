package com.psiqueup.api.dto.auth;

public record AuthResponse(
        String token,
        String type,
        String name,
        String email,
        String role
) {
    public AuthResponse(String token, String name, String email, String role) {
        this(token, "Bearer", name, email, role);
    }
}