package com.psiqueup.api.dto.user;

import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.UserRole;

import java.time.OffsetDateTime;

public record UserProfileResponse(
        Long id,
        String name,
        String email,
        UserRole role,
        Boolean active,
        OffsetDateTime createdAt
) {
    public static UserProfileResponse fromEntity(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getActive(),
                user.getCreatedAt()
        );
    }
}