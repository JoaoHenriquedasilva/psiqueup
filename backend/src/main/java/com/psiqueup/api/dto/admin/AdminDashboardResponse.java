package com.psiqueup.api.dto.admin;

public record AdminDashboardResponse(
        long activePsychologists,
        long inactivePsychologists,
        long totalPatients,
        long activeLinks,
        double averagePatientsPerPsychologist,
        long scheduledSessions,
        long completedSessions,
        long noShowSessions,
        long canceledSessions,
        long disputedSessions
) {}
