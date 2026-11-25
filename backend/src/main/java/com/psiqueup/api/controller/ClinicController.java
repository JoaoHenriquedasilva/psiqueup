package com.psiqueup.api.controller;

import com.psiqueup.api.dto.clinic.ClinicLinkResponse;
import com.psiqueup.api.dto.clinic.JoinClinicRequest;
import com.psiqueup.api.service.ClinicService;
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
@RequestMapping("/api/clinics")
@RequiredArgsConstructor
@Tag(name = "Clinics", description = "Vínculo de psicólogos com consultórios (CNPJ) e modo autônomo")
public class ClinicController {

    private final ClinicService clinicService;

    @PostMapping("/join")
    @PreAuthorize("hasRole('PSYCHOLOGIST')")
    @Operation(summary = "Solicitar vínculo a um consultório informando o CNPJ (Psicólogo)")
    public ResponseEntity<ClinicLinkResponse> requestJoin(
            Authentication authentication,
            @Valid @RequestBody JoinClinicRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(clinicService.requestClinicJoin(authentication.getName(), request));
    }

    @GetMapping("/my-links")
    @PreAuthorize("hasRole('PSYCHOLOGIST')")
    @Operation(summary = "Listar solicitações e vínculos do psicólogo autenticado com consultórios")
    public ResponseEntity<List<ClinicLinkResponse>> listMyLinks(Authentication authentication) {
        return ResponseEntity.ok(clinicService.listMyClinicLinks(authentication.getName()));
    }
}
