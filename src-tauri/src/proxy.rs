use crate::state::AppState;
use log::{error, info};
use native_tls::TlsConnector as NativeTlsConnector;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::Client;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio_native_tls::TlsConnector;

pub const LOCAL_PROXY_PORT: u16 = 14222;

pub struct LocalProxy;

impl LocalProxy {
    /// Starts the local HTTP loopback proxy on 127.0.0.1:14222
    pub fn start_in_background(state: Arc<AppState>) {
        tauri::async_runtime::spawn(async move {
            let addr = format!("127.0.0.1:{}", LOCAL_PROXY_PORT);
            let listener = match TcpListener::bind(&addr).await {
                Ok(l) => l,
                Err(e) => {
                    error!("Failed to bind local SSL proxy on {}: {}", addr, e);
                    return;
                }
            };

            info!("Local SSL Bypass Proxy running at http://{}", addr);

            let http_client = Client::builder()
                .danger_accept_invalid_certs(true)
                .build()
                .unwrap_or_default();

            let native_tls_builder = NativeTlsConnector::builder()
                .danger_accept_invalid_certs(true)
                .danger_accept_invalid_hostnames(true)
                .build()
                .unwrap_or_else(|_| NativeTlsConnector::new().unwrap());
            let tls_connector = TlsConnector::from(native_tls_builder);

            loop {
                let (mut socket, _) = match listener.accept().await {
                    Ok(res) => res,
                    Err(_) => continue,
                };

                let state_clone = Arc::clone(&state);
                let client_clone = http_client.clone();
                let connector_clone = tls_connector.clone();

                tauri::async_runtime::spawn(async move {
                    let mut buffer = [0u8; 16384];
                    let bytes_read = match socket.read(&mut buffer).await {
                        Ok(n) if n > 0 => n,
                        _ => return,
                    };

                    let raw_req = String::from_utf8_lossy(&buffer[..bytes_read]);
                    let mut lines = raw_req.lines();
                    let first_line = lines.next().unwrap_or_default();
                    let parts: Vec<&str> = first_line.split_whitespace().collect();

                    if parts.len() < 2 {
                        return;
                    }

                    let method = parts[0];
                    let raw_path = parts[1]; // /proxy/{connection_id}/... OR /novnc/... OR /api2/...

                    // Determine target connection_id and subpath
                    let (conn_id, target_subpath) = if let Some(path_without_prefix) = raw_path.strip_prefix("/proxy/") {
                        let mut path_parts = path_without_prefix.splitn(2, '/');
                        let cid = path_parts.next().unwrap_or_default().to_string();
                        let sub = path_parts.next().unwrap_or_default().to_string();

                        // Set active connection ID
                        if let Ok(mut active_lock) = state_clone.active_connection_id.lock() {
                            *active_lock = Some(cid.clone());
                        }

                        (cid, sub)
                    } else {
                        // Request without /proxy/ prefix (e.g. /novnc/... or /api2/...)
                        let active_id = {
                            let active_lock = state_clone
                                .active_connection_id
                                .lock()
                                .unwrap_or_else(|e| e.into_inner());
                            active_lock.clone()
                        };

                        let conn_lock = state_clone
                            .connections
                            .lock()
                            .unwrap_or_else(|e| e.into_inner());
                        let cid = active_id
                            .or_else(|| conn_lock.first().map(|c| c.id.clone()))
                            .unwrap_or_default();
                        drop(conn_lock);

                        let sub = raw_path.trim_start_matches('/').to_string();
                        (cid, sub)
                    };

                    // Find connection profile
                    let profile = {
                        let conn_lock = state_clone
                            .connections
                            .lock()
                            .unwrap_or_else(|e| e.into_inner());
                        conn_lock.iter().find(|c| c.id == conn_id).cloned()
                    };

                    let profile = match profile {
                        Some(p) => p,
                        None => {
                            let _ = socket
                                .write_all(b"HTTP/1.1 404 Connection Profile Not Found\r\n\r\n")
                                .await;
                            return;
                        }
                    };

                    // Check if request is a WebSocket upgrade or SPICE CONNECT proxy tunnel
                    let is_websocket = raw_req.to_lowercase().contains("upgrade: websocket");
                    if method == "CONNECT" {
                        Self::tunnel_spice_connect(
                            socket,
                            &raw_req,
                            &profile.host,
                            &conn_id,
                            &state_clone,
                            connector_clone,
                        )
                        .await;
                        return;
                    }

                    if is_websocket {
                        Self::tunnel_websocket(
                            socket,
                            &buffer[..bytes_read],
                            &profile.host,
                            profile.port,
                            &conn_id,
                            &target_subpath,
                            &state_clone,
                            connector_clone,
                        )
                        .await;
                        return;
                    }

                    let target_url = format!("https://{}:{}/{}", profile.host, profile.port, target_subpath);

                    // Build request headers for standard HTTP
                    let mut req_headers = HeaderMap::new();
                    for line in lines {
                        if line.is_empty() {
                            break;
                        }
                        if let Some((k, v)) = line.split_once(':') {
                            let key_clean = k.trim().to_lowercase();
                            if key_clean != "host" && key_clean != "connection" {
                                if let (Ok(h_name), Ok(h_val)) = (
                                    HeaderName::from_bytes(key_clean.as_bytes()),
                                    HeaderValue::from_str(v.trim()),
                                ) {
                                    req_headers.insert(h_name, h_val);
                                }
                            }
                        }
                    }

                    // Inject Proxmox Authorization Header for this connection profile via secure client
                    if let Ok(client) = state_clone.get_client(&conn_id) {
                        let auth_val = client.auth.header_value();
                        if let Ok(h_val) = HeaderValue::from_str(&auth_val) {
                            req_headers.insert(HeaderName::from_static("authorization"), h_val);
                        }
                    }

                    // Extract vncticket from URL query string and inject PVEAuthCookie header for Proxmox console
                    if let Some((_, query_str)) = raw_path.split_once('?') {
                        for pair in query_str.split('&') {
                            if let Some((k, v)) = pair.split_once('=') {
                                if k == "vncticket" && !v.is_empty() {
                                    let cookie_str = format!("PVEAuthCookie={}", url::form_urlencoded::parse(v.as_bytes()).map(|(k,_)| k.to_string()).collect::<Vec<_>>().join(""));
                                    if let Ok(c_val) = HeaderValue::from_str(&cookie_str) {
                                        req_headers.insert(HeaderName::from_static("cookie"), c_val);
                                    }
                                }
                            }
                        }
                    }

                    // Perform HTTP request to Proxmox API with self-signed SSL accepted
                    let req_builder = match method {
                        "POST" => client_clone.post(&target_url),
                        "PUT" => client_clone.put(&target_url),
                        "DELETE" => client_clone.delete(&target_url),
                        _ => client_clone.get(&target_url),
                    };

                    match req_builder.headers(req_headers).send().await {
                        Ok(resp) => {
                            let status = resp.status();
                            let resp_headers = resp.headers().clone();
                            let body = resp.bytes().await.unwrap_or_default();

                            let mut head_str = format!("HTTP/1.1 {}\r\n", status);
                            for (k, v) in resp_headers.iter() {
                                let key_str = k.as_str();
                                if key_str != "transfer-encoding" && key_str != "content-length" {
                                    head_str.push_str(&format!("{}: {}\r\n", key_str, v.to_str().unwrap_or_default()));
                                }
                            }
                            head_str.push_str(&format!("content-length: {}\r\n", body.len()));
                            head_str.push_str("access-control-allow-origin: *\r\n\r\n");

                            let _ = socket.write_all(head_str.as_bytes()).await;
                            let _ = socket.write_all(&body).await;
                        }
                        Err(err) => {
                            let err_resp = format!(
                                "HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\n\r\nProxmox SSL Proxy Error: {}",
                                err
                            );
                            let _ = socket.write_all(err_resp.as_bytes()).await;
                        }
                    }
                });
            }
        });
    }

    /// Bi-directional TLS WebSocket tunneling engine with Proxmox Authorization injection
    #[allow(clippy::too_many_arguments)]
    async fn tunnel_websocket(
        mut local_socket: TcpStream,
        initial_bytes: &[u8],
        target_host: &str,
        target_port: u16,
        conn_id: &str,
        target_subpath: &str,
        state: &Arc<AppState>,
        tls_connector: TlsConnector,
    ) {
        let addr = format!("{}:{}", target_host, target_port);
        let tcp_stream = match TcpStream::connect(&addr).await {
            Ok(s) => s,
            Err(e) => {
                error!("WebSocket proxy failed to connect TCP to {}: {}", addr, e);
                return;
            }
        };

        let mut tls_stream = match tls_connector.connect(target_host, tcp_stream).await {
            Ok(s) => s,
            Err(e) => {
                error!("WebSocket proxy failed TLS handshake to {}: {}", target_host, e);
                return;
            }
        };

        let raw_req_str = String::from_utf8_lossy(initial_bytes);
        let mut lines = raw_req_str.lines();
        let first_line = lines.next().unwrap_or_default();
        let parts: Vec<&str> = first_line.split_whitespace().collect();
        let method = if !parts.is_empty() { parts[0] } else { "GET" };

        let mut modified_request = format!("{} /{} HTTP/1.1\r\nHost: {}:{}\r\n", method, target_subpath, target_host, target_port);

        // Inject Authorization header from ProxmoxClient
        if let Ok(client) = state.get_client(conn_id) {
            modified_request.push_str(&format!("Authorization: {}\r\n", client.auth.header_value()));
        }

        // Inject same-origin Origin header to pass Proxmox WebSocket Origin security check
        modified_request.push_str(&format!("Origin: https://{}:{}\r\n", target_host, target_port));

        for line in lines {
            if line.is_empty() {
                break;
            }
            if let Some((k, _)) = line.split_once(':') {
                let k_lower = k.trim().to_lowercase();
                if k_lower != "host" && k_lower != "authorization" && k_lower != "origin" {
                    modified_request.push_str(line);
                    modified_request.push_str("\r\n");
                }
            }
        }
        modified_request.push_str("\r\n");

        if let Err(e) = tls_stream.write_all(modified_request.as_bytes()).await {
            error!("Failed to write WebSocket handshake to Proxmox: {}", e);
            return;
        }

        // Read handshake response from Proxmox to inspect status code
        let mut resp_buf = [0u8; 4096];
        let resp_len = match tls_stream.read(&mut resp_buf).await {
            Ok(n) if n > 0 => n,
            Ok(_) => {
                error!("Proxmox closed TLS connection immediately during WebSocket handshake");
                return;
            }
            Err(e) => {
                error!("Failed to read WebSocket handshake response from Proxmox: {}", e);
                return;
            }
        };

        let resp_str = String::from_utf8_lossy(&resp_buf[..resp_len]);
        info!("Proxmox WebSocket Handshake Response:\n{}", resp_str);

        // Forward Proxmox handshake response back to local socket
        if let Err(e) = local_socket.write_all(&resp_buf[..resp_len]).await {
            error!("Failed to forward WebSocket handshake response to local socket: {}", e);
            return;
        }

        // Pipe remaining bidirectional binary VNC traffic
        match tokio::io::copy_bidirectional(&mut local_socket, &mut tls_stream).await {
            Ok((from_client, from_server)) => {
                info!("WebSocket session ended. Sent: {} bytes, Received: {} bytes", from_client, from_server);
            }
            Err(e) => {
                error!("WebSocket bidirectional piping error: {}", e);
            }
        }
    }

    /// SPICE HTTP CONNECT Proxying engine with Proxmox Authorization & SSL Bypass
    async fn tunnel_spice_connect(
        mut local_socket: TcpStream,
        raw_req: &str,
        target_host: &str,
        conn_id: &str,
        state: &Arc<AppState>,
        tls_connector: TlsConnector,
    ) {
        let addr = format!("{}:3128", target_host);
        let tcp_stream = match TcpStream::connect(&addr).await {
            Ok(s) => s,
            Err(e) => {
                error!("Failed to connect to Proxmox SPICE proxy {}: {}", addr, e);
                let _ = local_socket.write_all(b"HTTP/1.1 502 Bad Gateway\r\n\r\n").await;
                return;
            }
        };

        let mut tls_stream = match tls_connector.connect(target_host, tcp_stream).await {
            Ok(s) => s,
            Err(e) => {
                error!("Failed TLS handshake for SPICE proxy {}: {}", addr, e);
                let _ = local_socket.write_all(b"HTTP/1.1 502 Bad Gateway\r\n\r\n").await;
                return;
            }
        };

        let mut modified_request = String::new();
        let lines = raw_req.lines();
        for line in lines {
            if line.is_empty() {
                break;
            }
            modified_request.push_str(line);
            modified_request.push_str("\r\n");
        }

        // Inject Proxmox Authorization Header
        if let Ok(client) = state.get_client(conn_id) {
            modified_request.push_str(&format!("Authorization: {}\r\n", client.auth.header_value()));
        }
        modified_request.push_str("\r\n");

        if let Err(e) = tls_stream.write_all(modified_request.as_bytes()).await {
            error!("Failed to send CONNECT request to Proxmox SPICE proxy: {}", e);
            return;
        }

        let mut resp_buf = [0u8; 4096];
        let resp_len = match tls_stream.read(&mut resp_buf).await {
            Ok(n) if n > 0 => n,
            _ => return,
        };

        let resp_str = String::from_utf8_lossy(&resp_buf[..resp_len]);
        info!("Proxmox SPICE CONNECT Proxy Handshake Response:\n{}", resp_str);

        if let Err(e) = local_socket.write_all(&resp_buf[..resp_len]).await {
            error!("Failed to forward SPICE CONNECT response to remote-viewer: {}", e);
            return;
        }

        let _ = tokio::io::copy_bidirectional(&mut local_socket, &mut tls_stream).await;
    }
}
