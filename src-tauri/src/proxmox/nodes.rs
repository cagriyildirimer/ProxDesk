use crate::error::AppError;
use crate::proxmox::client::ProxmoxClient;
use crate::proxmox::models::{
  parse_f64, parse_u64, ClusterOverview, ClusterStatusItem, NodeStatusDetail,
  NodeSummary, ProxmoxVersion, RawNodeSummary,
};

impl ProxmoxClient {
  /// Fetches Proxmox VE API version (`GET /version`)
  pub async fn get_version(&self) -> Result<ProxmoxVersion, AppError> {
    self.get::<ProxmoxVersion>("/version").await
  }

  /// Fetches summary list of all nodes in cluster/host (`GET /nodes`)
  /// Also queries `/nodes/{node}/status` if node metrics (CPU/RAM) are incomplete
  pub async fn get_nodes(&self) -> Result<Vec<NodeSummary>, AppError> {
    let raw_list = self.get::<Vec<RawNodeSummary>>("/nodes").await?;

    let mut result = Vec::new();

    for item in raw_list {
      let mut cpu = parse_f64(&item.cpu);
      let mut maxcpu = parse_f64(&item.maxcpu);
      let mut mem = parse_u64(&item.mem);
      let mut maxmem = parse_u64(&item.maxmem);
      let mut uptime = parse_u64(&item.uptime);

      // If detailed metrics are missing from basic `/nodes` list, query `/nodes/{node}/status`
      if maxmem == 0 || maxcpu == 0.0 || uptime == 0 {
        let status_path = format!("/nodes/{}/status", item.node);
        if let Ok(detail) = self.get::<NodeStatusDetail>(&status_path).await {
          if cpu == 0.0 {
            cpu = parse_f64(&detail.cpu);
          }
          if uptime == 0 {
            uptime = parse_u64(&detail.uptime);
          }
          if let Some(mem_info) = detail.memory {
            if mem == 0 {
              mem = parse_u64(&mem_info.used);
            }
            if maxmem == 0 {
              maxmem = parse_u64(&mem_info.total);
            }
          }
          if let Some(cpu_info) = detail.cpuinfo {
            if maxcpu == 0.0 {
              maxcpu = parse_f64(&cpu_info.cpus);
            }
          }
        }
      }

      result.push(NodeSummary {
        node: item.node,
        status: item.status.unwrap_or_else(|| "online".into()),
        cpu: Some(cpu),
        maxcpu: Some(maxcpu),
        mem: Some(mem),
        maxmem: Some(maxmem),
        uptime: Some(uptime),
        level: item.level,
      });
    }

    Ok(result)
  }

  /// Fetches cluster status overview if cluster exists (`GET /cluster/status`)
  pub async fn get_cluster_status(&self) -> Result<Option<ClusterOverview>, AppError> {
    match self.get::<Vec<ClusterStatusItem>>("/cluster/status").await {
      Ok(items) => {
        let cluster_item = items.iter().find(|i| i.item_type == "cluster");
        let cluster_name = cluster_item
          .map(|i| i.name.clone())
          .unwrap_or_else(|| "Cluster".into());
        let is_quorate = cluster_item.and_then(|i| i.quorate).unwrap_or(1) == 1;

        let nodes: Vec<&ClusterStatusItem> = items
          .iter()
          .filter(|i| i.item_type == "node")
          .collect();
        let node_count = nodes.len();
        let online_count = nodes
          .iter()
          .filter(|i| i.online.unwrap_or(0) == 1)
          .count();

        Ok(Some(ClusterOverview {
          name: cluster_name,
          quorate: is_quorate,
          node_count,
          online_count,
        }))
      }
      Err(_) => {
        // Standalone node without cluster configuration
        Ok(None)
      }
    }
  }
}
