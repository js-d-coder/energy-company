import { useEffect, useMemo, useState } from 'react'
import { formatNumber, formatTimestamp } from '../utils/format'

type ActualPoint = {
  startTime: string
  generation: number
}

type ForecastPoint = {
  startTime: string
  publishTime: string
  generation: number
}

type ActualResponse = {
  data: ActualPoint[]
  count: number
}

type ForecastResponse = {
  deliveryDate: string
  data: ForecastPoint[]
  count: number
}

type DaySeriesPoint = {
  startTime: string
  actual: number
  forecast: number | null
}

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function DayAheadChart({ points }: { points: DaySeriesPoint[] }) {
  const width = 900
  const height = 270
  const margin = { top: 16, right: 18, bottom: 40, left: 58 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const maxValue = Math.max(1, ...points.flatMap((point) => [point.actual, point.forecast ?? 0])) * 1.08
  const x = (index: number) => margin.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth)
  const y = (value: number) => margin.top + plotHeight - (value / maxValue) * plotHeight
  const actualPath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.actual)}`)
    .join(' ')
  const forecastPoints = points
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => point.forecast !== null)
  const forecastPath = forecastPoints
    .map(({ point, index }, pathIndex) => `${pathIndex === 0 ? 'M' : 'L'} ${x(index)} ${y(point.forecast ?? 0)}`)
    .join(' ')
  const labelIndexes = [0, 12, 24, 36, points.length - 1].filter(
    (index, position, indexes) => index >= 0 && indexes.indexOf(index) === position && index < points.length,
  )

  if (points.length === 0) {
    return <div className="chart-empty">No actual generation is available for this delivery date.</div>
  }

  return (
    <div className="chart-scroll">
      <svg className="chart-svg day-ahead-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Day-ahead wind forecast compared with actual half-hourly wind generation">
        {[0, 1, 2, 3, 4].map((step) => {
          const value = (maxValue * step) / 4
          const lineY = y(value)
          return (
            <g key={step}>
              <line className="chart-grid" x1={margin.left} x2={width - margin.right} y1={lineY} y2={lineY} />
              <text className="chart-axis-label" x={margin.left - 10} y={lineY + 4} textAnchor="end">
                {formatNumber(value / 1000, 0)}k
              </text>
            </g>
          )
        })}
        <path className="chart-line actual-line" d={actualPath} />
        <path className="chart-line forecast-line" d={forecastPath} />
        {points.map((point, index) => (
          <g key={point.startTime}>
            <circle className="chart-point actual-point" cx={x(index)} cy={y(point.actual)} r="2.8">
              <title>{`${formatTimestamp(point.startTime)} actual ${formatNumber(point.actual)} MW`}</title>
            </circle>
            {point.forecast !== null && (
              <circle className="chart-point forecast-point" cx={x(index)} cy={y(point.forecast)} r="3">
                <title>{`${formatTimestamp(point.startTime)} day-ahead forecast ${formatNumber(point.forecast)} MW`}</title>
              </circle>
            )}
          </g>
        ))}
        {labelIndexes.map((index) => (
          <text
            className="chart-axis-label"
            key={index}
            x={x(index)}
            y={height - 12}
            textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
          >
            {formatTimestamp(points[index].startTime)}
          </text>
        ))}
      </svg>
    </div>
  )
}

export default function DayAheadSection() {
  const [deliveryDate, setDeliveryDate] = useState('2026-01-01')
  const [actuals, setActuals] = useState<ActualPoint[]>([])
  const [forecasts, setForecasts] = useState<ForecastPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function loadDayAheadData() {
      setError('')
      try {
        const actualUrl = `/api/actual?start=${deliveryDate}&end=${nextDate(deliveryDate)}`
        const forecastUrl = `/api/latest-forecast?delivery_date=${deliveryDate}`
        const [actualResponse, forecastResponse] = await Promise.all([
          fetch(actualUrl, { signal: controller.signal }),
          fetch(forecastUrl, { signal: controller.signal }),
        ])
        if (!actualResponse.ok || !forecastResponse.ok) {
          const failedResponse = !actualResponse.ok ? actualResponse : forecastResponse
          const body = await failedResponse.json().catch(() => null) as { detail?: string } | null
          throw new Error(body?.detail ?? `API request failed (${failedResponse.status})`)
        }
        const [actualData, forecastData] = await Promise.all([
          actualResponse.json() as Promise<ActualResponse>,
          forecastResponse.json() as Promise<ForecastResponse>,
        ])
        if (controller.signal.aborted) return
        setActuals(actualData.data)
        setForecasts(forecastData.data)
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return
        setError(requestError instanceof Error ? requestError.message : 'Unexpected error loading day-ahead data.')
        setActuals([])
        setForecasts([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadDayAheadData()
    return () => controller.abort()
  }, [deliveryDate])

  const points = useMemo(() => {
    const forecastByHour = new Map(
      forecasts.map((forecast) => [forecast.startTime.slice(0, 13), forecast.generation]),
    )
    return actuals.map((actual) => ({
      startTime: actual.startTime,
      actual: actual.generation,
      forecast: forecastByHour.get(actual.startTime.slice(0, 13)) ?? null,
    }))
  }, [actuals, forecasts])

  const matchedCount = points.filter((point) => point.forecast !== null).length
  const forecastPublishTime = forecasts.at(0)?.publishTime

  return (
    <section className="day-ahead-card" aria-labelledby="day-ahead-title">
      <div className="day-ahead-heading">
        <div>
          <span className="section-kicker">DAY-AHEAD VIEW</span>
          <h2 id="day-ahead-title">Selected delivery day</h2>
          <p>Compare the forecast available before the purchase decision with delivered wind generation.</p>
        </div>
        <div className="day-picker">
          <label htmlFor="day-ahead-date">DELIVERY DATE</label>
          <input
            id="day-ahead-date"
            type="date"
            min="2026-01-01"
            max="2026-01-31"
            value={deliveryDate}
            onChange={(event) => {
              setLoading(true)
              setDeliveryDate(event.target.value)
            }}
          />
        </div>
      </div>
      <div className="day-ahead-summary">
        <div className="day-ahead-stat">
          <span>ACTUAL PERIODS</span>
          <strong>{loading ? '—' : formatNumber(actuals.length)}</strong>
          <small>30-minute values</small>
        </div>
        <div className="day-ahead-stat">
          <span>FORECAST PERIODS</span>
          <strong>{loading ? '—' : formatNumber(forecasts.length)}</strong>
          <small>Eligible day-ahead values</small>
        </div>
        <div className="day-ahead-stat">
          <span>MATCHED HOURS</span>
          <strong>{loading ? '—' : formatNumber(matchedCount)}</strong>
          <small>Forecast and actual</small>
        </div>
        <div className="day-ahead-publish">
          <span>FORECAST PUBLISHED</span>
          <strong>{forecastPublishTime ? formatTimestamp(forecastPublishTime) : loading ? 'Loading…' : 'Not available'}</strong>
          <small>UTC · at least 13h before delivery</small>
        </div>
      </div>
      {error && <p className="day-ahead-error" role="alert">{error}</p>}
      {loading ? (
        <div className="chart-loading"><span className="spinner" /> Loading selected delivery day…</div>
      ) : (
        <DayAheadChart points={points} />
      )}
      {!loading && forecasts.length === 0 && !error && (
        <p className="day-ahead-note">No forecast meets the day-ahead publication cutoff for this delivery date.</p>
      )}
      <div className="day-ahead-legend">
        <span><i className="legend-line actual-legend" /> Actual · 30-minute</span>
        <span><i className="legend-line forecast-legend" /> Day-ahead forecast · hourly</span>
      </div>
    </section>
  )
}
