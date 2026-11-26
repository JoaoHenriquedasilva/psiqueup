package com.psiqueup.api.repository;

import com.psiqueup.api.domain.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findAllByActionOrderByCreatedAtDesc(String action);
}
