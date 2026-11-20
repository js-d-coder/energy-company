import type { DashboardData, DailyError } from '../types'
import { formatNumber } from '../utils/format'
import DailyErrorChart from './DailyErrorChart'

type Props = {
  points: DailyError[]
  dashboard: DashboardData | null
  loading: boolean
}

export default function AccuracySection({ points, dashboard, loading }: Props) {
  return (
    <section className="chart-card" id="accuracy">
      <div className="section-heading">
        <div>
          <span className="section-kicker">DAILY ACCURACY</span>
          <h2>Forecast error by day</h2>
          <p>Mean absolute error for each delivery day · MW</p>
        </div>
        <div className="max-error-pill">
          <span>PERIOD MAX</span>
          <strong>{dashboard ? `${formatNumber(dashboard.metrics.maxAbsoluteError)} MW` : '—'}</strong>
        </div>
      </div>
      {loading ? <div className="chart-loading"><span className="spinner" /> Loading accuracy data…</div> : (
        <DailyErrorChart points={points} />
      )}
    </section>
  )
}
