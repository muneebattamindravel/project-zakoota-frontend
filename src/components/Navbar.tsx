import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth';

const L = (a: boolean) =>
  ['px-2 py-1 rounded-md', a ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'].join(' ');

export default function Navbar() {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout, isAuthed } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-white/90 border-b backdrop-blur">
      <div className="container h-14 flex items-center justify-between">
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/" className={L(loc.pathname === '/')}>
            Dashboard
          </Link>
          <Link to="/devices" className={L(loc.pathname.startsWith('/devices'))}>
            Devices
          </Link>
          <Link to="/logs" className={L(loc.pathname.startsWith('/logs'))}>
            Logs
          </Link>
          <Link to="/reports/apps" className={L(loc.pathname.startsWith('/reports/apps'))}>
            Apps
          </Link>
          <Link to="/reports/titles" className={L(loc.pathname.startsWith('/reports/titles'))}>
            Titles
          </Link>
          <Link to="/health" className={L(loc.pathname.startsWith('/health'))}>
            Health
          </Link>
          <Link to="/commands" className={L(loc.pathname.startsWith('/commands'))}>
            Commands
          </Link>
          <Link to="/errors" className={L(loc.pathname.startsWith('/errors'))}>
            Errors
          </Link>
        </nav>
        <div className="flex items-center gap-2 text-sm">
          {isAuthed ? (
            <>
              <span className="text-slate-600">
                Hi, <b>{user?.username ?? 'user'}</b>
              </span>
              <button
                className="btn-secondary"
                onClick={() => {
                  logout();
                  nav('/login', { replace: true });
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-secondary">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
