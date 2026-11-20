import type { ComparisonPoint } from '../types'
import { formatNumber, formatTimestamp } from '../utils/format'

type Props = {
  points: ComparisonPoint[]
}

export default function GenerationChart({ points }: Props) {
  const width = 900
  const height = 300
  const margin = { top: 16, right: 18, bottom: 42, left: 58 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const values = points.flatMap((point) => [point.actualGeneration, point.forecastGeneration])
  const maxValue = Math.max(1, ...values) * 1.08
  const x = (index: number) => margin.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth)
  const y = (value: number) => margin.top + plotHeight - (value / maxValue) * plotHeight
  const actualPath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.actualGeneration)}`).join(' ')
  const forecastPath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.forecastGeneration)}`).join(' ')
  const labelIndexes = new Set(
    Array.from({ length: Math.min(5, points.length) }, (_, index) =>
      Math.round((index * (points.length - 1)) / Math.max(1, Math.min(5, points.length) - 1)),
    ),
  )

  if (points.length === 0) {
    return <div className="chart-empty">No matching forecast and actual data for this period.</div>
  }

  return (
    <div className="chart-scroll">
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Wind generation actual versus forecast line chart">
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
        {points.length < 45 && points.map((point, index) => (
          <g key={point.startTime}>
            <circle className="chart-point actual-point" cx={x(index)} cy={y(point.actualGeneration)} r="3">
              <title>{`${formatTimestamp(point.startTime)} actual ${formatNumber(point.actualGeneration)} MW`}</title>
            </circle>
            <circle className="chart-point forecast-point" cx={x(index)} cy={y(point.forecastGeneration)} r="3">
              <title>{`${formatTimestamp(point.startTime)} forecast ${formatNumber(point.forecastGeneration)} MW`}</title>
            </circle>
          </g>
        ))}
        {[...labelIndexes].map((index) => (
          <text
            className="chart-axis-label"
            key={index}
            x={x(index)}
            y={height - 13}
            textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
          >
            {formatTimestamp(points[index].startTime)}
          </text>
        ))}
      </svg>
    </div>
  )
}
