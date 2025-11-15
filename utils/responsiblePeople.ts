interface NameSource {
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
}

/**
 * Prüft, ob eine E-Mail zum offiziellen kosmamedia-Account gehört.
 * Wir werten ausschließlich den lokalen Teil vor dem @-Zeichen aus,
 * damit Accounts wie "david.kosma@kosmamedia.de" nicht fälschlicherweise
 * als kosmamedia erkannt werden.
 */
export function isKosmamediaEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return normalized === 'kosmamedia';
  const [localPart] = normalized.split('@');
  return localPart === 'kosmamedia';
}

/**
 * Ermittelt einen Display-Namen aus Vor- und Nachname, mit Fallback auf den
 * E-Mail Local-Part. Das Ergebnis ist bereits getrimmt.
 */
export function buildDisplayName(source: NameSource): string {
  const firstname = (source.firstname || '').trim();
  const lastname = (source.lastname || '').trim();
  if (firstname && lastname) {
    return `${firstname} ${lastname}`.trim();
  }
  if (firstname) return firstname;
  const email = source.email || '';
  if (email.includes('@')) {
    return email.split('@')[0] || email;
  }
  return email || '';
}

/**
 * Hilfsfunktion um aus einem Display-Namen rudimentär Vor- und Nachnamen
 * abzuleiten. Wird u.a. für Filter-Komponenten benötigt.
 */
export function splitDisplayName(name: string): { firstname: string; lastname: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstname: '', lastname: '' };
  }
  if (parts.length === 1) {
    return { firstname: parts[0], lastname: '' };
  }
  return {
    firstname: parts[0],
    lastname: parts.slice(1).join(' '),
  };
}

