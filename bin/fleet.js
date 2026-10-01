#!/usr/bin/env node

import { execSync } from 'node:child_process';
import {
  ensureFleetDir,
  getConfigPath,
  getChannelsPath,
  loadConfig,
  saveConfig,
  loadChannels,
  addChannel,
  removeChannel,
} from '../src/config.js';
import { createEventEnvelope } from '../src/protocol.js';

const args = process.argv.slice(2);
const command = args[0] || 'help';

function parseFlags(rawArgs) {
  const flags = {};
  const positional = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (rawArgs[i + 1] && !rawArgs[i + 1].startsWith('--')) {
        flags[key] = rawArgs[i + 1];
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

function printHelp() {
  console.log(`
paseo-fleet (fleet) - Model-agnostic Multi-Agent Fleet Orchestration & Protocol

USAGE:
  fleet <command> [subcommand] [options...]

COMMANDS:
  init                             Initialize fleet configuration directories and channels file
  coordinator set <agent-id>       Set active fleet coordinator agent ID globally
  coordinator get                  Show current fleet coordinator agent ID
  coordinator clear                Clear current coordinator agent ID
  channel add <name> [options]     Register a push channel provider
                                   Options: --tool <name> --cli <cmd> --type <chat|forge> --primary
  channel rm <name>                Remove a registered push channel
  channel ls                       List all registered push channels
  status                           Show coordinator liveness and registered channel health
  test-event [options]             Dispatch a synthetic test event envelope to the coordinator
                                   Options: --channel <name> --dry-run
  help                             Show this manual

EXAMPLES:
  fleet init
  fleet coordinator set afe3e85b-e376-4b7f-a10b-5970ced5b432
  fleet channel add slack --tool slack_send_message --cli "slack send" --type chat --primary
  fleet channel add gitlab --tool gitlab_add_note --cli "gitlab comment" --type forge
  fleet status
  fleet test-event --channel slack
`);
}

async function main() {
  const { flags, positional } = parseFlags(args.slice(1));

  try {
    switch (command) {
      case 'init': {
        ensureFleetDir();
        console.log(`Fleet environment initialized successfully.`);
        console.log(`Config:   ${getConfigPath()}`);
        console.log(`Channels: ${getChannelsPath()}`);
        break;
      }

      case 'coordinator': {
        const sub = positional[0] || 'get';
        if (sub === 'set') {
          const id = positional[1];
          if (!id) {
            console.error('Error: missing agent ID. Usage: fleet coordinator set <agent-id>');
            process.exit(1);
          }
          saveConfig({ coordinatorAgentId: id });
          console.log(`Coordinator agent ID set to: ${id}`);

          try {
            execSync(`slack set-coordinator ${id}`, { stdio: 'ignore' });
            console.log(`Bound to slack daemon.`);
          } catch {}

          try {
            execSync(`gitlab set-coordinator ${id}`, { stdio: 'ignore' });
            console.log(`Bound to gitlab daemon.`);
          } catch {}
        } else if (sub === 'clear') {
          saveConfig({ coordinatorAgentId: null });
          console.log('Coordinator agent ID cleared.');
        } else if (sub === 'get') {
          const config = loadConfig();
          console.log(config.coordinatorAgentId ? config.coordinatorAgentId : 'No coordinator set.');
        } else {
          console.error(`Unknown subcommand: ${sub}`);
          process.exit(1);
        }
        break;
      }

      case 'channel': {
        const sub = positional[0] || 'ls';
        if (sub === 'add') {
          const name = positional[1];
          if (!name) {
            console.error('Error: missing channel name. Usage: fleet channel add <name> [options]');
            process.exit(1);
          }
          const manifest = addChannel(name, {
            type: flags.type || 'chat',
            mcp_tool: flags.tool || null,
            cli_command: flags.cli || null,
            is_primary: Boolean(flags.primary),
          });
          console.log(`Channel '${name}' registered successfully.`);
          if (flags.primary) {
            console.log(`Set as primary notification channel.`);
          }
        } else if (sub === 'rm') {
          const name = positional[1];
          if (!name) {
            console.error('Error: missing channel name. Usage: fleet channel rm <name>');
            process.exit(1);
          }
          removeChannel(name);
          console.log(`Channel '${name}' removed.`);
        } else if (sub === 'ls') {
          const manifest = loadChannels();
          const channels = manifest.channels || {};
          const keys = Object.keys(channels);
          console.log(`Primary Channel: ${manifest.primary_channel || 'none'}`);
          console.log(`Registered Channels (${keys.length}):`);
          for (const key of keys) {
            const ch = channels[key];
            const star = manifest.primary_channel === key ? ' [primary]' : '';
            console.log(
              `- ${key}${star}: type=${ch.type}, tool=${ch.mcp_tool || 'none'}, cli=${ch.cli_command || 'none'}`,
            );
          }
        } else {
          console.error(`Unknown subcommand: ${sub}`);
          process.exit(1);
        }
        break;
      }

      case 'status': {
        const config = loadConfig();
        const manifest = loadChannels();
        const keys = Object.keys(manifest.channels || {});

        console.log(`Paseo Fleet Status`);
        console.log(`------------------`);
        console.log(`Coordinator Agent: ${config.coordinatorAgentId || 'Not configured'}`);
        console.log(`Primary Channel:   ${manifest.primary_channel || 'Not configured'}`);
        console.log(`Active Channels:   ${keys.length > 0 ? keys.join(', ') : 'None registered'}`);
        break;
      }

      case 'test-event': {
        const config = loadConfig();
        if (!config.coordinatorAgentId && !flags['dry-run']) {
          console.error('Error: No coordinator configured. Set one via: fleet coordinator set <id>');
          process.exit(1);
        }

        const channel = flags.channel || 'synthetic';
        const envelope = createEventEnvelope({
          source: channel,
          event_type: 'test_ping',
          content: 'Synthetic test event: verifying fleet connectivity',
          reply_action: {
            type: 'none',
          },
        });

        console.log('Generated Event Envelope:');
        console.log(JSON.stringify(envelope, null, 2));

        if (!flags['dry-run']) {
          execSync(
            `paseo send ${config.coordinatorAgentId} ${JSON.stringify(JSON.stringify(envelope))} --no-wait`,
            { stdio: 'inherit' },
          );
          console.log(`Dispatched to Coordinator (${config.coordinatorAgentId}).`);
        }
        break;
      }

      case 'help':
      default:
        printHelp();
        break;
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
