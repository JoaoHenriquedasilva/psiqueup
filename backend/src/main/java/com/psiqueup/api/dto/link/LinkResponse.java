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
        String patientCpfMasked,
        LinkStatus status,
        String rejectionReason,
        OffsetDateTime createdAt
) {
    public static LinkResponse fromEntity(PatientPsychologistLink link) {
        return build(link, false);
    }

    public static LinkResponse fromEntityForStaff(PatientPsychologistLink link) {
        boolean hidePatientPii = link.getStatus() != LinkStatus.ACTIVE;
        return build(link, hidePatientPii);
    }

    private static LinkResponse build(PatientPsychologistLink link, boolean hidePatientPii) {
        return new LinkResponse(
                link.getId(),
                link.getPsychologist().getUserId(),
                link.getPsychologist().getUser().getName(),
                link.getPsychologist().getCrp(),
                TherapeuticApproachResponse.fromEntity(link.getPsychologist().getApproach()),
                hidePatientPii ? null : link.getPatient().getUserId(),
                hidePatientPii ? null : link.getPatient().getUser().getName(),
                hidePatientPii ? null : link.getPatient().getUser().getEmail(),
                link.getPatient().getCpfMasked(),
                link.getStatus(),
                link.getRejectionReason(),
                link.getCreatedAt()
        );
    }
}