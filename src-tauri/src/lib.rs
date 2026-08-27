pub mod commands;
pub mod error;
pub mod proxmox;
pub mod proxy;
pub mod security;
pub mod state;

use state::AppState;
use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let config_dir = app
                .path()
                .app_config_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from(".proxdesk-config"));

            let app_state = AppState::new(config_dir);
            let state_arc = Arc::new(app_state);

            // Start local SSL bypass proxy loopback on 127.0.0.1:14222
            proxy::LocalProxy::start_in_background(Arc::clone(&state_arc));

            app.manage((*state_arc).clone());

            log::info!("ProxDesk Backend & Local SSL Proxy initialized successfully");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::connection::get_connections,
            commands::connection::test_connection,
            commands::connection::add_connection,
            commands::connection::delete_connection,
            commands::connection::trust_certificate,
            commands::nodes::get_nodes,
            commands::nodes::get_version,
            commands::nodes::get_cluster_overview,
            commands::guests::get_guests,
            commands::guests::guest_power_action,
            commands::guests::open_console_window,
            commands::guests::create_vnc_ticket,
            commands::guests::get_guest_agent_network,
            commands::guests::get_guest_snapshots,
            commands::guests::create_guest_snapshot,
            commands::guests::rollback_guest_snapshot,
            commands::guests::delete_guest_snapshot,
            commands::storage::get_storage_list,
            commands::storage::get_backup_contents,
            commands::tasks::get_task_status,
            commands::tasks::get_task_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ProxDesk tauri application");
}
