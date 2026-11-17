package com.psiqueup.api.controller;

import com.psiqueup.api.dto.session.CreateSessionRequest;
import com.psiqueup.api.dto.session.SessionResponse;
import com.psiqueup.api.dto.session.UpdateSessionStatusRequest;
import com.psiqueup.api.service.SessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
@Tag(name = "Sessions", description = "Agenda administrativa de sessões terapêuticas")
public class SessionController {

    private final SessionService sessionService;

    @PostMapping
    @Operation(summary = "Agendar nova sessão com paciente vinculado (Psicólogo)")
    public ResponseEntity<SessionResponse> scheduleSession(
            Authentication authentication,
            @Valid @RequestBody CreateSessionRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sessionService.scheduleSession(authentication.getName(), request));
    }

    @GetMapping
    @Operation(summary = "Listar agenda de sessões do usuário autenticado")
    public ResponseEntity<List<SessionResponse>> listMySessions(Authentication authentication) {
        return ResponseEntity.ok(sessionService.listMySessions(authentication.getName()));
    }

    @PatchMapping("/{sessionId}/status")
    @Operation(summary = "Atualizar status da sessão")
    public ResponseEntity<SessionResponse> updateSessionStatus(
            Authentication authentication,
            @PathVariable Long sessionId,
            @Valid @RequestBody UpdateSessionStatusRequest request
    ) {
        return ResponseEntity.ok(sessionService.updateStatus(authentication.getName(), sessionId, request));
    }
}