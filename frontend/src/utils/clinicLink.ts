import type { ClinicLinkItem, ClinicPsychologistStatus } from '../types/api';

/**
 * Seleciona o vínculo de consultório mais relevante para exibição no painel do psicólogo:
 * prioriza APPROVED, depois PENDING, depois o REJECTED mais recente.
 * Retorna null quando o psicólogo atua exclusivamente de forma autônoma.
 */
export function resolvePrimaryClinicLink(links: ClinicLinkItem[]): ClinicLinkItem | null {
    if (links.length === 0) {
        return null;
    }

    const approved = links.find((l) => l.status === 'APPROVED');
    if (approved) return approved;

    const pending = links.find((l) => l.status === 'PENDING');
    if (pending) return pending;

    const sortedRejected = [...links].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return sortedRejected[0] ?? null;
}

export interface ClinicLinkBadgeInfo {
    label: string;
    className: string;
}

/** Retorna rótulo e classes semânticas (--ds-*) para o status do vínculo com consultório. */
export function getClinicLinkBadge(status: ClinicPsychologistStatus | null): ClinicLinkBadgeInfo {
    if (status === 'APPROVED') {
        return {
            label: 'Vinculado ao consultório',
            className: 'bg-success-bg text-success-ink border-success-border',
        };
    }
    if (status === 'PENDING') {
        return {
            label: 'Aguardando aprovação',
            className: 'bg-warning-bg text-warning-ink border-warning-border',
        };
    }
    if (status === 'REJECTED') {
        return {
            label: 'Solicitação recusada',
            className: 'bg-danger-bg text-danger-ink border-danger-border',
        };
    }
    return {
        label: 'Atuação Autônoma',
        className: 'bg-neutral-bg text-neutral-ink border-neutral-border',
    };
}
