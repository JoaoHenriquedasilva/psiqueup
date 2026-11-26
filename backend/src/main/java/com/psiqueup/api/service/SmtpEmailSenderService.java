package com.psiqueup.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Implementação de envio real de e-mail via SMTP para o perfil de produção.
 */
@Slf4j
@Service
@Profile("prod")
@RequiredArgsConstructor
public class SmtpEmailSenderService implements EmailSenderService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@psiqueup.com.br}")
    private String fromAddress;

    @Override
    public void sendEmailVerification(String toEmail, String recipientName, String verificationLink) {
        String subject = "Confirme seu cadastro no PsiqueUp";
        String body = """
                Olá, %s!

                Para ativar sua conta no PsiqueUp, confirme seu e-mail acessando o link abaixo:
                %s

                Este link expira em 24 horas. Se você não realizou este cadastro, ignore esta mensagem.
                """.formatted(recipientName, verificationLink);

        sendPlainTextEmail(toEmail, subject, body);
    }

    @Override
    public void sendPasswordReset(String toEmail, String recipientName, String resetLink) {
        String subject = "Redefinição de senha - PsiqueUp";
        String body = """
                Olá, %s!

                Recebemos uma solicitação para redefinir a senha da sua conta no PsiqueUp.
                Acesse o link abaixo para criar uma nova senha:
                %s

                Este link expira em 30 minutos. Se você não solicitou esta alteração, ignore esta mensagem.
                """.formatted(recipientName, resetLink);

        sendPlainTextEmail(toEmail, subject, body);
    }

    private void sendPlainTextEmail(String toEmail, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
        log.info("E-mail transacional '{}' enviado com sucesso para {}", subject, maskEmail(toEmail));
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
