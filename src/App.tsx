import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';
import ConfigPage from './pages/ConfigPage';
import DevicesPage from './pages/DevicesPage';
import LogsExplorerPage from './pages/LogsExplorerPage';
import ReportsAppsPage from './pages/reports/ReportsAppsPage';
import ReportsTitlesPage from './pages/reports/ReportsTitlesPage';
import Errors from './pages/ErrorsPage';
import { useAuth } from './state/auth';

function Protected() {
  const { isAuthed } = useAuth();
  const loc = useLocation();

  if (!isAuthed) {
    return (
      <Navigate
        to="/login"
        state={{ from: loc }}
        replace
      />
    );
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          {/* Default → Device Dashboard */}
          <Route path="/" element={<Navigate to="/devices" replace />} />

          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/health" element={<ConfigPage />} />
          <Route path="/logs" element={<LogsExplorerPage />} />
          <Route path="/reports/apps" element={<ReportsAppsPage />} />
          <Route path="/reports/titles" element={<ReportsTitlesPage />} />
          <Route path="/errors" element={<Errors />} />
        </Route>
      </Route>
    </Routes>
  );
}
