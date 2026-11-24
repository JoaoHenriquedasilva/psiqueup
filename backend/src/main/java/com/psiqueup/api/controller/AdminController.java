package com.psiqueup.api.controller;

import com.psiqueup.api.domain.enums.SessionStatus;
import com.psiqueup.api.dto.admin.AdminDashboardResponse;
import com.psiqueup.api.dto.admin.AdminPsychologistResponse;
import com.psiqueup.api.dto.admin.AdminUserStatusResponse;
import com.psiqueup.api.dto.admin.ResolveDisputedSessionRequest;
import com.psiqueup.api.dto.admin.UpdateUserStatusRequest;
import com.psiqueup.api.dto.session.SessionResponse;
import com.psiqueup.api.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Clinic Administration", description = "Métricas operacionais e governança do consultório (ADMIN)")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/dashboard")
    @Operation(summary = "Obter métricas operacionais consolidadas da clínica")
    public ResponseEntity<AdminDashboardResponse> getDashboard() {
        return ResponseEntity.ok(adminService.getDashboardMetrics());
    }

    @GetMapping("/psychologists")
    @Operation(summary = "Listar psicólogos da clínica com CRP, abordagem, pacientes e sessões")
    public ResponseEntity<List<AdminPsychologistResponse>> listPsychologists() {
        return ResponseEntity.ok(adminService.listPsychologists());
    }

    @PatchMapping("/users/{userId}/status")
    @Operation(summary = "Ativar ou desativar conta de psicólogo ou paciente")
    public ResponseEntity<AdminUserStatusResponse> updateUserStatus(
            Authentication authentication,
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        return ResponseEntity.ok(
                adminService.updateUserStatus(authentication.getName(), userId, request.active())
        );
    }

    @GetMapping("/sessions")
    @Operation(summary = "Listar sessões da clínica com filtro opcional por status")
    public ResponseEntity<List<SessionResponse>> listSessions(
            @RequestParam(required = false) SessionStatus status
    ) {
        return ResponseEntity.ok(adminService.listSessions(status));
    }

    @PatchMapping("/sessions/{sessionId}/resolve")
    @Operation(summary = "Resolver sessão em contestação (DISPUTED) definindo desfecho final")
    public ResponseEntity<SessionResponse> resolveDisputedSession(
            @PathVariable Long sessionId,
            @Valid @RequestBody ResolveDisputedSessionRequest request
    ) {
        return ResponseEntity.ok(
                adminService.resolveDisputedSession(sessionId, request.resolutionStatus())
        );
    }
}
