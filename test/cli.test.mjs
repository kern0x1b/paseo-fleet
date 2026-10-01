import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { describe, it } from 'node:test';

describe('Fleet CLI binary', () => {
  it('prints help message', () => {
    const output = execSync('node bin/fleet.js help', { encoding: 'utf8' });
    assert.match(output, /paseo-fleet/);
    assert.match(output, /USAGE:/);
  });

  it('runs init and status commands', () => {
    const initOutput = execSync('node bin/fleet.js init', { encoding: 'utf8' });
    assert.match(initOutput, /initialized successfully/);

    const statusOutput = execSync('node bin/fleet.js status', { encoding: 'utf8' });
    assert.match(statusOutput, /Paseo Fleet Status/);
  });

  it('manages coordinator and channels via cli', () => {
    execSync('node bin/fleet.js coordinator set test-coord-42', { encoding: 'utf8' });
    const getOutput = execSync('node bin/fleet.js coordinator get', { encoding: 'utf8' });
    assert.match(getOutput, /test-coord-42/);

    execSync('node bin/fleet.js channel add custom-hook --tool hook_send --type webhook', {
      encoding: 'utf8',
    });
    const lsOutput = execSync('node bin/fleet.js channel ls', { encoding: 'utf8' });
    assert.match(lsOutput, /custom-hook/);

    execSync('node bin/fleet.js channel rm custom-hook', { encoding: 'utf8' });
    const lsAfter = execSync('node bin/fleet.js channel ls', { encoding: 'utf8' });
    assert.doesNotMatch(lsAfter, /custom-hook/);
  });

  it('generates test-event in dry-run mode', () => {
    const output = execSync('node bin/fleet.js test-event --channel test-ch --dry-run', {
      encoding: 'utf8',
    });
    assert.match(output, /Generated Event Envelope:/);
    assert.match(output, /test-ch/);
    assert.match(output, /test_ping/);
  });
});
