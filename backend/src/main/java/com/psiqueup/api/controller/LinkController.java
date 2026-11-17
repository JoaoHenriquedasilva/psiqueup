package com.psiqueup.api.controller;

import com.psiqueup.api.dto.link.CreateLinkRequest;
import com.psiqueup.api.dto.link.LinkResponse;
import com.psiqueup.api.dto.link.RejectLinkRequest;
import com.psiqueup.api.service.LinkService;
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
@RequestMapping("/api/links")
@RequiredArgsConstructor
@Tag(name = "Therapeutic Links", description = "Vínculos entre psicólogos e pacientes")
public class LinkController {

    private final LinkService linkService;

    @PostMapping
    @Operation(summary = "Vincular um paciente pelo e-mail (Psicólogo)")
    public ResponseEntity<LinkResponse> createLink(
            Authentication authentication,
            @Valid @RequestBody CreateLinkRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(linkService.createLink(authentication.getName(), request));
    }

    @GetMapping
    @Operation(summary = "Listar vínculos do usuário autenticado")
    public ResponseEntity<List<LinkResponse>> listMyLinks(Authentication authentication) {
        return ResponseEntity.ok(linkService.listMyLinks(authentication.getName()));
    }

    @PatchMapping("/{linkId}/reject")
    @Operation(summary = "Rejeitar vínculo indevido (Paciente)")
    public ResponseEntity<LinkResponse> rejectLink(
            Authentication authentication,
            @PathVariable Long linkId,
            @Valid @RequestBody(required = false) RejectLinkRequest request
    ) {
        return ResponseEntity.ok(linkService.rejectLink(authentication.getName(), linkId, request));
    }
}