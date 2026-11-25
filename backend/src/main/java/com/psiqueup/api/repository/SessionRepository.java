package com.psiqueup.api.repository;

import com.psiqueup.api.domain.entity.Session;
import com.psiqueup.api.domain.enums.SessionStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {

    @Override
    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "patient", "patient.user", "clinic"})
    Optional<Session> findById(Long id);

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "patient", "patient.user"})
    List<Session> findAllByPsychologistUserIdOrderByStartTimeAsc(Long psychologistId);

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "patient", "patient.user"})
    List<Session> findAllByPatientUserIdOrderByStartTimeAsc(Long patientId);

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "patient", "patient.user"})
    List<Session> findAllByOrderByStartTimeDesc();

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "patient", "patient.user"})
    List<Session> findAllByStatusOrderByStartTimeDesc(SessionStatus status);

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "patient", "patient.user"})
    List<Session> findAllByPsychologistUserIdInOrderByStartTimeDesc(Collection<Long> psychologistIds);

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "patient", "patient.user"})
    List<Session> findAllByStatusAndPsychologistUserIdInOrderByStartTimeDesc(
            SessionStatus status,
            Collection<Long> psychologistIds
    );

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "patient", "patient.user"})
    List<Session> findAllByClinicIdOrderByStartTimeDesc(Long clinicId);

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "patient", "patient.user"})
    List<Session> findAllByClinicIdAndStatusOrderByStartTimeDesc(Long clinicId, SessionStatus status);

    @Query("""
            SELECT s.status, COUNT(s)
            FROM Session s
            WHERE s.clinic.id = :clinicId
            GROUP BY s.status
            """)
    List<Object[]> countGroupedByStatusAndClinicId(@Param("clinicId") Long clinicId);

    @Query("""
            SELECT s.psychologist.userId,
                   COUNT(s),
                   SUM(CASE WHEN s.status = :disputedStatus THEN 1 ELSE 0 END)
            FROM Session s
            WHERE s.clinic.id = :clinicId
              AND s.psychologist.userId IN :psychologistIds
            GROUP BY s.psychologist.userId
            """)
    List<Object[]> countGroupedByPsychologistAndClinicIdAndIds(
            @Param("disputedStatus") SessionStatus disputedStatus,
            @Param("clinicId") Long clinicId,
            @Param("psychologistIds") Collection<Long> psychologistIds
    );

    long countByStatus(SessionStatus status);

    long countByStatusAndPsychologistUserIdIn(SessionStatus status, Collection<Long> psychologistIds);

    @Query("""
            SELECT s.psychologist.userId,
                   COUNT(s),
                   SUM(CASE WHEN s.status = :disputedStatus THEN 1 ELSE 0 END)
            FROM Session s
            GROUP BY s.psychologist.userId
            """)
    List<Object[]> countGroupedByPsychologist(@Param("disputedStatus") SessionStatus disputedStatus);

    @Query("""
            SELECT s.psychologist.userId,
                   COUNT(s),
                   SUM(CASE WHEN s.status = :disputedStatus THEN 1 ELSE 0 END)
            FROM Session s
            WHERE s.psychologist.userId IN :psychologistIds
            GROUP BY s.psychologist.userId
            """)
    List<Object[]> countGroupedByPsychologistAndIds(
            @Param("disputedStatus") SessionStatus disputedStatus,
            @Param("psychologistIds") Collection<Long> psychologistIds
    );

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