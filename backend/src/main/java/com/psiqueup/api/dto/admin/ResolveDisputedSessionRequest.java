package com.psiqueup.api.dto.admin;

import com.psiqueup.api.domain.enums.SessionStatus;
import jakarta.validation.constraints.NotNull;

public record ResolveDisputedSessionRequest(
        @NotNull(message = "O status de resolução é obrigatório")
        SessionStatus resolutionStatus
) {}
