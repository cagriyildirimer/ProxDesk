use crate::error::AppError;
use crate::proxmox::client::ProxmoxClient;
use crate::proxmox::models::SnapshotItem;
use serde::Serialize;

#[derive(Serialize)]
struct CreateSnapshotForm<'a> {
    snapname: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    vmstate: Option<u8>,
}

impl ProxmoxClient {
    /// Fetches snapshot tree/list for a VM or LXC container (`GET /nodes/{node}/{type}/{vmid}/snapshot`)
    pub async fn get_snapshots(
        &self,
        node: &str,
        vmid: u64,
        guest_type: &str,
    ) -> Result<Vec<SnapshotItem>, AppError> {
        let path = format!("/nodes/{}/{}/{}/snapshot", node, guest_type, vmid);
        self.get::<Vec<SnapshotItem>>(&path).await
    }

    /// Creates a new snapshot (`POST /nodes/{node}/{type}/{vmid}/snapshot`)
    pub async fn create_snapshot(
        &self,
        node: &str,
        vmid: u64,
        guest_type: &str,
        snapname: &str,
        description: Option<&str>,
        include_ram: bool,
    ) -> Result<String, AppError> {
        let path = format!("/nodes/{}/{}/{}/snapshot", node, guest_type, vmid);
        let form = CreateSnapshotForm {
            snapname,
            description,
            vmstate: if include_ram { Some(1) } else { None },
        };
        self.post_form::<String, _>(&path, &form).await
    }

    /// Rollbacks to a snapshot (`POST /nodes/{node}/{type}/{vmid}/snapshot/{snapname}/rollback`)
    pub async fn rollback_snapshot(
        &self,
        node: &str,
        vmid: u64,
        guest_type: &str,
        snapname: &str,
    ) -> Result<String, AppError> {
        let path = format!("/nodes/{}/{}/{}/snapshot/{}/rollback", node, guest_type, vmid, snapname);
        self.post_empty::<String>(&path).await
    }

    /// Deletes a snapshot (`DELETE /nodes/{node}/{type}/{vmid}/snapshot/{snapname}`)
    pub async fn delete_snapshot(
        &self,
        node: &str,
        vmid: u64,
        guest_type: &str,
        snapname: &str,
    ) -> Result<String, AppError> {
        let path = format!("/nodes/{}/{}/{}/snapshot/{}", node, guest_type, vmid, snapname);
        self.delete::<String>(&path).await
    }
}
