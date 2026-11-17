package com.psiqueup.api.repository;

import com.psiqueup.api.domain.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SessionRepository extends JpaRepository<Session, Long> {
    List<Session> findAllByPsychologistUserIdOrderByStartTimeAsc(Long psychologistId);
    List<Session> findAllByPatientUserIdOrderByStartTimeAsc(Long patientId);
}