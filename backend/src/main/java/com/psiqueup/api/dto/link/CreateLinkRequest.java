package com.psiqueup.api.dto.link;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateLinkRequest(
        @NotBlank(message = "O e-mail do paciente é obrigatório")
        @Email(message = "Formato de e-mail inválido")
        @Size(max = 150, message = "O e-mail deve ter no máximo 150 caracteres")
        String patientEmail
) {}