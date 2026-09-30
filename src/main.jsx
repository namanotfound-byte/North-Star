import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Check, CheckCircle2, ChevronDown, Compass, Heart, Lightbulb, Menu, MessageCircle, Mic, Plus, Send, ShieldCheck, Sparkles, Target, Trash2, X } from 'lucide-react';
import './style.css';

const KEYS = { sessions: 'northstar.sessions.v2', active: 'northstar.active.v2', mood: 'northstar.mood.v1', goals: 'northstar.goals.v1', exercise: 'northstar.exercises.v1', language: 'northstar.language.v1', decision: 'northstar.decision.v1' };
const exercises = [
  { title: 'Name what matters', prompt: 'Think of a choice you are facing. What are three things you want this decision to honor?' },
  { title: 'A kinder perspective', prompt: 'What would you say to someone you care about who was facing this same situation?' },
  { title: 'Future you', prompt: 'Imagine looking back a month from now. What would make you feel proud of how you approached this?' },
  { title: 'Small next step', prompt: 'What is one small, reversible step that could help you learn more before deciding?' },
  { title: 'Give the feeling a name', prompt: 'Pause for a moment. What emotion feels strongest right now, and what might it be trying to tell you?' },
];
const moods = ['Calm', 'Hopeful', 'Unsure', 'Overwhelmed', 'Anxious', 'Excited', 'Sad', 'Focused'];
const emptySession = () => ({ id: crypto.randomUUID(), title: 'New reflection', messages: [], updatedAt: Date.now() });
function read(key, fallback) { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
function initialSessions() {
  const saved = read(KEYS.sessions, null);
  if (Array.isArray(saved)) return saved;
  const old = read('northstar.conversation.v1', []);
  if (old.length) return [{ id: crypto.randomUUID(), title: old.find(m => m.role === 'user')?.content?.slice(0, 44) || 'Previous reflection', messages: old, updatedAt: Date.now() }];
  return [];
}
function Typewriter({ text }) {
  const [visible, setVisible] = useState('');
  useEffect(() => {
    let at = 0; let timeout;
    const tick = () => { at = Math.min(text.length, at + Math.max(1, Math.ceil(text.length / 120))); setVisible(text.slice(0, at)); if (at < text.length) timeout = setTimeout(tick, 18); };
    tick(); return () => clearTimeout(timeout);
  }, [text]);
  return <span className={visible.length < text.length ? 'typing-copy' : ''}>{visible}</span>;
}
function App() {
  const [bootSessions] = useState(initialSessions);
  const [sessions, setSessions] = useState(() => bootSessions);
  const [activeId, setActiveId] = useState(() => read(KEYS.active, null) || bootSessions[0]?.id || null);
  const [tab, setTab] = useState('reflect');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moodLog, setMoodLog] = useState(() => read(KEYS.mood, []));
  const [goals, setGoals] = useState(() => read(KEYS.goals, []));
  const [exerciseLog, setExerciseLog] = useState(() => read(KEYS.exercise, []));
  const [language, setLanguage] = useState(() => read(KEYS.language, 'English'));
  const [moodNote, setMoodNote] = useState('');
  const [goalText, setGoalText] = useState('');
  const [decisionDraft] = useState(() => read(KEYS.decision, { options: ['', ''], priorities: '' }));
  const [options, setOptions] = useState(() => decisionDraft.options || ['', '']);
  const [priorities, setPriorities] = useState(() => decisionDraft.priorities || '');
  const [summary, setSummary] = useState(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => { setVoiceSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)); }, []);
  useEffect(() => { try { localStorage.setItem(KEYS.sessions, JSON.stringify(sessions)); } catch {} }, [sessions]);
  useEffect(() => { try { localStorage.setItem(KEYS.active, JSON.stringify(activeId)); } catch {} }, [activeId]);
  useEffect(() => { try { localStorage.setItem(KEYS.mood, JSON.stringify(moodLog)); } catch {} }, [moodLog]);
  useEffect(() => { try { localStorage.setItem(KEYS.goals, JSON.stringify(goals)); } catch {} }, [goals]);
  useEffect(() => { try { localStorage.setItem(KEYS.exercise, JSON.stringify(exerciseLog)); } catch {} }, [exerciseLog]);
  useEffect(() => { try { localStorage.setItem(KEYS.language, JSON.stringify(language)); } catch {} }, [language]);
  useEffect(() => { try { localStorage.setItem(KEYS.decision, JSON.stringify({ options, priorities })); } catch {} }, [options, priorities]);

  const active = sessions.find(s => s.id === activeId) || null;
  const messages = active?.messages || [];
  const sortedSessions = useMemo(() => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt), [sessions]);
  const updateActive = (fn) => setSessions(old => old.map(s => s.id === activeId ? { ...fn(s), updatedAt: Date.now() } : s));

  function newReflection() { const session = emptySession(); setSessions(old => [session, ...old]); setActiveId(session.id); setSummary(null); setTab('reflect'); setInput(''); setMenuOpen(false); }
  function selectSession(id) { setActiveId(id); setSummary(null); setTab('reflect'); setMenuOpen(false); }
  function startVoice() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition(); recognition.lang = language === 'Hindi' ? 'hi-IN' : language === 'Spanish' ? 'es-ES' : 'en-US'; recognition.interimResults = true;
    recognition.onresult = event => setInput(Array.from(event.results).map(r => r[0].transcript).join(''));
    recognition.onerror = () => {};
    recognition.start();
  }
  async function startConversation(seed = input) {
    const text = seed.trim(); if (!text || loading) return;
    let session = active;
    if (!session) { session = emptySession(); setSessions(old => [session, ...old]); setActiveId(session.id); }
    const next = [...session.messages, { role: 'user', content: text }];
    const title = session.messages.length ? session.title : text.slice(0, 44) + (text.length > 44 ? '…' : '');
    setSessions(old => old.map(s => s.id === session.id ? { ...s, title, messages: next, updatedAt: Date.now() } : s));
    setInput(''); setTab('reflect'); setLoading(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next, language }) });
      const data = await res.json(); if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status}).`);
      setSessions(old => old.map(s => s.id === session.id ? { ...s, messages: [...next, { role: 'assistant', content: data.reply }], updatedAt: Date.now() } : s));
    } catch (error) {
      setSessions(old => old.map(s => s.id === session.id ? { ...s, messages: [...next, { role: 'assistant', content: error.message || 'I couldn’t reach Northstar just now. Please try again.' }], updatedAt: Date.now() } : s));
    } finally { setLoading(false); }
  }

  async function makeSummary() {
    if (messages.filter(m => m.role === 'user').length < 2) return;
    setSummaryBusy(true); setSummary(null);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'summary', messages, options: options.filter(Boolean), priorities: priorities.split(',').map(x => x.trim()).filter(Boolean), language }) });
      const data = await res.json(); if (!res.ok || data.error) throw new Error(data.error || 'Could not create the decision summary.'); setSummary(data.summary);
    } catch (error) { setSummary({ error: error.message }); }
    finally { setSummaryBusy(false); }
  }
  function addMood(mood) { setMoodLog(old => [{ id: crypto.randomUUID(), mood, note: moodNote.trim(), date: new Date().toISOString() }, ...old].slice(0, 200)); setMoodNote(''); }
  function addGoal(e) { e.preventDefault(); if (!goalText.trim()) return; setGoals(old => [{ id: crypto.randomUUID(), title: goalText.trim(), done: false, date: new Date().toISOString() }, ...old]); setGoalText(''); }
  function toggleGoal(id) { setGoals(old => old.map(g => g.id === id ? { ...g, done: !g.done } : g)); }
  function deleteGoal(id) { setGoals(old => old.filter(g => g.id !== id)); }
  function completeExercise(index) { const today = new Date().toISOString().slice(0, 10); setExerciseLog(old => old.includes(`${today}:${index}`) ? old : [...old, `${today}:${index}`]); }

  const title = { reflect: 'Your thinking space', journal: 'Mood journal', decide: 'Decision workspace', goals: 'Goal planner', daily: 'A daily pause', progress: 'Your progress' }[tab];
  const today = new Date().toISOString().slice(0, 10);
  const recentMoods = moodLog.slice(0, 7);

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
      <div className="brand-row"><a href="#" className="brand" onClick={e=>{e.preventDefault();setTab('reflect')}}><img src="/northstar-logo.png" alt="" className="brand-logo"/><span>northstar</span></a><button className="icon-button hide-mobile" onClick={()=>setMenuOpen(false)} aria-label="Close menu"><X size={17}/></button></div>
      <button className="new-chat" onClick={newReflection}><Plus size={16}/> New reflection</button>
      <div className="side-caption">YOUR SPACE</div>
      <nav className="side-nav">
        <button className={`side-link ${tab==='reflect'?'active':''}`} onClick={()=>setTab('reflect')}><MessageCircle size={16}/> Think something through</button>
        <button className={`side-link ${tab==='decide'?'active':''}`} onClick={()=>setTab('decide')}><BarChart3 size={16}/> Decision workspace</button>
        <button className={`side-link ${tab==='journal'?'active':''}`} onClick={()=>setTab('journal')}><Heart size={16}/> Mood journal</button>
        <button className={`side-link ${tab==='goals'?'active':''}`} onClick={()=>setTab('goals')}><Target size={16}/> Goals</button>
        <button className={`side-link ${tab==='daily'?'active':''}`} onClick={()=>setTab('daily')}><Sparkles size={16}/> Daily pause</button>
        <button className={`side-link ${tab==='progress'?'active':''}`} onClick={()=>setTab('progress')}><BarChart3 size={16}/> Progress</button>
      </nav>
      <div className="side-caption recent-label">CHAT HISTORY <span>{sessions.length}</span></div>
      <div className="history-list">{sortedSessions.length ? sortedSessions.map(s=><button key={s.id} className={`history-item ${activeId===s.id && tab==='reflect'?'selected':''}`} onClick={()=>selectSession(s.id)} title={s.title}><MessageCircle size={13}/><span>{s.title}</span></button>) : <div className="empty-recent">Your reflections stay on this device and appear here.</div>}</div>
      <div className="sidebar-bottom"><div className="privacy-card"><div className="privacy-icon"><ShieldCheck size={17}/></div><div><strong>Private to this browser</strong><p>Chat is sent to Groq for replies. Your history, mood notes and goals are saved locally.</p></div></div><div className="language-select"><label htmlFor="language">Response language</label><select id="language" value={language} onChange={e=>setLanguage(e.target.value)}><option>English</option><option>Hindi</option><option>Spanish</option></select></div></div>
    </aside>
    {menuOpen && <button className="scrim" onClick={()=>setMenuOpen(false)} aria-label="Close menu"/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-button show-mobile" onClick={()=>setMenuOpen(true)} aria-label="Open menu"><Menu size={19}/></button><div className="mode-label"><span className="mode-dot"/> {title}</div><span className="local-badge"><ShieldCheck size={13}/> Saved on this device</span></header>
      {tab==='reflect' && <section className="chat-content">
        {!active || messages.length===0 ? <div className="empty-chat"><div className="welcome-kicker"><span className="kicker-star">✳</span> YOUR THINKING SPACE</div><h1>Find your way <em>forward.</em></h1><p className="hero-sub">A little space to untangle what’s on your mind.<br/> No rush. No judgement. Just you, finding clarity.</p><div className="starter-row">{['I feel stuck between two choices','I have a lot on my mind','I want to understand how I feel'].map(s=><button className="starter" key={s} onClick={()=>startConversation(s)}><span className="starter-icon">✳</span>{s}<ArrowUpRight size={13}/></button>)}</div></div> : <><div className="chat-heading"><img className="chat-logo" src="/northstar-logo.png" alt=""/><div><span className="chat-kicker">LET’S TAKE THIS ONE STEP AT A TIME</span><h2>{active.title}</h2></div></div><div className="message-list">{messages.map((m,i)=><div key={i} className={`message ${m.role}`}><div className="message-avatar">{m.role==='assistant'?<img src="/northstar-logo.png" alt="Northstar"/>:<span>N</span>}</div><div className="message-text">{m.role==='assistant'?<Typewriter text={m.content}/>:m.content}</div></div>)}{loading&&<div className="message assistant"><div className="message-avatar"><img src="/northstar-logo.png" alt="Northstar"/></div><div className="typing"><i/><i/><i/></div></div>}</div></>}
        <div className="chat-composer"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();startConversation()}}} placeholder="What’s on your mind? Share a little more…" rows="2"/><div className="composer-actions">{voiceSupported&&<button className="icon-button" onClick={startVoice} title="Dictate with voice"><Mic size={17}/></button>}<button className="send-button" onClick={()=>startConversation()} disabled={!input.trim()||loading} aria-label="Send"><Send size={16}/></button></div><span className="chat-footnote">Northstar helps you think; your decision stays yours.</span></div>
      </section>}
      {tab==='journal' && <section className="tool-page"><PageIntro eyebrow="CHECK IN WITH YOURSELF" title="How are you feeling?" text="A small check-in can help you spot how your days are unfolding. Your notes stay on this device."/><div className="panel"><h3>Right now, I feel…</h3><div className="mood-grid">{moods.map(m=><button key={m} className="mood-choice" onClick={()=>addMood(m)}>{m}</button>)}</div><textarea className="field textarea-field" value={moodNote} onChange={e=>setMoodNote(e.target.value)} placeholder="Anything you want to remember about today? (optional)" rows="3"/></div><div className="panel"><h3>Recent check-ins</h3>{recentMoods.length ? <div className="journal-list">{recentMoods.map(m=><div className="journal-entry" key={m.id}><span className="mood-mark">✳</span><div><strong>{m.mood}</strong>{m.note&&<p>{m.note}</p>}</div><time>{new Date(m.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time></div>)}</div> : <p className="muted-copy">Your check-ins will appear here.</p>}</div></section>}
      {tab==='decide' && <section className="tool-page"><PageIntro eyebrow="MAKE ROOM FOR EVERY ANGLE" title="Think it through." text="Lay out the options, then let Northstar help you notice tradeoffs, risks, opportunities and what matters most."/><div className="panel option-panel"><h3>Your options</h3>{options.map((o,i)=><label className="field-label" key={i}>Option {i+1}<input className="field" value={o} onChange={e=>setOptions(old=>old.map((v,j)=>j===i?e.target.value:v))} placeholder={i===0?'e.g. Choose science':'e.g. Choose commerce'}/></label>)}{options.length<4&&<button className="text-button" onClick={()=>setOptions(old=>[...old,''])}><Plus size={15}/> Add another option</button>}<label className="field-label priorities-label">What matters most to you?<input className="field" value={priorities} onChange={e=>setPriorities(e.target.value)} placeholder="Separate priorities with commas"/></label><button className="primary-button" onClick={()=>{setTab('reflect');if(!active)newReflection();setInput(`I’m considering ${options.filter(Boolean).join(' or ')}. What matters most to me is ${priorities || 'still becoming clear'}. Help me think it through.`)}}>Start a guided reflection <ArrowRight size={16}/></button></div>{messages.filter(m=>m.role==='user').length>=2&&<div className="panel summary-action"><div><h3>Ready to see the bigger picture?</h3><p>Build a personal decision dashboard from this conversation.</p></div><button className="primary-button" disabled={summaryBusy} onClick={makeSummary}>{summaryBusy?'Putting it together…':'Create my summary'} <ArrowRight size={16}/></button></div>}{summary&&<SummaryCard summary={summary}/>}</section>}
      {tab==='goals' && <section className="tool-page"><PageIntro eyebrow="SMALL STEPS COUNT" title="Make space for progress." text="Add something you want to move toward. Keep it gentle and manageable."/><form className="panel goal-form" onSubmit={addGoal}><h3>A goal on my mind</h3><div className="inline-form"><input className="field" value={goalText} onChange={e=>setGoalText(e.target.value)} placeholder="e.g. Spend 20 minutes reviewing options"/><button className="primary-button" type="submit"><Plus size={16}/> Add goal</button></div></form><div className="panel"><h3>Your goals <span className="count-pill">{goals.filter(g=>g.done).length}/{goals.length} done</span></h3>{goals.length?<div className="goal-list">{goals.map(g=><div key={g.id} className={`goal-item ${g.done?'done':''}`}><button className="check-button" onClick={()=>toggleGoal(g.id)} aria-label={g.done?'Mark incomplete':'Complete goal'}>{g.done?<CheckCircle2 size={19}/>:<Check size={18}/>}</button><span>{g.title}</span><button className="delete-button" onClick={()=>deleteGoal(g.id)} aria-label="Remove goal"><Trash2 size={15}/></button></div>)}</div>:<p className="muted-copy">Your list is empty for now. Add one small next step when you’re ready.</p>}</div></section>}
      {tab==='daily' && <section className="tool-page"><PageIntro eyebrow="A MOMENT FOR YOU" title="One small exercise." text="Short prompts to help you reconnect with what matters. Pick one and take it at your own pace."/><div className="exercise-grid">{exercises.map((item,i)=><article className="panel exercise-card" key={item.title}><span className="exercise-number">0{i+1}</span><h3>{item.title}</h3><p>{item.prompt}</p>{exerciseLog.includes(`${today}:${i}`)?<span className="completed-label"><CheckCircle2 size={16}/> Done for today</span>:<button className="text-button" onClick={()=>{completeExercise(i);setTab('reflect');setInput(item.prompt)}}>Reflect on this <ArrowRight size={14}/></button>}</article>)}</div></section>}
      {tab==='progress' && <section className="tool-page"><PageIntro eyebrow="NOTICE YOUR OWN RHYTHM" title="Progress, at your pace." text="A quiet overview of the reflection work you’ve done on this device. This is a record, not a scorecard."/><div className="stats-grid"><Stat label="Reflections" value={sessions.filter(s=>s.messages.length).length} detail="conversations started" icon={<MessageCircle size={18}/>} /><Stat label="Check-ins" value={moodLog.length} detail="mood notes saved" icon={<Heart size={18}/>} /><Stat label="Goals reached" value={goals.filter(g=>g.done).length} detail={`of ${goals.length} added`} icon={<Target size={18}/>} /><Stat label="Daily pauses" value={exerciseLog.length} detail="exercises completed" icon={<Sparkles size={18}/>} /></div><div className="panel"><h3>Your recent feelings</h3>{recentMoods.length?<div className="mood-timeline">{recentMoods.map(m=><div className="timeline-item" key={m.id}><span className="timeline-dot"/><strong>{m.mood}</strong><time>{new Date(m.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time></div>)}</div>:<p className="muted-copy">Your mood journal will help build this picture over time.</p>}</div></section>}
      <footer className="app-footer"><span>Northstar is a thinking companion, not a source of professional advice.</span><span><a href="#privacy">Privacy</a><span className="footer-dot">·</span><a href="#about">About</a></span></footer>
    </main>
  </div>;
}
function PageIntro({eyebrow,title,text}) { return <div className="page-intro"><span className="chat-kicker">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>; }
function Stat({label,value,detail,icon}) { return <div className="panel stat-card"><span className="value-icon">{icon}</span><strong>{value}</strong><b>{label}</b><small>{detail}</small></div>; }
function SummaryCard({summary}) { if(summary.error)return <div className="panel error-card">{summary.error}</div>; return <div className="summary-dashboard"><div className="summary-title"><span className="chat-kicker">YOUR DECISION DASHBOARD</span><h2>{summary.title||'A clearer picture'}</h2></div><div className="stats-grid summary-stats"><Stat label="Emotional clarity" value={`${summary.emotional_score??'—'}/10`} detail="A gentle self-reflection" icon={<Heart size={18}/>} /><Stat label="Confidence" value={summary.confidence_level||'Building'} detail="Your sense of direction" icon={<Compass size={18}/>} /></div><div className="panel"><h3>Emotions in the conversation</h3><ChipList items={summary.emotions}/></div><div className="panel"><h3>What seems important to you</h3><ChipList items={summary.priorities}/></div><div className="panel"><h3>Options at a glance</h3>{summary.option_comparison?.length?<div className="comparison-list">{summary.option_comparison.map((o,i)=><div className="comparison-item" key={i}><h4>{o.option}</h4><ComparisonColumn title="Could offer" items={o.pros}/><ComparisonColumn title="Tradeoffs" items={o.cons}/><ComparisonColumn title="Risks & openings" items={[...(o.risks||[]),...(o.opportunities||[])]}/></div>)}</div>:<p className="muted-copy">Keep exploring your options in the conversation.</p>}</div><div className="insight-columns"><div className="panel"><h3>Patterns & concerns</h3><ChipList items={[...(summary.patterns||[]),...(summary.key_concerns||[])]}/></div><div className="panel"><h3>Possible next steps</h3><OrderedList items={summary.suggested_next_steps}/></div></div><div className="panel"><h3>Questions to sit with</h3><OrderedList items={summary.reflection_questions}/><p className="score-note">The clarity and confidence indicators are AI-generated prompts for reflection, not clinical assessments or predictions.</p></div></div>; }
function ChipList({items=[]}) { return items.length?<div className="chip-list">{items.map((x,i)=><span className="insight-chip" key={i}>{x}</span>)}</div>:<p className="muted-copy">These may become clearer as you reflect.</p>; }
function ComparisonColumn({title,items=[]}) { return <div className="comparison-column"><b>{title}</b>{items.length?<ul>{items.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p className="muted-copy">Still to explore</p>}</div>; }
function OrderedList({items=[]}) { return items.length?<ol className="ordered-insights">{items.map((x,i)=><li key={i}>{x}</li>)}</ol>:<p className="muted-copy">Continue the conversation to discover this.</p>; }

createRoot(document.getElementById('root')).render(<App/>);
