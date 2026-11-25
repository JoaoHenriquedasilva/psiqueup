package com.psiqueup.api.controller;

import com.psiqueup.api.domain.enums.ClinicPsychologistStatus;
import com.psiqueup.api.domain.enums.SessionStatus;
import com.psiqueup.api.dto.admin.AdminDashboardResponse;
import com.psiqueup.api.dto.admin.AdminPsychologistResponse;
import com.psiqueup.api.dto.admin.AdminTriageRequest;
import com.psiqueup.api.dto.admin.AdminUserStatusResponse;
import com.psiqueup.api.dto.admin.ResolveDisputedSessionRequest;
import com.psiqueup.api.dto.admin.UpdateUserStatusRequest;
import com.psiqueup.api.dto.clinic.ClinicLinkResponse;
import com.psiqueup.api.dto.link.LinkResponse;
import com.psiqueup.api.dto.session.SessionResponse;
import com.psiqueup.api.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
    public ResponseEntity<AdminDashboardResponse> getDashboard(Authentication authentication) {
        return ResponseEntity.ok(adminService.getDashboardMetrics(authentication.getName()));
    }

    @GetMapping("/psychologists")
    @Operation(summary = "Listar psicólogos aprovados da clínica com CRP, abordagem, pacientes e sessões")
    public ResponseEntity<List<AdminPsychologistResponse>> listPsychologists(Authentication authentication) {
        return ResponseEntity.ok(adminService.listPsychologists(authentication.getName()));
    }

    @GetMapping("/psychologist-requests")
    @Operation(summary = "Listar solicitações de vínculo de psicólogos da clínica")
    public ResponseEntity<List<ClinicLinkResponse>> listPsychologistRequests(
            Authentication authentication,
            @RequestParam(required = false) ClinicPsychologistStatus status
    ) {
        return ResponseEntity.ok(adminService.listPsychologistRequests(authentication.getName(), status));
    }

    @PatchMapping("/psychologist-requests/{requestId}/approve")
    @Operation(summary = "Aprovar solicitação de vínculo de psicólogo na própria clínica")
    public ResponseEntity<ClinicLinkResponse> approvePsychologistRequest(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        return ResponseEntity.ok(adminService.approvePsychologistRequest(authentication.getName(), requestId));
    }

    @PatchMapping("/psychologist-requests/{requestId}/reject")
    @Operation(summary = "Recusar solicitação de vínculo de psicólogo na própria clínica")
    public ResponseEntity<ClinicLinkResponse> rejectPsychologistRequest(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        return ResponseEntity.ok(adminService.rejectPsychologistRequest(authentication.getName(), requestId));
    }

    @PostMapping("/triage")
    @Operation(summary = "Realizar triagem indicando/vinculando um paciente a um psicólogo aprovado da clínica")
    public ResponseEntity<LinkResponse> triagePatient(
            Authentication authentication,
            @Valid @RequestBody AdminTriageRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.triagePatient(authentication.getName(), request));
    }

    @PatchMapping("/users/{userId}/status")
    @Operation(summary = "Ativar ou desativar conta de psicólogo ou paciente da clínica")
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
            Authentication authentication,
            @RequestParam(required = false) SessionStatus status
    ) {
        return ResponseEntity.ok(adminService.listSessions(authentication.getName(), status));
    }

    @PatchMapping("/sessions/{sessionId}/resolve")
    @Operation(summary = "Resolver sessão em contestação (DISPUTED) definindo desfecho final")
    public ResponseEntity<SessionResponse> resolveDisputedSession(
            Authentication authentication,
            @PathVariable Long sessionId,
            @Valid @RequestBody ResolveDisputedSessionRequest request
    ) {
        return ResponseEntity.ok(
                adminService.resolveDisputedSession(authentication.getName(), sessionId, request.resolutionStatus())
        );
    }
}
