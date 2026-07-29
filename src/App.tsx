import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { supabase } from './lib/supabase';
import { Login } from './pages/Login';
import { ProfileSetup } from './pages/ProfileSetup';
import { Dashboard } from './pages/Dashboard';
import { Group } from './pages/Group';
import { Challenges } from './pages/Challenges';
import { Profile } from './pages/Profile';
import { Avatar } from './components/Avatar';
import { StreakBadge } from './components/StreakBadge';
import { XpBadge } from './components/XpBadge';
import { RouteProgress } from './components/RouteProgress';
import { Spinner } from './components/Spinner';
import './App.css';

function Gate({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page"><Spinner /></div>;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!profile) return <ProfileSetup />;
  return <>{children}</>;
}

function Nav() {
  const { profile } = useAuth();
  if (!profile) return null;
  return (
    <nav className="nav">
      <div className="nav-links">
        <Link to="/">Job Search Tracker</Link>
        <Link to="/group">The Group</Link>
        <Link to="/challenges">Challenges</Link>
      </div>
      <div className="nav-right">
        <XpBadge />
        <StreakBadge />
        <Link to="/profile" className="nav-profile">
          <Avatar name={profile.display_name} avatarKey={profile.avatar_key} seed={profile.id} size={28} />
          <span>{profile.display_name}</span>
        </Link>
        <button className="link-button" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Gate>
            <Dashboard />
          </Gate>
        }
      />
      <Route path="/goals" element={<Navigate to="/" replace />} />
      <Route path="/feed" element={<Navigate to="/group" replace />} />
      <Route
        path="/group"
        element={
          <Gate>
            <Group />
          </Gate>
        }
      />
      <Route
        path="/challenges"
        element={
          <Gate>
            <Challenges />
          </Gate>
        }
      />
      <Route
        path="/profile"
        element={
          <Gate>
            <Profile />
          </Gate>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RouteProgress />
        <Nav />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
