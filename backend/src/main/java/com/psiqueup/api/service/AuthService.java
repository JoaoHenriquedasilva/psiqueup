package com.psiqueup.api.service;

import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.dto.auth.AuthResponse;
import com.psiqueup.api.dto.auth.LoginRequest;
import com.psiqueup.api.dto.auth.RegisterRequest;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.security.JwtService;
import com.psiqueup.api.security.UserPrincipal;
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

        User user = User.builder()
                .name(trimmedName)
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(resolvedRole)
                .active(true)
                .build();

        User savedUser = userRepository.save(user);
        String token = jwtService.generateToken(new UserPrincipal(savedUser));

        return new AuthResponse(
                token,
                savedUser.getName(),
                savedUser.getEmail(),
                savedUser.getRole().name()
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