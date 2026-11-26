package com.psiqueup.api.service;

/**
 * Evento publicado após alterações persistidas de autenticação para disparo
 * assíncrono de e-mails fora da transação JPA.
 */
public record EmailNotificationEvent(
        Type type,
        String toEmail,
        String recipientName,
        String actionLink
) {
    public enum Type {
        EMAIL_VERIFICATION,
        PASSWORD_RESET
    }
}
