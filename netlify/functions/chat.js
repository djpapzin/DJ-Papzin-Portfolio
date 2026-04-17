// Netlify Function — LLM chatbot proxy using OpenRouter free models with fallback
const SYSTEM_PROMPT = `You are DJ Papzin's AI assistant, on Letlhogonolo Fanampe's portfolio website (djpapzin.com). Answer questions warmly and concisely. Keep answers under 4 sentences unless asked for detail. Use occasional emoji. Be honest and proud.

WHO: Letlhogonolo Fanampe, known as DJ Papzin. AI/ML Engineer specializing in Generative AI and NLP. Based in South Africa, works remotely. Available for freelance.

DJ & MUSIC: DJing since 2012. Co-founded Papzin & Crew (2016) with Gabriel Matshabe. Platform: mega-mixes, Cruize Friday mixes, 24/7 radio, mix requests. Freemium model. Team: Papzin (CEO), Gabby (VP/Dev), Thaso (Marketing), Terry B (Design), Layla (Voice), Tshego (Admin). Exploring AI music via Suno.

AI EXPERIENCE: Freelance AI/ML Engineer (2025-now). Kwantu PTY LTD consultant (Oct 2024-Apr 2025): RAG chatbots LangChain/FastAPI, SA ID recognition Detectron2/Tesseract, WhatsApp/Telegram bots. Outlier.ai (Jul 2024): RLHF training. Translated (Oct-Dec 2024): AI prompt evaluation. Afrisam lab analyst (2014-2022): 8 years.

SKILLS: TensorFlow, Keras, LangChain, NLP, OpenCV, OCR, RLHF, Python, FastAPI, Django, React, Docker, Git, Linux.

PROJECTS: Papzin & Crew (streaming), PapzinAI (multi-agent), Task Tracker (FastAPI+PostgreSQL), TruthGuard (Llama 3 fake news), Vocal Thread (ElevenLabs+Gemini), VisualPro (WebGPU winner), TalentFlow Bot, Arc-ZARDIAN (ZAR-USDC AI), SA ID Recognition.

HACKATHONS: WebGPU Hackathon Winner, ElevenLabs AI Audio Challenge, Geekle.us FR1, multiple LabLab.ai certs.

EDUCATION: Diploma Analytical Chemistry, Tshwane University of Technology. Certs: LangChain, Python, System Admin.

CONTACT: l.fanampe@gmail.com, +27 83 483 7699, github.com/djpapzin, linkedin.com/in/djpapzin`;

// Free models on OpenRouter — system messages merged into user message
const MODELS = [
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-3-12b-it:free',
];

// OpenAI fallback models
const OPENAI_MODELS = [
  'gpt-4o-mini',
  'gpt-3.5-turbo',
];

// Groq fallback models
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
];

async function callOpenRouter(apiKey, model, userMessage, history = []) {
  // Build messages: system context + conversation history + current question
  const messages = [];

  // Add past conversation turns (last 10 to stay within token limits)
  for (const turn of history.slice(-10)) {
    messages.push({ role: turn.role, content: turn.content });
  }

  // Current message with system prompt embedded
  messages.push({
    role: 'user',
    content: `${SYSTEM_PROMPT}\n\n---\n\nVisitor asks: ${userMessage}`,
  });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://djpapzin.com',
      'X-Title': 'LF Assistant',
    },
    body: JSON.stringify({ model, messages, max_tokens: 300, temperature: 0.7 }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    const errMsg = data.error?.message || data.error || `HTTP ${response.status}`;
    throw new Error(`${model}: ${errMsg}`);
  }
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) throw new Error(`${model}: Empty response`);
  return reply;
}

exports.handler = async (event) => {
  // CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { message, history } = JSON.parse(event.body);
    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Message required' }) };
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API key not set' }) };
    }

    let lastError;
    for (const model of MODELS) {
      try {
        const reply = await callOpenRouter(apiKey, model, message, history || []);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ reply, model }),
        };
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    // Fallback to OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const messages = [];
      for (const turn of (history || []).slice(-10)) {
        messages.push({ role: turn.role, content: turn.content });
      }
      messages.push({ role: 'user', content: `${SYSTEM_PROMPT}\n\n---\n\nVisitor asks: ${message}` });

      for (const model of OPENAI_MODELS) {
        try {
          const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, max_tokens: 300, temperature: 0.7 }),
          });
          const data = await resp.json();
          if (!resp.ok || data.error) throw new Error(data.error?.message || 'OpenAI failed');
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ reply, model: `openai/${model}` }),
            };
          }
        } catch (err) {
          lastError = err;
          continue;
        }
      }
    }

    // Fallback to Groq
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      const messages = [];
      for (const turn of (history || []).slice(-10)) {
        messages.push({ role: turn.role, content: turn.content });
      }
      messages.push({ role: 'user', content: `${SYSTEM_PROMPT}\n\n---\n\nVisitor asks: ${message}` });

      for (const model of GROQ_MODELS) {
        try {
          const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, max_tokens: 300, temperature: 0.7 }),
          });
          const data = await resp.json();
          if (!resp.ok || data.error) throw new Error(data.error?.message || 'Groq failed');
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ reply, model: `groq/${model}` }),
            };
          }
        } catch (err) {
          lastError = err;
          continue;
        }
      }
    }

    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'All providers unavailable', detail: lastError?.message }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
