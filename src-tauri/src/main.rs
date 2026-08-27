fn main() {
    // Force WebKitGTK & libsoup on Linux to bypass untrusted self-signed Proxmox VE SSL certificates
    std::env::set_var("WEBKIT_TLS_ERRORS_ALLOW_ALL", "1");
    std::env::set_var("SOUP_SSL_IGNORE_ERRORS", "1");
    std::env::set_var("G_TLS_GNUTLS_PRIORITY", "NORMAL:%COMPAT");
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");

    proxdesk_lib::run();
}
