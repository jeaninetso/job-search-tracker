import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { supabase } from './lib/supabase';
import { Login } from './pages/Login';
import { ProfileSetup } from './pages/ProfileSetup';
import { GoalSetup } from './pages/GoalSetup';
import { Dashboard } from './pages/Dashboard';
import { Feed } from './pages/Feed';
import { Profile } from './pages/Profile';
import { Avatar } from './components/Avatar';
import './App.css';

function Gate({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="page">Loading...</p>;
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
        <Link to="/">Today</Link>
        <Link to="/goals">My Goals</Link>
        <Link to="/feed">The Group</Link>
      </div>
      <div className="nav-right">
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
      <Route
        path="/goals"
        element={
          <Gate>
            <GoalSetup />
          </Gate>
        }
      />
      <Route
        path="/feed"
        element={
          <Gate>
            <Feed />
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
        <Nav />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
