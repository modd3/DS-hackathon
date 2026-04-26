// In dev the Vite proxy rewrites /api → http://localhost:4000, avoiding CORS entirely.
// In production set VITE_API_BASE_URL to the deployed server origin.
export const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || '')
export const POLL_INTERVAL = Number(import.meta.env.VITE_POLL_INTERVAL_MS || 15000)

export const WEBHOOK_SECRET = import.meta.env.VITE_WEBHOOK_SECRET || 'SVp3R53cRe7sEcr37'

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.auth ? { 'x-dayliff-webhook-token': WEBHOOK_SECRET } : {}),
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}