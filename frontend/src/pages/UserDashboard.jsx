import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { 
  PlusCircle, FileText, MessageSquare, Database, 
  Clock, ChevronRight, Zap, Edit2, Trash2, 
  Check, X, Loader2, Sparkles, ArrowRight
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function UserDashboard() {
  const { getToken } = useAuth();
  const [kbs, setKbs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchKbs();
  }, []);

  const fetchKbs = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/upload/kbs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKbs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Dissolve this neural cluster? This indexed data will be permanently erased.')) return;
    setIsProcessing(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/upload/kb/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchKbs();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRename = async (id) => {
    if (!editName.trim()) return;
    setIsProcessing(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/upload/kb/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name: editName })
      });
      if (res.ok) {
        setEditingId(null);
        fetchKbs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="animate-reveal">
      <div style={{ marginBottom: '6rem' }}>
        <div className="aura-hero-badge" style={{ marginBottom: '1.5rem', color: '#fff', borderColor: 'rgba(255, 255, 255, 0.4)' }}>PLATFORM OVERVIEW</div>
        <h1 style={{ fontSize: '4rem', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)' }}>Resolve with Intensity.</h1>
        <p style={{ color: 'var(--aura-text-body)', fontSize: '1.2rem', maxWidth: '600px' }}>
          Your integrated neural workspace. Manage clusters for high-speed resolution.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2.5rem' }}>
        
        <Link to="/upload" className="aura-card" style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
          padding: '4rem 2rem', gap: '1.5rem', border: '2.5px dashed rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.01)',
          textAlign: 'center'
        }}>
          <div style={{ 
            background: '#fff', color: '#000', 
            padding: '1.5rem', borderRadius: '24px', boxShadow: '0 0 40px rgba(255, 255, 255, 0.1)'
          }}>
            <PlusCircle size={36} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.75rem', marginBottom: '0.75rem', fontFamily: 'var(--font-serif)', color: '#fff' }}>Deploy Neural Node</h3>
            <p style={{ color: 'var(--aura-text-muted)', fontSize: '1rem' }}>Initiate a new high-speed vector index.</p>
          </div>
        </Link>

        {isLoading ? (
          [1, 2].map(i => <div key={i} className="aura-card animate-pulse" style={{ height: '350px' }}></div>)
        ) : kbs.map(kb => (
          <div key={kb.id} className="aura-card" style={{ 
            display: 'flex', flexDirection: 'column', padding: '3rem', 
            background: 'rgba(15, 23, 42, 0.8)', border: editingId === kb.id ? '2px solid #fff' : ''
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff', padding: '1rem', borderRadius: '18px' }}>
                <Database size={28} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                 <button onClick={() => { setEditingId(kb.id); setEditName(kb.name); }} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.4)', cursor: 'pointer', transition: 'color 0.2s' }}>
                    <Edit2 size={18} />
                 </button>
                 <button onClick={() => handleDelete(kb.id)} style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.6)', cursor: 'pointer', transition: 'color 0.2s' }}>
                    <Trash2 size={18} />
                 </button>
              </div>
            </div>

            <div style={{ marginBottom: '3rem', flex: 1 }}>
              {editingId === kb.id ? (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input 
                      className="aura-input" 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ padding: '0.75rem', fontSize: '1.25rem', fontFamily: 'var(--font-serif)' }}
                      autoFocus
                    />
                    <button onClick={() => handleRename(kb.id)} style={{ color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer' }}><Check size={28} /></button>
                    <button onClick={() => setEditingId(null)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><X size={28} /></button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-serif)', color: '#fff', lineHeight: 1 }}>{kb.name}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {kb.description && (
                      <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-accent-base)', letterSpacing: '0.1em' }}>
                        {kb.description.toUpperCase()}
                      </div>
                    )}
                    <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--aura-text-muted)' }}>
                      {kb.doc_count || 0} ASSETS
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link to={`/chat/${kb.id}`} className="btn-aura" style={{ width: '100%', justifyContent: 'space-between' }}>
               <span>OPEN INTELLIGENCE</span>
               <ArrowRight size={18} />
            </Link>
          </div>
        ))}
      </div>

      {/* Decorative Galaxy Footer Motif */}
      <div style={{ marginTop: '8rem', padding: '6rem', borderRadius: 'var(--radius-xl)', background: 'linear-gradient(135deg, #0f172a 0%, #000 100%)', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
         <div style={{ position: 'relative', zIndex: 1 }}>
           <h2 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)' }}>The future of support is autonomous.</h2>
           <button className="btn-aura">Explore Automation</button>
         </div>
         <div style={{ position: 'absolute', top: '-20%', right: '-10%', opacity: 0.1 }}>
            <Sparkles size={400} />
         </div>
      </div>
    </section>
  );
}
