import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface FeedbackMessage {
    type: 'success' | 'error' | 'info';
    text: string;
}

interface FeedbackBannerProps {
    feedback: FeedbackMessage | null;
    onClose: () => void;
}

const BANNER_VARIANTS = {
    success: {
        container: 'bg-success-bg border-success-border border-l-success-ink text-success-ink',
        Icon: CheckCircle2,
    },
    error: {
        container: 'bg-danger-bg border-danger-border border-l-danger-ink text-danger-ink',
        Icon: AlertCircle,
    },
    info: {
        container:
            'bg-slate-inst-tint border-slate-inst-border border-l-slate-inst text-slate-inst-ink',
        Icon: Info,
    },
} as const;

/**
 * Banner reutilizável para exibir mensagens de sucesso, erro ou informação nos painéis.
 */
export function FeedbackBanner({ feedback, onClose }: FeedbackBannerProps) {
    if (!feedback) {
        return null;
    }

    const { container, Icon } = BANNER_VARIANTS[feedback.type];

    return (
        <div
            role="status"
            className={`rounded-xl px-4 py-3 text-sm border border-l-4 flex items-center justify-between gap-3 shadow-surface ${container}`}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="leading-snug">{feedback.text}</span>
            </div>
            <button
                type="button"
                onClick={onClose}
                aria-label="Fechar aviso"
                className="p-1 rounded-lg hover:bg-ink/10 transition cursor-pointer shrink-0"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
