import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, FileText, Check, AlertCircle, Loader2, Database, ArrowLeft } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function UploadPage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [kbName, setKbName] = useState('');
  const [topic, setTopic] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!file || !kbName) {
      setError('Provide cluster identity and select a source file.');
      return;
    }
    setIsUploading(true);
    setError(null);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kbName', kbName);
      formData.append('description', topic); // Added topic (description)

      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) throw new Error('Indexing sequence failed');
      const data = await response.json();
      navigate(`/chat/${data.kbId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="animate-reveal" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '6rem' }}>
        <div className="aura-hero-badge">Indexer</div>
        <h1 style={{ fontSize: '4rem', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)' }}>Synthesize Knowledge.</h1>
        <p style={{ color: 'var(--aura-text-body)', fontSize: '1.2rem' }}>Index local documents into topic-specific neural clusters.</p>
      </div>

      <div className="aura-card" style={{ padding: '4rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--aura-text-muted)' }}>CLUSTER IDENTITY (NAME)</label>
          <input 
            type="text" 
            className="aura-input" 
            placeholder="e.g. Sales Training Matrix"
            value={kbName}
            onChange={(e) => setKbName(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '3rem' }}>
          <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--aura-text-muted)' }}>TOPIC / SECTOR (OPTIONAL)</label>
          <input 
            type="text" 
            className="aura-input" 
            placeholder="e.g. Marketing, Sales, Engineering"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{ height: '60px', padding: '1rem 1.5rem' }}
          />
        </div>

        <div 
          onClick={() => document.getElementById('file-upload').click()}
          style={{ 
            cursor: 'pointer',
            padding: '5rem 2rem', 
            border: `2px dashed ${file ? '#fff' : 'rgba(255,255,255,0.1)'}`, 
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.02)',
            transition: 'all 0.3s',
            marginBottom: '3rem'
          }}
        >
          {file ? (
             <div>
                <Check size={48} color="#22c55e" style={{ marginBottom: '1.5rem', margin: '0 auto' }} />
                <h3 style={{ marginBottom: '0.5rem', color: '#fff' }}>{file.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--aura-text-muted)' }}>Source file validated and ready for indexing.</p>
             </div>
          ) : (
            <>
              <Upload size={48} color="rgba(255,255,255,0.2)" style={{ marginBottom: '1.5rem', margin: '0 auto' }} />
              <h3 style={{ marginBottom: '0.5rem', color: '#fff' }}>Select Multimodal Source</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--aura-text-muted)', maxWidth: '400px', margin: '0 auto' }}>
                PDF, DOCX, XLSX, PPTX, CSV, JSON, MD supported. 
                <br/>(Download Google Docs/Sheets as PDF or Office to index)
              </p>
            </>
          )}
          <input 
            type="file" 
            id="file-upload" 
            style={{ display: 'none' }} 
            accept=".pdf,.txt,.docx,.xlsx,.xls,.pptx,.csv,.json,.md" 
            onChange={(e) => setFile(e.target.files[0])} 
          />
        </div>

        {error && (
          <div style={{ marginBottom: '2rem', color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <button 
          className="btn-aura" 
          onClick={handleUpload}
          disabled={isUploading || !file || !kbName}
          style={{ width: '100%', padding: '1.25rem' }}
        >
          {isUploading ? <><Loader2 className="animate-spin" size={20} /> INITIALIZING INDEX...</> : 'DEPLOY TOPIC CLUSTER'}
        </button>
      </div>
    </div>
  );
}
