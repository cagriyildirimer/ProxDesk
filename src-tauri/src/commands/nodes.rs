use crate::proxmox::models::{ClusterOverview, NodeSummary, ProxmoxVersion};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_nodes(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<NodeSummary>, String> {
    let client = state.get_client(&connection_id).map_err(String::from)?;
    client.get_nodes().await.map_err(String::from)
}

#[tauri::command]
pub async fn get_version(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<ProxmoxVersion, String> {
    let client = state.get_client(&connection_id).map_err(String::from)?;
    client.get_version().await.map_err(String::from)
}

#[tauri::command]
pub async fn get_cluster_overview(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Option<ClusterOverview>, String> {
    let client = state.get_client(&connection_id).map_err(String::from)?;
    client.get_cluster_status().await.map_err(String::from)
}
