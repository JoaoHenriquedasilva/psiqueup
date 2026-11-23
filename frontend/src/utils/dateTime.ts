const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_24H_PATTERN = /^\d{2}:\d{2}$/;

/**
 * Retorna a data local atual no formato YYYY-MM-DD para inputs HTML type="date".
 */
export function getTodayDateInputValue(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Converte data (YYYY-MM-DD) e hora (HH:mm) no fuso horário local do navegador
 * para uma string ISO-8601 UTC compatível com OffsetDateTime no backend.
 * Retorna null se a data ou a hora estiverem ausentes ou inválidas.
 */
export function localDateTimeToIso(date: string, time: string): string | null {
    const cleanDate = date.trim();
    const cleanTime = time.trim();

    if (!ISO_DATE_PATTERN.test(cleanDate) || !TIME_24H_PATTERN.test(cleanTime)) {
        return null;
    }

    const parsed = new Date(`${cleanDate}T${cleanTime}:00`);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toISOString();
}

/**
 * Formata a data e o intervalo de horário de uma sessão no fuso horário local do usuário.
 */
export function formatSessionDateTime(startIso: string, endIso: string): string {
    const start = new Date(startIso);
    const end = new Date(endIso);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return 'Data/horário indisponível';
    }

    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    return `${start.toLocaleDateString('pt-BR')} • ${start.toLocaleTimeString('pt-BR', timeOptions)} às ${end.toLocaleTimeString('pt-BR', timeOptions)}`;
}
