/**
 * Exam timing rules.
 *
 * The client renders a countdown, but the server is the authority: remaining
 * time is always derived from the stored `startedAt` and the exam duration, so
 * a refresh, a clock change, or a tampered client cannot extend an attempt.
 */

export type TimingState = {
  /** Seconds left, never negative. */
  remainingSeconds: number
  /** True once the deadline has passed. */
  expired: boolean
  /** Seconds the student actually used, capped at the exam duration. */
  elapsedSeconds: number
}

export function computeTiming(
  startedAt: string | number | Date,
  durationMinutes: number,
  now: number = Date.now(),
): TimingState {
  const startedMs = new Date(startedAt).getTime()
  const limitSeconds = Math.max(0, Math.floor(durationMinutes * 60))

  if (!Number.isFinite(startedMs)) {
    return { remainingSeconds: limitSeconds, expired: false, elapsedSeconds: 0 }
  }

  const elapsedRaw = Math.floor((now - startedMs) / 1000)
  const elapsedSeconds = Math.max(0, Math.min(elapsedRaw, limitSeconds))
  const remainingSeconds = Math.max(0, limitSeconds - Math.max(0, elapsedRaw))

  return {
    remainingSeconds,
    expired: elapsedRaw >= limitSeconds,
    elapsedSeconds,
  }
}

/** Format seconds as MM:SS (or HH:MM:SS past an hour). */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

/** The status a submission should be recorded with. */
export function resolveSubmissionStatus(
  startedAt: string | number | Date,
  durationMinutes: number,
  now: number = Date.now(),
): 'submitted' | 'auto-submitted' {
  return computeTiming(startedAt, durationMinutes, now).expired ? 'auto-submitted' : 'submitted'
}
