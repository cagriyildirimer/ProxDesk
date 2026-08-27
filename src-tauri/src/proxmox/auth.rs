use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Clone, Serialize, Deserialize)]
pub struct ProxmoxAuth {
    pub user: String,
    pub realm: String,
    pub token_id: String,
    #[serde(skip_serializing)]
    pub token_secret: String,
}

impl ProxmoxAuth {
    pub fn new(user: impl Into<String>, realm: impl Into<String>, token_id: impl Into<String>, token_secret: impl Into<String>) -> Self {
        Self {
            user: user.into(),
            realm: realm.into(),
            token_id: token_id.into(),
            token_secret: token_secret.into(),
        }
    }

    /// Generates the standard Proxmox VE API Token Authorization header string:
    /// `PVEAPIToken=<user>@<realm>!<tokenid>=<secret>`
    pub fn header_value(&self) -> String {
        format!(
            "PVEAPIToken={}@{}!{}={}",
            self.user, self.realm, self.token_id, self.token_secret
        )
    }
}

/// Custom Debug implementation ensuring token_secret is ALWAYS REDACTED
impl fmt::Debug for ProxmoxAuth {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ProxmoxAuth")
            .field("user", &self.user)
            .field("realm", &self.realm)
            .field("token_id", &self.token_id)
            .field("token_secret", &"<REDACTED>")
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_header_formatting() {
        let auth = ProxmoxAuth::new("proxdesk", "pve", "desktop", "12345678-abcd-ef01-2345-6789abcdef01");
        assert_eq!(
            auth.header_value(),
            "PVEAPIToken=proxdesk@pve!desktop=12345678-abcd-ef01-2345-6789abcdef01"
        );
    }

    #[test]
    fn test_auth_debug_redaction() {
        let auth = ProxmoxAuth::new("proxdesk", "pve", "desktop", "super_secret_token_123");
        let debug_str = format!("{:?}", auth);
        assert!(!debug_str.contains("super_secret_token_123"));
        assert!(debug_str.contains("<REDACTED>"));
    }
}
