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
import com.psiqueup.api.dto.link.NeutralActionResponse;
import com.psiqueup.api.dto.link.RejectLinkRequest;
import com.psiqueup.api.repository.ClinicPsychologistRepository;
import com.psiqueup.api.repository.PatientProfileRepository;
import com.psiqueup.api.repository.PatientPsychologistLinkRepository;
import com.psiqueup.api.repository.PsychologistProfileRepository;
import com.psiqueup.api.repository.SessionRepository;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.security.CpfCryptoService;
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
    private final CpfCryptoService cpfCryptoService;

    @Transactional
    public NeutralActionResponse createLink(String psychologistEmail, CreateLinkRequest request) {
        User psychologistUser = getActiveUserByEmail(psychologistEmail);
        if (psychologistUser.getRole() != UserRole.PSYCHOLOGIST) {
            throw new AccessDeniedException("Apenas psicólogos podem criar vínculos terapêuticos.");
        }

        PsychologistProfile psychologist = psychologistRepository.findById(psychologistUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Complete seu perfil profissional (CRP) antes de vincular pacientes."));

        Clinic clinic = clinicPsychologistRepository
                .findFirstByPsychologistUserIdAndStatus(psychologist.getUserId(), ClinicPsychologistStatus.APPROVED)
                .map(ClinicPsychologist::getClinic)
                .orElse(null);

        return createPendingLinkIfEligible(psychologist, clinic, request.cpf());
    }

    @Transactional
    public NeutralActionResponse createPendingLinkIfEligible(
            PsychologistProfile psychologist,
            Clinic clinic,
            String rawCpf
    ) {
        String cpfHash = cpfCryptoService.hashCpf(rawCpf);

        patientRepository.findByCpfHash(cpfHash).ifPresent(patient -> {
            User patientUser = patient.getUser();
            if (patientUser.getRole() == UserRole.PATIENT
                    && Boolean.TRUE.equals(patientUser.getActive())
                    && linkRepository.findByPsychologistUserIdAndPatientUserId(
                            psychologist.getUserId(), patient.getUserId()).isEmpty()) {
                PatientPsychologistLink link = PatientPsychologistLink.builder()
                        .psychologist(psychologist)
                        .patient(patient)
                        .clinic(clinic)
                        .status(LinkStatus.PENDING)
                        .build();

                linkRepository.save(link);
            }
        });

        return NeutralActionResponse.linkRequestRegistered();
    }

    @Transactional(readOnly = true)
    public List<LinkResponse> listMyLinks(String userEmail) {
        User user = getActiveUserByEmail(userEmail);

        if (user.getRole() == UserRole.PSYCHOLOGIST) {
            return linkRepository.findAllByPsychologistUserId(user.getId()).stream()
                    .map(LinkResponse::fromEntityForStaff)
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
    public LinkResponse acceptLink(String patientEmail, Long linkId) {
        User patientUser = getActiveUserByEmail(patientEmail);
        if (patientUser.getRole() != UserRole.PATIENT) {
            throw new AccessDeniedException("Apenas pacientes podem aceitar vínculos terapêuticos.");
        }

        PatientPsychologistLink link = linkRepository.findById(linkId)
                .orElseThrow(() -> new IllegalArgumentException("Vínculo não encontrado."));

        if (!link.getPatient().getUserId().equals(patientUser.getId())) {
            throw new AccessDeniedException("Você só pode aceitar vínculos associados à sua conta.");
        }

        if (link.getStatus() != LinkStatus.PENDING) {
            throw new IllegalArgumentException("Apenas vínculos pendentes podem ser aceitos.");
        }

        link.setStatus(LinkStatus.ACTIVE);
        return LinkResponse.fromEntity(linkRepository.save(link));
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

        if (link.getStatus() == LinkStatus.REJECTED || link.getStatus() == LinkStatus.REVOKED) {
            throw new IllegalArgumentException("Este vínculo já foi encerrado.");
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