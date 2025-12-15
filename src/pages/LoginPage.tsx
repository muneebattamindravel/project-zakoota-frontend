import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth';

export default function LoginPage() {
    const { login } = useAuth();
    const nav = useNavigate();
    const loc = useLocation() as any;

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const from =
        loc.state?.from?.pathname ||
        loc.state?.from ||
        '/devices';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setLoading(true);
        try {
            await login(username.trim(), password);
            nav(from, { replace: true });
        } catch (err: any) {
            console.error(err);
            setErrorMsg(
                err?.response?.data?.error ||
                err?.message ||
                'Login failed. Please check your credentials.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-800 px-4">
            {/* subtle background glows */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-32 -left-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="absolute -bottom-32 -right-16 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                <div className="rounded-3xl border border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-2xl shadow-slate-900/40 p-6 sm:p-8 space-y-6">
                    {/* Brand */}
                    <div className="flex items-center gap-3 mb-1">
                        <div className="h-9 w-9 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center text-sm font-semibold shadow-md shadow-slate-950/20">
                            M
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-sm font-semibold text-white">
                                matrixFlow
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                                Device analytics dashboard
                            </span>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-xl font-semibold text-white">
                            Sign in to continue
                        </h1>
                        <p className="text-xs text-slate-400 mt-1">
                            Secure access to your internal device analytics. Sessions
                            auto-expire for safety.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                        <div>
                            <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                                Username
                            </label>
                            <input
                                type="text"
                                autoComplete="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="border border-slate-700/80 rounded-2xl px-3 py-2.5 text-sm w-full bg-slate-900/70 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="admin"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                                Password
                            </label>
                            <input
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="border border-slate-700/80 rounded-2xl px-3 py-2.5 text-sm w-full bg-slate-900/70 text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>

                        {errorMsg && (
                            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                                {errorMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-1 px-4 py-2.5 rounded-2xl bg-emerald-500 text-slate-950 text-sm font-medium shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>

                    <div className="pt-1 border-t border-slate-800/70 mt-2">
                        <p className="text-[10px] text-slate-500 text-center">
                            Admin credentials come from backend environment variables:{' '}
                            <span className="font-mono">DASHBOARD_ADMIN_USER</span> and{' '}
                            <span className="font-mono">DASHBOARD_ADMIN_PASSWORD</span>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
