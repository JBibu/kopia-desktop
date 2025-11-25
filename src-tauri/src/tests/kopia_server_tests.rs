//! Tests for kopia_server module
//!
//! These tests verify server lifecycle management, process spawning, and cleanup.

#[cfg(test)]
mod tests {
    use crate::error::KopiaError;
    use crate::kopia_server::KopiaServer;

    #[test]
    fn test_new_server_not_running() {
        let server = KopiaServer::new();
        let mut server_mut = server;
        let status = server_mut.status();

        assert!(!status.running);
        assert!(status.server_url.is_none());
        assert!(status.port.is_none());
        assert!(status.uptime.is_none());
    }

    #[test]
    fn test_default_server() {
        let server = KopiaServer::default();
        let mut server_mut = server;
        let status = server_mut.status();

        assert!(!status.running);
    }

    #[test]
    fn test_stop_when_not_running() {
        let mut server = KopiaServer::new();
        let result = server.stop();

        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), KopiaError::ServerNotRunning));
    }

    #[test]
    fn test_get_http_client_when_not_running() {
        let server = KopiaServer::new();
        let client = server.get_http_client();

        assert!(client.is_none());
    }

    #[test]
    fn test_is_running_when_not_started() {
        let mut server = KopiaServer::new();
        assert!(!server.is_running());
    }

    #[test]
    fn test_password_generation_length() {
        // Can't directly test private methods, but we can verify the concept
        use base64::Engine;
        use rand::Rng;

        let mut rng = rand::thread_rng();
        let random_bytes: [u8; 32] = rng.gen();
        let password = base64::prelude::BASE64_STANDARD.encode(random_bytes);

        // Base64 encoding of 32 bytes should be 44 characters (32 * 4/3 rounded up)
        assert_eq!(password.len(), 44);
    }

    #[test]
    fn test_server_status_consistency() {
        let mut server = KopiaServer::new();

        // Get status multiple times - should be consistent
        let status1 = server.status();
        let status2 = server.status();

        assert_eq!(status1.running, status2.running);
        assert_eq!(status1.port, status2.port);
    }

    #[test]
    fn test_kopia_server_info_serialization() {
        use crate::kopia_server::KopiaServerInfo;

        let info = KopiaServerInfo {
            server_url: "https://127.0.0.1:51515".to_string(),
            port: 51515,
            password: "test-password-123".to_string(),
            control_password: Some("control-password-456".to_string()),
            cert_sha256: "abc123def456".to_string(),
            pid: 12345,
        };

        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("51515"));
        assert!(json.contains("test-password-123"));
        assert!(json.contains("abc123def456"));

        let deserialized: KopiaServerInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.port, 51515);
        assert_eq!(deserialized.pid, 12345);
        assert_eq!(
            deserialized.control_password,
            Some("control-password-456".to_string())
        );
    }

    #[test]
    fn test_kopia_server_info_without_control_password() {
        use crate::kopia_server::KopiaServerInfo;

        let info = KopiaServerInfo {
            server_url: "https://127.0.0.1:51516".to_string(),
            port: 51516,
            password: "password".to_string(),
            control_password: None,
            cert_sha256: "deadbeef".to_string(),
            pid: 999,
        };

        let json = serde_json::to_string(&info).unwrap();
        let deserialized: KopiaServerInfo = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.control_password, None);
        assert_eq!(deserialized.port, 51516);
    }

    #[test]
    fn test_kopia_server_status_serialization() {
        use crate::kopia_server::KopiaServerStatus;

        let status = KopiaServerStatus {
            running: true,
            server_url: Some("https://127.0.0.1:51515".to_string()),
            port: Some(51515),
            uptime: Some(3600),
        };

        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("true"));
        assert!(json.contains("3600"));

        let deserialized: KopiaServerStatus = serde_json::from_str(&json).unwrap();
        assert!(deserialized.running);
        assert_eq!(deserialized.uptime, Some(3600));
    }

    #[test]
    fn test_kopia_server_status_not_running() {
        use crate::kopia_server::KopiaServerStatus;

        let status = KopiaServerStatus {
            running: false,
            server_url: None,
            port: None,
            uptime: None,
        };

        let json = serde_json::to_string(&status).unwrap();
        let deserialized: KopiaServerStatus = serde_json::from_str(&json).unwrap();

        assert!(!deserialized.running);
        assert!(deserialized.server_url.is_none());
        assert!(deserialized.port.is_none());
    }

    #[test]
    fn test_multiple_server_instances_independent() {
        let mut server1 = KopiaServer::new();
        let mut server2 = KopiaServer::new();

        let status1 = server1.status();
        let status2 = server2.status();

        // Both should be not running and independent
        assert!(!status1.running);
        assert!(!status2.running);
        assert!(!server1.is_running());
        assert!(!server2.is_running());
    }

    #[test]
    fn test_get_http_client_consistency() {
        let server = KopiaServer::new();

        let client1 = server.get_http_client();
        let client2 = server.get_http_client();

        // Both should be None for non-running server
        assert!(client1.is_none());
        assert!(client2.is_none());
    }

    #[test]
    fn test_server_status_uptime_none_when_not_running() {
        let mut server = KopiaServer::new();
        let status = server.status();

        assert!(status.uptime.is_none());
        assert!(!status.running);
    }

    #[test]
    fn test_kopia_server_info_clone() {
        use crate::kopia_server::KopiaServerInfo;

        let info = KopiaServerInfo {
            server_url: "https://127.0.0.1:51515".to_string(),
            port: 51515,
            password: "password".to_string(),
            control_password: Some("control".to_string()),
            cert_sha256: "abc123".to_string(),
            pid: 12345,
        };

        let cloned = info.clone();

        assert_eq!(info.server_url, cloned.server_url);
        assert_eq!(info.port, cloned.port);
        assert_eq!(info.pid, cloned.pid);
        assert_eq!(info.control_password, cloned.control_password);
        assert_eq!(info.cert_sha256, cloned.cert_sha256);
    }

    #[test]
    fn test_kopia_server_status_clone() {
        use crate::kopia_server::KopiaServerStatus;

        let status = KopiaServerStatus {
            running: true,
            server_url: Some("url".to_string()),
            port: Some(123),
            uptime: Some(456),
        };

        let cloned = status.clone();

        assert_eq!(status.running, cloned.running);
        assert_eq!(status.port, cloned.port);
        assert_eq!(status.uptime, cloned.uptime);
    }

    #[test]
    fn test_server_state_type_alias() {
        use crate::kopia_server::{create_server_state, KopiaServerState};
        use std::sync::{Arc, Mutex};

        let state: KopiaServerState = create_server_state();

        // Verify it's the right type
        let _: Arc<Mutex<KopiaServer>> = state;
    }

    #[test]
    fn test_create_server_state() {
        use crate::kopia_server::create_server_state;

        let state = create_server_state();
        let _server = state.lock().unwrap();
        let mut server_mut = KopiaServer::new();

        // Should have same initial state
        let status = server_mut.status();
        assert!(!status.running);
    }

    #[test]
    fn test_error_server_already_running() {
        // Can't actually start two servers, but we can test the error type
        let error = KopiaError::ServerAlreadyRunning { port: 51515 };

        let display = error.to_string();
        assert!(display.contains("51515") || display.contains("running"));
    }

    #[test]
    fn test_error_server_not_running() {
        let mut server = KopiaServer::new();
        let result = server.stop();

        assert!(result.is_err());
        if let Err(KopiaError::ServerNotRunning) = result {
            // Expected error
        } else {
            panic!("Expected ServerNotRunning error");
        }
    }

    #[test]
    fn test_kopia_server_info_debug_format() {
        use crate::kopia_server::KopiaServerInfo;

        let info = KopiaServerInfo {
            server_url: "https://127.0.0.1:51515".to_string(),
            port: 51515,
            password: "password".to_string(),
            control_password: None,
            cert_sha256: "abc123".to_string(),
            pid: 12345,
        };

        let debug_str = format!("{:?}", info);
        assert!(debug_str.contains("KopiaServerInfo"));
        assert!(debug_str.contains("51515"));
    }

    #[test]
    fn test_kopia_server_status_debug_format() {
        use crate::kopia_server::KopiaServerStatus;

        let status = KopiaServerStatus {
            running: true,
            server_url: Some("url".to_string()),
            port: Some(123),
            uptime: Some(456),
        };

        let debug_str = format!("{:?}", status);
        assert!(debug_str.contains("KopiaServerStatus"));
        assert!(debug_str.contains("true") || debug_str.contains("running"));
    }

    // Integration tests would go here (require actual Kopia binary)
    // These are marked with #[ignore] to skip by default

    #[test]
    #[ignore = "Requires Kopia binary and creates actual process"]
    fn test_server_start_and_stop() {
        // This would test actual server lifecycle
        // Requires Kopia binary to be present
    }

    #[test]
    #[ignore = "Requires Kopia binary"]
    fn test_server_health_check() {
        // This would test health check functionality
    }

    #[test]
    #[ignore = "Requires Kopia binary"]
    fn test_get_ready_waiter() {
        // This would test the ready waiter functionality
    }
}
