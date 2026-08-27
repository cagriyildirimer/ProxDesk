use crate::error::AppError;
use crate::proxmox::auth::ProxmoxAuth;
use crate::proxmox::client::ProxmoxClient;
use crate::security::credentials::CredentialStore;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use log::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionProfile {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub realm: String,
    pub token_id: String,
    #[serde(default)]
    pub trusted_fingerprints: Vec<String>,
    #[serde(default)]
    pub pve_version: Option<String>,
    #[serde(default)]
    pub last_connected: Option<String>,
}

#[derive(Clone)]
pub struct AppState {
    pub config_dir: PathBuf,
    pub connections: Arc<Mutex<Vec<ConnectionProfile>>>,
    pub clients: Arc<Mutex<HashMap<String, Arc<ProxmoxClient>>>>,
    pub active_connection_id: Arc<Mutex<Option<String>>>,
}

impl AppState {
    pub fn new(config_dir: PathBuf) -> Self {
        if !config_dir.exists() {
            let _ = fs::create_dir_all(&config_dir);
        }

        let profiles = Self::load_profiles_from_disk(&config_dir).unwrap_or_default();

        Self {
            config_dir,
            connections: Arc::new(Mutex::new(profiles)),
            clients: Arc::new(Mutex::new(HashMap::new())),
            active_connection_id: Arc::new(Mutex::new(None)),
        }
    }

    fn config_file_path(config_dir: &Path) -> PathBuf {
        config_dir.join("connections.json")
    }

    fn load_profiles_from_disk(config_dir: &Path) -> Result<Vec<ConnectionProfile>, AppError> {
        let file_path = Self::config_file_path(config_dir);
        if !file_path.exists() {
            return Ok(Vec::new());
        }

        let content = fs::read_to_string(&file_path)
            .map_err(|e| AppError::Io(format!("Failed to read connections file: {}", e)))?;
        let profiles: Vec<ConnectionProfile> = serde_json::from_str(&content)
            .map_err(|e| AppError::InvalidConfiguration(format!("Corrupt connections file: {}", e)))?;

        Ok(profiles)
    }

    pub fn save_profiles_to_disk(&self) -> Result<(), AppError> {
        let file_path = Self::config_file_path(&self.config_dir);
        let profiles = self.connections.lock().unwrap_or_else(|e| e.into_inner()).clone();
        let content = serde_json::to_string_pretty(&profiles)
            .map_err(|e| AppError::Io(format!("Failed to serialize profiles: {}", e)))?;
        fs::write(file_path, content)
            .map_err(|e| AppError::Io(format!("Failed to write connections file: {}", e)))?;
        Ok(())
    }

    /// Retrieves or initializes a ProxmoxClient for a connection profile ID
    pub fn get_client(&self, connection_id: &str) -> Result<Arc<ProxmoxClient>, AppError> {
        let mut clients_lock = self.clients.lock().unwrap_or_else(|e| e.into_inner());

        if let Some(client) = clients_lock.get(connection_id) {
            return Ok(Arc::clone(client));
        }

        // Load profile
        let conn_lock = self.connections.lock().unwrap_or_else(|e| e.into_inner());
        let profile = conn_lock
            .iter()
            .find(|c| c.id == connection_id)
            .ok_or_else(|| AppError::NotFound(format!("Connection profile '{}' not found", connection_id)))?
            .clone();
        drop(conn_lock);

        // Fetch secret securely from keyring
        let secret = CredentialStore::get_secret(connection_id)?;
        let auth = ProxmoxAuth::new(profile.user, profile.realm, profile.token_id, secret);
        let client = Arc::new(ProxmoxClient::new(&profile.host, profile.port, auth)?);

        clients_lock.insert(connection_id.to_string(), Arc::clone(&client));
        Ok(client)
    }

    pub fn add_or_update_profile(
        &self,
        profile: ConnectionProfile,
        secret: &str,
    ) -> Result<(), AppError> {
        let connection_id = profile.id.clone();

        // Save secret to OS Keyring first
        CredentialStore::save_secret(&connection_id, secret)?;

        let mut lock = self.connections.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(existing) = lock.iter_mut().find(|c| c.id == connection_id) {
            *existing = profile;
        } else {
            lock.push(profile);
        }
        drop(lock);

        self.save_profiles_to_disk()?;

        // Invalidate active client cache so it picks up new secret/config
        let mut clients = self.clients.lock().unwrap_or_else(|e| e.into_inner());
        clients.remove(&connection_id);

        Ok(())
    }

    pub fn delete_profile(&self, connection_id: &str) -> Result<(), AppError> {
        let _ = CredentialStore::delete_secret(connection_id);

        let mut lock = self.connections.lock().unwrap_or_else(|e| e.into_inner());
        lock.retain(|c| c.id != connection_id);
        drop(lock);

        self.save_profiles_to_disk()?;

        let mut clients = self.clients.lock().unwrap_or_else(|e| e.into_inner());
        clients.remove(connection_id);

        info!("Deleted connection profile {}", connection_id);
        Ok(())
    }
}
