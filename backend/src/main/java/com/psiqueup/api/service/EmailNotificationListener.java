package com.psiqueup.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listener responsável por enviar e-mails somente após o commit da transação JPA,
 * executando de forma assíncrona para não bloquear threads de requisição HTTP.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmailNotificationListener {

    private final EmailSenderService emailSenderService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleEmailNotification(EmailNotificationEvent event) {
        try {
            switch (event.type()) {
                case EMAIL_VERIFICATION -> emailSenderService.sendEmailVerification(
                        event.toEmail(),
                        event.recipientName(),
                        event.actionLink()
                );
                case PASSWORD_RESET -> emailSenderService.sendPasswordReset(
                        event.toEmail(),
                        event.recipientName(),
                        event.actionLink()
                );
            }
        } catch (Exception ex) {
            log.error("Falha ao enviar e-mail assíncrono do tipo {}: {}", event.type(), ex.getMessage());
        }
    }
}
