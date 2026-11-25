package com.psiqueup.api.repository;

import com.psiqueup.api.domain.entity.Clinic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClinicRepository extends JpaRepository<Clinic, Long> {
    Optional<Clinic> findByCnpj(String cnpj);
    boolean existsByCnpj(String cnpj);
    Optional<Clinic> findByOwnerUserId(Long ownerUserId);
}
