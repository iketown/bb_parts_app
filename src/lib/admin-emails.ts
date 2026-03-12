import 'server-only';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }

  return value;
}

function parseAdminEmails(value: string | undefined): Set<string> {
  if (!value) {
    return new Set();
  }

  const trimmedValue = stripWrappingQuotes(value.trim());

  if (!trimmedValue) {
    return new Set();
  }

  if (trimmedValue.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmedValue);

      if (Array.isArray(parsed)) {
        return new Set(
          parsed
            .filter((email): email is string => typeof email === 'string')
            .map(normalizeEmail)
            .filter(Boolean)
        );
      }
    } catch (error) {
      console.error('Failed to parse ADMIN_EMAILS as JSON:', error);
    }
  }

  return new Set(
    trimmedValue
      .split(/[\n,]/)
      .map(normalizeEmail)
      .filter(Boolean)
  );
}

export function getAdminEmailSet(): Set<string> {
  return parseAdminEmails(process.env.ADMIN_EMAILS);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return getAdminEmailSet().has(normalizeEmail(email));
}
