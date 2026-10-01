import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROTOCOL_VERSION, createEventEnvelope, validateEventEnvelope } from '../src/protocol.js';

describe('Paseo Fleet Protocol', () => {
  it('creates a standard event envelope', () => {
    const envelope = createEventEnvelope({
      source: 'slack',
      event_type: 'mention',
      content: 'Hello fleet',
      reply_action: {
        type: 'mcp',
        tool: 'slack_send_message',
        params: { channel: 'C123' },
      },
    });

    assert.equal(envelope.protocol, PROTOCOL_VERSION);
    assert.equal(envelope.source, 'slack');
    assert.equal(envelope.event_type, 'mention');
    assert.equal(envelope.content, 'Hello fleet');
    assert.ok(envelope.id.startsWith('evt_'));
    assert.ok(envelope.timestamp);
    assert.equal(envelope.reply_action.tool, 'slack_send_message');
  });

  it('validates a correct envelope', () => {
    const envelope = createEventEnvelope({
      source: 'gitlab',
      instance: 'https://gitlab.corp.net',
      scope: 'core/backend',
      urn: 'urn:gitlab:gitlab.corp.net:core/backend:issue:42',
      event_type: 'pipeline_failed',
      content: 'CI failure',
    });

    assert.equal(envelope.instance, 'https://gitlab.corp.net');
    assert.equal(envelope.scope, 'core/backend');
    assert.equal(envelope.urn, 'urn:gitlab:gitlab.corp.net:core/backend:issue:42');

    const result = validateEventEnvelope(envelope);
    assert.equal(result.valid, true);
  });

  it('rejects an envelope with missing required fields', () => {
    assert.equal(validateEventEnvelope(null).valid, false);
    assert.equal(validateEventEnvelope({}).valid, false);
    assert.equal(
      validateEventEnvelope({
        protocol: 'invalid/v99',
        id: '1',
        source: 's',
        event_type: 'e',
        content: 'c',
        reply_action: {},
      }).valid,
      false,
    );
  });

  it('throws when creating envelope without required properties', () => {
    assert.throws(() => createEventEnvelope({}), /source is required/);
    assert.throws(() => createEventEnvelope({ source: 'slack' }), /event_type is required/);
    assert.throws(() => createEventEnvelope({ source: 'slack', event_type: 'dm' }), /content is required/);
  });
});
