package com.psiqueup.api.service;

import com.psiqueup.api.domain.entity.PatientProfile;
import com.psiqueup.api.domain.entity.PsychologistProfile;
import com.psiqueup.api.domain.entity.Session;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.LinkStatus;
import com.psiqueup.api.domain.enums.SessionStatus;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.dto.session.CreateSessionRequest;
import com.psiqueup.api.dto.session.SessionResponse;
import com.psiqueup.api.dto.session.UpdateSessionStatusRequest;
import com.psiqueup.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SessionService {

    private final SessionRepository sessionRepository;
    private final PsychologistProfileRepository psychologistRepository;
    private final PatientProfileRepository patientRepository;
    private final PatientPsychologistLinkRepository linkRepository;
    private final UserRepository userRepository;

    @Transactional
    public SessionResponse scheduleSession(String psychologistEmail, CreateSessionRequest request) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw new IllegalArgumentException("O horário de término deve ser posterior ao horário de início.");
        }

        PsychologistProfile psychologist = psychologistRepository.findByUserEmail(psychologistEmail)
                .orElseThrow(() -> new AccessDeniedException("Apenas psicólogos com perfil configurado podem agendar sessões."));

        PatientProfile patient = patientRepository.findById(request.patientId())
                .orElseThrow(() -> new IllegalArgumentException("Paciente não encontrado."));

        boolean hasActiveLink = linkRepository.existsByPsychologistUserIdAndPatientUserIdAndStatus(
                psychologist.getUserId(),
                patient.getUserId(),
                LinkStatus.ACTIVE
        );

        if (!hasActiveLink) {
            throw new IllegalArgumentException("Não existe vínculo ativo entre você e este paciente.");
        }

        Session session = Session.builder()
                .psychologist(psychologist)
                .patient(patient)
                .startTime(request.startTime())
                .endTime(request.endTime())
                .status(SessionStatus.SCHEDULED)
                .build();

        return SessionResponse.fromEntity(sessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> listMySessions(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado."));

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
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada."));

        boolean isPsychologist = session.getPsychologist().getUser().getEmail().equals(userEmail);
        boolean isPatient = session.getPatient().getUser().getEmail().equals(userEmail);

        if (!isPsychologist && !isPatient) {
            throw new AccessDeniedException("Você não participa desta sessão.");
        }

        if (isPatient && request.status() != SessionStatus.CANCELED && request.status() != SessionStatus.DISPUTED) {
            throw new AccessDeniedException("Pacientes só podem cancelar ou contestar uma sessão.");
        }

        session.setStatus(request.status());
        return SessionResponse.fromEntity(sessionRepository.save(session));
    }
}