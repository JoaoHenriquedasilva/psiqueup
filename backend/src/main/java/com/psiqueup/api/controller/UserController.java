package com.psiqueup.api.controller;

import com.psiqueup.api.dto.user.UpdateUserProfileRequest;
import com.psiqueup.api.dto.user.UserProfileResponse;
import com.psiqueup.api.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Gestão de perfil do utilizador autenticado")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "Obter perfil do utilizador autenticado")
    public ResponseEntity<UserProfileResponse> getMyProfile(Authentication authentication) {
        return ResponseEntity.ok(userService.getCurrentUserProfile(authentication.getName()));
    }

    @PatchMapping("/me")
    @Operation(summary = "Atualizar dados básicos do perfil autenticado")
    public ResponseEntity<UserProfileResponse> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateUserProfileRequest request
    ) {
        return ResponseEntity.ok(userService.updateCurrentUserProfile(authentication.getName(), request));
    }
}