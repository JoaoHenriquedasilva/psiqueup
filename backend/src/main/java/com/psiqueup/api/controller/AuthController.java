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
import com.psiqueup.api.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

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
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
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
