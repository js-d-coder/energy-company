import type { ComparisonPoint } from '../types'
import { formatNumber } from '../utils/format'
import GenerationChart from './GenerationChart'

type Props = {
  points: ComparisonPoint[]
  loading: boolean
  periodLabel: string
}

export default function GenerationSection({ points, loading, periodLabel }: Props) {
  const average = points.length
    ? {
        actual: points.reduce((sum, point) => sum + point.actualGeneration, 0) / points.length,
        forecast: points.reduce((sum, point) => sum + point.forecastGeneration, 0) / points.length,
      }
    : null

  return (
    <section className="chart-card" id="generation">
      <div className="section-heading">
        <div>
          <span className="section-kicker">GENERATION PROFILE</span>
          <h2>Forecast vs actual wind</h2>
          <p>Hourly average generation · {periodLabel}</p>
        </div>
        <div className="chart-legend">
          <span><i className="legend-line actual-legend" /> Actual</span>
          <span><i className="legend-line forecast-legend" /> Day-ahead forecast</span>
        </div>
      </div>
      {loading ? <div className="chart-loading"><span className="spinner" /> Loading generation data…</div> : (
        <GenerationChart points={points} />
      )}
      {average && !loading && (
        <div className="chart-footnote">
          <span>Period average</span>
          <strong className="actual-text">{formatNumber(average.actual)} MW actual</strong>
          <strong className="forecast-text">{formatNumber(average.forecast)} MW forecast</strong>
          <span className="sample-count">{formatNumber(points.length)} matched hours</span>
        </div>
      )}
    </section>
  )
}
