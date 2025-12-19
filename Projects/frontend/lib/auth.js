// Using HttpOnly cookies for auth. Fetch with credentials included.
export async function authFetch(url, opts = {}) {
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

  // perform fetch including cookies
  const res = await fetch(finalUrl, { ...opts, headers, credentials: 'include' });

  // If unauthorized, attempt silent refresh once and retry original request
  if (res.status === 401) {
    try {
      const r = await fetch((backendHost) + '/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (r.ok) {
        // retry original request
        return fetch(finalUrl, { ...opts, headers, credentials: 'include' });
      }
    } catch (e) {
      // ignore and fallthrough to return original 401
    }
  }

  return res;
}

export async function logout() {
  const envHost = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') : 'http://localhost:4000'
  await fetch(envHost + '/api/auth/logout', { method: 'POST', credentials: 'include' });
}

// Optional client-side token helpers (localStorage fallback)
export function saveToken(token) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try { window.localStorage.setItem('token', token) } catch (e) { /* noop */ }
  }
}

export function getToken() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try { return window.localStorage.getItem('token') } catch (e) { return null }
  }
  return null
}
