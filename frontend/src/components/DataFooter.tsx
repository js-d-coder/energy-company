import type { DashboardData } from '../types'
import { formatNumber } from '../utils/format'

type Props = {
  dashboard: DashboardData | null
}

export default function DataFooter({ dashboard }: Props) {
  return (
    <>
      <section className="data-footer">
        <div className="source-note">
          <span className="source-icon">i</span>
          <p>Forecasts use the latest Elexon WINDFOR revision published at least 13 hours before delivery. Actuals are sourced from FUELHH WIND settlement periods.</p>
        </div>
        <div className="record-counts">
          <span><i className="count-dot actual-count-dot" /> {dashboard ? formatNumber(dashboard.actualCount) : '—'} actual records</span>
          <span><i className="count-dot forecast-count-dot" /> {dashboard ? formatNumber(dashboard.forecastCount) : '—'} forecast revisions</span>
        </div>
      </section>
      <footer className="page-footer">
        <span>GRIDWISE ANALYTICS</span>
        <span>Generation values shown in MW · All times UTC</span>
      </footer>
    </>
  )
}
