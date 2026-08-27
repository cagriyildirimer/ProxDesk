use crate::error::AppError;
use crate::proxmox::client::ProxmoxClient;
use crate::proxmox::models::{GuestNetworkInterface, RawQemuVm};

impl ProxmoxClient {
    /// Fetches all QEMU VMs on a specific node (`GET /nodes/{node}/qemu`)
    pub async fn get_qemu_vms(&self, node: &str) -> Result<Vec<RawQemuVm>, AppError> {
        let path = format!("/nodes/{}/qemu", node);
        self.get::<Vec<RawQemuVm>>(&path).await
    }

    /// Fetches current status of a specific QEMU VM (`GET /nodes/{node}/qemu/{vmid}/status/current`)
    pub async fn get_qemu_vm_status(&self, node: &str, vmid: u64) -> Result<RawQemuVm, AppError> {
        let path = format!("/nodes/{}/qemu/{}/status/current", node, vmid);
        self.get::<RawQemuVm>(&path).await
    }

    /// Executes power action on a QEMU VM (`POST /nodes/{node}/qemu/{vmid}/status/{action}`)
    /// Actions: start, shutdown, reboot, stop, reset, suspend, resume
    /// Returns UPID task string for async tracking
    pub async fn qemu_power_action(&self, node: &str, vmid: u64, action: &str) -> Result<String, AppError> {
        let valid_actions = ["start", "shutdown", "reboot", "stop", "reset", "suspend", "resume"];
        if !valid_actions.contains(&action) {
            return Err(AppError::InvalidConfiguration(format!("Invalid QEMU power action: {}", action)));
        }

        let path = format!("/nodes/{}/qemu/{}/status/{}", node, vmid, action);
        self.post_empty::<String>(&path).await
    }

    /// Requests SPICE proxy connection configuration (`POST /nodes/{node}/qemu/{vmid}/spiceproxy`)
    pub async fn get_spice_config(&self, node: &str, vmid: u64) -> Result<serde_json::Value, AppError> {
        let path = format!("/nodes/{}/qemu/{}/spiceproxy", node, vmid);
        self.post_empty::<serde_json::Value>(&path).await
    }

    /// Requests VNC proxy session ticket (`POST /nodes/{node}/qemu/{vmid}/vncproxy`)
    pub async fn create_qemu_vnc_proxy(&self, node: &str, vmid: u64) -> Result<serde_json::Value, AppError> {
        let path = format!("/nodes/{}/qemu/{}/vncproxy", node, vmid);
        #[derive(serde::Serialize)]
        struct VncForm {
            websocket: u8,
        }
        self.post_form::<serde_json::Value, _>(&path, &VncForm { websocket: 1 }).await
    }

    /// Attempts to fetch QEMU Guest Agent network interfaces (`GET /nodes/{node}/qemu/{vmid}/agent/network-get-interfaces`)
    /// Returns None gracefully if guest agent is not running or disabled
    pub async fn get_qemu_agent_network(
        &self,
        node: &str,
        vmid: u64,
    ) -> Result<Option<Vec<GuestNetworkInterface>>, AppError> {
        let path = format!("/nodes/{}/qemu/{}/agent/network-get-interfaces", node, vmid);
        
        #[derive(serde::Deserialize)]
        struct AgentResult {
            result: Option<Vec<GuestNetworkInterface>>,
        }

        match self.get::<AgentResult>(&path).await {
            Ok(res) => Ok(res.result),
            Err(_) => Ok(None), // Guest agent is optional, handle gracefully
        }
    }
}
