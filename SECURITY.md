# Security Policy

NightShift is built from the ground up with local-first security principles. Because NightShift executes media processing commands on the host operating system, security, sandboxing, and binary verification are core design priorities.

---

## Supported Versions

Only the latest release receives active security patches and updates.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability or security bug in NightShift, please report it privately. **Do not create public GitHub issues for security vulnerabilities.**

### How to Report

1. **GitHub Security Advisory (Recommended):** Submit a confidential report via [GitHub Security Advisories](https://github.com/akehito/NightShift/security/advisories/new).
2. **Email Disclosure:** Send an email to `security@nightshift.dev` (or the project maintainer).

### What to Include

Please provide:
- A description of the vulnerability and its potential impact.
- Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
- Affected version(s) and operating system(s).
- Any proposed remediations or patches if available.

### Disclosure Policy & Response SLA

- **Initial Acknowledgment:** Within 48 hours of receipt.
- **Triage & Assessment:** Within 5 business days.
- **Patch Release & Advisory:** Coordinated release within 30 days of triage confirmation.

We kindly ask that you give us reasonable time to investigate and resolve the issue before making any details publicly accessible.

---

## Security Architecture & Threat Model

NightShift employs strict defensive layers to protect users and their systems:

### 1. No Arbitrary Shell Execution
- NightShift **never** passes strings to system shells (`cmd.exe`, `powershell.exe`, or `/bin/sh`).
- Commands are executed as direct array arguments (`std::process::Command::new("ffmpeg").args([...])`) via native Rust. This completely eliminates shell argument interpolation and shell injection vectors.

### 2. Binary Verification & Integrity
- Static binary downloads during the `/setup` wizard are verified against hardcoded cryptographic SHA-256 hashes (`tools-manifest.json`).
- Downloaded binaries are isolated in the user's secure application data directory (`AppData/Local/NightShift/tools` on Windows, `~/Library/Application Support/NightShift/tools` on macOS, `~/.local/share/NightShift/tools` on Linux).

### 3. Tauri v2 IPC Isolation
- IPC capabilities are restricted via granular capability definitions (`src-tauri/capabilities/default.json`).
- The frontend operates with strict Content Security Policy (`CSP`) headers, preventing unauthorized external script loading and network exfiltration.

### 4. Local-First Media Processing
- No user media files, paths, metadata, or logs are uploaded to any external server or telemetry service. Processing remains 100% on your local machine.

---

## Best Practices for Users

- Only download NightShift installers from the official [GitHub Releases](https://github.com/akehito/NightShift/releases).
- Verify checksums published alongside official releases.
- Be cautious when running custom FFmpeg commands or importing untrusted preset JSON files.
