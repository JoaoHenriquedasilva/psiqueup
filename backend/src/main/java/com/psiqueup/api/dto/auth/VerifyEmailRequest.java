package com.psiqueup.api.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record VerifyEmailRequest(
        @NotBlank(message = "O token de verificação é obrigatório")
        String token
) {
}
