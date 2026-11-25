package com.psiqueup.api.repository;

import com.psiqueup.api.domain.entity.ClinicPsychologist;
import com.psiqueup.api.domain.enums.ClinicPsychologistStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ClinicPsychologistRepository extends JpaRepository<ClinicPsychologist, Long> {

    @Override
    @EntityGraph(attributePaths = {"clinic", "psychologist", "psychologist.user", "psychologist.approach"})
    Optional<ClinicPsychologist> findById(Long id);

    @EntityGraph(attributePaths = {"clinic", "psychologist", "psychologist.user", "psychologist.approach"})
    Optional<ClinicPsychologist> findByClinicIdAndPsychologistUserId(Long clinicId, Long psychologistId);

    @EntityGraph(attributePaths = {"clinic", "psychologist", "psychologist.user", "psychologist.approach"})
    List<ClinicPsychologist> findAllByClinicIdOrderByCreatedAtDesc(Long clinicId);

    @EntityGraph(attributePaths = {"clinic", "psychologist", "psychologist.user", "psychologist.approach"})
    List<ClinicPsychologist> findAllByClinicIdAndStatusOrderByCreatedAtDesc(Long clinicId, ClinicPsychologistStatus status);

    @EntityGraph(attributePaths = {"clinic", "psychologist", "psychologist.user", "psychologist.approach"})
    List<ClinicPsychologist> findAllByClinicIdAndStatusOrderByPsychologistUserNameAsc(Long clinicId, ClinicPsychologistStatus status);

    @EntityGraph(attributePaths = {"clinic", "psychologist", "psychologist.user", "psychologist.approach"})
    List<ClinicPsychologist> findAllByPsychologistUserIdOrderByCreatedAtDesc(Long psychologistId);

    boolean existsByClinicIdAndPsychologistUserIdAndStatus(Long clinicId, Long psychologistId, ClinicPsychologistStatus status);

    @EntityGraph(attributePaths = {"clinic", "psychologist", "psychologist.user", "psychologist.approach"})
    Optional<ClinicPsychologist> findFirstByPsychologistUserIdAndStatus(Long psychologistId, ClinicPsychologistStatus status);

    boolean existsByPsychologistUserIdAndStatusIn(Long psychologistId, Collection<ClinicPsychologistStatus> statuses);

    boolean existsByPsychologistUserIdAndStatusAndClinicIdNot(
            Long psychologistId,
            ClinicPsychologistStatus status,
            Long clinicId
    );
}
