import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Landing from './pages/Landing.jsx';
import EventsBrowse from './pages/EventsBrowse.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Login from './pages/auth/Login.jsx';
import Signup from './pages/auth/Signup.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import AuthCallback from './pages/auth/AuthCallback.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import EventForm from './pages/EventForm.jsx';
import OrganizerManage from './pages/OrganizerManage.jsx';
import TicketView from './pages/TicketView.jsx';
import CheckIn from './pages/CheckIn.jsx';
import AdminPanel from './pages/AdminPanel.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/events" element={<EventsBrowse />} />
      <Route path="/events/:slug" element={<EventDetail />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/create" element={<ProtectedRoute><EventForm /></ProtectedRoute>} />
      <Route path="/dashboard/edit/:id" element={<ProtectedRoute><EventForm /></ProtectedRoute>} />
      <Route path="/dashboard/manage/:id" element={<ProtectedRoute><OrganizerManage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/tickets/:id" element={<ProtectedRoute><TicketView /></ProtectedRoute>} />
      <Route path="/checkin/:code" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />

      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
