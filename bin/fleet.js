#!/usr/bin/env node

import { spawn, execSync } from 'node:child_process';
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
import { DEFAULT_ADAPTERS, parseSince, resolveSweepSince, runSweep } from '../src/sweep.js';

const args = process.argv.slice(2);
const command = args[0] || 'help';

function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function checkSlackDaemon() {
  try {
    const out = execSync('slack daemon status', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const data = JSON.parse(out);
    if (data && data.running && data.pid && isPidAlive(data.pid)) {
      return { running: true, pid: data.pid };
    }
  } catch {}
  return { running: false, pid: null };
}

function checkGitLabDaemon() {
  try {
    const out = execSync('gitlab daemon status', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const data = JSON.parse(out);
    if (data && data.running && data.pid && isPidAlive(data.pid)) {
      return { running: true, pid: data.pid };
    }
  } catch {}
  return { running: false, pid: null };
}

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
                                   Options: --tool <name> --cli <cmd> --type <chat|forge>
                                            --instance <host|team> --scope <repo|channel>
                                            --desc <text> --primary
  channel rm <name>                Remove a registered push channel
  channel ls                       List all registered push channels
  status                           Show coordinator liveness and registered channel health
  test-event [options]             Dispatch a synthetic test event envelope to the coordinator
                                   Options: --channel <name> --instance <id> --scope <id> --dry-run
  activate [agent-id]              Self-activate current agent ($PASEO_AGENT_ID) as coordinator and start daemons
  sweep                            Collect everything currently waiting on you from every adapter as one JSON queue
                                   Options: --since <iso|24h|3d> (default: since the last sweep, at least 24h back;
                                            72h on the first run) --adapters <a,b> --no-cursor
  stop                             Stop all background fleet push daemons
  help                             Show this manual

EXAMPLES:
  fleet init
  fleet activate
  fleet coordinator set afe3e85b-e376-4b7f-a10b-5970ced5b432
  fleet channel add slack:work --tool slack_send_message --cli "slack send" --type chat --instance T01WORK --scope C01DEV --primary
  fleet channel add gitlab:corp --tool gitlab_create_issue_note --cli "gitlab comment" --type forge --instance https://gitlab.corp.net --scope core/backend
  fleet status
  fleet sweep
  fleet sweep --since 3d --adapters gitlab
  fleet test-event --channel slack:work
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

      case 'start':
      case 'activate': {
        let id = positional[0] || process.env.PASEO_AGENT_ID;
        if (!id) {
          const cfg = loadConfig();
          id = cfg.coordinatorAgentId;
        }
        if (!id) {
          console.error(
            'Error: cannot resolve coordinator agent ID. Run within Paseo or specify: fleet activate <agent-id>',
          );
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

        const slackStatus = checkSlackDaemon();
        if (slackStatus.running) {
          console.log(`Slack daemon is already running (PID ${slackStatus.pid}).`);
        } else {
          try {
            const child = spawn('slack', ['daemon'], {
              detached: true,
              stdio: 'ignore',
            });
            child.unref();
            console.log(`Started slack daemon in background (PID ${child.pid}).`);
          } catch (err) {
            console.error(`Failed to start slack daemon: ${err.message}`);
          }
        }

        const gitlabStatus = checkGitLabDaemon();
        if (gitlabStatus.running) {
          console.log(`GitLab daemon is already running (PID ${gitlabStatus.pid}).`);
        } else {
          try {
            const child = spawn('gitlab', ['daemon', '--all-hours'], {
              detached: true,
              stdio: 'ignore',
            });
            child.unref();
            console.log(`Started gitlab daemon in background (PID ${child.pid}).`);
          } catch (err) {
            console.error(`Failed to start gitlab daemon: ${err.message}`);
          }
        }

        const manifest = loadChannels();
        const active = Object.keys(manifest.channels || {});
        console.log(`Fleet Coordinator successfully activated!`);
        console.log(`Active channels: ${active.join(', ') || 'none'}`);
        console.log(`Listening for inbound events.`);
        console.log(`Next: run 'fleet sweep' to collect work that was already waiting before activation.`);
        break;
      }

      case 'sweep': {
        const config = loadConfig();
        const since = flags.since
          ? parseSince(flags.since)
          : resolveSweepSince({ lastSweepAt: config.lastSweepAt });
        const adapters = flags.adapters ? flags.adapters.split(',') : config.adapters || DEFAULT_ADAPTERS;
        const sweep = await runSweep({ adapters, since });
        if (!flags['no-cursor'] && sweep.sources.some((source) => source.ok)) {
          saveConfig({ lastSweepAt: sweep.started_at });
        }
        console.log(JSON.stringify(sweep, null, 2));
        break;
      }

      case 'stop':
      case 'deactivate': {
        try {
          execSync(`slack daemon stop`, { stdio: 'ignore' });
          console.log(`Stopped slack daemon.`);
        } catch {}

        try {
          execSync(`gitlab daemon stop`, { stdio: 'ignore' });
          console.log(`Stopped gitlab daemon.`);
        } catch {}

        saveConfig({ coordinatorAgentId: null });
        try {
          execSync(`slack unset-coordinator`, { stdio: 'ignore' });
        } catch {}
        try {
          execSync(`gitlab unset-coordinator`, { stdio: 'ignore' });
        } catch {}

        console.log(`Fleet daemons stopped and coordinator cleared.`);
        break;
      }

      case 'coordinator': {
        const sub = positional[0] || 'get';
        if (sub === 'set') {
          let id = positional[1];
          if (!id || id === 'self') {
            id = process.env.PASEO_AGENT_ID;
          }
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
            instance: flags.instance || null,
            scope: flags.scope || null,
            description: flags.desc || flags.description || null,
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
            const details = [];
            if (ch.instance) details.push(`instance=${ch.instance}`);
            if (ch.scope) details.push(`scope=${ch.scope}`);
            if (ch.mcp_tool) details.push(`tool=${ch.mcp_tool}`);
            if (ch.cli_command) details.push(`cli=${ch.cli_command}`);
            const detailStr = details.length > 0 ? `, ${details.join(', ')}` : '';
            console.log(`- ${key}${star}: type=${ch.type}${detailStr}`);
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
        const slackStatus = checkSlackDaemon();
        const gitlabStatus = checkGitLabDaemon();

        console.log(`Paseo Fleet Status`);
        console.log(`------------------`);
        console.log(`Coordinator Agent: ${config.coordinatorAgentId || 'Not configured'}`);
        console.log(`Primary Channel:   ${manifest.primary_channel || 'Not configured'}`);
        console.log(`Active Channels:   ${keys.length > 0 ? keys.join(', ') : 'None registered'}`);
        console.log(
          `Slack Daemon:      ${slackStatus.running ? `Running (PID ${slackStatus.pid})` : 'Stopped'}`,
        );
        console.log(
          `GitLab Daemon:     ${gitlabStatus.running ? `Running (PID ${gitlabStatus.pid})` : 'Stopped'}`,
        );
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
          instance: flags.instance || null,
          scope: flags.scope || null,
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
