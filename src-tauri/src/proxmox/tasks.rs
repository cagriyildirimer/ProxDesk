use crate::error::AppError;
use crate::proxmox::client::ProxmoxClient;
use crate::proxmox::models::{ProxmoxTask, TaskLogLine};

impl ProxmoxClient {
    /// Fetches UPID task status (`GET /nodes/{node}/tasks/{upid}/status`)
    pub async fn get_task_status(&self, node: &str, upid: &str) -> Result<ProxmoxTask, AppError> {
        let encoded_upid: String = url::form_urlencoded::byte_serialize(upid.as_bytes()).collect();
        let path = format!("/nodes/{}/tasks/{}/status", node, encoded_upid);
        self.get::<ProxmoxTask>(&path).await
    }

    /// Fetches UPID task log stream lines (`GET /nodes/{node}/tasks/{upid}/log`)
    pub async fn get_task_log(&self, node: &str, upid: &str) -> Result<Vec<TaskLogLine>, AppError> {
        let encoded_upid: String = url::form_urlencoded::byte_serialize(upid.as_bytes()).collect();
        let path = format!("/nodes/{}/tasks/{}/log", node, encoded_upid);
        self.get::<Vec<TaskLogLine>>(&path).await
    }
}
