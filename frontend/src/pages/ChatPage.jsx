import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Send, BookOpen, ArrowLeft, Loader2, Sparkles, Database, FileText, Zap, Download, Volume2, VolumeX } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function ChatPage() {
  const { kbId } = useParams();
  const { getToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);

  const speak = (text) => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onstart = () => setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    loadHistory();
  }, [kbId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadHistory = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/chat/history/${kbId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const sendMessage = async (overrideInput) => {
    const textMsg = overrideInput || input;
    if (!textMsg.trim() || isLoading) return;
    
    setMessages(prev => [...prev, { role: 'user', content: textMsg }]);
    setInput('');
    setSuggestions([]);
    setIsLoading(true);

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ kbId, question: textMsg })
      });

      if (!response.ok) throw new Error('System link failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      setMessages(prev => [...prev, { role: 'ai', content: '', sources: [] }]);

      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk') {
                accumulatedContent += data.content;
                setMessages(prev => {
                  const last = { ...prev[prev.length - 1], content: accumulatedContent };
                  return [...prev.slice(0, -1), last];
                });
              } else if (data.type === 'sources') {
                setMessages(prev => {
                  const last = { ...prev[prev.length - 1], sources: data.sources };
                  return [...prev.slice(0, -1), last];
                });
              } else if (data.type === 'suggestions') {
                setSuggestions(data.suggestions);
              } else if (data.type === 'done') {
                setIsLoading(false);
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("Aura Intelligence Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    const body = messages.map(m => [
      m.role === 'user' ? 'USER' : 'AURA',
      m.content,
      m.sources?.join(', ') || '-'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Identity', 'Content', 'Verified Sources']],
      body: body,
      theme: 'grid',
      styles: { fontSize: 9 }
    });

    doc.save(`aura-report-kb${kbId}.pdf`);
  };

  return (
    <div className="animate-reveal" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
         <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '15px' }}><Database size={24} color="#fff" /></div>
            <div>
               <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-serif)', color: '#fff' }}>Cluster Identity #{kbId}</h2>
               <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', color: '#22c55e', fontWeight: 700 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div> CORE ONLINE
               </div>
            </div>
         </div>
         <button onClick={exportPDF} className="btn-aura" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.6rem 1.25rem' }}>
            <Download size={16} /> EXPORT
         </button>
      </div>

      <div style={{ flex: 1, background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
         <div style={{ flex: 1, overflowY: 'auto', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ 
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                padding: '1.25rem 1.75rem',
                borderRadius: 'var(--radius-md)',
                background: m.role === 'user' ? 'rgba(255,255,255,0.05)' : 'rgba(56, 189, 248, 0.04)',
                border: m.role === 'user' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(56, 189, 248, 0.1)',
                color: m.role === 'user' ? '#fff' : 'var(--aura-text-body)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                   <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{m.content}</div>
                   {m.role === 'ai' && (
                     <button 
                        onClick={() => speak(m.content)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-accent-base)', cursor: 'pointer', padding: '0.2rem', opacity: 0.8 }}
                        title="Read out loud"
                     >
                        <Volume2 size={16} />
                     </button>
                   )}
                </div>
                {m.sources?.length > 0 && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                     <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-accent-base)', marginBottom: '0.5rem' }}>VERIFIED SOURCES</p>
                     <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {m.sources.map((s, si) => <span key={si} style={{ fontSize: '0.7rem', opacity: 0.6 }}>{s}</span>)}
                     </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
         </div>

         {suggestions.length > 0 && (
           <div style={{ padding: '0 2.5rem 1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
             {suggestions.map((s, i) => (
               <button key={i} onClick={() => sendMessage(s)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '99px', padding: '0.4rem 1rem', fontSize: '0.8rem', color: 'var(--aura-text-body)', cursor: 'pointer' }}>{s}</button>
             ))}
           </div>
         )}

         <div style={{ padding: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ position: 'relative' }}>
               <input 
                 className="aura-input" 
                 placeholder="Query the node..."
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                 style={{ padding: '1.25rem 7rem 1.25rem 2.5rem', height: '80px', fontSize: '1.25rem' }}
               />
               <button 
                 onClick={() => sendMessage()} 
                 disabled={isLoading || !input.trim()} 
                 style={{ 
                   position: 'absolute', right: '1rem', top: '1rem', bottom: '1rem', 
                   background: '#fff', border: 'none', borderRadius: '14px', padding: '0 2rem', 
                   fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                   boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                 }}
               >
                  {isLoading ? <Loader2 className="animate-spin" size={24} /> : "QUERY"}
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
