import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface FeedbackMessage {
    type: 'success' | 'error';
    text: string;
}

interface FeedbackBannerProps {
    feedback: FeedbackMessage | null;
    onClose: () => void;
}

/**
 * Banner reutilizável para exibir mensagens de sucesso ou erro nos painéis.
 */
export function FeedbackBanner({ feedback, onClose }: FeedbackBannerProps) {
    if (!feedback) {
        return null;
    }

    const isSuccess = feedback.type === 'success';

    return (
        <div
            role="status"
            className={`rounded-xl px-4 py-3 text-sm border border-l-4 flex items-center justify-between gap-3 shadow-surface ${
                isSuccess
                    ? 'bg-[#E8F4EE] border-[#C6E3D3] border-l-[#1B5E3F] text-[#1B5E3F]'
                    : 'bg-[#FDF0EF] border-[#F3C9C8] border-l-[#9E2A2B] text-[#9E2A2B]'
            }`}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                {isSuccess ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span className="leading-snug">{feedback.text}</span>
            </div>
            <button
                type="button"
                onClick={onClose}
                aria-label="Fechar aviso"
                className="p-1 rounded-lg hover:bg-black/5 transition cursor-pointer shrink-0"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
