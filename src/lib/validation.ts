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
    if (
      u.hostname.includes("konabase") ||
      u.hostname.includes("konawiki") ||
      u.hostname.includes("konaway")
    ) {
      return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNGRjNDNDIiLz48dGV4dCB4PSIzMiIgeT0iMzMiIGZpbGw9IiNmZmZmZmYiIGZvbnQtZmFtaWx5PSJBcmlhbCwgSGVsdmV0aWNhLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjQyIiBmb250LXdlaWdodD0iNzAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCI+SzwvdGV4dD48L3N2Zz4=";
    }
    return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${u.hostname}&size=128`;
  } catch {
    return null;
  }
}

export function validName(name: string): string | null {
  const t = name.trim();
  return t.length >= 1 && t.length <= 20 ? t : null;
}

export function validPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
