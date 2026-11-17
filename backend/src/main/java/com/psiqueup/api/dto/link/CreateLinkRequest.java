package com.psiqueup.api.dto.link;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateLinkRequest(
        @NotBlank(message = "O e-mail do paciente é obrigatório")
        @Email(message = "Formato de e-mail inválido")
        String patientEmail
) {}