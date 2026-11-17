package com.psiqueup.api.dto.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpsertPsychologistProfileRequest(
        @NotBlank(message = "O número de registo CRP é obrigatório")
        @Size(max = 20, message = "O CRP deve ter no máximo 20 caracteres")
        String crp,

        @NotNull(message = "A abordagem terapêutica é obrigatória")
        Long approachId,

        @Size(max = 500, message = "A apresentação deve ter no máximo 500 caracteres")
        String bio
) {}