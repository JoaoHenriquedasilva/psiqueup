package com.psiqueup.api.dto.link;

import com.psiqueup.api.domain.entity.PatientPsychologistLink;
import com.psiqueup.api.domain.enums.LinkStatus;
import com.psiqueup.api.dto.profile.TherapeuticApproachResponse;

import java.time.OffsetDateTime;

public record LinkResponse(
        Long id,
        Long psychologistId,
        String psychologistName,
        String psychologistCrp,
        TherapeuticApproachResponse approach,
        Long patientId,
        String patientName,
        String patientEmail,
        LinkStatus status,
        String rejectionReason,
        OffsetDateTime createdAt
) {
    public static LinkResponse fromEntity(PatientPsychologistLink link) {
        return new LinkResponse(
                link.getId(),
                link.getPsychologist().getUserId(),
                link.getPsychologist().getUser().getName(),
                link.getPsychologist().getCrp(),
                TherapeuticApproachResponse.fromEntity(link.getPsychologist().getApproach()),
                link.getPatient().getUserId(),
                link.getPatient().getUser().getName(),
                link.getPatient().getUser().getEmail(),
                link.getStatus(),
                link.getRejectionReason(),
                link.getCreatedAt()
        );
    }
}