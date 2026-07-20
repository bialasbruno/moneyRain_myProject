import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AchievementsPage } from './pages/AchievementsPage';
import { BondsPage } from './pages/BondsPage';
import { DashboardPage } from './pages/DashboardPage';
import { GoalsPage } from './pages/GoalsPage';
import { JourneyPage } from './pages/JourneyPage';
import { SettingsPage } from './pages/SettingsPage';
import { VaultPage } from './pages/VaultPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="etf" element={<Navigate to="/bonds" replace />} />
        <Route path="bonds" element={<BondsPage />} />
        <Route path="journey" element={<JourneyPage />} />
        <Route path="vault" element={<VaultPage />} />
        <Route path="achievements" element={<AchievementsPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
