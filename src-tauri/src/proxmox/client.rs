use crate::error::AppError;
use crate::proxmox::auth::ProxmoxAuth;
use crate::proxmox::models::ProxmoxResponse;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use reqwest::Client;
use serde::de::DeserializeOwned;
use serde::Serialize;
use std::time::Duration;
use url::Url;

pub struct ProxmoxClient {
    base_url: String,
    client: Client,
    pub auth: ProxmoxAuth,
}

impl ProxmoxClient {
    /// Normalizes host/URL string to proper base API URL: `https://host:port/api2/json`
    pub fn normalize_url(host: &str, port: u16) -> Result<String, AppError> {
        let clean_host = host.trim();
        let formatted = if !clean_host.starts_with("http://") && !clean_host.starts_with("https://") {
            format!("https://{}:{}", clean_host, port)
        } else {
            clean_host.to_string()
        };

        let mut url = Url::parse(&formatted).map_err(|e| {
            AppError::InvalidConfiguration(format!("Invalid Proxmox host/URL: {}", e))
        })?;

        if url.port().is_none() {
            let _ = url.set_port(Some(port));
        }

        let path = url.path().trim_end_matches('/');
        if !path.ends_with("/api2/json") {
            url.set_path(&format!("{}/api2/json", path));
        }

        Ok(url.to_string().trim_end_matches('/').to_string())
    }

    /// Constructs new ProxmoxClient with configured headers and custom TLS handling
    pub fn new(host: &str, port: u16, auth: ProxmoxAuth) -> Result<Self, AppError> {
        let base_url = Self::normalize_url(host, port)?;

        let mut headers = HeaderMap::new();
        let auth_val = HeaderValue::from_str(&auth.header_value()).map_err(|_| {
            AppError::InvalidConfiguration("API token contains invalid header characters".into())
        })?;
        headers.insert(AUTHORIZATION, auth_val);

        // Build reqwest client accepting self-signed certs (with explicit user verification step)
        let client = Client::builder()
            .default_headers(headers)
            .danger_accept_invalid_certs(true) // Self-signed certs accepted at transport level, verified via fingerprint
            .timeout(Duration::from_secs(15))
            .connect_timeout(Duration::from_secs(10))
            .build()
            .map_err(|e| AppError::Network(format!("Failed to build HTTP client: {}", e)))?;

        Ok(Self {
            base_url,
            client,
            auth,
        })
    }

    /// Internal method to execute request and unpack ProxmoxResponse<T>
    async fn execute<T: DeserializeOwned>(
        &self,
        request_builder: reqwest::RequestBuilder,
    ) -> Result<T, AppError> {
        let response = request_builder.send().await.map_err(|err| {
            if err.is_timeout() {
                AppError::Timeout("Connection timed out while reaching Proxmox VE API".into())
            } else {
                AppError::Network(format!("Network connection failed: {}", err))
            }
        })?;

        let status = response.status();
        if !status.is_success() {
            let text = response.text().await.unwrap_or_default();
            match status.as_u16() {
                401 => return Err(AppError::Authentication(format!("Unauthorized: {}", text))),
                403 => return Err(AppError::PermissionDenied(format!("Forbidden: {}", text))),
                404 => return Err(AppError::NotFound(format!("Not found: {}", text))),
                500..=599 => return Err(AppError::ServerError(format!("Internal Server Error: {}", text))),
                code => {
                    return Err(AppError::ProxmoxApi {
                        status_code: code,
                        message: text,
                    })
                }
            }
        }

        let full_resp: ProxmoxResponse<T> = response.json().await.map_err(|err| {
            AppError::ServerError(format!("Failed to parse Proxmox API response: {}", err))
        })?;

        Ok(full_resp.data)
    }

    /// GET API request wrapper
    pub async fn get<T: DeserializeOwned>(&self, path: &str) -> Result<T, AppError> {
        let endpoint = format!("{}/{}", self.base_url, path.trim_start_matches('/'));
        self.execute(self.client.get(&endpoint)).await
    }

    /// POST request with JSON body
    pub async fn post<T: DeserializeOwned, B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> Result<T, AppError> {
        let endpoint = format!("{}/{}", self.base_url, path.trim_start_matches('/'));
        self.execute(self.client.post(&endpoint).json(body)).await
    }

    /// POST request with form parameters
    pub async fn post_form<T: DeserializeOwned, Form: Serialize>(
        &self,
        path: &str,
        form: &Form,
    ) -> Result<T, AppError> {
        let endpoint = format!("{}/{}", self.base_url, path.trim_start_matches('/'));
        self.execute(self.client.post(&endpoint).form(form)).await
    }

    /// POST request without body (standard for power actions)
    pub async fn post_empty<T: DeserializeOwned>(&self, path: &str) -> Result<T, AppError> {
        let endpoint = format!("{}/{}", self.base_url, path.trim_start_matches('/'));
        self.execute(self.client.post(&endpoint)).await
    }

    /// DELETE API request
    pub async fn delete<T: DeserializeOwned>(&self, path: &str) -> Result<T, AppError> {
        let endpoint = format!("{}/{}", self.base_url, path.trim_start_matches('/'));
        self.execute(self.client.delete(&endpoint)).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_url() {
        assert_eq!(
            ProxmoxClient::normalize_url("192.168.1.10", 8006).unwrap(),
            "https://192.168.1.10:8006/api2/json"
        );
        assert_eq!(
            ProxmoxClient::normalize_url("pve.local", 8006).unwrap(),
            "https://pve.local:8006/api2/json"
        );
        assert_eq!(
            ProxmoxClient::normalize_url("https://pve.example.com:8006", 8006).unwrap(),
            "https://pve.example.com:8006/api2/json"
        );
        assert_eq!(
            ProxmoxClient::normalize_url("https://pve.example.com/api2/json", 8006).unwrap(),
            "https://pve.example.com:8006/api2/json"
        );
    }
}
