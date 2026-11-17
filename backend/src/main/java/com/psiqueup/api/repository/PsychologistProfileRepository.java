package com.psiqueup.api.repository;

import com.psiqueup.api.domain.entity.PsychologistProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PsychologistProfileRepository extends JpaRepository<PsychologistProfile, Long> {
    boolean existsByCrp(String crp);
    Optional<PsychologistProfile> findByUserEmail(String email);
}