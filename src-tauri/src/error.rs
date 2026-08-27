use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppErrorResponse {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
}

#[derive(Debug)]
pub enum AppError {
    Authentication(String),
    PermissionDenied(String),
    NotFound(String),
    ServerError(String),
    Network(String),
    Timeout(String),
    CertificateUntrusted {
        host: String,
        fingerprint: String,
        subject: String,
        issuer: String,
        details: String,
    },
    InvalidConfiguration(String),
    CredentialStorage(String),
    ProxmoxApi {
        status_code: u16,
        message: String,
    },
    Io(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Authentication(msg) => write!(f, "Authentication Failed: {}", msg),
            AppError::PermissionDenied(msg) => write!(f, "Permission Denied: {}", msg),
            AppError::NotFound(msg) => write!(f, "Resource Not Found: {}", msg),
            AppError::ServerError(msg) => write!(f, "Server Error: {}", msg),
            AppError::Network(msg) => write!(f, "Network Error: {}", msg),
            AppError::Timeout(msg) => write!(f, "Connection Timed Out: {}", msg),
            AppError::CertificateUntrusted { host, fingerprint, .. } => {
                write!(f, "TLS Certificate Untrusted for {}: {}", host, fingerprint)
            }
            AppError::InvalidConfiguration(msg) => write!(f, "Invalid Configuration: {}", msg),
            AppError::CredentialStorage(msg) => write!(f, "Credential Storage Error: {}", msg),
            AppError::ProxmoxApi { status_code, message } => {
                write!(f, "Proxmox API Error ({}) : {}", status_code, message)
            }
            AppError::Io(msg) => write!(f, "IO Error: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl From<AppError> for AppErrorResponse {
    fn from(err: AppError) -> Self {
        match err {
            AppError::Authentication(details) => AppErrorResponse {
                code: "AUTH_FAILED".into(),
                message: "Authentication failed. Please check your API token credentials.".into(),
                details: Some(details),
            },
            AppError::PermissionDenied(details) => AppErrorResponse {
                code: "PERMISSION_DENIED".into(),
                message: "Permission denied. Your API token lacks privileges for this action.".into(),
                details: Some(details),
            },
            AppError::NotFound(details) => AppErrorResponse {
                code: "NOT_FOUND".into(),
                message: "The requested Proxmox resource was not found.".into(),
                details: Some(details),
            },
            AppError::ServerError(details) => AppErrorResponse {
                code: "SERVER_ERROR".into(),
                message: "Proxmox server returned an internal error.".into(),
                details: Some(details),
            },
            AppError::Network(details) => AppErrorResponse {
                code: "NETWORK_ERROR".into(),
                message: "Unable to connect to the Proxmox server.".into(),
                details: Some(details),
            },
            AppError::Timeout(details) => AppErrorResponse {
                code: "TIMEOUT".into(),
                message: "Connection to Proxmox server timed out.".into(),
                details: Some(details),
            },
            AppError::CertificateUntrusted { host, fingerprint, subject, issuer, details } => AppErrorResponse {
                code: "CERT_UNTRUSTED".into(),
                message: format!("TLS Certificate for {} is untrusted.", host),
                details: Some(format!("Fingerprint: {}\nSubject: {}\nIssuer: {}\n{}", fingerprint, subject, issuer, details)),
            },
            AppError::InvalidConfiguration(details) => AppErrorResponse {
                code: "INVALID_CONFIG".into(),
                message: "Invalid connection profile configuration.".into(),
                details: Some(details),
            },
            AppError::CredentialStorage(details) => AppErrorResponse {
                code: "CREDENTIAL_STORAGE_ERROR".into(),
                message: "Failed to access system secure credential storage.".into(),
                details: Some(details),
            },
            AppError::ProxmoxApi { status_code, message } => AppErrorResponse {
                code: format!("API_ERROR_{}", status_code),
                message: format!("Proxmox API Error ({})", status_code),
                details: Some(message),
            },
            AppError::Io(details) => AppErrorResponse {
                code: "IO_ERROR".into(),
                message: "System IO error occurred.".into(),
                details: Some(details),
            },
        }
    }
}

// Convert AppError into String for Tauri IPC serialize
impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        let resp: AppErrorResponse = err.into();
        serde_json::to_string(&resp).unwrap_or(resp.message)
    }
}
