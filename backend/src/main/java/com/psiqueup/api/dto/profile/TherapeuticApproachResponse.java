package com.psiqueup.api.dto.profile;

import com.psiqueup.api.domain.entity.TherapeuticApproach;

public record TherapeuticApproachResponse(
        Long id,
        String name,
        String patientFriendlyDescription
) {
    public static TherapeuticApproachResponse fromEntity(TherapeuticApproach approach) {
        return new TherapeuticApproachResponse(
                approach.getId(),
                approach.getName(),
                approach.getPatientFriendlyDescription()
        );
    }
}