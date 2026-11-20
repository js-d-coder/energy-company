import type { FormEvent } from 'react'

type Props = {
  periodLabel: string
  startDate: string
  endDate: string
  loading: boolean
  rangeError: string
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export default function PeriodBanner({
  periodLabel,
  startDate,
  endDate,
  loading,
  rangeError,
  onStartDateChange,
  onEndDateChange,
  onSubmit,
}: Props) {
  return (
    <section className="period-overview">
      <div className="date-range-section" aria-labelledby="range-heading">
        <div className="date-range-copy">
          <span className="section-kicker">ANALYSIS PERIOD</span>
          <h2 id="range-heading">Choose a date range</h2>
          <p>Update the charts and accuracy metrics for the selected period.</p>
        </div>
        <div className="date-range-controls">
          <form className="date-filter" onSubmit={onSubmit}>
            <div className="date-field">
              <label htmlFor="start-date">FROM</label>
              <input
                id="start-date"
                type="date"
                min="2026-01-01"
                max="2026-01-31"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
                required
              />
            </div>
            <span className="date-separator">—</span>
            <div className="date-field">
              <label htmlFor="end-date">TO</label>
              <input
                id="end-date"
                type="date"
                min="2026-01-01"
                max="2026-01-31"
                value={endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
                required
              />
            </div>
            <button className="button button-primary" disabled={loading} type="submit">
              {loading ? 'Loading…' : 'Apply range'}
            </button>
          </form>
          {rangeError && <p className="range-error" role="alert">{rangeError}</p>}
        </div>
      </div>
      <div className="period-banner">
        <div className="period-icon" aria-hidden="true">
          <img src="/icons/calendar.svg" width="19" height="19" alt="" />
        </div>
        <div><strong>Selected period</strong><span>{periodLabel}</span></div>
        <div className="period-right">
          <span className="period-dot" />
          <span>Half-hourly actuals · Hourly forecast comparison</span>
        </div>
      </div>
    </section>
  )
}
