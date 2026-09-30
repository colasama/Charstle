import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toolbar } from './components/layout/Toolbar';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { ModalHost } from './components/modals/ModalHost';
import { useUI } from './store/ui';
import { NetworkPage } from './pages/NetworkPage';
import { RulesPage } from './pages/RulesPage';
import { ValuesPage } from './pages/ValuesPage';
import { ScriptsPage } from './pages/ScriptsPage';
import { BreakpointsPage } from './pages/BreakpointsPage';
import { ComposePage } from './pages/ComposePage';
import { ThrottlePage } from './pages/ThrottlePage';
import { DevicesPage } from './pages/DevicesPage';
import { CertificatePage } from './pages/CertificatePage';
import { SettingsPage } from './pages/SettingsPage';

function useThemeAttr() {
  const theme = useUI((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);
}

export function App() {
  useThemeAttr();
  // TODO(api): 在这里 connectEvents()，把事件分发到数据 store

  return (
    <HashRouter>
      <div className="app">
        <Toolbar />
        <Sidebar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/network" replace />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/values" element={<ValuesPage />} />
            <Route path="/scripts" element={<ScriptsPage />} />
            <Route path="/breakpoints" element={<BreakpointsPage />} />
            <Route path="/compose" element={<ComposePage />} />
            <Route path="/throttle" element={<ThrottlePage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/ssl" element={<CertificatePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/network" replace />} />
          </Routes>
        </main>
        <StatusBar />
        <ModalHost />
      </div>
    </HashRouter>
  );
}
