import type { DashboardData } from '../types'
import { formatNumber } from '../utils/format'
import MetricCard from './MetricCard'

type Props = {
  dashboard: DashboardData | null
}

export default function MetricsGrid({ dashboard }: Props) {
  const metrics = dashboard?.metrics
  return (
    <section className="metrics-grid" aria-label="Forecast accuracy summary">
      <MetricCard
        label="Mean absolute error"
        value={metrics ? formatNumber(metrics.mae) : '—'}
        unit="MW"
        note="Average forecast deviation"
        accent="green"
      />
      <MetricCard
        label="Root mean square error"
        value={metrics ? formatNumber(metrics.rmse) : '—'}
        unit="MW"
        note="Penalizes larger misses"
        accent="amber"
      />
      <MetricCard
        label="Mean absolute percentage"
        value={metrics ? formatNumber(metrics.mape, 1) : '—'}
        unit="%"
        note="Relative to actual output"
        accent="blue"
      />
      <MetricCard
        label="Forecast bias"
        value={metrics ? `${metrics.bias > 0 ? '+' : ''}${formatNumber(metrics.bias)}` : '—'}
        unit="MW"
        note={metrics && metrics.bias > 0 ? 'Forecasts overestimated actuals' : 'Forecasts underestimated actuals'}
        accent="purple"
      />
    </section>
  )
}
