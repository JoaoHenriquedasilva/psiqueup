package com.psiqueup.api.repository;

import com.psiqueup.api.domain.entity.Session;
import com.psiqueup.api.domain.enums.SessionStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {

    @Override
    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "patient", "patient.user"})
    Optional<Session> findById(Long id);

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "patient", "patient.user"})
    List<Session> findAllByPsychologistUserIdOrderByStartTimeAsc(Long psychologistId);

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "patient", "patient.user"})
    List<Session> findAllByPatientUserIdOrderByStartTimeAsc(Long patientId);

    List<Session> findAllByPsychologistUserIdAndPatientUserIdAndStatus(
            Long psychologistId,
            Long patientId,
            SessionStatus status
    );

    @Query("""
            SELECT COUNT(s) > 0
            FROM Session s
            WHERE (s.psychologist.userId = :psychologistId OR s.patient.userId = :patientId)
              AND s.status = :status
              AND s.startTime < :endTime
              AND s.endTime > :startTime
            """)
    boolean existsConflictingSession(
            @Param("psychologistId") Long psychologistId,
            @Param("patientId") Long patientId,
            @Param("status") SessionStatus status,
            @Param("startTime") OffsetDateTime startTime,
            @Param("endTime") OffsetDateTime endTime
    );
}