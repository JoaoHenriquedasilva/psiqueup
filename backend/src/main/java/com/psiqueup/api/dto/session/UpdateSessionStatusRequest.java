package com.psiqueup.api.dto.session;

import com.psiqueup.api.domain.enums.SessionStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateSessionStatusRequest(
        @NotNull(message = "O novo status da sessão é obrigatório")
        SessionStatus status,

        Boolean confirmEarlyCompletion
) {
    public UpdateSessionStatusRequest(SessionStatus status) {
        this(status, null);
    }
}