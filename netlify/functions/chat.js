// Portfolio assistant with configurable provider fallback
const { portfolioReply } = require('./lib/portfolio-reply');
const { requestReply, parseConversation, jsonResponse } = require('./lib/chat-provider');
const { SYSTEM_PROMPT } = require('./lib/portfolio-prompt');

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });
  let conversation;
  try { conversation = parseConversation(event.body); }
  catch (error) { return jsonResponse(400, { error: error.message }); }
  try {
    const result = await requestReply(SYSTEM_PROMPT, conversation.message, conversation.history);
    return jsonResponse(200, result);
  } catch (error) {
    return jsonResponse(200, portfolioReply(conversation.message, conversation.history));
  }
};
