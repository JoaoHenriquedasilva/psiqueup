package com.psiqueup.api.service;

import com.psiqueup.api.domain.entity.PsychologistProfile;
import com.psiqueup.api.domain.entity.Session;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.LinkStatus;
import com.psiqueup.api.domain.enums.SessionStatus;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.dto.admin.AdminDashboardResponse;
import com.psiqueup.api.dto.admin.AdminPsychologistResponse;
import com.psiqueup.api.dto.admin.AdminUserStatusResponse;
import com.psiqueup.api.dto.session.SessionResponse;
import com.psiqueup.api.repository.PatientPsychologistLinkRepository;
import com.psiqueup.api.repository.PsychologistProfileRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final PsychologistProfileRepository psychologistRepository;
    private final PatientPsychologistLinkRepository linkRepository;
    private final SessionRepository sessionRepository;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboardMetrics() {
        long activePsychologists = userRepository.countByRoleAndActive(UserRole.PSYCHOLOGIST, true);
        long inactivePsychologists = userRepository.countByRoleAndActive(UserRole.PSYCHOLOGIST, false);
        long totalPatients = userRepository.countByRole(UserRole.PATIENT);
        long activeLinks = linkRepository.countByStatus(LinkStatus.ACTIVE);

        long totalPsychologists = activePsychologists + inactivePsychologists;
        double averagePatients = totalPsychologists == 0
                ? 0.0
                : BigDecimal.valueOf((double) activeLinks / totalPsychologists)
                        .setScale(2, RoundingMode.HALF_UP)
                        .doubleValue();

        return new AdminDashboardResponse(
                activePsychologists,
                inactivePsychologists,
                totalPatients,
                activeLinks,
                averagePatients,
                sessionRepository.countByStatus(SessionStatus.SCHEDULED),
                sessionRepository.countByStatus(SessionStatus.COMPLETED),
                sessionRepository.countByStatus(SessionStatus.NO_SHOW),
                sessionRepository.countByStatus(SessionStatus.CANCELED),
                sessionRepository.countByStatus(SessionStatus.DISPUTED)
        );
    }

    @Transactional(readOnly = true)
    public List<AdminPsychologistResponse> listPsychologists() {
        List<User> psychologists = userRepository.findAllByRoleOrderByNameAsc(UserRole.PSYCHOLOGIST);
        Map<Long, PsychologistProfile> profilesByUserId = psychologistRepository.findAll().stream()
                .collect(Collectors.toMap(PsychologistProfile::getUserId, Function.identity()));

        Map<Long, Long> activeLinksByPsychologist = new HashMap<>();
        for (Object[] row : linkRepository.countGroupedByPsychologistAndStatus(LinkStatus.ACTIVE)) {
            activeLinksByPsychologist.put((Long) row[0], ((Number) row[1]).longValue());
        }

        Map<Long, long[]> sessionsByPsychologist = new HashMap<>();
        for (Object[] row : sessionRepository.countGroupedByPsychologist(SessionStatus.DISPUTED)) {
            long total = ((Number) row[1]).longValue();
            long disputed = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            sessionsByPsychologist.put((Long) row[0], new long[]{total, disputed});
        }

        return psychologists.stream().map(user -> {
            PsychologistProfile profile = profilesByUserId.get(user.getId());
            long[] sessionCounts = sessionsByPsychologist.getOrDefault(user.getId(), new long[]{0L, 0L});

            return new AdminPsychologistResponse(
                    user.getId(),
                    user.getName(),
                    user.getEmail(),
                    Boolean.TRUE.equals(user.getActive()),
                    profile != null ? profile.getCrp() : null,
                    profile != null ? profile.getApproach().getName() : null,
                    profile != null ? profile.getBio() : null,
                    activeLinksByPsychologist.getOrDefault(user.getId(), 0L),
                    sessionCounts[0],
                    sessionCounts[1]
            );
        }).toList();
    }

    @Transactional
    public AdminUserStatusResponse updateUserStatus(String adminEmail, Long targetUserId, boolean active) {
        User adminUser = userRepository.findByEmail(EmailNormalizer.normalize(adminEmail))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Administrador não encontrado."));

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilizador não encontrado."));

        if (adminUser.getId().equals(targetUser.getId())) {
            throw new IllegalArgumentException("Não é permitido desativar ou alterar o próprio status administrativo.");
        }

        if (targetUser.getRole() == UserRole.ADMIN) {
            throw new AccessDeniedException("Não é permitido alterar o status de outro administrador.");
        }

        targetUser.setActive(active);
        return AdminUserStatusResponse.fromEntity(userRepository.save(targetUser));
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> listSessions(SessionStatus statusFilter) {
        List<Session> sessions = statusFilter != null
                ? sessionRepository.findAllByStatusOrderByStartTimeDesc(statusFilter)
                : sessionRepository.findAllByOrderByStartTimeDesc();

        return sessions.stream().map(SessionResponse::fromEntity).toList();
    }

    @Transactional
    public SessionResponse resolveDisputedSession(Long sessionId, SessionStatus resolutionStatus) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sessão não encontrada."));

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
}
