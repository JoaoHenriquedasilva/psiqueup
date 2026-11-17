package com.psiqueup.api.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "therapeutic_approaches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TherapeuticApproach {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "patient_friendly_description", nullable = false, columnDefinition = "TEXT")
    private String patientFriendlyDescription;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}