package com.psiqueup.api.domain.enums;

/**
 * Perfis permitidos no auto-registro público (/api/auth/register).
 * Contas administrativas não podem ser criadas via cadastro aberto.
 */
public enum PublicUserRole {
    PSYCHOLOGIST,
    PATIENT;

    public UserRole toUserRole() {
        return UserRole.valueOf(name());
    }
}
