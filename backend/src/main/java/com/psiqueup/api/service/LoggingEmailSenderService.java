package com.psiqueup.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Implementação padrão de envio de e-mail para desenvolvimento/testes.
 * Não requer servidor SMTP ativo e não expõe tokens sensíveis nos logs.
 */
@Slf4j
@Service
@Profile("!prod")
public class LoggingEmailSenderService implements EmailSenderService {

    @Override
    public void sendEmailVerification(String toEmail, String recipientName, String verificationLink) {
        log.info("E-mail de confirmação de conta preparado para {} ({})", maskEmail(toEmail), recipientName);
    }

    @Override
    public void sendPasswordReset(String toEmail, String recipientName, String resetLink) {
        log.info("E-mail de redefinição de senha preparado para {} ({})", maskEmail(toEmail), recipientName);
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "***";
        }
        int atIndex = email.indexOf('@');
        if (atIndex <= 2) {
            return "***" + email.substring(atIndex);
        }
        return email.substring(0, 2) + "***" + email.substring(atIndex);
    }
}
