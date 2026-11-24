package com.psiqueup.api.dto.admin;

import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.UserRole;

public record AdminUserStatusResponse(
        Long userId,
        String name,
        String email,
        UserRole role,
        boolean active
) {
    public static AdminUserStatusResponse fromEntity(User user) {
        return new AdminUserStatusResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                Boolean.TRUE.equals(user.getActive())
        );
    }
}
