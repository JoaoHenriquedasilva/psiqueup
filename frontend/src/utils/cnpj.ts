/**
 * Utilitários de sanitização, máscara e validação de CNPJ (14 dígitos).
 */

/** Remove todos os caracteres não numéricos e limita a 14 dígitos. */
export function stripCnpj(value: string): string {
    return value.replace(/\D/g, '').slice(0, 14);
}

/** Aplica a máscara progressiva 00.000.000/0000-00 ao CNPJ. */
export function formatCnpj(value: string): string {
    const digits = stripCnpj(value);
    return digits
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

function calcCheckDigit(digits: string, length: number): number {
    let sum = 0;
    let weight = length - 7;
    for (let i = length; i >= 1; i--) {
        sum += Number(digits[length - i]) * weight--;
        if (weight < 2) {
            weight = 9;
        }
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
}

/** Valida se o CNPJ possui 14 dígitos numéricos e dígitos verificadores oficiais válidos. */
export function isValidCnpj(value: string): boolean {
    const digits = stripCnpj(value);
    if (digits.length !== 14) {
        return false;
    }

    if (/^(\d)\1{13}$/.test(digits)) {
        return false;
    }

    const firstDigit = calcCheckDigit(digits, 12);
    const secondDigit = calcCheckDigit(digits, 13);

    return firstDigit === Number(digits[12]) && secondDigit === Number(digits[13]);
}
