use sha2::{Digest, Sha256};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CertificateInfo {
    pub subject: String,
    pub issuer: String,
    pub fingerprint: String, // Hex string with colons: XX:XX:XX...
    pub expires_at: Option<String>,
    pub host: String,
}

pub struct CertificateVerifier;

impl CertificateVerifier {
    /// Formats a raw 32-byte SHA-256 hash into a standard fingerprint string:
    /// e.g. "A1:B2:C3:D4:..."
    pub fn format_fingerprint(bytes: &[u8]) -> String {
        bytes
            .iter()
            .map(|b| format!("{:02X}", b))
            .collect::<Vec<String>>()
            .join(":")
    }

    /// Calculates SHA-256 fingerprint from raw DER certificate bytes
    pub fn calculate_fingerprint(der_bytes: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(der_bytes);
        let result = hasher.finalize();
        Self::format_fingerprint(&result)
    }

    /// Verifies if a presented certificate fingerprint matches the saved trusted fingerprint
    pub fn is_trusted(presented_fingerprint: &str, trusted_fingerprints: &[String]) -> bool {
        let clean_presented = presented_fingerprint.replace([':', ' '], "").to_uppercase();
        trusted_fingerprints.iter().any(|tf| {
            let clean_trusted = tf.replace([':', ' '], "").to_uppercase();
            clean_presented == clean_trusted
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_fingerprint() {
        let bytes = vec![0x12, 0xab, 0xcd, 0xef];
        assert_eq!(CertificateVerifier::format_fingerprint(&bytes), "12:AB:CD:EF");
    }

    #[test]
    fn test_is_trusted() {
        let trusted = vec!["12:AB:CD:EF".to_string()];
        assert!(CertificateVerifier::is_trusted("12:ab:cd:ef", &trusted));
        assert!(CertificateVerifier::is_trusted("12abcdEF", &trusted));
        assert!(!CertificateVerifier::is_trusted("99:99:99:99", &trusted));
    }
}
