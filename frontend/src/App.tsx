import { useEffect, useMemo, useState, type FormEvent } from 'react'
import AccuracySection from './components/AccuracySection'
import DataFooter from './components/DataFooter'
import DayAheadSection from './components/DayAheadSection'
import DateRangeHeader from './components/DateRangeHeader'
import ErrorState from './components/ErrorState'
import GenerationSection from './components/GenerationSection'
import MetricsGrid from './components/MetricsGrid'
import PeriodBanner from './components/PeriodBanner'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import type { DashboardData } from './types'
import { formatDate } from './utils/format'
import './App.css'

const JANUARY_START = '2026-01-01'
const JANUARY_END = '2026-01-31'

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function App() {
  const [startDate, setStartDate] = useState(JANUARY_START)
  const [endDate, setEndDate] = useState(JANUARY_END)
  const [appliedRange, setAppliedRange] = useState({ start: JANUARY_START, end: JANUARY_END })
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rangeError, setRangeError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function fetchDashboard() {
      setError('')
      try {
        const params = new URLSearchParams({
          start: appliedRange.start,
          end: nextDate(appliedRange.end),
        })
        const response = await fetch(`/api/dashboard?${params}`, { signal: controller.signal })
        if (!response.ok) {
          const body = await response.json().catch(() => null) as { detail?: string } | null
          throw new Error(body?.detail ?? `API request failed (${response.status})`)
        }
        const data = await response.json() as DashboardData
        if (!controller.signal.aborted) setDashboard(data)
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return
        setError(requestError instanceof Error ? requestError.message : 'Unexpected error loading dashboard data.')
        setDashboard(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchDashboard()
    return () => controller.abort()
  }, [appliedRange])

  const dailyErrors = useMemo(() => {
    if (!dashboard) return []
    const grouped = new Map<string, { sum: number; count: number }>()
    for (const point of dashboard.comparison) {
      const day = point.startTime.slice(0, 10)
      const current = grouped.get(day) ?? { sum: 0, count: 0 }
      current.sum += point.absoluteError
      current.count += 1
      grouped.set(day, current)
    }
    return [...grouped.entries()].map(([date, values]) => ({
      date,
      meanAbsoluteError: values.sum / values.count,
    }))
  }, [dashboard])

  function applyDateRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (startDate > endDate) {
      setRangeError('Start date must be on or before end date.')
      return
    }
    setRangeError('')
    setLoading(true)
    setAppliedRange({ start: startDate, end: endDate })
  }

  function retry() {
    setLoading(true)
    setAppliedRange((range) => ({ ...range }))
  }

  const periodLabel = `${formatDate(appliedRange.start)} – ${formatDate(appliedRange.end)}, 2026`

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" id="overview">
        <Topbar />
        <div className="page-content">
          <DateRangeHeader />
          <DayAheadSection />
          <PeriodBanner
            periodLabel={periodLabel}
            startDate={startDate}
            endDate={endDate}
            loading={loading}
            rangeError={rangeError}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onSubmit={applyDateRange}
          />
          {error && <ErrorState message={error} onRetry={retry} />}
          <MetricsGrid dashboard={dashboard} />
          <GenerationSection
            points={dashboard?.comparison ?? []}
            loading={loading}
            periodLabel={periodLabel}
          />
          <AccuracySection
            points={dailyErrors}
            dashboard={dashboard}
            loading={loading}
          />
          <DataFooter dashboard={dashboard} />
        </div>
      </main>
    </div>
  )
}

export default App
