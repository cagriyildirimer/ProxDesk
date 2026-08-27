use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxmoxResponse<T> {
    pub data: T,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxmoxVersion {
    pub version: String,
    pub release: String,
    #[serde(default)]
    pub repoid: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawNodeSummary {
    pub node: String,
    pub status: Option<String>,
    pub cpu: Option<serde_json::Value>,
    pub maxcpu: Option<serde_json::Value>,
    pub mem: Option<serde_json::Value>,
    pub maxmem: Option<serde_json::Value>,
    pub uptime: Option<serde_json::Value>,
    pub level: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeSummary {
    pub node: String,
    pub status: String,
    pub cpu: Option<f64>,
    pub maxcpu: Option<f64>,
    pub mem: Option<u64>,
    pub maxmem: Option<u64>,
    pub uptime: Option<u64>,
    pub level: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterStatusItem {
    #[serde(rename = "type")]
    pub item_type: String,
    pub name: String,
    pub id: Option<String>,
    pub nodeid: Option<u32>,
    pub nodes: Option<u32>,
    pub quorate: Option<u8>,
    pub online: Option<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterOverview {
    pub name: String,
    pub quorate: bool,
    pub node_count: usize,
    pub online_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawQemuVm {
    pub vmid: serde_json::Value,
    pub name: Option<String>,
    pub status: Option<String>,
    pub cpu: Option<serde_json::Value>,
    pub cpus: Option<serde_json::Value>,
    pub mem: Option<serde_json::Value>,
    pub maxmem: Option<serde_json::Value>,
    pub disk: Option<serde_json::Value>,
    pub maxdisk: Option<serde_json::Value>,
    pub uptime: Option<serde_json::Value>,
    pub template: Option<serde_json::Value>,
    pub tags: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawLxcContainer {
    pub vmid: serde_json::Value,
    pub name: Option<String>,
    pub status: Option<String>,
    pub cpu: Option<serde_json::Value>,
    pub cpus: Option<serde_json::Value>,
    pub mem: Option<serde_json::Value>,
    pub maxmem: Option<serde_json::Value>,
    pub disk: Option<serde_json::Value>,
    pub maxdisk: Option<serde_json::Value>,
    pub uptime: Option<serde_json::Value>,
    pub template: Option<serde_json::Value>,
    pub tags: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuestSummary {
    pub vmid: u64,
    pub name: String,
    pub guest_type: String, // "qemu" or "lxc"
    pub node: String,
    pub status: String, // "running", "stopped", "paused"
    pub cpu_usage: f64,
    pub cpu_count: u32,
    pub memory_used: u64,
    pub memory_total: u64,
    pub disk_used: u64,
    pub disk_total: u64,
    pub uptime: u64,
    pub is_template: bool,
    pub tags: Vec<String>,
    pub primary_ip: Option<String>,
    pub agent_status: Option<String>, // "active", "unavailable"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuestIpAddress {
    #[serde(rename = "ip-address")]
    pub ip_address: String,
    #[serde(rename = "ip-address-type")]
    pub ip_address_type: String,
    pub prefix: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuestNetworkInterface {
    pub name: String,
    #[serde(rename = "hardware-address")]
    pub hardware_address: Option<String>,
    #[serde(rename = "ip-addresses")]
    pub ip_addresses: Option<Vec<GuestIpAddress>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageSummary {
    pub storage: String,
    #[serde(rename = "type")]
    pub storage_type: String,
    pub node: String,
    pub status: String,
    pub content: String,
    pub used: u64,
    pub total: u64,
    pub avail: u64,
    pub shared: bool,
    pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawStorage {
    pub storage: String,
    #[serde(rename = "type")]
    pub storage_type: String,
    pub status: Option<String>,
    pub content: Option<String>,
    pub used: Option<serde_json::Value>,
    pub total: Option<serde_json::Value>,
    pub avail: Option<serde_json::Value>,
    pub shared: Option<serde_json::Value>,
    pub active: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeStatusDetail {
    pub cpu: Option<serde_json::Value>,
    pub uptime: Option<serde_json::Value>,
    pub memory: Option<NodeMemoryDetail>,
    pub cpuinfo: Option<NodeCpuInfoDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeMemoryDetail {
    pub total: Option<serde_json::Value>,
    pub used: Option<serde_json::Value>,
    pub free: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeCpuInfoDetail {
    pub cpus: Option<serde_json::Value>,
    pub cores: Option<serde_json::Value>,
    pub sockets: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxmoxTask {
    pub upid: String,
    pub node: String,
    pub status: String,
    pub exitstatus: Option<String>,
    pub starttime: Option<i64>,
    pub endtime: Option<i64>,
    pub user: Option<String>,
    #[serde(rename = "type")]
    pub task_type: Option<String>,
    pub id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskLogLine {
    pub n: u64,
    pub t: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotItem {
    pub name: String,
    pub description: Option<String>,
    pub snaptime: Option<i64>,
    pub parent: Option<String>,
    pub vmstate: Option<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupContentItem {
    pub volid: String,
    pub vmid: Option<u64>,
    pub size: Option<serde_json::Value>,
    pub ctime: Option<i64>,
    pub format: Option<String>,
    pub notes: Option<String>,
}

// Helpers for flexible parsing of JSON numbers/strings/floats
pub fn parse_u64(val: &Option<serde_json::Value>) -> u64 {
    match val {
        Some(serde_json::Value::Number(n)) => n.as_u64().unwrap_or(0),
        Some(serde_json::Value::String(s)) => s.parse::<u64>().unwrap_or(0),
        _ => 0,
    }
}

pub fn parse_f64(val: &Option<serde_json::Value>) -> f64 {
    match val {
        Some(serde_json::Value::Number(n)) => n.as_f64().unwrap_or(0.0),
        Some(serde_json::Value::String(s)) => s.parse::<f64>().unwrap_or(0.0),
        _ => 0.0,
    }
}

pub fn parse_u32(val: &Option<serde_json::Value>) -> u32 {
    match val {
        Some(serde_json::Value::Number(n)) => n.as_u64().map(|v| v as u32).unwrap_or(0),
        Some(serde_json::Value::String(s)) => s.parse::<u32>().unwrap_or(0),
        _ => 0,
    }
}
