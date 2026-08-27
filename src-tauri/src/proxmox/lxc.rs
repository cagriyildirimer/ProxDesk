use crate::error::AppError;
use crate::proxmox::client::ProxmoxClient;
use crate::proxmox::models::RawLxcContainer;

impl ProxmoxClient {
    /// Fetches all LXC Containers on a specific node (`GET /nodes/{node}/lxc`)
    pub async fn get_lxc_containers(&self, node: &str) -> Result<Vec<RawLxcContainer>, AppError> {
        let path = format!("/nodes/{}/lxc", node);
        self.get::<Vec<RawLxcContainer>>(&path).await
    }

    /// Fetches status of a specific LXC Container (`GET /nodes/{node}/lxc/{vmid}/status/current`)
    pub async fn get_lxc_status(&self, node: &str, vmid: u64) -> Result<RawLxcContainer, AppError> {
        let path = format!("/nodes/{}/lxc/{}/status/current", node, vmid);
        self.get::<RawLxcContainer>(&path).await
    }

    /// Executes power action on an LXC Container (`POST /nodes/{node}/lxc/{vmid}/status/{action}`)
    /// Actions: start, shutdown, reboot, stop
    /// Returns UPID task string for async tracking
    pub async fn lxc_power_action(&self, node: &str, vmid: u64, action: &str) -> Result<String, AppError> {
        let valid_actions = ["start", "shutdown", "reboot", "stop"];
        if !valid_actions.contains(&action) {
            return Err(AppError::InvalidConfiguration(format!("Invalid LXC power action: {}", action)));
        }

        let path = format!("/nodes/{}/lxc/{}/status/{}", node, vmid, action);
        self.post_empty::<String>(&path).await
    }

    /// Requests VNC proxy session ticket for LXC container (`POST /nodes/{node}/lxc/{vmid}/vncproxy`)
    pub async fn create_lxc_vnc_proxy(&self, node: &str, vmid: u64) -> Result<serde_json::Value, AppError> {
        let path = format!("/nodes/{}/lxc/{}/vncproxy", node, vmid);
        #[derive(serde::Serialize)]
        struct VncForm {
            websocket: u8,
        }
        self.post_form::<serde_json::Value, _>(&path, &VncForm { websocket: 1 }).await
    }
}
