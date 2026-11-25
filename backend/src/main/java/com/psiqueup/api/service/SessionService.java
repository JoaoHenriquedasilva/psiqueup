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
import com.psiqueup.api.dto.session.CreateSessionRequest;
import com.psiqueup.api.dto.session.SessionResponse;
import com.psiqueup.api.dto.session.UpdateSessionStatusRequest;
import com.psiqueup.api.repository.*;
import com.psiqueup.api.util.EmailNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SessionService {

    private final SessionRepository sessionRepository;
    private final PsychologistProfileRepository psychologistRepository;
    private final PatientProfileRepository patientRepository;
    private final PatientPsychologistLinkRepository linkRepository;
    private final ClinicPsychologistRepository clinicPsychologistRepository;
    private final UserRepository userRepository;

    @Transactional
    public SessionResponse scheduleSession(String psychologistEmail, CreateSessionRequest request) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw new IllegalArgumentException("O horário de término deve ser posterior ao horário de início.");
        }

        User psychologistUser = getActiveUserByEmail(psychologistEmail);
        if (psychologistUser.getRole() != UserRole.PSYCHOLOGIST) {
            throw new AccessDeniedException("Apenas psicólogos podem agendar sessões.");
        }

        PsychologistProfile psychologist = psychologistRepository.findById(psychologistUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Complete seu perfil profissional (CRP) antes de agendar sessões."));

        PatientProfile patient = patientRepository.findById(request.patientId())
                .orElseThrow(() -> new IllegalArgumentException("Paciente não encontrado."));

        if (!Boolean.TRUE.equals(patient.getUser().getActive())) {
            throw new IllegalArgumentException("Não é possível agendar sessão para um paciente com conta inativa.");
        }

        PatientPsychologistLink activeLink = linkRepository
                .findByPsychologistUserIdAndPatientUserId(psychologist.getUserId(), patient.getUserId())
                .filter(link -> link.getStatus() == LinkStatus.ACTIVE)
                .orElseThrow(() -> new IllegalArgumentException("Não existe vínculo ativo entre você e este paciente."));

        Clinic sessionClinic = activeLink.getClinic();
        if (sessionClinic == null) {
            sessionClinic = clinicPsychologistRepository
                    .findFirstByPsychologistUserIdAndStatus(psychologist.getUserId(), ClinicPsychologistStatus.APPROVED)
                    .map(ClinicPsychologist::getClinic)
                    .orElse(null);
            if (sessionClinic != null) {
                activeLink.setClinic(sessionClinic);
                linkRepository.save(activeLink);
            }
        }

        boolean hasConflict = sessionRepository.existsConflictingSession(
                psychologist.getUserId(),
                patient.getUserId(),
                SessionStatus.SCHEDULED,
                request.startTime(),
                request.endTime()
        );

        if (hasConflict) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Já existe uma sessão agendada que conflita com este horário."
            );
        }

        Session session = Session.builder()
                .psychologist(psychologist)
                .patient(patient)
                .clinic(sessionClinic)
                .startTime(request.startTime())
                .endTime(request.endTime())
                .status(SessionStatus.SCHEDULED)
                .build();

        return SessionResponse.fromEntity(sessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> listMySessions(String userEmail) {
        User user = getActiveUserByEmail(userEmail);

        if (user.getRole() == UserRole.PSYCHOLOGIST) {
            return sessionRepository.findAllByPsychologistUserIdOrderByStartTimeAsc(user.getId()).stream()
                    .map(SessionResponse::fromEntity)
                    .toList();
        }

        if (user.getRole() == UserRole.PATIENT) {
            return sessionRepository.findAllByPatientUserIdOrderByStartTimeAsc(user.getId()).stream()
                    .map(SessionResponse::fromEntity)
                    .toList();
        }

        throw new AccessDeniedException("Perfil sem agenda de sessões.");
    }

    @Transactional
    public SessionResponse updateStatus(String userEmail, Long sessionId, UpdateSessionStatusRequest request) {
        User caller = getActiveUserByEmail(userEmail);

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada."));

        boolean isPsychologist = session.getPsychologist().getUserId().equals(caller.getId());
        boolean isPatient = session.getPatient().getUserId().equals(caller.getId());

        if (!isPsychologist && !isPatient) {
            throw new AccessDeniedException("Você não participa desta sessão.");
        }

        validateStatusTransition(session, request, isPsychologist, isPatient);

        session.setStatus(request.status());
        return SessionResponse.fromEntity(sessionRepository.save(session));
    }

    private void validateStatusTransition(
            Session session,
            UpdateSessionStatusRequest request,
            boolean isPsychologist,
            boolean isPatient
    ) {
        SessionStatus currentStatus = session.getStatus();
        SessionStatus newStatus = request.status();

        if (currentStatus == newStatus) {
            throw new IllegalArgumentException("A sessão já se encontra com este status.");
        }

        if (currentStatus == SessionStatus.CANCELED || currentStatus == SessionStatus.DISPUTED) {
            throw new IllegalArgumentException("Sessões canceladas ou em contestação não podem ter o status alterado.");
        }

        if (currentStatus == SessionStatus.SCHEDULED) {
            if (isPatient) {
                if (newStatus != SessionStatus.CANCELED) {
                    throw new AccessDeniedException("Pacientes só podem cancelar uma sessão agendada.");
                }
                return;
            }

            if (isPsychologist) {
                if (newStatus != SessionStatus.COMPLETED
                        && newStatus != SessionStatus.NO_SHOW
                        && newStatus != SessionStatus.CANCELED) {
                    throw new IllegalArgumentException("Transição de status inválida para sessão agendada.");
                }

                boolean isBeforeScheduledStart = OffsetDateTime.now().isBefore(session.getStartTime());
                if (isBeforeScheduledStart && newStatus == SessionStatus.NO_SHOW) {
                    throw new IllegalArgumentException("Não é possível registrar falta antes do horário agendado da sessão.");
                }

                if (isBeforeScheduledStart
                        && newStatus == SessionStatus.COMPLETED
                        && !Boolean.TRUE.equals(request.confirmEarlyCompletion())) {
                    throw new IllegalArgumentException(
                            "Esta sessão está agendada para um horário futuro. Confirme o adiantamento do atendimento para marcá-la como realizada."
                    );
                }
                return;
            }
        }

        if (currentStatus == SessionStatus.COMPLETED || currentStatus == SessionStatus.NO_SHOW) {
            if (isPatient && newStatus == SessionStatus.DISPUTED) {
                return;
            }
            if (isPatient) {
                throw new AccessDeniedException("Sessões já finalizadas só podem ser contestadas pelo paciente.");
            }
            throw new IllegalArgumentException("Sessões já finalizadas não podem ser reabertas ou alteradas pelo profissional.");
        }
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