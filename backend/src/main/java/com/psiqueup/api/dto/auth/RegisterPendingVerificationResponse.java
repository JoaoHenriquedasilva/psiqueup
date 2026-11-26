package com.psiqueup.api.dto.auth;

public record RegisterPendingVerificationResponse(
        String message,
        String email,
        boolean verificationRequired
) {
}
