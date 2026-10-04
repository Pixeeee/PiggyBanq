/** Server-only configuration. Browser requests always use /backend. */
export function resolveApiBaseUrl(environment: Record<string, string | undefined> = process.env): string {
  const value = environment.API_BASE_URL ?? environment.NEXT_PUBLIC_API_BASE_URL ?? environment.NEXT_PUBLIC_API_URL;
  if (!value && environment.NODE_ENV === 'production') throw new Error('API_BASE_URL is required for production.');
  let url: URL;
  try { url = new URL(value ?? 'http://127.0.0.1:4000'); }
  catch { throw new Error('API_BASE_URL must be a valid HTTP(S) origin.'); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || /[^/]/.test(url.pathname)) {
    throw new Error('API_BASE_URL must be an HTTP(S) origin without credentials, path, query or fragment.');
  }
  if (environment.NODE_ENV === 'production' && url.protocol !== 'https:' && !loopback) {
    throw new Error('API_BASE_URL must use HTTPS in production.');
  }
  return url.origin;
}
