package com.psiqueup.api.util;

public final class CnpjUtils {

    private static final int[] FIRST_WEIGHTS = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
    private static final int[] SECOND_WEIGHTS = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};

    private CnpjUtils() {
    }

    public static String sanitize(String rawCnpj) {
        if (rawCnpj == null) {
            return null;
        }
        return rawCnpj.replaceAll("\\D", "");
    }

    public static boolean isValid(String rawCnpj) {
        String digits = sanitize(rawCnpj);
        if (digits == null || digits.length() != 14) {
            return false;
        }

        // Rejeita sequências repetidas como 00000000000000, 11111111111111, etc.
        char firstChar = digits.charAt(0);
        boolean allEqual = true;
        for (int i = 1; i < digits.length(); i++) {
            if (digits.charAt(i) != firstChar) {
                allEqual = false;
                break;
            }
        }
        if (allEqual) {
            return false;
        }

        int firstCheckDigit = calculateDigit(digits, FIRST_WEIGHTS);
        if (Character.getNumericValue(digits.charAt(12)) != firstCheckDigit) {
            return false;
        }

        int secondCheckDigit = calculateDigit(digits, SECOND_WEIGHTS);
        return Character.getNumericValue(digits.charAt(13)) == secondCheckDigit;
    }

    public static String normalizeAndValidate(String rawCnpj) {
        String digits = sanitize(rawCnpj);
        if (!isValid(digits)) {
            throw new IllegalArgumentException("CNPJ inválido.");
        }
        return digits;
    }

    private static int calculateDigit(String digits, int[] weights) {
        int sum = 0;
        for (int i = 0; i < weights.length; i++) {
            sum += Character.getNumericValue(digits.charAt(i)) * weights[i];
        }
        int remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }
}
