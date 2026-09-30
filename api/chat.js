const SYSTEM = `You are Northstar, a calm thinking companion for students and young adults. Help people think, do not make decisions for them. Start with emotional reflection, understand the situation, ask one thoughtful open question at a time, then gradually clarify priorities, options, tradeoffs, risks, and next steps. Be warm and concise. Use tentative phrasing like "It sounds like" and "One possibility is"; never diagnose or claim certainty. Do not dump a full framework immediately. Never tell the user what they should choose. Avoid medical, legal, financial, or crisis advice; in a crisis, encourage contacting a trusted person or local emergency/crisis support. Reply in plain text, 2-5 short sentences.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(503).json({ error: 'Northstar is ready to connect. Add GROQ_API_KEY in Vercel and redeploy.' });
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'Start by sharing what is on your mind.' });
    const safeMessages = messages.slice(-16).filter(m => ['user','assistant'].includes(m.role) && typeof m.content === 'string').map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
    const model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.7, max_tokens: 420, messages: [{ role: 'system', content: SYSTEM }, ...safeMessages] })
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
    return res.status(200).json({ reply: data.choices?.[0]?.message?.content || 'What feels most important to you right now?' });
  } catch (error) {
    console.error('Northstar chat handler failed', error?.message || 'unknown error');
    return res.status(500).json({ error: 'Something interrupted this reflection. Please try again.' });
  }
}
