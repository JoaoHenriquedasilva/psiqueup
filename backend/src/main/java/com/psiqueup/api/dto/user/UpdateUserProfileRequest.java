package com.psiqueup.api.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserProfileRequest(
        @NotBlank(message = "O nome é obrigatório")
        @Size(min = 2, max = 120, message = "Por favor o nome deve ter entre 2 e 120 caracteres")
        String name
) {}