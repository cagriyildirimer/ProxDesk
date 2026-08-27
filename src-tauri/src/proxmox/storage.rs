use crate::error::AppError;
use crate::proxmox::client::ProxmoxClient;
use crate::proxmox::models::{
  parse_u32, parse_u64, BackupContentItem, RawStorage, StorageSummary,
};

impl ProxmoxClient {
  /// Fetches list of storage pools on a specific node (`GET /nodes/{node}/storage`)
  pub async fn get_storage_list(&self, node: &str) -> Result<Vec<StorageSummary>, AppError> {
    let path = format!("/nodes/{}/storage", node);
    let raw_storages = self.get::<Vec<RawStorage>>(&path).await?;

    let mut summaries = Vec::new();
    for item in raw_storages {
      let used = parse_u64(&item.used);
      let total = parse_u64(&item.total);
      let avail = parse_u64(&item.avail);
      let active_val = parse_u32(&item.active);
      let active = active_val == 1 || item.active.is_none();
      let shared_val = parse_u32(&item.shared);

      summaries.push(StorageSummary {
        storage: item.storage,
        storage_type: item.storage_type,
        node: node.to_string(),
        status: item
          .status
          .unwrap_or_else(|| if active { "active".into() } else { "inactive".into() }),
        content: item.content.unwrap_or_else(|| "none".into()),
        used,
        total,
        avail,
        shared: shared_val == 1,
        active,
      });
    }

    Ok(summaries)
  }

  /// Fetches backup items in storage content (`GET /nodes/{node}/storage/{storage}/content?content=backup`)
  pub async fn get_backup_contents(
    &self,
    node: &str,
    storage: &str,
  ) -> Result<Vec<BackupContentItem>, AppError> {
    let path = format!("/nodes/{}/storage/{}/content?content=backup", node, storage);
    self.get::<Vec<BackupContentItem>>(&path).await
  }
}
