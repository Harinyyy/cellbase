import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './pages/Login/LoginPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { IncubatorsPage } from './pages/Incubators/IncubatorsPage';
import { IncubatorDetailPage } from './pages/Incubators/IncubatorDetailPage';
import { MediaPage } from './pages/Media/MediaPage';
import { CellCulturesPage } from './pages/CellCultures/CellCulturesPage';
import { CellCultureDetailPage } from './pages/CellCultures/CellCultureDetailPage';
import { SchedulesPage } from './pages/Schedules/SchedulesPage';
import { ContaminationPage } from './pages/Contamination/ContaminationPage';
import { ExperimentsPage } from './pages/Experiments/ExperimentsPage';
import { ExperimentDetailPage } from './pages/Experiments/ExperimentDetailPage';
import { UsersPage } from './pages/Users/UsersPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/incubators"
        element={
          <ProtectedRoute>
            <IncubatorsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/incubators/:id"
        element={
          <ProtectedRoute>
            <IncubatorDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/media"
        element={
          <ProtectedRoute>
            <MediaPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cultures"
        element={
          <ProtectedRoute>
            <CellCulturesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cultures/:id"
        element={
          <ProtectedRoute>
            <CellCultureDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <SchedulesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/contamination"
        element={
          <ProtectedRoute>
            <ContaminationPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiments"
        element={
          <ProtectedRoute>
            <ExperimentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/experiments/:id"
        element={
          <ProtectedRoute>
            <ExperimentDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
