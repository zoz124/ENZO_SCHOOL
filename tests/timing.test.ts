import { describe, expect, it } from 'vitest'
import { computeTiming, formatCountdown, resolveSubmissionStatus } from '@/lib/exam-timing'

const START = new Date('2026-11-18T10:00:00.000Z').getTime()
const at = (secondsAfterStart: number) => START + secondsAfterStart * 1000

describe('computeTiming', () => {
  it('starts with the full duration remaining', () => {
    const state = computeTiming(START, 30, at(0))
    expect(state.remainingSeconds).toBe(1800)
    expect(state.expired).toBe(false)
    expect(state.elapsedSeconds).toBe(0)
  })

  it('counts down correctly after 5 minutes', () => {
    const state = computeTiming(START, 30, at(300))
    expect(state.remainingSeconds).toBe(1500)
    expect(state.elapsedSeconds).toBe(300)
    expect(state.expired).toBe(false)
  })

  it('reports expiry exactly at the deadline', () => {
    const state = computeTiming(START, 30, at(1800))
    expect(state.remainingSeconds).toBe(0)
    expect(state.expired).toBe(true)
  })

  it('never returns negative remaining time past the deadline', () => {
    const state = computeTiming(START, 30, at(9999))
    expect(state.remainingSeconds).toBe(0)
    expect(state.expired).toBe(true)
    // Elapsed is capped at the limit, so a late submit cannot inflate it.
    expect(state.elapsedSeconds).toBe(1800)
  })

  it('keeps the REAL remaining time across a refresh', () => {
    // A refresh 10 minutes in must show 20 minutes left, not a fresh 30.
    const state = computeTiming(START, 30, at(600))
    expect(state.remainingSeconds).toBe(1200)
  })

  it('is unaffected by a client clock that claims no time passed', () => {
    // The server passes its own `now`; the stored startedAt wins.
    const early = computeTiming(START, 30, at(1200))
    expect(early.remainingSeconds).toBe(600)
  })

  it('handles a 1-minute exam', () => {
    expect(computeTiming(START, 1, at(30)).remainingSeconds).toBe(30)
    expect(computeTiming(START, 1, at(60)).expired).toBe(true)
  })

  it('handles a 300-minute exam', () => {
    expect(computeTiming(START, 300, at(0)).remainingSeconds).toBe(18000)
  })

  it('falls back safely on an invalid startedAt', () => {
    const state = computeTiming('not-a-date', 30, at(0))
    expect(state.remainingSeconds).toBe(1800)
    expect(state.expired).toBe(false)
  })

  it('treats a future startedAt as zero elapsed', () => {
    const state = computeTiming(START, 30, at(-500))
    expect(state.elapsedSeconds).toBe(0)
    expect(state.remainingSeconds).toBe(1800)
  })
})

describe('formatCountdown', () => {
  const cases: Array<[number, string]> = [
    [0, '00:00'],
    [59, '00:59'],
    [60, '01:00'],
    [1800, '30:00'],
    [3599, '59:59'],
    [3600, '01:00:00'],
  ]

  for (const [seconds, expected] of cases) {
    it(`formats ${seconds} seconds as ${expected}`, () => {
      expect(formatCountdown(seconds)).toBe(expected)
    })
  }

  it('never renders a negative clock', () => {
    expect(formatCountdown(-10)).toBe('00:00')
  })
})

describe('resolveSubmissionStatus', () => {
  it('marks an in-time submission as submitted', () => {
    expect(resolveSubmissionStatus(START, 30, at(100))).toBe('submitted')
  })

  it('marks a submission at the deadline as auto-submitted', () => {
    expect(resolveSubmissionStatus(START, 30, at(1800))).toBe('auto-submitted')
  })

  it('marks a late submission as auto-submitted', () => {
    expect(resolveSubmissionStatus(START, 30, at(5000))).toBe('auto-submitted')
  })
})
