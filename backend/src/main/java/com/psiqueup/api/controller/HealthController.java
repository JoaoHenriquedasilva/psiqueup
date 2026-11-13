package com.psiqueup.api.controller;

import com.psiqueup.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> checkHealth() {
        long userCount = userRepository.count();

        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "psiqueup-api",
                "database", "CONNECTED",
                "usersRegistered", userCount,
                "timestamp", OffsetDateTime.now()
        ));
    }
}