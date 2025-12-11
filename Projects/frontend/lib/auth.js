// Using HttpOnly cookies for auth. Fetch with credentials included.
export function authFetch(url, opts = {}) {
  const headers = opts.headers || {};
  // default backend host for API calls during development
  const backendHost = 'http://localhost:4000'
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
  await fetch('http://localhost:4000/api/auth/logout', { method: 'POST', credentials: 'include' });
}
