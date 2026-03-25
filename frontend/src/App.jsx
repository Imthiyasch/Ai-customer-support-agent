import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, useAuth, UserButton, SignInButton } from '@clerk/clerk-react';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UploadPage from './pages/UploadPage';
import ChatPage from './pages/ChatPage';
import ErrorBoundary from './components/ErrorBoundary';
import { 
  LayoutGrid, Upload, Shield, 
  Loader2, Zap, Database, MessageSquare, Plus, FileText, Check, X
} from 'lucide-react';
import React from 'react';
import './index.css';

const LandingPage = () => (
  <div className="landing-page">
    <header className="aura-header">
       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '28px', height: '28px', background: '#fff', borderRadius: '50%' }}></div>
          <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: '#fff' }}>Aura</h2>
       </div>
       <nav style={{ display: 'flex', gap: '3rem' }}>
          <span style={{ color: 'var(--aura-text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>PLATFORM</span>
          <span style={{ color: 'var(--aura-text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>SOLUTIONS</span>
          <span style={{ color: 'var(--aura-text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>COMPANY</span>
       </nav>
       <SignInButton mode="modal">
          <button className="btn-aura">GET STARTED</button>
       </SignInButton>
    </header>

    <div className="hero-main">
       <div className="animate-reveal" style={{ maxWidth: '1000px', padding: '0 2rem' }}>
          <div className="aura-hero-badge">Aura Intelligence Engine v2.0</div>
          <h1>Resolve at the<br/>speed of thought</h1>
          <p style={{ color: 'var(--aura-text-muted)', fontSize: '1.1rem', marginTop: '2.5rem', maxWidth: '500px', margin: '2.5rem auto 0', lineHeight: 1.6 }}>
            An AI support platform that understands. Automate workflows, retain context, and deliver human-quality resolution at scale.
          </p>
       </div>
    </div>
  </div>
);

const Sidebar = () => {
  const location = useLocation();
  const NavItem = ({ to, icon: Icon, label }) => (
    <Link to={to} className={`nav-item ${location.pathname === to ? 'active' : ''}`}>
      <Icon size={20} />
      <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em' }}>{label}</span>
    </Link>
  );

  return (
    <aside className="side-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ width: '32px', height: '32px', background: '#fff', borderRadius: '50%' }}></div>
        <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-serif)', color: '#fff' }}>Aura</h2>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <NavItem to="/dashboard" icon={LayoutGrid} label="PLATFORM" />
        <NavItem to="/upload" icon={Upload} label="INDEXER" />
        <NavItem to="/admin" icon={Shield} label="CONSOLE" />
      </nav>
      <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <UserButton afterSignOutUrl="/" />
        <div style={{ overflow: 'hidden' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>User Oracle</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--aura-text-muted)' }}>Pro Access</p>
        </div>
      </div>
    </aside>
  );
};

const ProtectedLayout = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617' }}><Loader2 className="animate-spin" size={40} color="#fff" /></div>;
  if (!isSignedIn) return <Navigate to="/" replace />;
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#020617' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '4rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<><SignedOut><LandingPage /></SignedOut><SignedIn><Navigate to="/dashboard" replace /></SignedIn></>} />
          <Route path="/dashboard" element={<ProtectedLayout><UserDashboard /></ProtectedLayout>} />
          <Route path="/admin" element={<ProtectedLayout><AdminDashboard /></ProtectedLayout>} />
          <Route path="/upload" element={<ProtectedLayout><UploadPage /></ProtectedLayout>} />
          <Route path="/chat/:kbId" element={<ProtectedLayout><ChatPage /></ProtectedLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
