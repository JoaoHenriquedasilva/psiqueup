package com.psiqueup.api.config;

import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.util.EmailNormalizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Provisiona uma conta ADMIN inicial de forma idempotente quando
 * ADMIN_SEED_EMAIL e ADMIN_SEED_PASSWORD estão configuradas no ambiente.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrapRunner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.seed.name:Administrador PsiqueUp}")
    private String adminName;

    @Value("${app.admin.seed.email:}")
    private String adminEmail;

    @Value("${app.admin.seed.password:}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            return;
        }

        String normalizedEmail = EmailNormalizer.normalize(adminEmail);
        if (userRepository.existsByEmail(normalizedEmail)) {
            return;
        }

        String resolvedName = (adminName != null && !adminName.isBlank())
                ? adminName.trim()
                : "Administrador PsiqueUp";

        User admin = User.builder()
                .name(resolvedName)
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .role(UserRole.ADMIN)
                .active(true)
                .build();

        userRepository.save(admin);
        log.info("Initial ADMIN account provisioned for {}", normalizedEmail);
    }
}
