import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HealthPage from './pages/HealthPage';
import DevicesPage from './pages/DevicesPage';
import LogsExplorerPage from './pages/LogsExplorerPage';
import ReportsAppsPage from './pages/reports/ReportsAppsPage';
import ReportsTitlesPage from './pages/reports/ReportsTitlesPage';
import { useAuth } from './state/auth';

function Protected(){ const { bootstrapped, isAuthed } = useAuth(); const loc=useLocation();
  if(!bootstrapped) return <div className='container py-4'>Loading...</div>;
  if(!isAuthed) return <Navigate to='/login' state={{ from: loc.pathname }} replace />;
  return <Outlet/>;
}

export default function App(){
  return (<Routes>
    <Route path='/login' element={<LoginPage/>}/>
    <Route element={<Protected/>}>
      <Route element={<Layout/>}>
        <Route path='/' element={<DashboardPage/>}/>
        <Route path='/health' element={<HealthPage/>}/>
        <Route path='/devices' element={<DevicesPage/>}/>
        <Route path='/logs' element={<LogsExplorerPage/>}/>
        <Route path='/reports/apps' element={<ReportsAppsPage/>}/>
        <Route path='/reports/titles' element={<ReportsTitlesPage/>}/>
      </Route>
    </Route>
  </Routes>);
}
