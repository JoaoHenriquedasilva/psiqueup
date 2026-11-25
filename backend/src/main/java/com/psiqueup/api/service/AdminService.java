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
import com.psiqueup.api.dto.admin.AdminDashboardResponse;
import com.psiqueup.api.dto.admin.AdminPsychologistResponse;
import com.psiqueup.api.dto.admin.AdminTriageRequest;
import com.psiqueup.api.dto.admin.AdminUserStatusResponse;
import com.psiqueup.api.dto.clinic.ClinicLinkResponse;
import com.psiqueup.api.dto.link.LinkResponse;
import com.psiqueup.api.dto.session.SessionResponse;
import com.psiqueup.api.repository.ClinicPsychologistRepository;
import com.psiqueup.api.repository.ClinicRepository;
import com.psiqueup.api.repository.PatientProfileRepository;
import com.psiqueup.api.repository.PatientPsychologistLinkRepository;
import com.psiqueup.api.repository.SessionRepository;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.util.EmailNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final ClinicRepository clinicRepository;
    private final ClinicPsychologistRepository clinicPsychologistRepository;
    private final PatientProfileRepository patientRepository;
    private final PatientPsychologistLinkRepository linkRepository;
    private final SessionRepository sessionRepository;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboardMetrics(String adminEmail) {
        Clinic clinic = resolveAdminClinic(adminEmail).clinic();
        List<ClinicPsychologist> approvedLinks = clinicPsychologistRepository
                .findAllByClinicIdAndStatusOrderByPsychologistUserNameAsc(clinic.getId(), ClinicPsychologistStatus.APPROVED);

        long activePsychologists = approvedLinks.stream()
                .filter(cp -> Boolean.TRUE.equals(cp.getPsychologist().getUser().getActive()))
                .count();
        long inactivePsychologists = approvedLinks.size() - activePsychologists;

        long totalPatients = linkRepository.countDistinctPatientsByClinicId(clinic.getId());
        long activeLinks = linkRepository.countByStatusAndClinicId(LinkStatus.ACTIVE, clinic.getId());

        long totalPsychologists = activePsychologists + inactivePsychologists;
        double averagePatients = totalPsychologists == 0
                ? 0.0
                : BigDecimal.valueOf((double) activeLinks / totalPsychologists)
                        .setScale(2, RoundingMode.HALF_UP)
                        .doubleValue();

        Map<SessionStatus, Long> sessionCountsByStatus = new EnumMap<>(SessionStatus.class);
        for (Object[] row : sessionRepository.countGroupedByStatusAndClinicId(clinic.getId())) {
            sessionCountsByStatus.put((SessionStatus) row[0], ((Number) row[1]).longValue());
        }

        return new AdminDashboardResponse(
                activePsychologists,
                inactivePsychologists,
                totalPatients,
                activeLinks,
                averagePatients,
                sessionCountsByStatus.getOrDefault(SessionStatus.SCHEDULED, 0L),
                sessionCountsByStatus.getOrDefault(SessionStatus.COMPLETED, 0L),
                sessionCountsByStatus.getOrDefault(SessionStatus.NO_SHOW, 0L),
                sessionCountsByStatus.getOrDefault(SessionStatus.CANCELED, 0L),
                sessionCountsByStatus.getOrDefault(SessionStatus.DISPUTED, 0L)
        );
    }

    @Transactional(readOnly = true)
    public List<AdminPsychologistResponse> listPsychologists(String adminEmail) {
        Clinic clinic = resolveAdminClinic(adminEmail).clinic();
        List<ClinicPsychologist> approvedLinks = clinicPsychologistRepository
                .findAllByClinicIdAndStatusOrderByPsychologistUserNameAsc(clinic.getId(), ClinicPsychologistStatus.APPROVED);

        if (approvedLinks.isEmpty()) {
            return List.of();
        }

        List<Long> psychologistIds = approvedLinks.stream()
                .map(cp -> cp.getPsychologist().getUserId())
                .toList();

        Map<Long, Long> activeLinksByPsychologist = new HashMap<>();
        for (Object[] row : linkRepository.countGroupedByPsychologistAndStatusAndClinicIdAndPsychologistIds(
                LinkStatus.ACTIVE, clinic.getId(), psychologistIds)) {
            activeLinksByPsychologist.put((Long) row[0], ((Number) row[1]).longValue());
        }

        Map<Long, long[]> sessionsByPsychologist = new HashMap<>();
        for (Object[] row : sessionRepository.countGroupedByPsychologistAndClinicIdAndIds(
                SessionStatus.DISPUTED, clinic.getId(), psychologistIds)) {
            long total = ((Number) row[1]).longValue();
            long disputed = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            sessionsByPsychologist.put((Long) row[0], new long[]{total, disputed});
        }

        return approvedLinks.stream().map(cp -> {
            PsychologistProfile profile = cp.getPsychologist();
            User user = profile.getUser();
            long[] sessionCounts = sessionsByPsychologist.getOrDefault(user.getId(), new long[]{0L, 0L});

            return new AdminPsychologistResponse(
                    user.getId(),
                    user.getName(),
                    user.getEmail(),
                    Boolean.TRUE.equals(user.getActive()),
                    profile.getCrp(),
                    profile.getApproach() != null ? profile.getApproach().getName() : null,
                    profile.getBio(),
                    activeLinksByPsychologist.getOrDefault(user.getId(), 0L),
                    sessionCounts[0],
                    sessionCounts[1]
            );
        }).toList();
    }

    @Transactional
    public AdminUserStatusResponse updateUserStatus(String adminEmail, Long targetUserId, boolean active) {
        AdminContext context = resolveAdminClinic(adminEmail);
        User adminUser = context.adminUser();
        Clinic clinic = context.clinic();

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilizador não encontrado."));

        if (adminUser.getId().equals(targetUser.getId())) {
            throw new IllegalArgumentException("Não é permitido desativar ou alterar o próprio status administrativo.");
        }

        if (targetUser.getRole() == UserRole.ADMIN) {
            throw new AccessDeniedException("Não é permitido alterar o status de outro administrador.");
        }

        if (targetUser.getRole() == UserRole.PSYCHOLOGIST) {
            boolean belongsToClinic = clinicPsychologistRepository.existsByClinicIdAndPsychologistUserIdAndStatus(
                    clinic.getId(),
                    targetUser.getId(),
                    ClinicPsychologistStatus.APPROVED
            );
            if (!belongsToClinic) {
                throw new AccessDeniedException("Você não tem permissão para gerenciar um psicólogo que não pertence ao seu consultório.");
            }
            if (!active && clinicPsychologistRepository.existsByPsychologistUserIdAndStatusAndClinicIdNot(
                    targetUser.getId(),
                    ClinicPsychologistStatus.APPROVED,
                    clinic.getId())) {
                throw new AccessDeniedException(
                        "Não é possível desativar globalmente uma conta de psicólogo com vínculo aprovado em outro consultório."
                );
            }
        } else if (targetUser.getRole() == UserRole.PATIENT) {
            boolean belongsToClinic = linkRepository.existsByPatientUserIdAndClinicIdAndStatus(
                    targetUser.getId(),
                    clinic.getId(),
                    LinkStatus.ACTIVE
            );
            if (!belongsToClinic) {
                throw new AccessDeniedException("Você não tem permissão para gerenciar um paciente que não pertence ao seu consultório.");
            }
            if (!active && linkRepository.existsExternalOrAutonomousLink(
                    targetUser.getId(),
                    clinic.getId(),
                    LinkStatus.ACTIVE)) {
                throw new AccessDeniedException(
                        "Não é possível desativar globalmente uma conta com atuação externa ou autônoma."
                );
            }
        }

        targetUser.setActive(active);
        return AdminUserStatusResponse.fromEntity(userRepository.save(targetUser));
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> listSessions(String adminEmail, SessionStatus statusFilter) {
        Clinic clinic = resolveAdminClinic(adminEmail).clinic();

        List<Session> sessions = statusFilter != null
                ? sessionRepository.findAllByClinicIdAndStatusOrderByStartTimeDesc(clinic.getId(), statusFilter)
                : sessionRepository.findAllByClinicIdOrderByStartTimeDesc(clinic.getId());

        return sessions.stream().map(SessionResponse::fromEntity).toList();
    }

    @Transactional
    public SessionResponse resolveDisputedSession(String adminEmail, Long sessionId, SessionStatus resolutionStatus) {
        Clinic clinic = resolveAdminClinic(adminEmail).clinic();

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sessão não encontrada."));

        if (session.getClinic() == null || !session.getClinic().getId().equals(clinic.getId())) {
            throw new AccessDeniedException("Você não tem permissão para resolver sessões de outro consultório ou de psicólogo autônomo.");
        }

        if (session.getStatus() != SessionStatus.DISPUTED) {
            throw new IllegalArgumentException("Apenas sessões em contestação (DISPUTED) podem ser resolvidas pelo administrador.");
        }

        if (resolutionStatus != SessionStatus.COMPLETED
                && resolutionStatus != SessionStatus.NO_SHOW
                && resolutionStatus != SessionStatus.CANCELED) {
            throw new IllegalArgumentException("A resolução deve definir o status final como COMPLETED, NO_SHOW ou CANCELED.");
        }

        session.setStatus(resolutionStatus);
        return SessionResponse.fromEntity(sessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public List<ClinicLinkResponse> listPsychologistRequests(String adminEmail, ClinicPsychologistStatus statusFilter) {
        Clinic clinic = resolveAdminClinic(adminEmail).clinic();
        List<ClinicPsychologist> links = statusFilter != null
                ? clinicPsychologistRepository.findAllByClinicIdAndStatusOrderByCreatedAtDesc(clinic.getId(), statusFilter)
                : clinicPsychologistRepository.findAllByClinicIdOrderByCreatedAtDesc(clinic.getId());

        return links.stream().map(ClinicLinkResponse::fromEntity).toList();
    }

    @Transactional
    public ClinicLinkResponse approvePsychologistRequest(String adminEmail, Long requestId) {
        return updatePsychologistRequestStatus(adminEmail, requestId, ClinicPsychologistStatus.APPROVED);
    }

    @Transactional
    public ClinicLinkResponse rejectPsychologistRequest(String adminEmail, Long requestId) {
        return updatePsychologistRequestStatus(adminEmail, requestId, ClinicPsychologistStatus.REJECTED);
    }

    @Transactional
    public LinkResponse triagePatient(String adminEmail, AdminTriageRequest request) {
        Clinic clinic = resolveAdminClinic(adminEmail).clinic();

        ClinicPsychologist clinicPsych = clinicPsychologistRepository
                .findByClinicIdAndPsychologistUserId(clinic.getId(), request.psychologistId())
                .orElse(null);

        if (clinicPsych == null || clinicPsych.getStatus() != ClinicPsychologistStatus.APPROVED) {
            throw new AccessDeniedException("O psicólogo informado não possui vínculo aprovado neste consultório.");
        }

        PsychologistProfile psychologist = clinicPsych.getPsychologist();
        if (!Boolean.TRUE.equals(psychologist.getUser().getActive())) {
            throw new IllegalArgumentException("Não é possível realizar triagem para um psicólogo com conta inativa.");
        }

        String normalizedPatientEmail = EmailNormalizer.normalize(request.patientEmail());
        User patientUser = userRepository.findByEmail(normalizedPatientEmail)
                .filter(user -> user.getRole() == UserRole.PATIENT && Boolean.TRUE.equals(user.getActive()))
                .orElseThrow(() -> new IllegalArgumentException(
                        "Não foi possível concluir a triagem com o e-mail informado."
                ));

        PatientProfile patient = patientRepository.findById(patientUser.getId())
                .orElseGet(() -> patientRepository.save(PatientProfile.builder().user(patientUser).build()));

        linkRepository.findByPsychologistUserIdAndPatientUserId(psychologist.getUserId(), patient.getUserId())
                .ifPresent(existing -> {
                    if (existing.getStatus() == LinkStatus.REJECTED) {
                        throw new IllegalArgumentException("Este paciente rejeitou o vínculo anteriormente e bloqueou novas vinculações.");
                    }
                    throw new IllegalArgumentException("Já existe um vínculo ativo entre este psicólogo e este paciente.");
                });

        PatientPsychologistLink link = PatientPsychologistLink.builder()
                .psychologist(psychologist)
                .patient(patient)
                .clinic(clinic)
                .status(LinkStatus.ACTIVE)
                .build();

        return LinkResponse.fromEntity(linkRepository.save(link));
    }

    private ClinicLinkResponse updatePsychologistRequestStatus(
            String adminEmail,
            Long requestId,
            ClinicPsychologistStatus targetStatus
    ) {
        Clinic clinic = resolveAdminClinic(adminEmail).clinic();

        ClinicPsychologist link = clinicPsychologistRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitação de vínculo não encontrada."));

        if (!link.getClinic().getId().equals(clinic.getId())) {
            throw new AccessDeniedException("Você não tem permissão para gerenciar solicitações de outro consultório.");
        }

        if (link.getStatus() != ClinicPsychologistStatus.PENDING) {
            throw new IllegalArgumentException("Apenas solicitações pendentes podem ser aprovadas ou rejeitadas.");
        }

        if (targetStatus == ClinicPsychologistStatus.APPROVED
                && clinicPsychologistRepository.existsByPsychologistUserIdAndStatusAndClinicIdNot(
                        link.getPsychologist().getUserId(),
                        ClinicPsychologistStatus.APPROVED,
                        clinic.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este psicólogo já possui vínculo aprovado com outro consultório."
            );
        }

        link.setStatus(targetStatus);
        return ClinicLinkResponse.fromEntity(clinicPsychologistRepository.save(link));
    }

    private AdminContext resolveAdminClinic(String adminEmail) {
        User adminUser = userRepository.findByEmail(EmailNormalizer.normalize(adminEmail))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Administrador não encontrado."));

        Clinic clinic = clinicRepository.findByOwnerUserId(adminUser.getId())
                .orElseThrow(() -> new AccessDeniedException("Administrador não possui consultório vinculado."));

        if (!Boolean.TRUE.equals(clinic.getActive())) {
            throw new AccessDeniedException("Consultório inativo.");
        }

        return new AdminContext(adminUser, clinic);
    }

    private record AdminContext(User adminUser, Clinic clinic) {
    }
}
