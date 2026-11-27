package com.psiqueup.api.controller;

import com.psiqueup.api.dto.auth.AuthResponse;
import com.psiqueup.api.dto.auth.EmailActionRequest;
import com.psiqueup.api.dto.auth.LoginRequest;
import com.psiqueup.api.dto.auth.MessageResponse;
import com.psiqueup.api.dto.auth.RegisterClinicRequest;
import com.psiqueup.api.dto.auth.RegisterPendingVerificationResponse;
import com.psiqueup.api.dto.auth.RegisterRequest;
import com.psiqueup.api.dto.auth.ResetPasswordRequest;
import com.psiqueup.api.dto.auth.VerifyEmailRequest;
import com.psiqueup.api.security.AuthCookieService;
import com.psiqueup.api.service.AuthService;
import com.psiqueup.api.util.RequestIpUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthCookieService authCookieService;

    @PostMapping("/register")
    public ResponseEntity<RegisterPendingVerificationResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/register-clinic")
    public ResponseEntity<RegisterPendingVerificationResponse> registerClinic(
            @Valid @RequestBody RegisterClinicRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerClinic(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        AuthService.AuthSession session = authService.login(request, RequestIpUtils.resolveClientIp(httpRequest));
        authCookieService.addAuthCookies(httpResponse, session.accessToken(), session.refreshToken());
        return ResponseEntity.ok(session.user());
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        String rawRefreshToken = authCookieService.extractCookieValue(
                httpRequest,
                AuthCookieService.REFRESH_TOKEN_COOKIE
        );
        try {
            AuthService.AuthSession session = authService.refresh(
                    rawRefreshToken,
                    RequestIpUtils.resolveClientIp(httpRequest)
            );
            authCookieService.addAuthCookies(httpResponse, session.accessToken(), session.refreshToken());
            return ResponseEntity.ok(session.user());
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode().value() == HttpStatus.UNAUTHORIZED.value()) {
                authCookieService.clearAuthCookies(httpResponse);
            }
            throw ex;
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        String rawRefreshToken = authCookieService.extractCookieValue(
                httpRequest,
                AuthCookieService.REFRESH_TOKEN_COOKIE
        );
        MessageResponse response = authService.logout(rawRefreshToken);
        authCookieService.clearAuthCookies(httpResponse);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-email")
    public ResponseEntity<MessageResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(authService.verifyEmail(request));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<MessageResponse> resendVerification(@Valid @RequestBody EmailActionRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(authService.resendVerification(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody EmailActionRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(authService.forgotPassword(request));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }
}
