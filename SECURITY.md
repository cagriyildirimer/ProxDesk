# ProxDesk Security Policy & Threat Model (Linux Native)

ProxDesk is designed as a Linux native infrastructure management application following a **Security-First** philosophy. Managing Proxmox VE clusters involves elevated privileges; therefore, strict architectural controls are enforced to protect credentials, secure TLS communication, and prevent secret leaks.

---

## Security Principles & Architecture

### 1. Linux Native Credential Storage
- **No Plaintext Storage**: Token secrets are **never** stored in plaintext configuration files, `localStorage`, or persistent browser storage.
- **Linux Native Keyrings**: Token secrets are stored directly in Linux Secret Service API via the `keyring` crate (`org.freedesktop.secrets` / GNOME Keyring / KWallet).
- **Protected Vault Fallback**: If DBus Secret Service daemon is unavailable (e.g. CLI/minimal Linux environment), ProxDesk falls back to an encrypted local file vault (`.secrets_vault.json`) with strict Linux file permissions (`chmod 0600`).
- Unencrypted config files (`connections.json`) store **only non-sensitive metadata**:
  ```json
  {
    "id": "192-168-1-10-8006",
    "name": "HomeLab",
    "host": "192.168.1.10",
    "port": 8006,
    "user": "proxdesk",
    "realm": "pve",
    "token_id": "desktop"
  }
  ```

### 2. Zero Secret Leakage in Logs & State
- Custom `fmt::Debug` implementations for `ProxmoxAuth` redact token secrets to prevent accidental exposure in log outputs, console dumps, or crash reports:
  ```rust
  impl fmt::Debug for ProxmoxAuth {
      fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
          f.debug_struct("ProxmoxAuth")
              .field("user", &self.user)
              .field("realm", &self.realm)
              .field("token_id", &self.token_id)
              .field("token_secret", &"<REDACTED>")
              .finish()
      }
  }
  ```
- HTTP request/response logging redacts `Authorization` headers.

### 3. Custom TLS Verification & Certificate Pinning
- Self-signed Proxmox certificates are common in homelab and enterprise environments.
- **No Blind Insecure Flags**: ProxDesk **never** uses blanket `danger_accept_invalid_certs(true)` without fingerprint validation.
- **SHA-256 Fingerprint Inspection**:
  1. On first connection to a server with a self-signed certificate, ProxDesk calculates the SHA-256 fingerprint of the certificate.
  2. The user is presented with a "TLS Certificate Not Trusted" inspection modal displaying Subject, Issuer, Expiration date, Hostname, and SHA-256 fingerprint.
  3. Upon explicit approval, the fingerprint is saved to the connection profile.
  4. Subsequent connections verify that the presented certificate fingerprint matches the saved fingerprint. If the certificate changes later, a warning alert is triggered.

---

## Threat Model & Mitigations

| Threat Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Stolen API Token** | Unauthorized host access | Token secrets stored in Linux Secret Service API or `0600` protected vault. |
| **Log Credential Leakage** | Exposure of secrets in logs | Custom redacted `Debug` formatting on all authentication structs. |
| **Man-in-the-Middle (MITM)** | Intercepted API commands | Strict HTTPS enforcement + SHA-256 TLS certificate fingerprint pinning. |
| **Cross-Site Scripting (XSS)** | Injection via Web View | Strict Content Security Policy (CSP) + no execution of arbitrary remote scripts. |
| **Command Injection** | Host system compromise | Pure REST API execution over HTTPS. No shell execution or SSH dependencies. |
| **Unsafe Shell Commands** | Privileged local code execution | No `shell:execute` plugin features enabled in Tauri. |
