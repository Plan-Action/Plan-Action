export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_HINT = "Use pelo menos 12 caracteres, com letras maiúsculas, minúsculas, números e símbolo. Evite senhas comuns e sequências.";

export function passwordError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return PASSWORD_HINT;
  if (new TextEncoder().encode(password).length > 72) return "Senha muito longa. Reduza o tamanho, mantendo pelo menos 12 caracteres.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9\s]/.test(password)) return PASSWORD_HINT;
  const normalized = password.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (/(password|senha|qwerty|123456|abcdef|admin123|professor123|coordenador123)/.test(normalized) || /^(.)\1+$/.test(normalized)) {
    return "Escolha uma senha menos previsível, sem palavras comuns ou sequências.";
  }
  return null;
}
