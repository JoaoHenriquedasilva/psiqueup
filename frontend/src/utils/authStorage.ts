/**
 * Remove chaves legadas de autenticação do localStorage utilizadas antes da migração
 * para cookies HttpOnly. Não armazena nem lê tokens no navegador.
 */
export function clearLegacyAuthStorage(): void {
    try {
        localStorage.removeItem('@psiqueup:token');
        localStorage.removeItem('@psiqueup:user');
    } catch {
        // Ignora indisponibilidade de storage em ambientes restritos
    }
}
