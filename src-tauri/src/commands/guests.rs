use crate::proxmox::models::{
  parse_f64, parse_u32, parse_u64, GuestNetworkInterface, GuestSummary,
  SnapshotItem,
};
use crate::state::AppState;
use log::info;
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub async fn get_guests(
  state: State<'_, AppState>,
  connection_id: String,
) -> Result<Vec<GuestSummary>, String> {
  let client = state
    .get_client(&connection_id)
    .map_err(String::from)?;
  let nodes = client
    .get_nodes()
    .await
    .map_err(String::from)?;

  let mut all_guests = Vec::new();
  let mut errors = Vec::new();

  for node_item in nodes {
    let node_name = &node_item.node;

    // Fetch QEMU VMs
    match client.get_qemu_vms(node_name).await {
      Ok(vms) => {
        info!("Fetched {} QEMU VMs for node {}", vms.len(), node_name);
        for vm in vms {
          let vmid_num = parse_u64(&Some(vm.vmid));
          let tags = vm
            .tags
            .as_ref()
            .map(|t| {
              t.split(&[';', ','][..])
                .map(|s| s.trim().to_string())
                .collect()
            })
            .unwrap_or_default();

          let status = vm.status.unwrap_or_else(|| "stopped".into());

          all_guests.push(GuestSummary {
            vmid: vmid_num,
            name: vm.name.unwrap_or_else(|| format!("VM {}", vmid_num)),
            guest_type: "qemu".into(),
            node: node_name.clone(),
            status,
            cpu_usage: parse_f64(&vm.cpu),
            cpu_count: parse_u32(&vm.cpus).max(1),
            memory_used: parse_u64(&vm.mem),
            memory_total: parse_u64(&vm.maxmem),
            disk_used: parse_u64(&vm.disk),
            disk_total: parse_u64(&vm.maxdisk),
            uptime: parse_u64(&vm.uptime),
            is_template: parse_u32(&vm.template) == 1,
            tags,
            primary_ip: None,
            agent_status: None,
          });
        }
      }
      Err(err) => {
        errors.push(format!("QEMU VM fetch failed for node {}: {}", node_name, err));
      }
    }

    // Fetch LXC Containers
    match client.get_lxc_containers(node_name).await {
      Ok(lxcs) => {
        info!("Fetched {} LXC containers for node {}", lxcs.len(), node_name);
        for lxc in lxcs {
          let vmid_num = parse_u64(&Some(lxc.vmid));
          let tags = lxc
            .tags
            .as_ref()
            .map(|t| {
              t.split(&[';', ','][..])
                .map(|s| s.trim().to_string())
                .collect()
            })
            .unwrap_or_default();

          let status = lxc.status.unwrap_or_else(|| "stopped".into());

          all_guests.push(GuestSummary {
            vmid: vmid_num,
            name: lxc.name.unwrap_or_else(|| format!("CT {}", vmid_num)),
            guest_type: "lxc".into(),
            node: node_name.clone(),
            status,
            cpu_usage: parse_f64(&lxc.cpu),
            cpu_count: parse_u32(&lxc.cpus).max(1),
            memory_used: parse_u64(&lxc.mem),
            memory_total: parse_u64(&lxc.maxmem),
            disk_used: parse_u64(&lxc.disk),
            disk_total: parse_u64(&lxc.maxdisk),
            uptime: parse_u64(&lxc.uptime),
            is_template: parse_u32(&lxc.template) == 1,
            tags,
            primary_ip: None,
            agent_status: None,
          });
        }
      }
      Err(err) => {
        errors.push(format!("LXC fetch failed for node {}: {}", node_name, err));
      }
    }
  }

  if all_guests.is_empty() && !errors.is_empty() {
    return Err(errors.join(" | "));
  }

  Ok(all_guests)
}

#[tauri::command]
pub async fn guest_power_action(
  state: State<'_, AppState>,
  connection_id: String,
  node: String,
  vmid: u64,
  guest_type: String,
  action: String,
) -> Result<String, String> {
  let client = state
    .get_client(&connection_id)
    .map_err(String::from)?;
  if guest_type == "qemu" {
    client
      .qemu_power_action(&node, vmid, &action)
      .await
      .map_err(String::from)
  } else {
    client
      .lxc_power_action(&node, vmid, &action)
      .await
      .map_err(String::from)
  }
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn open_console_window(
  app: AppHandle,
  _state: State<'_, AppState>,
  connection_id: String,
  connection_host: String,
  connection_port: u16,
  node: String,
  vmid: u64,
  guest_type: String,
  _ticket: Option<String>,
  _port: Option<u16>,
) -> Result<String, String> {
  let window_label = format!("console-{}-{}", node, vmid);

  if let Some(existing) = app.get_webview_window(&window_label) {
    let _ = existing.set_focus();
    return Ok(format!("Focused existing console window for VM {}", vmid));
  }

  let window_url = format!(
    "index.html?window=console&connection_id={}&host={}&port={}&node={}&vmid={}&guest_type={}&guest_name=VM%20{}",
    connection_id,
    connection_host,
    connection_port,
    node,
    vmid,
    guest_type,
    vmid
  );

  WebviewWindowBuilder::new(
    &app,
    &window_label,
    WebviewUrl::App(window_url.into()),
  )
  .title(format!("ProxDesk Console – VM {} ({})", vmid, node))
  .inner_size(1024.0, 720.0)
  .resizable(true)
  .focused(true)
  .build()
  .map_err(|e| format!("Failed to open console window: {}", e))?;

  Ok(format!("Opened native console window for VM {}", vmid))
}

#[tauri::command]
pub async fn create_vnc_ticket(
  state: State<'_, AppState>,
  connection_id: String,
  node: String,
  vmid: u64,
  guest_type: String,
) -> Result<serde_json::Value, String> {
  let client = state
    .get_client(&connection_id)
    .map_err(String::from)?;
  if guest_type == "qemu" {
    client
      .create_qemu_vnc_proxy(&node, vmid)
      .await
      .map_err(String::from)
  } else {
    client
      .create_lxc_vnc_proxy(&node, vmid)
      .await
      .map_err(String::from)
  }
}



#[tauri::command]
pub async fn get_guest_agent_network(
  state: State<'_, AppState>,
  connection_id: String,
  node: String,
  vmid: u64,
) -> Result<Option<Vec<GuestNetworkInterface>>, String> {
  let client = state
    .get_client(&connection_id)
    .map_err(String::from)?;
  client
    .get_qemu_agent_network(&node, vmid)
    .await
    .map_err(String::from)
}

#[tauri::command]
pub async fn get_guest_snapshots(
  state: State<'_, AppState>,
  connection_id: String,
  node: String,
  vmid: u64,
  guest_type: String,
) -> Result<Vec<SnapshotItem>, String> {
  let client = state
    .get_client(&connection_id)
    .map_err(String::from)?;
  client
    .get_snapshots(&node, vmid, &guest_type)
    .await
    .map_err(String::from)
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn create_guest_snapshot(
  state: State<'_, AppState>,
  connection_id: String,
  node: String,
  vmid: u64,
  guest_type: String,
  snapname: String,
  description: Option<String>,
  include_ram: bool,
) -> Result<String, String> {
  let client = state
    .get_client(&connection_id)
    .map_err(String::from)?;
  client
    .create_snapshot(
      &node,
      vmid,
      &guest_type,
      &snapname,
      description.as_deref(),
      include_ram,
    )
    .await
    .map_err(String::from)
}

#[tauri::command]
pub async fn rollback_guest_snapshot(
  state: State<'_, AppState>,
  connection_id: String,
  node: String,
  vmid: u64,
  guest_type: String,
  snapname: String,
) -> Result<String, String> {
  let client = state
    .get_client(&connection_id)
    .map_err(String::from)?;
  client
    .rollback_snapshot(&node, vmid, &guest_type, &snapname)
    .await
    .map_err(String::from)
}

#[tauri::command]
pub async fn delete_guest_snapshot(
  state: State<'_, AppState>,
  connection_id: String,
  node: String,
  vmid: u64,
  guest_type: String,
  snapname: String,
) -> Result<String, String> {
  let client = state
    .get_client(&connection_id)
    .map_err(String::from)?;
  client
    .delete_snapshot(&node, vmid, &guest_type, &snapname)
    .await
    .map_err(String::from)
}
