import useSWR from 'swr'
import { apiFetch, POLL_INTERVAL } from '../config/config.js'

const fetcher = (url) => apiFetch(url).then(r => r.data)

export function useJourneys(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString()
  const key = `/api/journeys${qs ? `?${qs}` : ''}`
  return useSWR(key, fetcher, { refreshInterval: POLL_INTERVAL, keepPreviousData: true })
}

export function useTimeline(journeyId) {
  return useSWR(
    journeyId ? `/api/journeys/${journeyId}/timeline` : null,
    fetcher,
    { refreshInterval: POLL_INTERVAL }
  )
}

export function useCurrentStatus(journeyId) {
  return useSWR(
    journeyId ? `/api/journeys/${journeyId}/current-status` : null,
    fetcher,
    { refreshInterval: POLL_INTERVAL }
  )
}

export function useQueueStats() {
  return useSWR('/api/internal/queue/stats', (url) =>
    apiFetch(url, { auth: true }).then(r => r.data),
    { refreshInterval: POLL_INTERVAL }
  )
}

export function useQueueHealth() {
  return useSWR('/api/internal/queue/health', (url) =>
    apiFetch(url, { auth: true }).then(r => r.data),
    { refreshInterval: POLL_INTERVAL }
  )
}

export function useDeadLetters() {
  return useSWR('/api/internal/queue/dead-letters?limit=20', (url) =>
    apiFetch(url, { auth: true }).then(r => r.data),
    { refreshInterval: POLL_INTERVAL }
  )
}

export function useServerHealth() {
  return useSWR('/health', apiFetch, { refreshInterval: 10000 })
}

export function useAnalytics(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString()
  return useSWR(`/api/journeys/analytics${qs ? `?${qs}` : ''}`, fetcher, {
    refreshInterval: POLL_INTERVAL,
    keepPreviousData: true,
  })
}

export function useSlaRules() {
  return useSWR('/api/internal/sla/rules', (url) =>
    apiFetch(url, { auth: true }).then(r => r.data),
    { refreshInterval: POLL_INTERVAL }
  )
}

export function useNotifications() {
  return useSWR('/api/internal/notifications', (url) =>
    apiFetch(url, { auth: true }).then(r => r.data),
    { refreshInterval: 10000 }
  )
}