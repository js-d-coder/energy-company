export default function Sidebar() {
  return (
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="Gridwise home">
        <span className="brand-mark" aria-hidden="true">
          <img src="/icons/brand-mark.svg" width="21" height="21" alt="" />
        </span>
        <span>gridwise<span className="brand-period">.</span></span>
      </a>
      <div className="sidebar-label">WORKSPACE</div>
      <a className="nav-item active" href="#overview">
        <img src="/icons/overview.svg" width="18" height="18" alt="" aria-hidden="true" />
        Overview
      </a>
      <div className="sidebar-label data-label">DATA &amp; INSIGHTS</div>
      <a className="nav-item" href="#generation">
        <img src="/icons/generation.svg" width="18" height="18" alt="" aria-hidden="true" />
        Wind generation
      </a>
      <a className="nav-item" href="#accuracy">
        <img src="/icons/accuracy.svg" width="18" height="18" alt="" aria-hidden="true" />
        Forecast accuracy
      </a>
      <div className="sidebar-footer">
        <span className="status-pulse" />
        <div><strong>Data source</strong><small>Elexon BMRS · UK national</small></div>
      </div>
    </aside>
  )
}
