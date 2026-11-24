package com.psiqueup.api.dto.admin;

import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(
        @NotNull(message = "O status ativo é obrigatório")
        Boolean active
) {}
