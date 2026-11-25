package com.psiqueup.api.util;

public final class CpfUtils {

    private CpfUtils() {
    }

    public static String sanitize(String rawCpf) {
        if (rawCpf == null) {
            return null;
        }
        return rawCpf.replaceAll("\\D", "");
    }

    public static boolean isValid(String rawCpf) {
        String digits = sanitize(rawCpf);
        if (digits == null || digits.length() != 11) {
            return false;
        }

        // Rejeita sequências repetidas como 00000000000, 11111111111, etc.
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

        int firstCheckDigit = calculateDigit(digits, 9, 10);
        if (Character.getNumericValue(digits.charAt(9)) != firstCheckDigit) {
            return false;
        }

        int secondCheckDigit = calculateDigit(digits, 10, 11);
        return Character.getNumericValue(digits.charAt(10)) == secondCheckDigit;
    }

    public static String normalizeAndValidate(String rawCpf) {
        String digits = sanitize(rawCpf);
        if (!isValid(digits)) {
            throw new IllegalArgumentException("CPF inválido.");
        }
        return digits;
    }

    public static String mask(String rawCpf) {
        String digits = normalizeAndValidate(rawCpf);
        return "***." + digits.substring(3, 6) + "." + digits.substring(6, 9) + "-**";
    }

    private static int calculateDigit(String digits, int length, int initialWeight) {
        int sum = 0;
        for (int i = 0; i < length; i++) {
            sum += Character.getNumericValue(digits.charAt(i)) * (initialWeight - i);
        }
        int remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }
}
