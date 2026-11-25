package com.psiqueup.api.repository;

import com.psiqueup.api.domain.entity.PatientProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PatientProfileRepository extends JpaRepository<PatientProfile, Long> {
    Optional<PatientProfile> findByUserEmail(String email);
    Optional<PatientProfile> findByCpfHash(String cpfHash);
    boolean existsByCpfHash(String cpfHash);
}