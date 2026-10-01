# Security Policy

## Reporting a Vulnerability

Report suspected vulnerabilities in this repository to
**157722763+kern0x1b@users.noreply.github.com**. Do not open a public issue.

Include the project version, reproduction steps, and potential impact.

You can also use
[GitHub Security Advisories](https://github.com/kern0x1b/paseo-fleet/security/advisories/new).

## What to Expect

| Stage                           | Target           |
| ------------------------------- | ---------------- |
| Acknowledgement of report       | 3 business days  |
| Initial assessment and severity | 10 business days |
| Fix released                    | 90 days          |

## Safe Harbour

We will not pursue legal action against anyone who discovers and reports a vulnerability in good faith, provided that you:

- Test only against your own accounts and workspaces that you own;
- Do not access, modify, or exfiltrate data belonging to anyone else;
- Give reasonable time to respond and patch before public disclosure.

## Scope

In scope:

- Command injection vulnerabilities in `bin/fleet.js` and `src/config.js`;
- Event envelope parsing and schema validation vulnerabilities;
- Unsafe file access in channel manifest loading/saving.

Out of scope:

- Vulnerabilities in Paseo itself;
- Vulnerabilities in external adapter CLIs (e.g. `slack`, `gitlab`);
- Scenarios requiring preexisting local root execution on the host machine.
