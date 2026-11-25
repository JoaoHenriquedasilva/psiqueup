package com.psiqueup.api.dto.profile;

import com.psiqueup.api.validation.Cpf;
import jakarta.validation.constraints.NotBlank;

public record UpdatePatientCpfRequest(
        @NotBlank(message = "O CPF é obrigatório")
        @Cpf
        String cpf
) {
}
