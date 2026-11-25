package com.psiqueup.api.dto.profile;

import com.psiqueup.api.domain.entity.PatientProfile;
import com.psiqueup.api.domain.entity.User;

public record PatientProfileResponse(
        Long userId,
        String name,
        String email,
        String cpfMasked,
        boolean hasCpf
) {
    public static PatientProfileResponse from(User user, PatientProfile profile) {
        String cpfMasked = profile != null ? profile.getCpfMasked() : null;
        boolean hasCpf = profile != null && profile.getCpfHash() != null && !profile.getCpfHash().isBlank();
        return new PatientProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                cpfMasked,
                hasCpf
        );
    }
}
