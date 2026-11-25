package com.psiqueup.api.dto.clinic;

import com.psiqueup.api.validation.Cnpj;
import jakarta.validation.constraints.NotBlank;

public record JoinClinicRequest(
        @NotBlank(message = "O CNPJ do consultório é obrigatório")
        @Cnpj
        String cnpj
) {
}
