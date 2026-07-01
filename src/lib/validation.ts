export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Check if it already has a scheme
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);

  // If it has a scheme but it's not http(s), reject immediately
  if (hasScheme && !/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function faviconUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return null;
  }
}
