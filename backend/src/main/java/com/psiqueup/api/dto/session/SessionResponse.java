package com.psiqueup.api.dto.session;

import com.psiqueup.api.domain.entity.Session;
import com.psiqueup.api.domain.enums.SessionStatus;

import java.time.OffsetDateTime;

public record SessionResponse(
        Long id,
        Long psychologistId,
        String psychologistName,
        Long patientId,
        String patientName,
        OffsetDateTime startTime,
        OffsetDateTime endTime,
        SessionStatus status,
        OffsetDateTime createdAt
) {
    public static SessionResponse fromEntity(Session session) {
        return new SessionResponse(
                session.getId(),
                session.getPsychologist().getUserId(),
                session.getPsychologist().getUser().getName(),
                session.getPatient().getUserId(),
                session.getPatient().getUser().getName(),
                session.getStartTime(),
                session.getEndTime(),
                session.getStatus(),
                session.getCreatedAt()
        );
    }
}