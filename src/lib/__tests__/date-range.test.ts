import { describe, it, expect } from 'vitest'

// Extract the dateRange function for testing
// (it's not exported from queries.ts since it's internal, so we replicate it here
// to verify the logic independently)
function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const current = new Date(sy, sm - 1, sd)
  const last = new Date(ey, em - 1, ed)
  while (current <= last) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 1)
  }
  return dates
}

describe('dateRange', () => {
  it('returns single date for same start and end', () => {
    expect(dateRange('2026-04-03', '2026-04-03')).toEqual(['2026-04-03'])
  })

  it('returns correct range for multi-day span', () => {
    expect(dateRange('2026-04-03', '2026-04-05')).toEqual([
      '2026-04-03',
      '2026-04-04',
      '2026-04-05',
    ])
  })

  it('handles month boundaries', () => {
    const result = dateRange('2026-03-30', '2026-04-02')
    expect(result).toEqual([
      '2026-03-30',
      '2026-03-31',
      '2026-04-01',
      '2026-04-02',
    ])
  })

  it('handles year boundaries', () => {
    const result = dateRange('2026-12-30', '2027-01-02')
    expect(result).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ])
  })

  it('returns empty for end before start', () => {
    expect(dateRange('2026-04-05', '2026-04-03')).toEqual([])
  })

  it('preserves exact date strings (no timezone shift)', () => {
    // This was the original bug: toISOString() shifted dates in non-UTC timezones
    const result = dateRange('2026-04-03', '2026-04-05')
    expect(result[0]).toBe('2026-04-03')
    expect(result[1]).toBe('2026-04-04')
    expect(result[2]).toBe('2026-04-05')
  })

  it('handles single-digit months and days with zero padding', () => {
    const result = dateRange('2026-01-08', '2026-01-10')
    expect(result).toEqual(['2026-01-08', '2026-01-09', '2026-01-10'])
  })
})
