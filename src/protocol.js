export const PROTOCOL_VERSION = 'paseo-fleet/v1';

export function createEventEnvelope(options) {
  if (!options.source) {
    throw new Error('source is required for fleet event');
  }
  if (!options.event_type) {
    throw new Error('event_type is required for fleet event');
  }
  if (!options.content) {
    throw new Error('content is required for fleet event');
  }

  const envelope = {
    protocol: PROTOCOL_VERSION,
    id: options.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: options.timestamp || new Date().toISOString(),
    source: options.source,
    event_type: options.event_type,
    actor: options.actor || { id: 'unknown', name: 'Anonymous', is_bot: false },
    target: options.target || null,
    content: options.content,
    reply_action: options.reply_action || { type: 'none' },
  };

  if (options.instance) {
    envelope.instance = options.instance;
  }
  if (options.scope) {
    envelope.scope = options.scope;
  }
  if (options.urn) {
    envelope.urn = options.urn;
  }

  return envelope;
}

export function validateEventEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') {
    return { valid: false, error: 'Envelope must be an object' };
  }
  if (envelope.protocol !== PROTOCOL_VERSION) {
    return { valid: false, error: `Invalid protocol: expected ${PROTOCOL_VERSION}` };
  }
  if (!envelope.id || typeof envelope.id !== 'string') {
    return { valid: false, error: 'Missing or invalid id' };
  }
  if (!envelope.source || typeof envelope.source !== 'string') {
    return { valid: false, error: 'Missing or invalid source' };
  }
  if (!envelope.event_type || typeof envelope.event_type !== 'string') {
    return { valid: false, error: 'Missing or invalid event_type' };
  }
  if (!envelope.content || typeof envelope.content !== 'string') {
    return { valid: false, error: 'Missing or invalid content' };
  }
  if (!envelope.reply_action || typeof envelope.reply_action !== 'object') {
    return { valid: false, error: 'Missing or invalid reply_action' };
  }
  if (envelope.instance !== undefined && typeof envelope.instance !== 'string') {
    return { valid: false, error: 'instance must be a string if provided' };
  }
  if (envelope.scope !== undefined && typeof envelope.scope !== 'string') {
    return { valid: false, error: 'scope must be a string if provided' };
  }
  if (envelope.urn !== undefined && typeof envelope.urn !== 'string') {
    return { valid: false, error: 'urn must be a string if provided' };
  }

  return { valid: true };
}
