package com.psiqueup.api.dto.session;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;

public record CreateSessionRequest(
        @NotNull(message = "O ID do paciente é obrigatório")
        Long patientId,

        @NotNull(message = "A data e hora de início são obrigatórias")
        @Future(message = "A sessão deve ser agendada para uma data futura")
        OffsetDateTime startTime,

        @NotNull(message = "A data e hora de término são obrigatórias")
        @Future(message = "O término da sessão deve ser uma data futura")
        OffsetDateTime endTime
) {}