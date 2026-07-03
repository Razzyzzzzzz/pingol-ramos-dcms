import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import Landing from './pages/Landing.jsx';
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
import DoctorSchedules from './pages/DoctorSchedules.jsx';
import PatientDashboard from './pages/patient/PatientDashboard.jsx';
import PatientTransactions from './pages/patient/PatientTransactions.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  const roleRoute = (roles, element) => (
    <ProtectedRoute roles={roles}>
      {element}
    </ProtectedRoute>
  );

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* Protected app shell */}
      <Route
        element={
          <ProtectedRoute roles={['admin', 'dentist', 'staff']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientDetail />} />
        <Route path="/inventory" element={roleRoute(['admin', 'staff'], <Inventory />)} />
        <Route path="/revenue" element={roleRoute(['admin'], <Revenue />)} />
        <Route path="/expenses" element={roleRoute(['admin'], <Expenses />)} />
        <Route path="/reports" element={roleRoute(['admin'], <Reports />)} />
        <Route path="/schedules" element={roleRoute(['admin'], <DoctorSchedules />)} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Patient portal */}
      <Route
        element={
          <ProtectedRoute roles={['patient']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/portal" element={<PatientDashboard />} />
        <Route path="/portal/transactions" element={<PatientTransactions />} />
      </Route>

      {/* Fallbacks */}
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
