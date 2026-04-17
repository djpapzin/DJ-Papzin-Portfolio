// Netlify Function — Code search endpoint for the chatbot
// Searches the pre-built code index using BM25-style keyword matching

let codeIndex = null;

function loadIndex() {
  if (codeIndex) return codeIndex;
  // Index is baked into the function bundle at build time
  try {
    codeIndex = require('./code-index.json');
    return codeIndex;
  } catch (e) {
    return null;
  }
}

// Simple BM25-style scoring
function scoreFile(file, queryTerms) {
  let score = 0;
  const text = `${file.name} ${file.path} ${file.summary} ${file.content}`.toLowerCase();
  const keywords = file.keywords.join(' ').toLowerCase();

  for (const term of queryTerms) {
    if (term.length < 3) continue;

    // Exact match in keywords (highest weight)
    if (keywords.includes(term)) score += 10;

    // Match in filename
    if (file.name.toLowerCase().includes(term)) score += 8;

    // Match in path
    if (file.path.toLowerCase().includes(term)) score += 5;

    // Match in summary
    if (file.summary.toLowerCase().includes(term)) score += 4;

    // Count in content (diminishing returns)
    const contentLower = file.content.toLowerCase();
    let idx = 0;
    let count = 0;
    while ((idx = contentLower.indexOf(term, idx)) !== -1) {
      count++;
      idx += term.length;
    }
    score += Math.min(count, 5) * 2;
  }

  return score;
}

function filterResults(scoredFiles, queryTerms) {
  const isGeneralQuery = !queryTerms.some(term => ['whatsapp', 'setup', 'bot', 'telegram'].includes(term));

  if (isGeneralQuery) {
    return scoredFiles.filter(item => {
      const filePath = item.file.path.toLowerCase();
      const fileContent = item.file.content.toLowerCase();
      const fileSummary = item.file.summary.toLowerCase();

      // Penalize or filter out irrelevant setup/bot docs for general queries
      const containsIrrelevantKeywords = (
        filePath.includes('whatsapp') || filePath.includes('setup') || filePath.includes('bot') || filePath.includes('telegram') ||
        fileContent.includes('whatsapp') || fileContent.includes('setup') || fileContent.includes('bot') || fileContent.includes('telegram') ||
        fileSummary.includes('whatsapp') || fileSummary.includes('setup') || fileSummary.includes('bot') || fileSummary.includes('telegram')
      );

      // If a general query, filter out docs that are explicitly about WhatsApp/setup unless the score is exceptionally high.
      // For now, let's filter them out entirely to be strict.
      if (containsIrrelevantKeywords) {
        // Optionally, reduce score instead of filtering: item.score *= 0.1; return true;
        return false; // Filter out completely
      }
      return true;
    });
  }
  return scoredFiles;
}

function searchCode(query, maxResults = 5) {
  const index = loadIndex();
  if (!index) return { error: 'Code index not available' };

  // Tokenize query
  const terms = query.toLowerCase()
    .replace(/[^a-z0-9_\-. ]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);

  if (terms.length === 0) return { results: [], context: '' };

  // Score all files
  let scored = index.files
    .map(file => ({ file, score: scoreFile(file, terms) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Apply relevancy filtering
  scored = filterResults(scored, terms);

  // Slice after filtering
  scored = scored.slice(0, maxResults);

  // Build context for LLM
  let context = '';
  if (scored.length > 0) {
    context = 'RELEVANT CODE FROM GITHUB:\n\n';
    for (const { file, score } of scored) {
      context += `--- ${file.repo}/${file.path} (relevance: ${score}) ---\n`;
      if (file.summary) context += `Summary: ${file.summary}\n`;
      context += `Content:\n${file.content.slice(0, 3000)}\n\n`;
    }
  }

  return {
    results: scored.map(s => ({
      repo: s.file.repo,
      path: s.file.path,
      score: s.score,
      summary: s.file.summary?.slice(0, 200) || '',
    })),
    context,
  };
}

// System prompt augmentation
function buildAugmentedPrompt(codeContext, userQuestion) {
  if (!codeContext) return userQuestion;

  return `${codeContext}

Based on the code above, answer this question about DJ Papzin's projects:

${userQuestion}

Be specific — reference actual file names, function names, and implementation details from the code. If the code doesn't contain the answer, say so honestly.`;
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
    const { message } = JSON.parse(event.body);
    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Message required' }) };
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API key not set' }) };
    }

    // Search code index
    const search = searchCode(message);

    // Build system prompt with code context
    const systemPrompt = `You are DJ Papzin's AI assistant, on Letlhogonolo Fanampe's portfolio website (djpapzin.com). You can answer questions about his code and projects using real code context below. Answer warmly and concisely. Use occasional emoji.

WHO: Letlhogonolo Fanampe, known as DJ Papzin. AI/ML Engineer specializing in Generative AI and NLP. Based in South Africa, works remotely.

${search.context || 'No matching code found for this query.'}

ABOUT HIS WORK: He builds multi-agent AI systems, RAG chatbots, NLP pipelines, and automation tools. His projects span FastAPI backends, LangChain integrations, Telegram bots, Streamlit apps, and more.`;

    // Call LLM with model fallback (OpenRouter → OpenAI → Groq)
    const OR_MODELS = [
      'google/gemma-3-27b-it:free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'google/gemma-3-12b-it:free',
    ];

    const OPENAI_MODELS = [
      'gpt-4o-mini',
      'gpt-3.5-turbo',
    ];

    const GROQ_MODELS = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
    ];

    let reply = null;
    let lastError = null;

    const chatMessages = [
      { role: 'user', content: `${systemPrompt}\n\n---\n\nVisitor asks: ${message}` },
    ];

    // Try OpenRouter first
    for (const model of OR_MODELS) {
      try {
        const llmResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://djpapzin.com',
            'X-Title': 'DJ Papzin Assistant',
          },
          body: JSON.stringify({ model, messages: chatMessages, max_tokens: 500, temperature: 0.7 }),
        });
        const llmData = await llmResp.json();
        if (!llmResp.ok || llmData.error) throw new Error(llmData.error?.message || 'OR failed');
        reply = llmData.choices?.[0]?.message?.content;
        if (reply) break;
      } catch (err) { lastError = err; continue; }
    }

    // Fallback to OpenAI
    if (!reply) {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey) {
        for (const model of OPENAI_MODELS) {
          try {
            const llmResp = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ model, messages: chatMessages, max_tokens: 500, temperature: 0.7 }),
            });
            const llmData = await llmResp.json();
            if (!llmResp.ok || llmData.error) throw new Error(llmData.error?.message || 'OpenAI failed');
            reply = llmData.choices?.[0]?.message?.content;
            if (reply) break;
          } catch (err) { lastError = err; continue; }
        }
      }
    }

    // Fallback to Groq
    if (!reply) {
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        for (const model of GROQ_MODELS) {
          try {
            const llmResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ model, messages: chatMessages, max_tokens: 500, temperature: 0.7 }),
            });
            const llmData = await llmResp.json();
            if (!llmResp.ok || llmData.error) throw new Error(llmData.error?.message || 'Groq failed');
            reply = llmData.choices?.[0]?.message?.content;
            if (reply) break;
          } catch (err) { lastError = err; continue; }
        }
      }
    }

    if (!reply) {
      throw new Error(lastError?.message || 'All providers unavailable');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        reply,
        sources: search.results || [],
        query_terms: message.toLowerCase().replace(/[^a-z0-9_ ]/g, '').split(/\s+/).filter(t => t.length >= 2),
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

// Export for testing
exports.searchCode = searchCode;
