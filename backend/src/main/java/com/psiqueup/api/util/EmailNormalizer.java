package com.psiqueup.api.util;

import java.util.Locale;

/**
 * Utilitário centralizado para normalização consistente de endereços de e-mail.
 */
public final class EmailNormalizer {

    private EmailNormalizer() {
    }

    public static String normalize(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
