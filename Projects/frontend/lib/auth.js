// Using HttpOnly cookies for auth. Fetch with credentials included.
export function authFetch(url, opts = {}) {
  const headers = opts.headers || {};
  // backend host from environment (NEXT_PUBLIC_API_URL) with fallback
  const envHost = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) ? process.env.NEXT_PUBLIC_API_URL : null
  const backendHost = envHost ? String(envHost).replace(/\/$/, '') : 'http://localhost:4000'
  let finalUrl = url
  try {
    // if url is a relative API path (starts with /api), prepend backend host
    if (typeof url === 'string' && url.startsWith('/api')) {
      finalUrl = backendHost + url
    }
  } catch (e) {
    finalUrl = url
  }
  return fetch(finalUrl, { ...opts, headers, credentials: 'include' });
}

export async function logout() {
  const envHost = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') : 'http://localhost:4000'
  await fetch(envHost + '/api/auth/logout', { method: 'POST', credentials: 'include' });
}
