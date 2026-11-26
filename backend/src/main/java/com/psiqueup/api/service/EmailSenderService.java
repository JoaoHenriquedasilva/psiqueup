package com.psiqueup.api.service;

public interface EmailSenderService {

    void sendEmailVerification(String toEmail, String recipientName, String verificationLink);

    void sendPasswordReset(String toEmail, String recipientName, String resetLink);
}
