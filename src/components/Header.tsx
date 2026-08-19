import { NavLink } from 'react-router-dom'
import './Header.css'

export function Header() {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M4.5 8.5h2.1l1.2-2h8.4l1.2 2h2.1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
            <circle cx="12" cy="14" r="3.25" />
          </svg>
        </span>
        <div>
          <strong className="header__eyebrow">Camera App</strong>
        </div>
      </div>

      <nav className="header__nav" aria-label="Camera modes">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `header__link${isActive ? ' header__link--active' : ''}`}
        >
          Device Camera
        </NavLink>
        <NavLink
          to="/in-app"
          className={({ isActive }) => `header__link${isActive ? ' header__link--active' : ''}`}
        >
          In-App Camera
        </NavLink>
      </nav>
    </header>
  )
}
