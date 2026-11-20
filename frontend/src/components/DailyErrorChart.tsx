import type { DailyError } from '../types'
import { formatDate, formatNumber } from '../utils/format'

type Props = {
  points: DailyError[]
}

export default function DailyErrorChart({ points }: Props) {
  const width = 900
  const height = 230
  const margin = { top: 14, right: 14, bottom: 42, left: 58 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const maxValue = Math.max(1, ...points.map((point) => point.meanAbsoluteError)) * 1.15
  const slot = points.length ? plotWidth / points.length : plotWidth
  const barWidth = Math.max(2, Math.min(18, slot * 0.62))

  if (points.length === 0) {
    return <div className="chart-empty">No error data available for this period.</div>
  }

  return (
    <div className="chart-scroll">
      <svg className="chart-svg error-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily mean absolute forecast error bar chart">
        {[0, 1, 2, 3, 4].map((step) => {
          const value = (maxValue * step) / 4
          const lineY = margin.top + plotHeight - (step / 4) * plotHeight
          return (
            <g key={step}>
              <line className="chart-grid" x1={margin.left} x2={width - margin.right} y1={lineY} y2={lineY} />
              <text className="chart-axis-label" x={margin.left - 10} y={lineY + 4} textAnchor="end">
                {formatNumber(value / 1000, 1)}k
              </text>
            </g>
          )
        })}
        {points.map((point, index) => {
          const barHeight = (point.meanAbsoluteError / maxValue) * plotHeight
          const barX = margin.left + index * slot + (slot - barWidth) / 2
          const barY = margin.top + plotHeight - barHeight
          const showLabel = points.length <= 7 || index % Math.ceil(points.length / 7) === 0
          return (
            <g key={point.date}>
              <rect className="error-bar" x={barX} y={barY} width={barWidth} height={barHeight} rx="3">
                <title>{`${formatDate(point.date)} mean absolute error ${formatNumber(point.meanAbsoluteError)} MW`}</title>
              </rect>
              {showLabel && (
                <text className="chart-axis-label" x={barX + barWidth / 2} y={height - 13} textAnchor="middle">
                  {formatDate(point.date)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
