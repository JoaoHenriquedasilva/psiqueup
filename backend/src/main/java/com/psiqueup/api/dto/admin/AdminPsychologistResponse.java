package com.psiqueup.api.dto.admin;

public record AdminPsychologistResponse(
        Long userId,
        String name,
        String email,
        boolean active,
        String crp,
        String approachName,
        String bio,
        long activePatientsCount,
        long totalSessionsCount,
        long disputedSessionsCount
) {}
