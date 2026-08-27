use crate::proxmox::models::{ProxmoxTask, TaskLogLine};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_task_status(
    state: State<'_, AppState>,
    connection_id: String,
    node: String,
    upid: String,
) -> Result<ProxmoxTask, String> {
    let client = state.get_client(&connection_id).map_err(String::from)?;
    client.get_task_status(&node, &upid).await.map_err(String::from)
}

#[tauri::command]
pub async fn get_task_log(
    state: State<'_, AppState>,
    connection_id: String,
    node: String,
    upid: String,
) -> Result<Vec<TaskLogLine>, String> {
    let client = state.get_client(&connection_id).map_err(String::from)?;
    client.get_task_log(&node, &upid).await.map_err(String::from)
}
