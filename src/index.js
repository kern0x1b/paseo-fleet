export {
  getFleetDir,
  getConfigPath,
  getChannelsPath,
  ensureFleetDir,
  loadConfig,
  saveConfig,
  loadChannels,
  saveChannels,
  addChannel,
  removeChannel,
} from './config.js';

export { PROTOCOL_VERSION, createEventEnvelope, validateEventEnvelope } from './protocol.js';
