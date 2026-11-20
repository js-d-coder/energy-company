type Props = {
  label: string
  value: string
  unit?: string
  note: string
  accent?: string
}

export default function MetricCard({ label, value, unit, note, accent }: Props) {
  return (
    <article className="metric-card">
      <div className="metric-label">
        <span className={`metric-dot ${accent ?? ''}`} />
        {label}
      </div>
      <div className="metric-value">
        {value}
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      <p className="metric-note">{note}</p>
    </article>
  )
}
