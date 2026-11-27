package com.psiqueup.api.service;

import com.psiqueup.api.domain.entity.AuthActionToken;
import com.psiqueup.api.domain.entity.Clinic;
import com.psiqueup.api.domain.entity.PatientProfile;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.AuthTokenType;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.dto.auth.AuthResponse;
import com.psiqueup.api.dto.auth.EmailActionRequest;
import com.psiqueup.api.dto.auth.LoginRequest;
import com.psiqueup.api.dto.auth.MessageResponse;
import com.psiqueup.api.dto.auth.RegisterClinicRequest;
import com.psiqueup.api.dto.auth.RegisterPendingVerificationResponse;
import com.psiqueup.api.dto.auth.RegisterRequest;
import com.psiqueup.api.dto.auth.ResetPasswordRequest;
import com.psiqueup.api.dto.auth.VerifyEmailRequest;
import com.psiqueup.api.repository.AuthActionTokenRepository;
import com.psiqueup.api.repository.ClinicRepository;
import com.psiqueup.api.repository.PatientProfileRepository;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.security.CpfCryptoService;
import com.psiqueup.api.security.JwtService;
import com.psiqueup.api.security.UserPrincipal;
import com.psiqueup.api.util.CnpjUtils;
import com.psiqueup.api.util.CpfUtils;
import com.psiqueup.api.util.EmailNormalizer;
import com.psiqueup.api.util.HashUtils;
import com.psiqueup.api.util.RequestIpUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Duration EMAIL_VERIFICATION_TTL = Duration.ofHours(24);
    private static final Duration PASSWORD_RESET_TTL = Duration.ofMinutes(30);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final ClinicRepository clinicRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final AuthActionTokenRepository authActionTokenRepository;
    private final CpfCryptoService cpfCryptoService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final ApplicationEventPublisher eventPublisher;
    private final AuditLogService auditLogService;
    private final RefreshTokenService refreshTokenService;

    public record AuthSession(
            AuthResponse user,
            String accessToken,
            String refreshToken
    ) {
    }

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.legal.terms-version:2026-11}")
    private String currentTermsVersion;

    @Value("${app.legal.privacy-version:2026-11}")
    private String currentPrivacyVersion;

    @Transactional
    public RegisterPendingVerificationResponse register(RegisterRequest request) {
        User user = User.builder()
                .active(true)
                .emailVerified(false)
                .build();
        applyLegalConsent(
                user,
                request.acceptedTerms(),
                request.termsVersion(),
                request.privacyVersion(),
                RequestIpUtils.resolveCurrentClientIp()
        );

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

        user.setName(trimmedName);
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(resolvedRole);

        User savedUser = userRepository.save(user);

        if (resolvedRole == UserRole.PATIENT) {
            patientProfileRepository.save(PatientProfile.builder()
                    .user(savedUser)
                    .cpfHash(cpfHash)
                    .cpfMasked(cpfMasked)
                    .build());
        }

        issueAndSendEmailVerification(savedUser);

        return new RegisterPendingVerificationResponse(
                "Cadastro realizado! Enviamos um link de confirmação para o seu e-mail.",
                savedUser.getEmail(),
                true
        );
    }

    @Transactional
    public RegisterPendingVerificationResponse registerClinic(RegisterClinicRequest request) {
        User adminUser = User.builder()
                .role(UserRole.ADMIN)
                .active(true)
                .emailVerified(false)
                .build();
        applyLegalConsent(
                adminUser,
                request.acceptedTerms(),
                request.termsVersion(),
                request.privacyVersion(),
                RequestIpUtils.resolveCurrentClientIp()
        );

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

        adminUser.setName(trimmedAdminName);
        adminUser.setEmail(normalizedEmail);
        adminUser.setPasswordHash(passwordEncoder.encode(request.password()));

        User savedAdmin = userRepository.save(adminUser);

        Clinic clinic = Clinic.builder()
                .name(trimmedClinicName)
                .cnpj(sanitizedCnpj)
                .ownerUser(savedAdmin)
                .active(true)
                .build();
        clinicRepository.save(clinic);

        issueAndSendEmailVerification(savedAdmin);

        return new RegisterPendingVerificationResponse(
                "Cadastro realizado! Enviamos um link de confirmação para o seu e-mail.",
                savedAdmin.getEmail(),
                true
        );
    }

    @Transactional
    public AuthSession login(LoginRequest request) {
        return login(request, RequestIpUtils.resolveCurrentClientIp());
    }

    @Transactional
    public AuthSession login(LoginRequest request, String clientIp) {
        String normalizedEmail = EmailNormalizer.normalize(request.email());
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        normalizedEmail,
                        request.password()
                )
        );

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        User user = principal.getUser();

        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Confirme seu e-mail antes de acessar a plataforma."
            );
        }

        String accessToken = jwtService.generateToken(principal);
        String refreshToken = refreshTokenService.issueRefreshToken(user, clientIp);

        return new AuthSession(
                new AuthResponse(user.getName(), user.getEmail(), user.getRole().name()),
                accessToken,
                refreshToken
        );
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public AuthSession refresh(String rawRefreshToken, String clientIp) {
        RefreshTokenService.RotationResult rotation = refreshTokenService.rotate(rawRefreshToken, clientIp);
        User user = rotation.user();
        UserPrincipal principal = new UserPrincipal(user);
        String accessToken = jwtService.generateToken(principal);

        return new AuthSession(
                new AuthResponse(user.getName(), user.getEmail(), user.getRole().name()),
                accessToken,
                rotation.refreshToken()
        );
    }

    @Transactional
    public MessageResponse logout(String rawRefreshToken) {
        refreshTokenService.revokeToken(rawRefreshToken);
        return new MessageResponse("Sessão encerrada com sucesso.");
    }

    @Transactional
    public MessageResponse verifyEmail(VerifyEmailRequest request) {
        User user = consumeTokenAndLoadUser(request.token(), AuthTokenType.EMAIL_VERIFICATION);
        user.setEmailVerified(true);
        userRepository.save(user);

        return new MessageResponse("E-mail confirmado com sucesso. Você já pode acessar a plataforma.");
    }

    @Transactional
    public MessageResponse resendVerification(EmailActionRequest request) {
        String normalizedEmail = EmailNormalizer.normalize(request.email());
        userRepository.findByEmail(normalizedEmail).ifPresent(user -> {
            if (Boolean.TRUE.equals(user.getActive()) && !Boolean.TRUE.equals(user.getEmailVerified())) {
                authActionTokenRepository.invalidateActiveTokens(
                        user.getId(),
                        AuthTokenType.EMAIL_VERIFICATION,
                        OffsetDateTime.now()
                );
                issueAndSendEmailVerification(user);
            }
        });

        return new MessageResponse("Se o e-mail estiver cadastrado e pendente de confirmação, enviaremos um novo link.");
    }

    @Transactional
    public MessageResponse forgotPassword(EmailActionRequest request) {
        String normalizedEmail = EmailNormalizer.normalize(request.email());
        userRepository.findByEmail(normalizedEmail).ifPresent(user -> {
            if (Boolean.TRUE.equals(user.getActive())) {
                authActionTokenRepository.invalidateActiveTokens(
                        user.getId(),
                        AuthTokenType.PASSWORD_RESET,
                        OffsetDateTime.now()
                );
                String rawToken = issueToken(user, AuthTokenType.PASSWORD_RESET, PASSWORD_RESET_TTL);
                String resetUrl = buildFrontendLink("/reset-password", rawToken);
                eventPublisher.publishEvent(new EmailNotificationEvent(
                        EmailNotificationEvent.Type.PASSWORD_RESET,
                        user.getEmail(),
                        user.getName(),
                        resetUrl
                ));
            }
        });

        return new MessageResponse("Se o e-mail estiver cadastrado, enviaremos instruções para redefinir sua senha.");
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        User user = consumeTokenAndLoadUser(request.token(), AuthTokenType.PASSWORD_RESET);

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new AccessDeniedException("Conta de usuário inativa.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        int currentVersion = user.getTokenVersion() != null ? user.getTokenVersion() : 0;
        user.setTokenVersion(currentVersion + 1);
        userRepository.save(user);
        refreshTokenService.revokeAllForUser(user.getId());

        auditLogService.record(
                user.getId(),
                user.getEmail(),
                "AUTH_RESET_PASSWORD",
                "USER",
                user.getId().toString(),
                null,
                "Senha redefinida com sucesso via token de recuperação"
        );

        return new MessageResponse("Senha redefinida com sucesso.");
    }

    private void issueAndSendEmailVerification(User user) {
        String rawToken = issueToken(user, AuthTokenType.EMAIL_VERIFICATION, EMAIL_VERIFICATION_TTL);
        String verificationUrl = buildFrontendLink("/verify-email", rawToken);
        eventPublisher.publishEvent(new EmailNotificationEvent(
                EmailNotificationEvent.Type.EMAIL_VERIFICATION,
                user.getEmail(),
                user.getName(),
                verificationUrl
        ));
    }

    private String issueToken(User user, AuthTokenType tokenType, Duration ttl) {
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        OffsetDateTime now = OffsetDateTime.now();
        AuthActionToken entity = AuthActionToken.builder()
                .user(user)
                .tokenHash(HashUtils.sha256Hex(rawToken))
                .tokenType(tokenType)
                .expiresAt(now.plus(ttl))
                .build();
        authActionTokenRepository.save(entity);
        return rawToken;
    }

    private User consumeTokenAndLoadUser(String rawToken, AuthTokenType expectedType) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("Token inválido ou expirado.");
        }
        String hash = HashUtils.sha256Hex(rawToken.trim());
        OffsetDateTime now = OffsetDateTime.now();

        AuthActionToken actionToken = authActionTokenRepository.findByTokenHashAndTokenType(hash, expectedType)
                .orElseThrow(() -> new IllegalArgumentException("Token inválido ou expirado."));
        Long userId = actionToken.getUser().getId();

        int affectedRows = authActionTokenRepository.consumeTokenIfValid(hash, expectedType, now);
        if (affectedRows != 1) {
            throw new IllegalArgumentException("Token inválido ou expirado.");
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Token inválido ou expirado."));
    }

    private String buildFrontendLink(String path, String rawToken) {
        String base = (frontendUrl != null && !frontendUrl.isBlank()) ? frontendUrl.trim() : "http://localhost:5173";
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + path + "?token=" + rawToken;
    }

    private void applyLegalConsent(
            User user,
            Boolean acceptedTerms,
            String requestedTermsVersion,
            String requestedPrivacyVersion,
            String clientIp
    ) {
        if (!Boolean.TRUE.equals(acceptedTerms)) {
            throw new IllegalArgumentException("É obrigatório aceitar os Termos de Uso e a Política de Privacidade.");
        }
        user.setTermsVersion(resolveAndValidateLegalVersion(requestedTermsVersion, currentTermsVersion, "Termos de Uso"));
        user.setPrivacyVersion(resolveAndValidateLegalVersion(requestedPrivacyVersion, currentPrivacyVersion, "Política de Privacidade"));
        user.setTermsAcceptedAt(OffsetDateTime.now());
        user.setTermsAcceptedIp(clientIp);
    }

    private String resolveAndValidateLegalVersion(String requestedVersion, String currentVersion, String documentName) {
        if (requestedVersion == null || requestedVersion.isBlank()) {
            return currentVersion;
        }
        String trimmed = requestedVersion.trim();
        if (!currentVersion.equals(trimmed)) {
            throw new IllegalArgumentException(
                    "Versão desatualizada ou inválida de " + documentName + ". Versão vigente: " + currentVersion + "."
            );
        }
        return trimmed;
    }
}
