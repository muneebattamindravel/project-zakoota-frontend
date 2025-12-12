import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth';

const linkStyle = (active: boolean) =>
  [
    'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all',
    active
      ? 'bg-slate-900 text-white shadow-sm'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  ].join(' ');

export default function Navbar() {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout, isAuthed } = useAuth();

  const links = [
    {
      to: '/devices',
      label: 'Device Dashboard',
      isActive:
        loc.pathname === '/' || loc.pathname.startsWith('/devices'),
    },
    {
      to: '/health',
      label: 'Config',
      isActive: loc.pathname.startsWith('/health'),
    },
    {
      to: '/errors',
      label: 'Errors',
      isActive: loc.pathname.startsWith('/errors'),
    },
  ];

  return (
    <header className="sticky top-0 z-20 bg-white/90 border-b border-slate-200 backdrop-blur">
      <div className="container h-14 flex items-center justify-between gap-3">
        {/* Left: Brand + nav */}
        <div className="flex items-center gap-4">
          {/* Brand / logo */}
          <button
            type="button"
            onClick={() => nav('/devices')}
            className="flex items-center gap-2 group"
          >
            <div className="h-8 w-8 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-semibold shadow-sm group-hover:scale-[1.03] transition-transform">
              M
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-sm font-semibold text-slate-900">
                matrixFlow
              </span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400">
                Device analytics
              </span>
            </div>
          </button>

          {/* Nav links */}
          <nav className="flex items-center gap-2 text-sm font-medium">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={linkStyle(link.isActive)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: user / auth */}
        <div className="flex items-center gap-3 text-sm">
          {isAuthed ? (
            <>
              <span className="hidden sm:inline text-xs text-slate-600">
                Hi,{' '}
                <span className="font-semibold">
                  {user?.username ?? 'user'}
                </span>
              </span>
              <button
                className="px-3 py-1.5 rounded-full border border-slate-300 text-xs sm:text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                onClick={() => {
                  logout();
                  nav('/login', { replace: true });
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-full border border-slate-300 text-xs sm:text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
