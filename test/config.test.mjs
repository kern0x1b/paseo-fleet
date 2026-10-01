import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  loadConfig,
  saveConfig,
  loadChannels,
  saveChannels,
  addChannel,
  removeChannel,
} from '../src/config.js';

describe('Fleet Configuration & Registry', () => {
  it('loads and saves coordinator config', () => {
    saveConfig({ coordinatorAgentId: 'test-agent-123' });
    const config = loadConfig();
    assert.equal(config.coordinatorAgentId, 'test-agent-123');
  });

  it('manages channels registry', () => {
    addChannel('test-slack', {
      type: 'chat',
      mcp_tool: 'slack_send_message',
      cli_command: 'slack send',
      is_primary: true,
    });

    const manifest = loadChannels();
    assert.equal(manifest.primary_channel, 'test-slack');
    assert.ok(manifest.channels['test-slack']);
    assert.equal(manifest.channels['test-slack'].type, 'chat');
    assert.equal(manifest.channels['test-slack'].mcp_tool, 'slack_send_message');

    removeChannel('test-slack');
    const updated = loadChannels();
    assert.equal(updated.channels['test-slack'], undefined);
  });
});
