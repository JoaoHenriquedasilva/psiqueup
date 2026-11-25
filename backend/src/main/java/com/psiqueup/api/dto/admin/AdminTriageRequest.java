package com.psiqueup.api.dto.admin;

import com.psiqueup.api.validation.Cpf;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AdminTriageRequest(
        @NotNull(message = "O ID do psicólogo é obrigatório")
        Long psychologistId,

        @NotBlank(message = "O CPF do paciente é obrigatório")
        @Cpf
        String cpf
) {
}
