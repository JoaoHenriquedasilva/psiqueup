package com.psiqueup.api.controller;

import com.psiqueup.api.dto.profile.PsychologistProfileResponse;
import com.psiqueup.api.dto.profile.UpsertPsychologistProfileRequest;
import com.psiqueup.api.service.ProfileDomainService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
@Tag(name = "Domain Profiles", description = "Configuração de perfis de Psicólogo (CRP) e Paciente")
public class ProfileDomainController {

    private final ProfileDomainService profileDomainService;

    @GetMapping("/psychologist/me")
    @Operation(summary = "Obter perfil profissional do psicólogo autenticado")
    public ResponseEntity<PsychologistProfileResponse> getMyPsychologistProfile(Authentication authentication) {
        return ResponseEntity.ok(
                profileDomainService.getMyPsychologistProfile(authentication.getName())
        );
    }

    @PutMapping("/psychologist")
    @Operation(summary = "Criar ou atualizar perfil profissional do psicólogo (CRP e abordagem)")
    public ResponseEntity<PsychologistProfileResponse> upsertPsychologistProfile(
            Authentication authentication,
            @Valid @RequestBody UpsertPsychologistProfileRequest request
    ) {
        return ResponseEntity.ok(
                profileDomainService.upsertPsychologistProfile(authentication.getName(), request)
        );
    }

    @PostMapping("/patient/activate")
    @Operation(summary = "Ativar perfil de paciente para o utilizador autenticado")
    public ResponseEntity<Void> activatePatientProfile(Authentication authentication) {
        profileDomainService.ensurePatientProfile(authentication.getName());
        return ResponseEntity.noContent().build();
    }
}