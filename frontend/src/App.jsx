import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Appointments from './pages/Appointments.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import Patients from './pages/Patients.jsx';
import PatientDetail from './pages/PatientDetail.jsx';
import Inventory from './pages/Inventory.jsx';
import Revenue from './pages/Revenue.jsx';
import Expenses from './pages/Expenses.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected app shell */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientDetail />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/revenue" element={<Revenue />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Fallbacks */}
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
