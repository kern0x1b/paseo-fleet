import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const FLEET_DIR = path.join(os.homedir(), '.config', 'paseo', 'fleet');
const CONFIG_FILE = path.join(FLEET_DIR, 'config.json');
const CHANNELS_FILE = path.join(FLEET_DIR, 'channels.json');

export function getFleetDir() {
  return FLEET_DIR;
}

export function getConfigPath() {
  return CONFIG_FILE;
}

export function getChannelsPath() {
  return CHANNELS_FILE;
}

export function ensureFleetDir() {
  if (!fs.existsSync(FLEET_DIR)) {
    fs.mkdirSync(FLEET_DIR, { recursive: true });
  }
}

export function loadConfig() {
  ensureFleetDir();
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

export function saveConfig(updates) {
  ensureFleetDir();
  const current = loadConfig();
  const merged = { ...current, ...updates };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

export function loadChannels() {
  ensureFleetDir();
  if (fs.existsSync(CHANNELS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'));
    } catch {
      return { version: '1.0', channels: {} };
    }
  }
  return { version: '1.0', channels: {} };
}

export function saveChannels(manifest) {
  ensureFleetDir();
  fs.writeFileSync(CHANNELS_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

export function addChannel(name, options) {
  const manifest = loadChannels();
  if (!manifest.channels) {
    manifest.channels = {};
  }

  manifest.channels[name] = {
    type: options.type || 'chat',
    mcp_tool: options.mcp_tool || null,
    cli_command: options.cli_command || null,
    instance: options.instance || null,
    scope: options.scope || null,
    description: options.description || null,
    default_target: options.default_target || null,
    capabilities: options.capabilities || [],
  };

  if (options.is_primary) {
    manifest.primary_channel = name;
  }

  saveChannels(manifest);
  return manifest;
}

export function removeChannel(name) {
  const manifest = loadChannels();
  if (manifest.channels && manifest.channels[name]) {
    delete manifest.channels[name];
    if (manifest.primary_channel === name) {
      manifest.primary_channel = Object.keys(manifest.channels)[0] || null;
    }
    saveChannels(manifest);
  }
  return manifest;
}
