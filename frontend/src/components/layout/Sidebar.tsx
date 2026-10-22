import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◈', end: true },
  { to: '/incubators', label: 'Incubators', icon: '◐' },
  { to: '/media', label: 'Media Inventory', icon: '⬡' },
  { to: '/cultures', label: 'Cell Cultures', icon: '◍' },
  { to: '/schedule', label: 'Culture Schedule', icon: '▤' },
  { to: '/contamination', label: 'Contamination Logs', icon: '▲' },
  { to: '/experiments', label: 'Experiments', icon: '✦' },
];

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { user, logout } = useAuth();

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark" aria-hidden="true" />
        <div className="sidebar-brand-text">
          <strong>CellBase</strong>
          <span>Culture Lab Platform</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Operations</span>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <NavLink to="/users" onClick={onNavigate} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon" aria-hidden="true">♙</span>
            User Access
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <strong>{user.full_name}</strong>
            <span>{user.role.replace('_', ' ')}</span>
          </div>
        )}
        <button type="button" className="sidebar-logout" onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
