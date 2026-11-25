package com.psiqueup.api.service;

import com.psiqueup.api.domain.entity.Clinic;
import com.psiqueup.api.domain.entity.PatientProfile;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.dto.auth.AuthResponse;
import com.psiqueup.api.dto.auth.LoginRequest;
import com.psiqueup.api.dto.auth.RegisterClinicRequest;
import com.psiqueup.api.dto.auth.RegisterRequest;
import com.psiqueup.api.repository.ClinicRepository;
import com.psiqueup.api.repository.PatientProfileRepository;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.security.CpfCryptoService;
import com.psiqueup.api.security.JwtService;
import com.psiqueup.api.security.UserPrincipal;
import com.psiqueup.api.util.CnpjUtils;
import com.psiqueup.api.util.CpfUtils;
import com.psiqueup.api.util.EmailNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final ClinicRepository clinicRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final CpfCryptoService cpfCryptoService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = EmailNormalizer.normalize(request.email());
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este e-mail já está cadastrado.");
        }

        UserRole resolvedRole = request.role().toUserRole();
        if (resolvedRole == UserRole.ADMIN) {
            throw new AccessDeniedException("Cadastro público não permitido para perfil administrativo.");
        }

        String trimmedName = request.name().trim();
        if (trimmedName.length() < 3) {
            throw new IllegalArgumentException("O nome deve ter entre 3 e 120 caracteres.");
        }

        String cpfHash = null;
        String cpfMasked = null;
        if (resolvedRole == UserRole.PATIENT) {
            if (request.cpf() == null || request.cpf().isBlank()) {
                throw new IllegalArgumentException("O CPF é obrigatório para o cadastro de pacientes.");
            }
            String normalizedCpf = CpfUtils.normalizeAndValidate(request.cpf());
            cpfHash = cpfCryptoService.hashCpf(normalizedCpf);
            cpfMasked = CpfUtils.mask(normalizedCpf);
            if (patientProfileRepository.existsByCpfHash(cpfHash)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Este CPF já está cadastrado.");
            }
        }

        User user = User.builder()
                .name(trimmedName)
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(resolvedRole)
                .active(true)
                .build();

        User savedUser = userRepository.save(user);

        if (resolvedRole == UserRole.PATIENT) {
            patientProfileRepository.save(PatientProfile.builder()
                    .user(savedUser)
                    .cpfHash(cpfHash)
                    .cpfMasked(cpfMasked)
                    .build());
        }

        String token = jwtService.generateToken(new UserPrincipal(savedUser));

        return new AuthResponse(
                token,
                savedUser.getName(),
                savedUser.getEmail(),
                savedUser.getRole().name()
        );
    }

    @Transactional
    public AuthResponse registerClinic(RegisterClinicRequest request) {
        String normalizedEmail = EmailNormalizer.normalize(request.adminEmail());
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este e-mail já está cadastrado.");
        }

        String sanitizedCnpj = CnpjUtils.normalizeAndValidate(request.cnpj());
        if (clinicRepository.existsByCnpj(sanitizedCnpj)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este CNPJ já está cadastrado.");
        }

        String trimmedClinicName = request.clinicName().trim();
        if (trimmedClinicName.length() < 3) {
            throw new IllegalArgumentException("O nome do consultório deve ter entre 3 e 150 caracteres.");
        }

        String trimmedAdminName = request.adminName().trim();
        if (trimmedAdminName.length() < 3) {
            throw new IllegalArgumentException("O nome do administrador deve ter entre 3 e 120 caracteres.");
        }

        User adminUser = User.builder()
                .name(trimmedAdminName)
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(UserRole.ADMIN)
                .active(true)
                .build();

        User savedAdmin = userRepository.save(adminUser);

        Clinic clinic = Clinic.builder()
                .name(trimmedClinicName)
                .cnpj(sanitizedCnpj)
                .ownerUser(savedAdmin)
                .active(true)
                .build();
        clinicRepository.save(clinic);

        String token = jwtService.generateToken(new UserPrincipal(savedAdmin));

        return new AuthResponse(
                token,
                savedAdmin.getName(),
                savedAdmin.getEmail(),
                savedAdmin.getRole().name()
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = EmailNormalizer.normalize(request.email());
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        normalizedEmail,
                        request.password()
                )
        );

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        User user = principal.getUser();
        String token = jwtService.generateToken(principal);

        return new AuthResponse(
                token,
                user.getName(),
                user.getEmail(),
                user.getRole().name()
        );
    }
}