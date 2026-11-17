package com.psiqueup.api.repository;

import com.psiqueup.api.domain.entity.PatientPsychologistLink;
import com.psiqueup.api.domain.enums.LinkStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PatientPsychologistLinkRepository extends JpaRepository<PatientPsychologistLink, Long> {
    Optional<PatientPsychologistLink> findByPsychologistUserIdAndPatientUserId(Long psychologistId, Long patientId);
    boolean existsByPsychologistUserIdAndPatientUserIdAndStatus(Long psychologistId, Long patientId, LinkStatus status);
    List<PatientPsychologistLink> findAllByPatientUserId(Long patientId);
    List<PatientPsychologistLink> findAllByPsychologistUserId(Long psychologistId);
}