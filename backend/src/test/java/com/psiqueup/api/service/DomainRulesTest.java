package com.psiqueup.api.service;

import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.PublicUserRole;
import com.psiqueup.api.domain.enums.SessionStatus;
import com.psiqueup.api.dto.auth.LoginRequest;
import com.psiqueup.api.dto.auth.RegisterRequest;
import com.psiqueup.api.dto.link.CreateLinkRequest;
import com.psiqueup.api.dto.link.LinkResponse;
import com.psiqueup.api.dto.link.RejectLinkRequest;
import com.psiqueup.api.dto.profile.UpsertPsychologistProfileRequest;
import com.psiqueup.api.dto.session.CreateSessionRequest;
import com.psiqueup.api.dto.session.SessionResponse;
import com.psiqueup.api.dto.session.UpdateSessionStatusRequest;
import com.psiqueup.api.repository.SessionRepository;
import com.psiqueup.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DomainRulesTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private ProfileDomainService profileDomainService;

    @Autowired
    private LinkService linkService;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SessionRepository sessionRepository;

    private String uniqueSuffix() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private String uniqueBrazilianCrp() {
        int number = 100000 + Math.abs(UUID.randomUUID().hashCode() % 899999);
        return "06/" + number;
    }

    @Test
    void shouldNormalizeEmailsOnRegisterLoginAndLink() {
        String suffix = uniqueSuffix();
        String rawPsychEmail = "  Dra.Psicologa." + suffix + "@PsiqueUp.Test  ";
        String rawPatientEmail = "  Paciente.Teste." + suffix + "@PsiqueUp.Test ";

        var psychAuth = authService.register(new RegisterRequest(
                "  Dra. Psicologa  ",
                rawPsychEmail,
                "secret123",
                PublicUserRole.PSYCHOLOGIST
        ));
        assertThat(psychAuth.email()).isEqualTo("dra.psicologa." + suffix + "@psiqueup.test");
        assertThat(psychAuth.name()).isEqualTo("Dra. Psicologa");

        var patientAuth = authService.register(new RegisterRequest(
                "Carlos Paciente",
                rawPatientEmail,
                "secret123",
                PublicUserRole.PATIENT
        ));
        assertThat(patientAuth.email()).isEqualTo("paciente.teste." + suffix + "@psiqueup.test");

        // Login com variação de caixa e espaços
        var loginRes = authService.login(new LoginRequest("  PACIENTE.TESTE." + suffix + "@psiqueup.test ", "secret123"));
        assertThat(loginRes.email()).isEqualTo(patientAuth.email());

        // Configurar CRP e vincular usando e-mail com caixa mista
        profileDomainService.upsertPsychologistProfile(
                psychAuth.email(),
                new UpsertPsychologistProfileRequest(uniqueBrazilianCrp(), 1L, "Bio teste")
        );

        LinkResponse link = linkService.createLink(
                "DRA.PSICOLOGA." + suffix + "@psiqueup.test",
                new CreateLinkRequest("  PACIENTE.TESTE." + suffix + "@PSIQUEUP.TEST ")
        );
        assertThat(link.patientEmail()).isEqualTo(patientAuth.email());
    }

    @Test
    void shouldEnforceSessionStateMachineEarlyCompletionAndDoubleBooking() {
        String suffix = uniqueSuffix();
        String psychEmail = "psych." + suffix + "@psiqueup.test";
        String patientEmail = "patient." + suffix + "@psiqueup.test";

        authService.register(new RegisterRequest("Psicologo", psychEmail, "secret123", PublicUserRole.PSYCHOLOGIST));
        authService.register(new RegisterRequest("Paciente", patientEmail, "secret123", PublicUserRole.PATIENT));

        profileDomainService.upsertPsychologistProfile(
                psychEmail,
                new UpsertPsychologistProfileRequest(uniqueBrazilianCrp(), 1L, null)
        );
        LinkResponse link = linkService.createLink(psychEmail, new CreateLinkRequest(patientEmail));

        OffsetDateTime start = OffsetDateTime.now().plusHours(3);
        OffsetDateTime end = start.plusHours(1);

        SessionResponse session = sessionService.scheduleSession(
                psychEmail,
                new CreateSessionRequest(link.patientId(), start, end)
        );

        // 1. Double-booking (horário sobreposto) deve falhar com 409 CONFLICT
        assertThatThrownBy(() -> sessionService.scheduleSession(
                psychEmail,
                new CreateSessionRequest(link.patientId(), start.plusMinutes(30), end.plusMinutes(30))
        ))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.CONFLICT));

        // 2. Registrar falta (NO_SHOW) antes do horário agendado deve falhar
        assertThatThrownBy(() -> sessionService.updateStatus(
                psychEmail,
                session.id(),
                new UpdateSessionStatusRequest(SessionStatus.NO_SHOW, false)
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("registrar falta antes do horário");

        // 3. Marcar COMPLETED antes do horário sem confirmar adiantamento deve falhar
        assertThatThrownBy(() -> sessionService.updateStatus(
                psychEmail,
                session.id(),
                new UpdateSessionStatusRequest(SessionStatus.COMPLETED, false)
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Confirme o adiantamento");

        // 4. Marcar COMPLETED antes do horário COM confirmação de adiantamento deve funcionar
        SessionResponse completed = sessionService.updateStatus(
                psychEmail,
                session.id(),
                new UpdateSessionStatusRequest(SessionStatus.COMPLETED, true)
        );
        assertThat(completed.status()).isEqualTo(SessionStatus.COMPLETED);

        // 5. Psicólogo não pode reabrir sessão COMPLETED para SCHEDULED
        assertThatThrownBy(() -> sessionService.updateStatus(
                psychEmail,
                session.id(),
                new UpdateSessionStatusRequest(SessionStatus.SCHEDULED, false)
        ))
                .isInstanceOf(IllegalArgumentException.class);

        // 6. Paciente pode contestar sessão COMPLETED -> DISPUTED
        SessionResponse disputed = sessionService.updateStatus(
                patientEmail,
                session.id(),
                new UpdateSessionStatusRequest(SessionStatus.DISPUTED, false)
        );
        assertThat(disputed.status()).isEqualTo(SessionStatus.DISPUTED);

        // 7. Sessão DISPUTED não pode ser sobrescrita pelo psicólogo
        assertThatThrownBy(() -> sessionService.updateStatus(
                psychEmail,
                session.id(),
                new UpdateSessionStatusRequest(SessionStatus.COMPLETED, true)
        ))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldCancelScheduledSessionsWhenPatientRejectsLinkAndEnforceRoles() {
        String suffix = uniqueSuffix();
        String psychEmail = "psych.rej." + suffix + "@psiqueup.test";
        String patientEmail = "patient.rej." + suffix + "@psiqueup.test";

        authService.register(new RegisterRequest("Psicologo", psychEmail, "secret123", PublicUserRole.PSYCHOLOGIST));
        authService.register(new RegisterRequest("Paciente", patientEmail, "secret123", PublicUserRole.PATIENT));

        // Paciente tentando criar vínculo deve receber 403 AccessDeniedException
        assertThatThrownBy(() -> linkService.createLink(patientEmail, new CreateLinkRequest(psychEmail)))
                .isInstanceOf(AccessDeniedException.class);

        profileDomainService.upsertPsychologistProfile(
                psychEmail,
                new UpsertPsychologistProfileRequest(uniqueBrazilianCrp(), 1L, null)
        );
        LinkResponse link = linkService.createLink(psychEmail, new CreateLinkRequest(patientEmail));

        OffsetDateTime start = OffsetDateTime.now().plusDays(1);
        SessionResponse scheduled = sessionService.scheduleSession(
                psychEmail,
                new CreateSessionRequest(link.patientId(), start, start.plusHours(1))
        );
        assertThat(scheduled.status()).isEqualTo(SessionStatus.SCHEDULED);

        // Ao rejeitar o vínculo, a sessão SCHEDULED deve ser cancelada automaticamente
        linkService.rejectLink(patientEmail, link.id(), new RejectLinkRequest("Não reconheço"));

        var updatedSession = sessionRepository.findById(scheduled.id()).orElseThrow();
        assertThat(updatedSession.getStatus()).isEqualTo(SessionStatus.CANCELED);

        // Conta inativa deve ser bloqueada
        User patientUser = userRepository.findByEmail(patientEmail).orElseThrow();
        patientUser.setActive(false);
        userRepository.save(patientUser);

        assertThatThrownBy(() -> sessionService.listMySessions(patientEmail))
                .isInstanceOf(AccessDeniedException.class);
    }
}
