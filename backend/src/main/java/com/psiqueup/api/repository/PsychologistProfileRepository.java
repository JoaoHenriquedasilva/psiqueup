package com.psiqueup.api.repository;

import com.psiqueup.api.domain.entity.PsychologistProfile;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PsychologistProfileRepository extends JpaRepository<PsychologistProfile, Long> {
    boolean existsByCrp(String crp);

    @Override
    @EntityGraph(attributePaths = {"user", "approach"})
    List<PsychologistProfile> findAll();

    @Override
    @EntityGraph(attributePaths = {"user", "approach"})
    Optional<PsychologistProfile> findById(Long id);

    @EntityGraph(attributePaths = {"user", "approach"})
    Optional<PsychologistProfile> findByUserEmail(String email);
}