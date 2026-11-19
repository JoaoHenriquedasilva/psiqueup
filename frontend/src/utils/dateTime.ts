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
 */
export function localDateTimeToIso(date: string, time: string): string {
    return new Date(`${date}T${time}:00`).toISOString();
}

/**
 * Formata a data e o intervalo de horário de uma sessão no fuso horário local do usuário.
 */
export function formatSessionDateTime(startIso: string, endIso: string): string {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

    return `${start.toLocaleDateString('pt-BR')} • ${start.toLocaleTimeString('pt-BR', timeOptions)} às ${end.toLocaleTimeString('pt-BR', timeOptions)}`;
}
