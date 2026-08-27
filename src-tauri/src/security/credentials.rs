use crate::error::AppError;
use keyring::Entry;
use log::{info, warn};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

const SERVICE_NAME: &str = "proxdesk";

// In-memory & protected file vault when DBus / Secret-Service is unavailable
static FALLBACK_VAULT: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

pub struct CredentialStore;

impl CredentialStore {
    fn entry_key(connection_id: &str) -> String {
        format!("proxdesk-secret-{}", connection_id)
    }

    fn fallback_file_path() -> PathBuf {
        let base = std::env::var("HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("."));
        base.join(".proxdesk-config").join(".secrets_vault.json")
    }

    fn load_fallback_vault() -> HashMap<String, String> {
        let mut guard = FALLBACK_VAULT.lock().unwrap();
        if let Some(ref map) = *guard {
            return map.clone();
        }

        let path = Self::fallback_file_path();
        let map = if path.exists() {
            fs::read_to_string(&path)
                .ok()
                .and_then(|content| serde_json::from_str::<HashMap<String, String>>(&content).ok())
                .unwrap_or_default()
        } else {
            HashMap::new()
        };

        *guard = Some(map.clone());
        map
    }

    fn save_fallback_vault(map: HashMap<String, String>) -> Result<(), AppError> {
        let path = Self::fallback_file_path();
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        let content = serde_json::to_string_pretty(&map)
            .map_err(|e| AppError::CredentialStorage(format!("Vault serialization error: {}", e)))?;

        fs::write(&path, content).map_err(|e| {
            AppError::CredentialStorage(format!("Failed to write fallback secrets vault: {}", e))
        })?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = fs::set_permissions(&path, fs::Permissions::from_mode(0o600));
        }

        let mut guard = FALLBACK_VAULT.lock().unwrap();
        *guard = Some(map);
        Ok(())
    }

    /// Securely saves token secret to native platform credential manager.
    /// Automatically falls back to protected file vault if DBus Secret Service is missing.
    pub fn save_secret(connection_id: &str, secret: &str) -> Result<(), AppError> {
        let key = Self::entry_key(connection_id);

        // Try OS Keyring first
        match Entry::new(SERVICE_NAME, &key) {
            Ok(entry) => match entry.set_password(secret) {
                Ok(_) => {
                    info!("Successfully saved secret to OS keyring for connection {}", connection_id);
                    return Ok(());
                }
                Err(err) => {
                    warn!(
                        "OS keyring set_password failed ({}), using protected vault fallback for connection {}",
                        err, connection_id
                    );
                }
            },
            Err(err) => {
                warn!(
                    "OS keyring entry failed ({}), using protected vault fallback for connection {}",
                    err, connection_id
                );
            }
        }

        // Fallback to protected file vault
        let mut vault = Self::load_fallback_vault();
        vault.insert(connection_id.to_string(), secret.to_string());
        Self::save_fallback_vault(vault)
    }

    /// Securely retrieves token secret from native platform credential manager or fallback vault.
    pub fn get_secret(connection_id: &str) -> Result<String, AppError> {
        let key = Self::entry_key(connection_id);

        // Try OS Keyring first
        if let Ok(entry) = Entry::new(SERVICE_NAME, &key) {
            if let Ok(secret) = entry.get_password() {
                return Ok(secret);
            }
        }

        // Try fallback vault
        let vault = Self::load_fallback_vault();
        if let Some(secret) = vault.get(connection_id) {
            return Ok(secret.clone());
        }

        Err(AppError::CredentialStorage(format!(
            "Secret for connection '{}' not found in keyring or vault",
            connection_id
        )))
    }

    /// Securely deletes token secret from native platform credential manager and fallback vault.
    pub fn delete_secret(connection_id: &str) -> Result<(), AppError> {
        let key = Self::entry_key(connection_id);

        if let Ok(entry) = Entry::new(SERVICE_NAME, &key) {
            let _ = entry.delete_credential();
        }

        let mut vault = Self::load_fallback_vault();
        if vault.remove(connection_id).is_some() {
            let _ = Self::save_fallback_vault(vault);
        }

        info!("Deleted secret for connection {}", connection_id);
        Ok(())
    }
}
