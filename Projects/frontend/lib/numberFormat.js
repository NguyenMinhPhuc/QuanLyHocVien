export function sanitizeNumericInput(raw) {
  if (raw == null) return ''
  let s = String(raw)
  s = s.replace(/[^0-9.]/g, '')
  const parts = s.split('.')
  if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('')
  return s
}

export function formatWithThousands(raw) {
  if (raw == null || raw === '') return ''
  const s = String(raw).replace(/,/g, '')
  if (s.indexOf('.') >= 0) {
    const [intPart, frac] = s.split('.')
    const i = Number(intPart || 0).toLocaleString()
    return frac ? `${i}.${frac}` : `${i}.`
  }
  return Number(s).toLocaleString()
}
