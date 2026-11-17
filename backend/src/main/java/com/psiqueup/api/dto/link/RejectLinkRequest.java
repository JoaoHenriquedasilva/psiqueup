package com.psiqueup.api.dto.link;

import jakarta.validation.constraints.Size;

public record RejectLinkRequest(
        @Size(max = 255, message = "O motivo deve ter no máximo 255 caracteres")
        String reason
) {}