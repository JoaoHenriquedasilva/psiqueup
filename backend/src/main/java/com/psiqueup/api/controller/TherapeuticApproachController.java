package com.psiqueup.api.controller;

import com.psiqueup.api.dto.profile.TherapeuticApproachResponse;
import com.psiqueup.api.service.TherapeuticApproachService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/approaches")
@RequiredArgsConstructor
@Tag(name = "Therapeutic Approaches", description = "Catálogo educativo de abordagens terapêuticas")
public class TherapeuticApproachController {

    private final TherapeuticApproachService approachService;

    @GetMapping
    @Operation(summary = "Listar abordagens terapêuticas disponíveis")
    public ResponseEntity<List<TherapeuticApproachResponse>> listApproaches() {
        return ResponseEntity.ok(approachService.listAll());
    }
}