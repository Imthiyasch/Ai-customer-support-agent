import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { 
  Users, Activity, Database, Shield, AlertCircle, 
  Loader2, Check, X, ArrowLeft, Zap, Orbit, Sparkles
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = 'imthiranu@gmail.com';

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL;

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin]);

  const fetchAdminData = async () => {
    try {
      const token = await getToken();
      const [statsRes, activityRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/activity`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (statsRes.ok && activityRes.ok) {
        setStats(await statsRes.json());
        setActivity(await activityRes.json());
      } else {
        setError('Security Clearance Level 5 Required.');
      }
    } catch (e) {
      setError('System connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin && !isLoading) {
    return (
      <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Shield size={64} color="#ef4444" style={{ marginBottom: '2rem', opacity: 0.3 }} />
        <h1 style={{ fontSize: '3rem', fontFamily: 'var(--font-serif)', color: '#fff' }}>Access Forbidden.</h1>
        <p style={{ color: 'var(--aura-text-muted)', maxWidth: '400px' }}>Your current identity does not have sufficient clearance for this console.</p>
      </div>
    );
  }

  return (
    <div className="animate-reveal">
      <div style={{ marginBottom: '6rem' }}>
        <div className="aura-hero-badge" style={{ color: '#fbbf24', borderColor: '#fbbf24' }}>ADMIN CONSOLE</div>
        <h1 style={{ fontSize: '4rem', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)' }}>Pulse & Analytics.</h1>
        <p style={{ color: 'var(--aura-text-body)', fontSize: '1.25rem' }}>Full platform observability and system heartbeats.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2.5rem', marginBottom: '4rem' }}>
        <div className="aura-card" style={{ padding: '2.5rem' }}>
           <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--aura-text-muted)', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>NEURAL CLUSTERS</h4>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
              <h2 style={{ fontSize: '3.5rem', fontFamily: 'var(--font-serif)', color: '#fff' }}>{stats?.total_kbs || 0}</h2>
              <div style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 700 }}>+4 INDEXED</div>
           </div>
        </div>
        <div className="aura-card" style={{ padding: '2.5rem' }}>
           <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--aura-text-muted)', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>TOTAL ASSETS</h4>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
              <h2 style={{ fontSize: '3.5rem', fontFamily: 'var(--font-serif)', color: '#fff' }}>{stats?.total_docs || 0}</h2>
              <div style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 700 }}>VERIFIED</div>
           </div>
        </div>
        <div className="aura-card" style={{ padding: '2.5rem' }}>
           <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--aura-text-muted)', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>ACTIVE MESSAGES</h4>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
              <h2 style={{ fontSize: '3.5rem', fontFamily: 'var(--font-serif)', color: '#fff' }}>{stats?.total_messages || 0}</h2>
              <div style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700 }}>STREAMING</div>
           </div>
        </div>
      </div>

      <div className="aura-card" style={{ padding: '0' }}>
         <div style={{ padding: '2.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <h3 style={{ fontSize: '1.5rem', color: '#fff', fontFamily: 'var(--font-serif)' }}>Cluster Activity Log</h3>
         </div>
         <div style={{ padding: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
               <thead>
                 <tr style={{ color: 'var(--aura-text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>
                   <th style={{ paddingBottom: '1.5rem' }}>IDENTITY</th>
                   <th style={{ paddingBottom: '1.5rem' }}>ACTION</th>
                   <th style={{ paddingBottom: '1.5rem' }}>CLUSTER ID</th>
                   <th style={{ paddingBottom: '1.5rem' }}>TIMESTAMP</th>
                 </tr>
               </thead>
               <tbody style={{ color: '#fff' }}>
                 {activity.map((log, i) => (
                   <tr key={i} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.03)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '1.5rem 0' }}>{log.user_email || 'System Core'}</td>
                      <td style={{ padding: '1.5rem 0' }}><span style={{ padding: '0.3rem 0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>{log.action}</span></td>
                      <td style={{ padding: '1.5rem 0' }}>{log.kb_name || log.target_id}</td>
                      <td style={{ padding: '1.5rem 0' }}>{new Date(log.created_at).toLocaleTimeString()}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
