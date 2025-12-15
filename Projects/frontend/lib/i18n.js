import translations from '../locales/vi.json'

export function t(key, fallback) {
  if (!key) return ''
  const v = translations[key]
  if (typeof v === 'undefined') return fallback || key
  return v
}

export function setLocale() {
  // simple single-locale app for now
}
