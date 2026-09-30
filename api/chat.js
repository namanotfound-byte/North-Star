const SYSTEM = `You are Northstar, a calm thinking companion for students and young adults. Help people think, do not make decisions for them. Start with emotional reflection, understand the situation, ask one thoughtful open question at a time, then gradually clarify priorities, options, tradeoffs, risks, and next steps. Be warm and concise. Use tentative phrasing like "It sounds like" and "One possibility is"; never diagnose or claim certainty. Do not dump a full framework immediately. Never tell the user what they should choose. Avoid medical, legal, financial, or crisis advice; in a crisis, encourage contacting a trusted person or local emergency/crisis support. Reply in plain text, 2-5 short sentences.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(503).json({ error: 'Northstar is ready to connect. Add GROQ_API_KEY in Vercel and redeploy.' });
  try {
    const { messages, mode, options = [], priorities = [], language = 'English' } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'Start by sharing what is on your mind.' });
    const safeMessages = messages.slice(-16).filter(m => ['user','assistant'].includes(m.role) && typeof m.content === 'string').map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
    const model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
    const summaryMode = mode === 'summary';
    const summarySystem = `You are Northstar, a calm reflection companion. Review this conversation and produce a structured decision dashboard in ${language}. Return only a JSON object with these keys: title (string), emotional_score (integer 1-10 representing clarity, not mental health), confidence_level (short string), emotions (array of strings), priorities (array), option_comparison (array of objects with option, pros, cons, risks, opportunities arrays), patterns (array), key_concerns (array), suggested_next_steps (array), reflection_questions (array). Use the supplied options and priorities when relevant. Ground every point in what the user actually shared, say when something is still unknown, use tentative language, never choose for them, and keep lists concise. This is a thinking aid, not professional advice.`;
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, temperature: summaryMode ? 0.2 : 0.7, max_tokens: summaryMode ? 1000 : 420,
        ...(summaryMode ? { response_format: { type: 'json_object' } } : {}),
        messages: summaryMode
          ? [{ role: 'system', content: summarySystem }, { role: 'user', content: JSON.stringify({ conversation: safeMessages, decision_options: Array.isArray(options) ? options.slice(0, 4) : [], stated_priorities: Array.isArray(priorities) ? priorities.slice(0, 10) : [] }) }]
          : [{ role: 'system', content: `${SYSTEM} Respond in ${language}.` }, ...safeMessages]
      })
    });
    if (!upstream.ok) {
      const details = await upstream.json().catch(() => ({}));
      console.error('Groq chat request failed', upstream.status, details.error?.code || details.error?.type || 'unknown');
      if (upstream.status === 401 || upstream.status === 403) return res.status(502).json({ error: 'Groq rejected the API key. Check GROQ_API_KEY in Vercel and redeploy.' });
      if (upstream.status === 404) return res.status(502).json({ error: `Groq could not find model “${model}”. Remove GROQ_MODEL in Vercel or set it to qwen/qwen3.8-27b, then redeploy.` });
      if (upstream.status === 429) return res.status(502).json({ error: 'Groq’s rate limit or free quota was reached. Please wait a little and try again.' });
      return res.status(502).json({ error: `Groq could not complete the request (HTTP ${upstream.status}). Check the Vercel runtime logs for details.` });
    }
    const data = await upstream.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (summaryMode) {
      try { return res.status(200).json({ summary: JSON.parse(content) }); }
      catch { return res.status(502).json({ error: 'Northstar could not format the summary this time. Please try again.' }); }
    }
    return res.status(200).json({ reply: content || 'What feels most important to you right now?' });
  } catch (error) {
    console.error('Northstar chat handler failed', error?.message || 'unknown error');
    return res.status(500).json({ error: 'Something interrupted this reflection. Please try again.' });
  }
}
