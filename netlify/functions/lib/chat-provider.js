const PROVIDERS = [
  { key: 'OPENROUTER_API_KEY', url: 'https://openrouter.ai/api/v1/chat/completions', models: ['google/gemma-4-26b-a4b-it:free', 'liquid/lfm-2.5-2.6b:free'] },
  { key: 'OPENAI_API_KEY', url: 'https://api.openai.com/v1/chat/completions', models: ['gpt-4o-mini'] },
  { key: 'GROQ_API_KEY', url: 'https://api.groq.com/openai/v1/chat/completions', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] },
];
function jsonResponse(statusCode, data) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: JSON.stringify(data) };
}
function parseConversation(body) {
  let data;
  try { data = JSON.parse(body); } catch { throw new Error('Invalid JSON'); }
  if (!data || typeof data.message !== 'string' || !data.message.trim() || data.message.length > 4000) throw new Error('A message of 1–4000 characters is required');
  const history = Array.isArray(data.history) ? data.history.filter(turn => turn && ['user', 'assistant'].includes(turn.role) && typeof turn.content === 'string').slice(-10).map(turn => ({ role: turn.role, content: turn.content.slice(0, 4000) })) : [];
  return { message: data.message.trim(), history };
}
async function requestReply(prompt, message, history = []) {
  let configured = false;
  const deadline = Date.now() + 20000;
  for (const provider of PROVIDERS) {
    if (provider.key !== 'OPENROUTER_API_KEY' && process.env.CHAT_ALLOW_PAID_PROVIDERS !== 'true') continue;
    const apiKey = process.env[provider.key];
    if (!apiKey) continue;
    configured = true;
    for (const model of provider.models) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      try {
        const response = await fetch(provider.url, {
          method: 'POST', signal: AbortSignal.timeout(Math.min(10000, remaining)),
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://djpapzin.com', 'X-Title': 'DJ Papzin Assistant' },
          body: JSON.stringify({ model, messages: [{role: 'system', content: prompt}, ...history, { role: 'user', content: message }], max_tokens: 1000, temperature: 0.7,
          }),
        });
        // Invalid credentials affect the entire provider, not just one model.
        if ([401, 403].includes(response.status)) {
          console.warn('Chat provider rejected credentials', {provider: provider.key, status: response.status});
          break;
        }
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (response.ok && typeof reply === 'string' && reply.trim()) return { reply: reply.trim(), model: data.model || model };
        console.warn('Chat provider returned no usable reply', {provider: provider.key, status: response.status, finishReason: data.choices?.[0]?.finish_reason, errorCode: data.error?.code});
      } catch (error) {
        console.warn('Chat provider request failed', {provider: provider.key, kind: error.name});
      }
    }
  }
  const error = new Error('Chat provider unavailable');
  error.code = configured ? 'PROVIDER_UNAVAILABLE' : 'CHAT_NOT_CONFIGURED';
  throw error;
}
module.exports = { requestReply, parseConversation, jsonResponse };
