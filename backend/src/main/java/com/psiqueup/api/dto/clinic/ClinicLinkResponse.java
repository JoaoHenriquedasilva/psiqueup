package com.psiqueup.api.dto.clinic;

import com.psiqueup.api.domain.entity.ClinicPsychologist;
import com.psiqueup.api.domain.enums.ClinicPsychologistStatus;

import java.time.OffsetDateTime;

public record ClinicLinkResponse(
        Long id,
        Long clinicId,
        String clinicName,
        String clinicCnpj,
        Long psychologistId,
        String psychologistName,
        String psychologistEmail,
        String psychologistCrp,
        String approachName,
        ClinicPsychologistStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static ClinicLinkResponse fromEntity(ClinicPsychologist entity) {
        return new ClinicLinkResponse(
                entity.getId(),
                entity.getClinic().getId(),
                entity.getClinic().getName(),
                entity.getClinic().getCnpj(),
                entity.getPsychologist().getUserId(),
                entity.getPsychologist().getUser().getName(),
                entity.getPsychologist().getUser().getEmail(),
                entity.getPsychologist().getCrp(),
                entity.getPsychologist().getApproach() != null
                        ? entity.getPsychologist().getApproach().getName()
                        : null,
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
