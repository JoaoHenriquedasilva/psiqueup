package com.psiqueup.api.dto.profile;

import com.psiqueup.api.domain.entity.PsychologistProfile;

public record PsychologistProfileResponse(
        Long userId,
        String name,
        String email,
        String crp,
        TherapeuticApproachResponse approach,
        String bio
) {
    public static PsychologistProfileResponse fromEntity(PsychologistProfile profile) {
        return new PsychologistProfileResponse(
                profile.getUserId(),
                profile.getUser().getName(),
                profile.getUser().getEmail(),
                profile.getCrp(),
                TherapeuticApproachResponse.fromEntity(profile.getApproach()),
                profile.getBio()
        );
    }
}