package com.psiqueup.api.repository;

import com.psiqueup.api.domain.entity.PatientPsychologistLink;
import com.psiqueup.api.domain.enums.LinkStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PatientPsychologistLinkRepository extends JpaRepository<PatientPsychologistLink, Long> {

    @Override
    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "psychologist.approach", "patient", "patient.user"})
    Optional<PatientPsychologistLink> findById(Long id);

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "psychologist.approach", "patient", "patient.user"})
    Optional<PatientPsychologistLink> findByPsychologistUserIdAndPatientUserId(Long psychologistId, Long patientId);

    boolean existsByPsychologistUserIdAndPatientUserIdAndStatus(Long psychologistId, Long patientId, LinkStatus status);

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "psychologist.approach", "patient", "patient.user"})
    List<PatientPsychologistLink> findAllByPatientUserId(Long patientId);

    @EntityGraph(attributePaths = {"psychologist", "psychologist.user", "psychologist.approach", "patient", "patient.user"})
    List<PatientPsychologistLink> findAllByPsychologistUserId(Long psychologistId);
}