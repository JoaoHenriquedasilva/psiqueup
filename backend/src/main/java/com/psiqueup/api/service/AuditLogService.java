package com.psiqueup.api.service;

import com.psiqueup.api.domain.entity.AuditLog;
import com.psiqueup.api.repository.AuditLogRepository;
import com.psiqueup.api.util.RequestIpUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private static final int MAX_DETAILS_LENGTH = 500;

    private final AuditLogRepository auditLogRepository;

    public void record(
            Long actorUserId,
            String actorEmail,
            String action,
            String targetType,
            String targetId,
            Long clinicId,
            String details
    ) {
        String safeDetails = details;
        if (safeDetails != null && safeDetails.length() > MAX_DETAILS_LENGTH) {
            safeDetails = safeDetails.substring(0, MAX_DETAILS_LENGTH);
        }

        AuditLog entry = AuditLog.builder()
                .actorUserId(actorUserId)
                .actorEmail(actorEmail)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .clinicId(clinicId)
                .ipAddress(RequestIpUtils.resolveCurrentClientIp())
                .details(safeDetails)
                .build();

        auditLogRepository.save(entry);
    }
}
