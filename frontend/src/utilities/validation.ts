/**
 * Validate Bangladeshi phone number: 11 digits starting with 01[3-9]
 */
export function isValidBangladeshPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+?88)?01[3-9]\d{8}$/.test(cleaned);
}

/**
 * Validate a standard email address with a dotted domain.
 */
export function isValidEmail(email: string): boolean {
  const cleaned = email.trim();
  if (cleaned.length > 254) return false;

  const [localPart, ...domainParts] = cleaned.split('@');
  if (!localPart || domainParts.length !== 1 || localPart.length > 64) return false;

  const [domain] = domainParts;
  if (!domain || localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return false;
  }

  return /^[A-Za-z0-9.!$%&'*+\/=?^_`{|}~-]+$/.test(localPart)
    && /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(domain);
}

/**
 * Validate bKash / Nagad TrxID: 8 to 12 alphanumeric characters (letters and digits)
 */
export function isValidTrxId(trxId: string): boolean {
  if (!trxId) return false;
  const cleaned = trxId.trim();
  return /^[A-Za-z0-9]{8,12}$/.test(cleaned);
}

/**
 * Validate customer name
 */
export function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}

/**
 * Validate delivery address
 */
export function isValidAddress(address: string): boolean {
  return address.trim().length >= 5;
}
