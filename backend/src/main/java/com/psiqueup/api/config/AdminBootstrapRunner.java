package com.psiqueup.api.config;

import com.psiqueup.api.domain.entity.Clinic;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.repository.ClinicRepository;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.util.CnpjUtils;
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
 * Provisiona uma conta ADMIN inicial e seu consultório de forma idempotente
 * quando ADMIN_SEED_EMAIL e ADMIN_SEED_PASSWORD estão configuradas no ambiente.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrapRunner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final ClinicRepository clinicRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.seed.name:Administrador PsiqueUp}")
    private String adminName;

    @Value("${app.admin.seed.email:}")
    private String adminEmail;

    @Value("${app.admin.seed.password:}")
    private String adminPassword;

    @Value("${app.admin.seed.clinic-name:Consultório PsiqueUp}")
    private String clinicName;

    @Value("${app.admin.seed.clinic-cnpj:11222333000181}")
    private String clinicCnpj;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            return;
        }

        String normalizedEmail = EmailNormalizer.normalize(adminEmail);
        User admin = userRepository.findByEmail(normalizedEmail).orElse(null);

        if (admin == null) {
            String resolvedName = (adminName != null && !adminName.isBlank())
                    ? adminName.trim()
                    : "Administrador PsiqueUp";

            admin = userRepository.save(User.builder()
                    .name(resolvedName)
                    .email(normalizedEmail)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .role(UserRole.ADMIN)
                    .active(true)
                    .emailVerified(true)
                    .build());
            log.info("Initial ADMIN account provisioned for {}", normalizedEmail);
        } else if (admin.getRole() != UserRole.ADMIN) {
            log.warn("Seed email {} already belongs to non-ADMIN role {}; skipping clinic seed.",
                    normalizedEmail, admin.getRole());
            return;
        }

        if (clinicRepository.findByOwnerUserId(admin.getId()).isPresent()) {
            return;
        }

        String sanitizedCnpj = CnpjUtils.normalizeAndValidate(clinicCnpj);
        if (clinicRepository.existsByCnpj(sanitizedCnpj)) {
            log.warn("Seed clinic CNPJ {} already exists for another clinic; skipping clinic seed.", sanitizedCnpj);
            return;
        }

        String resolvedClinicName = (clinicName != null && !clinicName.isBlank())
                ? clinicName.trim()
                : "Consultório PsiqueUp";

        Clinic clinic = Clinic.builder()
                .name(resolvedClinicName)
                .cnpj(sanitizedCnpj)
                .ownerUser(admin)
                .active(true)
                .build();

        clinicRepository.save(clinic);
        log.info("Initial Clinic '{}' provisioned for ADMIN {}", resolvedClinicName, normalizedEmail);
    }
}
