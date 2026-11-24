package com.psiqueup.api.repository;

import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByRole(UserRole role);
    long countByRoleAndActive(UserRole role, boolean active);
    List<User> findAllByRoleOrderByNameAsc(UserRole role);
}