package com.psiqueup.api.dto.link;

import com.psiqueup.api.validation.Cpf;
import jakarta.validation.constraints.NotBlank;

public record CreateLinkRequest(
        @NotBlank(message = "O CPF do paciente é obrigatório")
        @Cpf
        String cpf
) {}