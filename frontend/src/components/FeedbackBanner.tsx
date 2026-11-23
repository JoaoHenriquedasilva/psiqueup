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

    return (
        <div
            role="status"
            className={`rounded-xl px-4 py-3 text-sm border flex items-center justify-between ${
                feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-700'
            }`}
        >
            <span>{feedback.text}</span>
            <button
                type="button"
                onClick={onClose}
                className="text-xs underline ml-4 cursor-pointer"
            >
                Fechar
            </button>
        </div>
    );
}
