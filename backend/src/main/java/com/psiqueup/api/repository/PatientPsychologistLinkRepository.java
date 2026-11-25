package com.psiqueup.api.repository;

import com.psiqueup.api.domain.entity.PatientPsychologistLink;
import com.psiqueup.api.domain.enums.LinkStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PatientPsychologistLinkRepository extends JpaRepository<PatientPsychologistLink, Long> {

    @Override
    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "psychologist.approach", "patient", "patient.user", "clinic"})
    Optional<PatientPsychologistLink> findById(Long id);

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "psychologist.approach", "patient", "patient.user", "clinic"})
    Optional<PatientPsychologistLink> findByPsychologistUserIdAndPatientUserId(Long psychologistId, Long patientId);

    boolean existsByPsychologistUserIdAndPatientUserIdAndStatus(Long psychologistId, Long patientId, LinkStatus status);

    boolean existsByPatientUserIdAndPsychologistUserIdIn(Long patientId, Collection<Long> psychologistIds);

    boolean existsByPatientUserIdAndClinicIdAndStatus(Long patientId, Long clinicId, LinkStatus status);

    @Query("""
            SELECT COUNT(l) > 0
            FROM PatientPsychologistLink l
            WHERE l.patient.userId = :patientId
              AND l.status = :status
              AND (l.clinic IS NULL OR l.clinic.id <> :clinicId)
            """)
    boolean existsExternalOrAutonomousLink(
            @Param("patientId") Long patientId,
            @Param("clinicId") Long clinicId,
            @Param("status") LinkStatus status
    );

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "psychologist.approach", "patient", "patient.user"})
    List<PatientPsychologistLink> findAllByPatientUserId(Long patientId);

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "psychologist.approach", "patient", "patient.user"})
    List<PatientPsychologistLink> findAllByPsychologistUserId(Long psychologistId);

    long countByStatus(LinkStatus status);

    long countByStatusAndPsychologistUserIdIn(LinkStatus status, Collection<Long> psychologistIds);

    long countByStatusAndClinicId(LinkStatus status, Long clinicId);

    @Query("""
            SELECT COUNT(DISTINCT l.patient.userId)
            FROM PatientPsychologistLink l
            WHERE l.clinic.id = :clinicId
            """)
    long countDistinctPatientsByClinicId(@Param("clinicId") Long clinicId);

    @Query("""
            SELECT l.psychologist.userId, COUNT(l)
            FROM PatientPsychologistLink l
            WHERE l.status = :status
              AND l.clinic.id = :clinicId
              AND l.psychologist.userId IN :psychologistIds
            GROUP BY l.psychologist.userId
            """)
    List<Object[]> countGroupedByPsychologistAndStatusAndClinicIdAndPsychologistIds(
            @Param("status") LinkStatus status,
            @Param("clinicId") Long clinicId,
            @Param("psychologistIds") Collection<Long> psychologistIds
    );

    @Query("""
            SELECT COUNT(DISTINCT l.patient.userId)
            FROM PatientPsychologistLink l
            WHERE l.psychologist.userId IN :psychologistIds
            """)
    long countDistinctPatientsByPsychologistIds(@Param("psychologistIds") Collection<Long> psychologistIds);

    @Query("""
            SELECT l.psychologist.userId, COUNT(l)
            FROM PatientPsychologistLink l
            WHERE l.status = :status
            GROUP BY l.psychologist.userId
            """)
    List<Object[]> countGroupedByPsychologistAndStatus(@Param("status") LinkStatus status);

    @Query("""
            SELECT l.psychologist.userId, COUNT(l)
            FROM PatientPsychologistLink l
            WHERE l.status = :status
              AND l.psychologist.userId IN :psychologistIds
            GROUP BY l.psychologist.userId
            """)
    List<Object[]> countGroupedByPsychologistAndStatusAndPsychologistIds(
            @Param("status") LinkStatus status,
            @Param("psychologistIds") Collection<Long> psychologistIds
    );
}