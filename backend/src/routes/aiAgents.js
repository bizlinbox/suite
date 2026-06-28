const express = require('express');
const axios = require('axios');
const { query } = require('../db');
const { authenticate, requirePermission } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');
const { encrypt, decrypt } = require('../utils/encryption');

const router = express.Router();

router.use(authenticate);

// GET / - list AI agents for org
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, name, provider, model, system_prompt, temperature, max_tokens,
              is_active, auto_reply_enabled, trigger_keywords, created_at, updated_at
       FROM ai_agents WHERE org_id = $1 ORDER BY created_at DESC`,
      [req.user.org_id]
    );
    res.json({ agents: camelize(result.rows) });
  } catch (err) {
    logger.error('List AI agents error', err);
    next(err);
  }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, name, provider, model, system_prompt, temperature, max_tokens,
              is_active, auto_reply_enabled, trigger_keywords, created_at, updated_at
       FROM ai_agents WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI agent not found' });
    }
    res.json({ agent: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Get AI agent error', err);
    next(err);
  }
});

// POST / - create AI agent
router.post('/', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const {
      name, provider, api_key, model, system_prompt,
      temperature, max_tokens, auto_reply_enabled, trigger_keywords,
    } = req.body;

    if (!name || !api_key) {
      return res.status(400).json({ error: 'name and api_key are required' });
    }

    const encryptedKey = encrypt(api_key);

    const result = await query(
      `INSERT INTO ai_agents (org_id, name, provider, api_key_encrypted, model, system_prompt, temperature, max_tokens, auto_reply_enabled, trigger_keywords)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, org_id, name, provider, model, system_prompt, temperature, max_tokens, is_active, auto_reply_enabled, trigger_keywords, created_at, updated_at`,
      [
        req.user.org_id, name, provider || 'openai', encryptedKey,
        model || 'gpt-4o-mini', system_prompt || 'You are a helpful customer support assistant.',
        temperature || 0.7, max_tokens || 1024,
        auto_reply_enabled || false, trigger_keywords || [],
      ]
    );

    res.status(201).json({ agent: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Create AI agent error', err);
    next(err);
  }
});

// PUT /:id - update AI agent
router.put('/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const {
      name, provider, api_key, model, system_prompt,
      temperature, max_tokens, is_active, auto_reply_enabled, trigger_keywords,
    } = req.body;

    const existing = await query(
      'SELECT api_key_encrypted FROM ai_agents WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'AI agent not found' });
    }

    const encryptedKey = api_key ? encrypt(api_key) : existing.rows[0].api_key_encrypted;

    const result = await query(
      `UPDATE ai_agents
       SET name = $1, provider = $2, api_key_encrypted = $3, model = $4, system_prompt = $5,
           temperature = $6, max_tokens = $7, is_active = $8, auto_reply_enabled = $9, trigger_keywords = $10, updated_at = NOW()
       WHERE id = $11 AND org_id = $12
       RETURNING id, org_id, name, provider, model, system_prompt, temperature, max_tokens, is_active, auto_reply_enabled, trigger_keywords, created_at, updated_at`,
      [
        name, provider || 'openai', encryptedKey, model || 'gpt-4o-mini',
        system_prompt || 'You are a helpful customer support assistant.',
        temperature || 0.7, max_tokens || 1024,
        is_active !== undefined ? is_active : true,
        auto_reply_enabled !== undefined ? auto_reply_enabled : false,
        trigger_keywords || [],
        req.params.id, req.user.org_id,
      ]
    );

    res.json({ agent: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Update AI agent error', err);
    next(err);
  }
});

// DELETE /:id
router.delete('/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM ai_agents WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI agent not found' });
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete AI agent error', err);
    next(err);
  }
});

// POST /:id/test - test the AI agent
router.post('/:id/test', async (req, res, next) => {
  try {
    const agentResult = await query(
      'SELECT * FROM ai_agents WHERE id = $1 AND org_id = $2 AND is_active = true',
      [req.params.id, req.user.org_id]
    );
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'AI agent not found or inactive' });
    }

    const agent = agentResult.rows[0];
    const apiKey = decrypt(agent.api_key_encrypted);
    const { messages } = req.body;

    const startTime = Date.now();
    let responseText = '';
    let tokensUsed = 0;

    if (agent.provider === 'openai') {
      const aiRes = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: agent.model,
          messages: [
            { role: 'system', content: agent.system_prompt },
            ...(messages || []),
          ],
          temperature: parseFloat(agent.temperature),
          max_tokens: parseInt(agent.max_tokens),
        },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 30000 }
      );
      responseText = aiRes.data.choices[0]?.message?.content || '';
      tokensUsed = aiRes.data.usage?.total_tokens || 0;
    } else if (agent.provider === 'anthropic') {
      const aiRes = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: agent.model || 'claude-3-haiku-20240307',
          max_tokens: parseInt(agent.max_tokens),
          temperature: parseFloat(agent.temperature),
          system: agent.system_prompt,
          messages: messages || [],
        },
        { headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' }, timeout: 30000 }
      );
      responseText = aiRes.data.content?.[0]?.text || '';
      tokensUsed = aiRes.data.usage?.input_tokens + aiRes.data.usage?.output_tokens || 0;
    } else {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    res.json({
      response: responseText,
      latencyMs: Date.now() - startTime,
      tokensUsed,
    });
  } catch (err) {
    logger.error('AI agent test error', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || 'AI request failed' });
  }
});

// POST /generate - generate a reply for a conversation (manual trigger)
router.post('/generate', async (req, res, next) => {
  try {
    const { conversation_id, agent_id, context } = req.body;
    if (!conversation_id || !agent_id) {
      return res.status(400).json({ error: 'conversation_id and agent_id are required' });
    }

    const agentResult = await query(
      'SELECT * FROM ai_agents WHERE id = $1 AND org_id = $2 AND is_active = true',
      [agent_id, req.user.org_id]
    );
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'AI agent not found or inactive' });
    }

    const agent = agentResult.rows[0];
    const apiKey = decrypt(agent.api_key_encrypted);

    // Fetch recent messages for context
    const messagesResult = await query(
      `SELECT sender_type, content, created_at FROM messages
       WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [conversation_id]
    );
    const recentMessages = messagesResult.rows.reverse().map((m) => ({
      role: m.sender_type === 'agent' ? 'assistant' : 'user',
      content: m.content || '',
    }));

    const startTime = Date.now();
    let responseText = '';
    let tokensUsed = 0;

    if (agent.provider === 'openai') {
      const aiRes = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: agent.model,
          messages: [
            { role: 'system', content: agent.system_prompt + (context ? `\n\nContext: ${context}` : '') },
            ...recentMessages,
          ],
          temperature: parseFloat(agent.temperature),
          max_tokens: parseInt(agent.max_tokens),
        },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 30000 }
      );
      responseText = aiRes.data.choices[0]?.message?.content || '';
      tokensUsed = aiRes.data.usage?.total_tokens || 0;
    } else if (agent.provider === 'anthropic') {
      const aiRes = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: agent.model || 'claude-3-haiku-20240307',
          max_tokens: parseInt(agent.max_tokens),
          temperature: parseFloat(agent.temperature),
          system: agent.system_prompt + (context ? `\n\nContext: ${context}` : ''),
          messages: recentMessages,
        },
        { headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' }, timeout: 30000 }
      );
      responseText = aiRes.data.content?.[0]?.text || '';
      tokensUsed = aiRes.data.usage?.input_tokens + aiRes.data.usage?.output_tokens || 0;
    } else {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    // Log the reply
    await query(
      `INSERT INTO ai_replies (org_id, conversation_id, agent_id, prompt, response, tokens_used, latency_ms, was_sent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
      [req.user.org_id, conversation_id, agent_id, JSON.stringify(recentMessages), responseText, tokensUsed, Date.now() - startTime]
    );

    res.json({ response: responseText, latencyMs: Date.now() - startTime, tokensUsed });
  } catch (err) {
    logger.error('AI generate error', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || 'AI request failed' });
  }
});

module.exports = router;
