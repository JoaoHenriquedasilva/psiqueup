package com.psiqueup.api.service;

import com.psiqueup.api.domain.entity.Clinic;
import com.psiqueup.api.domain.entity.ClinicPsychologist;
import com.psiqueup.api.domain.entity.PatientProfile;
import com.psiqueup.api.domain.entity.PatientPsychologistLink;
import com.psiqueup.api.domain.entity.PsychologistProfile;
import com.psiqueup.api.domain.entity.Session;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.ClinicPsychologistStatus;
import com.psiqueup.api.domain.enums.LinkStatus;
import com.psiqueup.api.domain.enums.SessionStatus;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.dto.link.CreateLinkRequest;
import com.psiqueup.api.dto.link.LinkResponse;
import com.psiqueup.api.dto.link.RejectLinkRequest;
import com.psiqueup.api.repository.ClinicPsychologistRepository;
import com.psiqueup.api.repository.PatientProfileRepository;
import com.psiqueup.api.repository.PatientPsychologistLinkRepository;
import com.psiqueup.api.repository.PsychologistProfileRepository;
import com.psiqueup.api.repository.SessionRepository;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.util.EmailNormalizer;
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
    private final ClinicPsychologistRepository clinicPsychologistRepository;
    private final PsychologistProfileRepository psychologistRepository;
    private final PatientProfileRepository patientRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;

    @Transactional
    public LinkResponse createLink(String psychologistEmail, CreateLinkRequest request) {
        User psychologistUser = getActiveUserByEmail(psychologistEmail);
        if (psychologistUser.getRole() != UserRole.PSYCHOLOGIST) {
            throw new AccessDeniedException("Apenas psicólogos podem criar vínculos terapêuticos.");
        }

        PsychologistProfile psychologist = psychologistRepository.findById(psychologistUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Complete seu perfil profissional (CRP) antes de vincular pacientes."));

        String normalizedPatientEmail = EmailNormalizer.normalize(request.patientEmail());
        User patientUser = userRepository.findByEmail(normalizedPatientEmail)
                .orElseThrow(() -> new IllegalArgumentException("Nenhum usuário encontrado com este e-mail."));

        if (patientUser.getRole() != UserRole.PATIENT) {
            throw new IllegalArgumentException("O usuário informado não possui perfil de paciente.");
        }

        if (!Boolean.TRUE.equals(patientUser.getActive())) {
            throw new IllegalArgumentException("Não é possível vincular um paciente com conta inativa.");
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

        Clinic clinic = clinicPsychologistRepository
                .findFirstByPsychologistUserIdAndStatus(psychologist.getUserId(), ClinicPsychologistStatus.APPROVED)
                .map(ClinicPsychologist::getClinic)
                .orElse(null);

        PatientPsychologistLink link = PatientPsychologistLink.builder()
                .psychologist(psychologist)
                .patient(patient)
                .clinic(clinic)
                .status(LinkStatus.ACTIVE)
                .build();

        return LinkResponse.fromEntity(linkRepository.save(link));
    }

    @Transactional(readOnly = true)
    public List<LinkResponse> listMyLinks(String userEmail) {
        User user = getActiveUserByEmail(userEmail);

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
        User patientUser = getActiveUserByEmail(patientEmail);
        if (patientUser.getRole() != UserRole.PATIENT) {
            throw new AccessDeniedException("Apenas pacientes podem rejeitar vínculos terapêuticos.");
        }

        PatientPsychologistLink link = linkRepository.findById(linkId)
                .orElseThrow(() -> new IllegalArgumentException("Vínculo não encontrado."));

        if (!link.getPatient().getUserId().equals(patientUser.getId())) {
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

        List<Session> scheduledSessions = sessionRepository.findAllByPsychologistUserIdAndPatientUserIdAndStatus(
                link.getPsychologist().getUserId(),
                link.getPatient().getUserId(),
                SessionStatus.SCHEDULED
        );
        for (Session session : scheduledSessions) {
            session.setStatus(SessionStatus.CANCELED);
        }

        return LinkResponse.fromEntity(linkRepository.save(link));
    }

    private User getActiveUserByEmail(String email) {
        User user = userRepository.findByEmail(EmailNormalizer.normalize(email))
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado."));
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new AccessDeniedException("Conta de usuário inativa.");
        }
        return user;
    }
}