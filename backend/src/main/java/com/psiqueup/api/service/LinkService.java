package com.psiqueup.api.service;

import com.psiqueup.api.domain.entity.PatientProfile;
import com.psiqueup.api.domain.entity.PatientPsychologistLink;
import com.psiqueup.api.domain.entity.PsychologistProfile;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.LinkStatus;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.dto.link.CreateLinkRequest;
import com.psiqueup.api.dto.link.LinkResponse;
import com.psiqueup.api.dto.link.RejectLinkRequest;
import com.psiqueup.api.repository.PatientProfileRepository;
import com.psiqueup.api.repository.PatientPsychologistLinkRepository;
import com.psiqueup.api.repository.PsychologistProfileRepository;
import com.psiqueup.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LinkService {

    private final PatientPsychologistLinkRepository linkRepository;
    private final PsychologistProfileRepository psychologistRepository;
    private final PatientProfileRepository patientRepository;
    private final UserRepository userRepository;

    @Transactional
    public LinkResponse createLink(String psychologistEmail, CreateLinkRequest request) {
        PsychologistProfile psychologist = psychologistRepository.findByUserEmail(psychologistEmail)
                .orElseThrow(() -> new IllegalArgumentException("Complete seu perfil profissional (CRP) antes de vincular pacientes."));

        User patientUser = userRepository.findByEmail(request.patientEmail().trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Nenhum usuário encontrado com este e-mail."));

        if (patientUser.getRole() != UserRole.PATIENT) {
            throw new IllegalArgumentException("O usuário informado não possui perfil de paciente.");
        }

        PatientProfile patient = patientRepository.findById(patientUser.getId())
                .orElseGet(() -> patientRepository.save(PatientProfile.builder().user(patientUser).build()));

        linkRepository.findByPsychologistUserIdAndPatientUserId(psychologist.getUserId(), patient.getUserId())
                .ifPresent(existing -> {
                    if (existing.getStatus() == LinkStatus.REJECTED) {
                        throw new IllegalArgumentException("Este paciente rejeitou o vínculo anteriormente e bloqueou novas vinculações.");
                    }
                    throw new IllegalArgumentException("Já existe um vínculo ativo com este paciente.");
                });

        PatientPsychologistLink link = PatientPsychologistLink.builder()
                .psychologist(psychologist)
                .patient(patient)
                .status(LinkStatus.ACTIVE)
                .build();

        return LinkResponse.fromEntity(linkRepository.save(link));
    }

    @Transactional(readOnly = true)
    public List<LinkResponse> listMyLinks(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado."));

        if (user.getRole() == UserRole.PSYCHOLOGIST) {
            return linkRepository.findAllByPsychologistUserId(user.getId()).stream()
                    .map(LinkResponse::fromEntity)
                    .toList();
        }

        if (user.getRole() == UserRole.PATIENT) {
            return linkRepository.findAllByPatientUserId(user.getId()).stream()
                    .map(LinkResponse::fromEntity)
                    .toList();
        }

        throw new AccessDeniedException("Perfil sem acesso a vínculos terapêuticos.");
    }

    @Transactional
    public LinkResponse rejectLink(String patientEmail, Long linkId, RejectLinkRequest request) {
        PatientPsychologistLink link = linkRepository.findById(linkId)
                .orElseThrow(() -> new IllegalArgumentException("Vínculo não encontrado."));

        if (!link.getPatient().getUser().getEmail().equals(patientEmail)) {
            throw new AccessDeniedException("Você só pode rejeitar vínculos associados à sua conta.");
        }

        if (link.getStatus() == LinkStatus.REJECTED) {
            throw new IllegalArgumentException("Este vínculo já foi rejeitado.");
        }

        link.setStatus(LinkStatus.REJECTED);
        link.setRejectionReason(
                (request != null && request.reason() != null && !request.reason().isBlank())
                        ? request.reason().trim()
                        : "Vínculo não reconhecido pelo paciente."
        );

        return LinkResponse.fromEntity(linkRepository.save(link));
    }
}