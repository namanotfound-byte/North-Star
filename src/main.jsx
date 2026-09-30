import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowRight, ArrowUpRight, AudioLines, Check, ChevronDown, Compass, Heart, Lightbulb, Menu, MessageCircle, Plus, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import './style.css';

const starters = ['I feel stuck between two choices', 'I have a lot on my mind', 'I want to understand how I feel'];
const HISTORY_KEY = 'northstar.conversation.v1';

function getSavedMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string') : [];
  } catch { return []; }
}

function App() {
  const [screen, setScreen] = useState(() => getSavedMessages().length ? 'chat' : 'home');
  const [prompt, setPrompt] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(getSavedMessages);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      if (messages.length) localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
      else localStorage.removeItem(HISTORY_KEY);
    } catch { /* Storage may be disabled or full; chat still works for this visit. */ }
  }, [messages]);

  async function startConversation(seed = input) {
    const text = seed.trim(); if (!text || loading) return;
    setInput(''); setPrompt(''); setScreen('chat');
    const next = [...messages, { role: 'user', content: text }]; setMessages(next); setLoading(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status}).`);
      setMessages([...next, { role: 'assistant', content: data.reply || "Let's take this one step at a time. What feels most important about this situation to you?" }]);
    } catch (error) {
      setMessages([...next, { role: 'assistant', content: error.message || 'I couldn’t reach Northstar just now. Please check your connection and try again.' }]);
    } finally { setLoading(false); }
  }

  const reset = () => { setMessages([]); setScreen('home'); setInput(''); };
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
      <div className="brand-row"><a href="#" className="brand" onClick={e=>{e.preventDefault();reset()}}><span className="brand-mark"><Compass size={20}/></span><span>northstar</span></a><button className="icon-button hide-mobile" onClick={()=>setMenuOpen(false)} aria-label="Close menu"><X size={17}/></button></div>
      <button className="new-chat" onClick={reset}><Plus size={16}/> New reflection <span>⌘ K</span></button>
      <div className="side-caption">YOUR SPACE</div>
      <button className="side-link active" onClick={reset}><MessageCircle size={16}/> Think something through</button>
      <div className="side-caption recent-label">RECENT</div>
      <div className="empty-recent">{messages.length ? 'Your current reflection is saved on this device.' : 'Your reflections will find a home here.'}</div>
      <div className="sidebar-bottom"><div className="privacy-card"><div className="privacy-icon"><ShieldCheck size={17}/></div><div><strong>A space just for you</strong><p>No account needed. This conversation is saved only in this browser.</p></div></div><div className="profile-row"><div className="avatar">N</div><div className="profile-copy"><strong>Your space</strong><span>Personal reflection</span></div><ChevronDown size={15} className="muted"/></div></div>
    </aside>
    {menuOpen && <button className="scrim" onClick={()=>setMenuOpen(false)} aria-label="Close menu"/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-button show-mobile" onClick={()=>setMenuOpen(true)} aria-label="Open menu"><Menu size={19}/></button><div className="mode-label"><span className="mode-dot"/> A moment to think</div><button className="top-help" onClick={()=>document.getElementById('how')?.scrollIntoView({behavior:'smooth'})}>How it works <ArrowUpRight size={14}/></button></header>
      {screen === 'home' ? <div className="home-content">
        <div className="welcome-kicker"><span className="kicker-star">✳</span> YOUR THINKING SPACE</div>
        <h1>Find your way<br/> <em>forward.</em></h1>
        <p className="hero-sub">A little space to untangle what’s on your mind.<br className="desktop-only"/> No rush. No judgement. Just you, finding clarity.</p>
        <div className="composer-wrap"><div className="composer"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();startConversation()}}} placeholder="What’s on your mind? Start anywhere…" rows="2"/><div className="composer-bottom"><span className="composer-hint"><Sparkles size={14}/> A gentle place to begin</span><button className="send-button" onClick={()=>startConversation()} disabled={!input.trim()||loading} aria-label="Send"><ArrowRight size={18}/></button></div></div><div className="composer-note"><ShieldCheck size={13}/> No account needed. Your thoughts are processed by Groq to guide your reflection.</div></div>
        <div className="starter-row">{starters.map((s,i)=><button key={s} className="starter" onClick={()=>startConversation(s)}><span className={`starter-icon s${i}`}><span>{['↗','〰','♡'][i]}</span></span>{s}<ArrowUpRight size={13}/></button>)}</div>
        <div className="value-strip"><div><span className="value-icon"><Heart size={17}/></span><span><b>Start with how you feel</b><small>Emotions are part of the picture.</small></span></div><div><span className="value-icon"><Lightbulb size={17}/></span><span><b>Make sense of the pieces</b><small>See what matters to you.</small></span></div><div><span className="value-icon"><Compass size={17}/></span><span><b>Choose your own direction</b><small>The next step is always yours.</small></span></div></div>
        <div className="demo-hint"><span className="demo-line"/> A thought doesn’t have to be perfectly worded to begin <ArrowDown size={13}/></div>
      </div> : <div className="chat-content"><div className="chat-heading"><div className="mini-star">✳</div><div><span className="chat-kicker">LET’S TAKE THIS ONE STEP AT A TIME</span><h2>What’s coming up for you?</h2></div></div><div className="message-list">{messages.map((m,i)=><div key={i} className={`message ${m.role}`}><div className="message-avatar">{m.role==='assistant'?<Compass size={15}/>:<span>N</span>}</div><div className="message-text">{m.content}</div></div>)}{loading&&<div className="message assistant"><div className="message-avatar"><Compass size={15}/></div><div className="typing"><i/><i/><i/></div></div>}</div><div className="chat-composer"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();startConversation()}}} placeholder="Share a little more…" rows="1"/><button className="send-button" onClick={()=>startConversation()} disabled={!input.trim()||loading}><Send size={16}/></button><span className="chat-footnote">Your final decision is always yours.</span></div></div>}
      <footer className="app-footer"><span>Northstar is a thinking companion, not a source of professional advice.</span><span><a href="#privacy">Privacy</a><span className="footer-dot">·</span><a href="#about">About</a></span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
