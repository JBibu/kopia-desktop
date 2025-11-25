//! Tests for system commands module
//!
//! These tests verify system utility functions.

#[cfg(test)]
mod tests {
    use crate::commands::system::{get_current_user, get_system_info};

    #[tokio::test]
    async fn test_get_system_info() {
        let result = get_system_info().await;
        assert!(result.is_ok());

        let info = result.unwrap();

        // Should have OS
        assert!(!info.os.is_empty());
        assert!(matches!(
            info.os.as_str(),
            "linux" | "windows" | "macos" | "freebsd" | "openbsd" | "netbsd"
        ));

        // Should have version
        assert!(!info.version.is_empty());

        // Should have architecture
        assert!(!info.arch.is_empty());
        assert!(matches!(
            info.arch.as_str(),
            "x86_64" | "aarch64" | "arm" | "x86" | "riscv64"
        ));
    }

    #[tokio::test]
    async fn test_get_current_user() {
        let result = get_current_user().await;
        assert!(result.is_ok());

        let (username, hostname) = result.unwrap();

        // Username should not be empty
        assert!(!username.is_empty());

        // Username should be alphanumeric or contain common username chars
        assert!(username
            .chars()
            .all(|c| c.is_alphanumeric() || c == '_' || c == '-' || c == '.'));

        // Hostname should not be empty
        assert!(!hostname.is_empty());
    }

    #[tokio::test]
    async fn test_system_info_consistency() {
        // Multiple calls should return the same info
        let info1 = get_system_info().await.unwrap();
        let info2 = get_system_info().await.unwrap();

        assert_eq!(info1.os, info2.os);
        assert_eq!(info1.version, info2.version);
        assert_eq!(info1.arch, info2.arch);
    }

    #[tokio::test]
    async fn test_current_user_consistency() {
        // Multiple calls should return the same user
        let (username1, hostname1) = get_current_user().await.unwrap();
        let (username2, hostname2) = get_current_user().await.unwrap();

        assert_eq!(username1, username2);
        assert_eq!(hostname1, hostname2);
    }

    #[cfg(target_os = "linux")]
    #[tokio::test]
    async fn test_linux_platform() {
        let info = get_system_info().await.unwrap();
        assert_eq!(info.os, "linux");
    }

    #[cfg(target_os = "windows")]
    #[tokio::test]
    async fn test_windows_platform() {
        let info = get_system_info().await.unwrap();
        assert_eq!(info.os, "windows");
    }

    #[cfg(target_os = "macos")]
    #[tokio::test]
    async fn test_macos_platform() {
        let info = get_system_info().await.unwrap();
        assert_eq!(info.os, "macos");
    }
}
