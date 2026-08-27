use crate::proxmox::models::{BackupContentItem, StorageSummary};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_storage_list(
  state: State<'_, AppState>,
  connection_id: String,
) -> Result<Vec<StorageSummary>, String> {
  let client = state
    .get_client(&connection_id)
    .map_err(String::from)?;
  let nodes = client
    .get_nodes()
    .await
    .map_err(String::from)?;

  let mut all_storages = Vec::new();
  let mut errors = Vec::new();

  for node in nodes {
    match client.get_storage_list(&node.node).await {
      Ok(storages) => {
        all_storages.extend(storages);
      }
      Err(err) => {
        errors.push(format!("Storage fetch failed for node {}: {}", node.node, err));
      }
    }
  }

  if all_storages.is_empty() && !errors.is_empty() {
    return Err(errors.join(" | "));
  }

  Ok(all_storages)
}

#[tauri::command]
pub async fn get_backup_contents(
  state: State<'_, AppState>,
  connection_id: String,
  node: String,
  storage: String,
) -> Result<Vec<BackupContentItem>, String> {
  let client = state
    .get_client(&connection_id)
    .map_err(String::from)?;
  client
    .get_backup_contents(&node, &storage)
    .await
    .map_err(String::from)
}
