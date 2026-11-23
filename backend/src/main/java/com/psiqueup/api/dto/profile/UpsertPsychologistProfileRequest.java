package com.psiqueup.api.dto.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpsertPsychologistProfileRequest(
        @NotBlank(message = "O número de registo CRP é obrigatório")
        @Size(max = 20, message = "O CRP deve ter no máximo 20 caracteres")
        @Pattern(
                regexp = "^\\s*(0[1-9]|1[0-9]|2[0-4])/\\d{4,6}\\s*$",
                message = "Informe um CRP brasileiro válido no formato XX/NNNNN (ex.: 06/12345)"
        )
        String crp,

        @NotNull(message = "A abordagem terapêutica é obrigatória")
        Long approachId,

        @Size(max = 500, message = "A apresentação deve ter no máximo 500 caracteres")
        String bio
) {}