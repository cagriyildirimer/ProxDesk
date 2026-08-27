use crate::proxmox::auth::ProxmoxAuth;
use crate::proxmox::client::ProxmoxClient;
use crate::state::{AppState, ConnectionProfile};
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub latency_ms: u64,
    pub pve_version: String,
    pub node_count: usize,
    pub first_node: String,
}

#[tauri::command]
pub fn get_connections(state: State<'_, AppState>) -> Result<Vec<ConnectionProfile>, String> {
    let lock = state.connections.lock().unwrap_or_else(|e| e.into_inner());
    Ok(lock.clone())
}

#[tauri::command]
pub async fn test_connection(
    host: String,
    port: u16,
    user: String,
    realm: String,
    token_id: String,
    token_secret: String,
) -> Result<ConnectionTestResult, String> {
    let auth = ProxmoxAuth::new(user, realm, token_id, token_secret);
    let client = ProxmoxClient::new(&host, port, auth).map_err(String::from)?;

    let start = Instant::now();
    let version = client.get_version().await.map_err(String::from)?;
    let nodes = client.get_nodes().await.map_err(String::from)?;
    let latency_ms = start.elapsed().as_millis() as u64;

    let first_node = nodes.first().map(|n| n.node.clone()).unwrap_or_else(|| "pve".into());

    Ok(ConnectionTestResult {
        success: true,
        latency_ms,
        pve_version: format!("{}.{}", version.version, version.release),
        node_count: nodes.len(),
        first_node,
    })
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn add_connection(
    state: State<'_, AppState>,
    name: String,
    host: String,
    port: u16,
    user: String,
    realm: String,
    token_id: String,
    token_secret: String,
    trusted_fingerprints: Vec<String>,
) -> Result<ConnectionProfile, String> {
    let ts = chrono::Utc::now().timestamp_millis() % 100000;
    let clean_name = name.to_lowercase().replace(' ', "-");
    let id = format!("{}-{}-{}", host.replace('.', "-"), port, if clean_name.is_empty() { ts.to_string() } else { clean_name });
    let profile = ConnectionProfile {
        id: id.clone(),
        name,
        host,
        port,
        user,
        realm,
        token_id,
        trusted_fingerprints,
        pve_version: None,
        last_connected: Some(chrono::Utc::now().to_rfc3339()),
    };

    state.add_or_update_profile(profile.clone(), &token_secret).map_err(String::from)?;
    Ok(profile)
}

#[tauri::command]
pub fn delete_connection(state: State<'_, AppState>, connection_id: String) -> Result<bool, String> {
    state.delete_profile(&connection_id).map_err(String::from)?;
    Ok(true)
}

#[tauri::command]
pub fn trust_certificate(
    state: State<'_, AppState>,
    connection_id: String,
    fingerprint: String,
) -> Result<bool, String> {
    let mut conn_lock = state.connections.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(profile) = conn_lock.iter_mut().find(|c| c.id == connection_id) {
        if !profile.trusted_fingerprints.contains(&fingerprint) {
            profile.trusted_fingerprints.push(fingerprint);
        }
        drop(conn_lock);
        let _ = state.save_profiles_to_disk();
        return Ok(true);
    }
    Err("Connection profile not found".into())
}
