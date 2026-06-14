import { useStore } from '../store/useStore';
import './GlobalNav.css';

export default function GlobalNav() {
  const revealed = useStore((s) => s.revealed);
  const activePanel = useStore((s) => s.activePanel);
  const setActivePanel = useStore((s) => s.setActivePanel);

  const navLinks = [
    { name: 'Dashboard',   id: 'dashboard'   },
    { name: 'Planner',     id: 'planner'     },
    { name: 'Analytics',   id: 'analytics'   },
    { name: 'Yield',       id: 'yield'       },
    { name: 'Crop Doctor', id: 'crop-doctor' },
    { name: 'Market',      id: 'market'      },
    { name: 'About',       id: 'about'       },
  ];

  // Only hide the nav BEFORE the user scrolls past the cinematic (when panel is dashboard)
  const isCinematicIntro = activePanel === 'dashboard' && !revealed;

  return (
    <nav className="global-nav" style={{ opacity: isCinematicIntro ? 0 : 1, pointerEvents: isCinematicIntro ? 'none' : 'auto' }}>
      <div className="global-nav__logo mono">
        <button onClick={() => setActivePanel('dashboard')} className="nav-logo-btn">BHOOMI SENSE</button>
      </div>
      <ul className="global-nav__links mono">
        {navLinks.map((link) => {
          const isActive = activePanel === link.id;
          return (
            <li key={link.name}>
              <button 
                onClick={() => setActivePanel(link.id)} 
                className={`global-nav__link ${isActive ? 'is-active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}
              >
                {link.name}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
