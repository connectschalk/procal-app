/**
 * South African ID number: 13 digits with Luhn-style checksum (last digit).
 */

export function normalizeSaIdNumberInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 13);
}

/** Standard SA ID checksum on the last digit. */
export function isValidSaIdNumberChecksum(digits13: string): boolean {
  if (!/^\d{13}$/.test(digits13)) return false;
  let c = 0;
  for (let i = 0; i < 12; i += 2) {
    c += Number.parseInt(digits13[i]!, 10);
  }
  for (let i = 1; i < 12; i += 2) {
    const d = Number.parseInt(digits13[i]!, 10) * 2;
    c += Math.floor(d / 10) + (d % 10);
  }
  const check = (10 - (c % 10)) % 10;
  return check === Number.parseInt(digits13[12]!, 10);
}

export function isValidSaIdNumberFormat(raw: string): boolean {
  const n = normalizeSaIdNumberInput(raw);
  return n.length === 13 && isValidSaIdNumberChecksum(n);
}
