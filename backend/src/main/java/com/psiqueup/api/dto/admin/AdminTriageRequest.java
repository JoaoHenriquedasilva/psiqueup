package com.psiqueup.api.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminTriageRequest(
        @NotNull(message = "O ID do psicólogo é obrigatório")
        Long psychologistId,

        @NotBlank(message = "O e-mail do paciente é obrigatório")
        @Email(message = "Formato de e-mail inválido")
        @Size(max = 150, message = "O e-mail deve ter no máximo 150 caracteres")
        String patientEmail
) {
}
