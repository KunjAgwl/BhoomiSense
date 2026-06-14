import { Link, useLocation } from 'react-router-dom';
import './GlobalNav.css';

export default function GlobalNav() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Crop Doctor', path: '/crop-doctor' },
    { name: 'Market', path: '/market' },
    { name: 'About', path: '/about' },
  ];

  return (
    <nav className="global-nav" style={{ opacity: isLanding ? 0 : 1, pointerEvents: isLanding ? 'none' : 'auto' }}>
      <div className="global-nav__logo mono">
        <Link to="/">BHOOMI SENSE</Link>
      </div>
      <ul className="global-nav__links mono">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <li key={link.name}>
              <Link to={link.path} className={`global-nav__link ${isActive ? 'is-active' : ''}`}>
                {link.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
