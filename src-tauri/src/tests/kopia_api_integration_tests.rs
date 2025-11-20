//! Integration tests for Kopia Binary API
//!
//! These tests verify actual Kopia server interactions through the binary.
//! They require a Kopia binary to be present in the bin/ folder.
//!
//! # Running Tests
//!
//! ```bash
//! KOPIA_PATH=/path/to/bin/kopia-linux-x64 cargo test --lib kopia_api_integration -- --ignored --test-threads=1
//! ```
//!
//! # Test Coverage
//!
//! - **Server Lifecycle** (7 tests): Start, stop, status, HTTP client availability, URL retrieval, uptime tracking
//! - **Repository API** (2 tests): Algorithms endpoint, status endpoint (not connected)
//! - **Error Handling** (3 tests): Stop when not running, double start, operations requiring running server
//!
//! Total: **10 integration tests** covering core Kopia server functionality
//!
//! # Important Notes
//!
//! - Tests run sequentially (`--test-threads=1`) to avoid port conflicts
//! - `KOPIA_PATH` environment variable must point to the Kopia binary
//! - Each test uses a unique temporary config directory to avoid lock conflicts
//! - Kopia 0.21.1 does not support `--shutdown-on-stdin`, so servers are terminated via process kill

#[cfg(test)]
mod tests {
    use crate::error::KopiaError;
    use crate::kopia_server::KopiaServer;
    use std::fs;
    use tempfile::TempDir;

    /// Test helper to create a temporary directory for repositories
    #[allow(dead_code)]
    fn create_test_repo_dir() -> TempDir {
        TempDir::new().expect("Failed to create temp directory")
    }

    /// Test helper to clean up test repository
    #[allow(dead_code)]
    fn cleanup_test_repo(repo_path: &str) {
        let _ = fs::remove_dir_all(repo_path);
    }

    /// Test helper to get config directory
    /// Creates a unique temporary directory for each test to avoid lock conflicts
    fn get_test_config_dir() -> TempDir {
        TempDir::new().expect("Failed to create temp config directory")
    }

    /// Test helper to wait for server health
    async fn wait_for_server_health(server: &KopiaServer, max_attempts: u32) -> bool {
        for attempt in 0..max_attempts {
            if let Some(client) = server.get_http_client() {
                // Try a simple health check
                let url = format!(
                    "{}/api/v1/repo/status",
                    server.get_server_url().unwrap_or_default()
                );
                match client.get(&url).send().await {
                    Ok(response) => {
                        if response.status().is_success() || response.status().as_u16() == 404 {
                            // 404 is OK - means server is up but no repo connected
                            return true;
                        }
                        log::debug!(
                            "Attempt {}: Server returned status {}",
                            attempt,
                            response.status()
                        );
                    }
                    Err(e) => {
                        log::debug!("Attempt {}: Failed to connect: {}", attempt, e);
                    }
                }
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        }
        false
    }

    // ============================================================================
    // Server Lifecycle Tests
    // ============================================================================

    #[tokio::test]
    #[ignore = "Requires Kopia binary - Run with: cargo test -- --ignored --test-threads=1"]
    async fn test_server_start_and_stop_integration() {
        let config_dir_temp = get_test_config_dir();
        let config_dir = config_dir_temp.path().to_str().expect("Invalid temp path");
        let mut server = KopiaServer::new();

        // Server should not be running initially
        assert!(!server.is_running());

        // Start server
        let start_result = server.start(config_dir);
        assert!(
            start_result.is_ok(),
            "Failed to start server: {:?}",
            start_result.err()
        );

        let server_info = start_result.unwrap();
        assert!(server_info.port > 0, "Server port should be > 0");
        assert!(
            !server_info.http_password.is_empty(),
            "Password should not be empty"
        );
        assert!(
            server_info.server_url.starts_with("https://"),
            "Server URL should use HTTPS"
        );

        // Give server extra time to initialize
        tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;

        // Check if server is still running
        let is_running = server.is_running();
        assert!(is_running, "Server should be running after 2s");

        // Get ready waiter and wait for server
        let ready_waiter = server.get_ready_waiter();
        assert!(ready_waiter.is_ok(), "Should get ready waiter");

        let wait_result = ready_waiter.unwrap().await;
        assert!(
            wait_result.is_ok(),
            "Server should become ready: {:?}",
            wait_result.err()
        );

        // Get status
        let status = server.status();
        assert!(status.running, "Status should show running");
        assert!(status.server_url.is_some(), "Status should have server URL");
        assert!(status.port.is_some(), "Status should have port");

        // Stop server
        let stop_result = server.stop();
        assert!(
            stop_result.is_ok(),
            "Failed to stop server: {:?}",
            stop_result.err()
        );

        // Verify server is stopped
        assert!(!server.is_running(), "Server should not be running");
    }

    #[tokio::test]
    #[ignore = "Requires Kopia binary - Run with: cargo test -- --ignored --test-threads=1"]
    async fn test_server_status_when_not_running() {
        let mut server = KopiaServer::new();
        let status = server.status();

        assert!(!status.running, "Server should not be running");
        assert!(status.server_url.is_none(), "Server URL should be None");
        assert!(status.port.is_none(), "Port should be None");
        assert!(status.uptime.is_none(), "Uptime should be None");
    }

    #[tokio::test]
    #[ignore = "Requires Kopia binary - Run with: cargo test -- --ignored --test-threads=1"]
    async fn test_server_http_client_availability() {
        let config_dir_temp = get_test_config_dir();
        let config_dir = config_dir_temp.path().to_str().expect("Invalid temp path");
        let mut server = KopiaServer::new();

        // Client should be None when not running
        assert!(
            server.get_http_client().is_none(),
            "HTTP client should be None when not running"
        );

        // Start server
        let _ = server.start(config_dir).expect("Failed to start server");
        let ready_waiter = server
            .get_ready_waiter()
            .expect("Failed to get ready waiter");
        ready_waiter.await.expect("Server failed to become ready");

        // Client should be available when running
        assert!(
            server.get_http_client().is_some(),
            "HTTP client should be available when running"
        );

        // Stop server
        let _ = server.stop();

        // Client should be None again
        assert!(
            server.get_http_client().is_none(),
            "HTTP client should be None after stop"
        );
    }

    #[tokio::test]
    #[ignore = "Requires Kopia binary - Run with: cargo test -- --ignored --test-threads=1"]
    async fn test_server_url_when_running() {
        let config_dir_temp = get_test_config_dir();
        let config_dir = config_dir_temp.path().to_str().expect("Invalid temp path");
        let mut server = KopiaServer::new();

        // URL should be None when not running
        assert!(
            server.get_server_url().is_none(),
            "Server URL should be None when not running"
        );

        // Start server
        let server_info = server.start(config_dir).expect("Failed to start server");
        let ready_waiter = server
            .get_ready_waiter()
            .expect("Failed to get ready waiter");
        let _ = ready_waiter.await;

        // URL should match the server info
        let url = server.get_server_url();
        assert!(url.is_some(), "Server URL should be available");
        assert_eq!(url.unwrap(), server_info.server_url, "URLs should match");

        // Stop server
        let _ = server.stop();
    }

    // ============================================================================
    // Repository API Tests (via HTTP client)
    // ============================================================================

    #[tokio::test]
    #[ignore = "Requires Kopia binary - Run with: cargo test -- --ignored --test-threads=1"]
    async fn test_repository_algorithms_api() {
        let config_dir_temp = get_test_config_dir();
        let config_dir = config_dir_temp.path().to_str().expect("Invalid temp path");
        let mut server = KopiaServer::new();

        // Start server
        let _ = server.start(config_dir).expect("Failed to start server");
        let ready_waiter = server
            .get_ready_waiter()
            .expect("Failed to get ready waiter");
        let _ = ready_waiter.await;

        // Wait for server to be healthy (60 attempts * 500ms = 30 seconds max)
        assert!(
            wait_for_server_health(&server, 60).await,
            "Server did not become healthy"
        );

        // Get HTTP client and test algorithms endpoint
        let client = server.get_http_client().expect("No HTTP client");
        let server_url = server.get_server_url().expect("No server URL");

        let url = format!("{}/api/v1/repo/algorithms", server_url);
        let response = client.get(&url).send().await;

        assert!(
            response.is_ok(),
            "Algorithms API request failed: {:?}",
            response.err()
        );
        let response = response.unwrap();
        assert!(
            response.status().is_success(),
            "Algorithms API returned error: {}",
            response.status()
        );

        // Parse response
        let algorithms: serde_json::Value = response
            .json()
            .await
            .expect("Failed to parse algorithms JSON");

        // Verify structure
        assert!(
            algorithms.get("defaultHash").is_some(),
            "Should have defaultHash"
        );
        assert!(
            algorithms.get("defaultEncryption").is_some(),
            "Should have defaultEncryption"
        );
        assert!(algorithms.get("hash").is_some(), "Should have hash array");
        assert!(
            algorithms.get("encryption").is_some(),
            "Should have encryption array"
        );

        // Stop server
        let _ = server.stop();
    }

    #[tokio::test]
    #[ignore = "Requires Kopia binary - Run with: cargo test -- --ignored --test-threads=1"]
    async fn test_repository_status_not_connected() {
        let config_dir_temp = get_test_config_dir();
        let config_dir = config_dir_temp.path().to_str().expect("Invalid temp path");
        let mut server = KopiaServer::new();

        // Start server
        let _ = server.start(config_dir).expect("Failed to start server");
        let ready_waiter = server
            .get_ready_waiter()
            .expect("Failed to get ready waiter");
        let _ = ready_waiter.await;

        // Wait for server to be healthy (60 attempts * 500ms = 30 seconds max)
        assert!(
            wait_for_server_health(&server, 60).await,
            "Server did not become healthy"
        );

        // Get HTTP client and test status endpoint
        let client = server.get_http_client().expect("No HTTP client");
        let server_url = server.get_server_url().expect("No server URL");

        let url = format!("{}/api/v1/repo/status", server_url);
        let response = client.get(&url).send().await;

        assert!(
            response.is_ok(),
            "Status API request failed: {:?}",
            response.err()
        );
        let response = response.unwrap();

        // Should return 404 or success with connected=false
        if response.status().is_success() {
            let status: serde_json::Value =
                response.json().await.expect("Failed to parse status JSON");
            let connected = status
                .get("connected")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            assert!(!connected, "Repository should not be connected initially");
        } else {
            assert_eq!(
                response.status().as_u16(),
                404,
                "Should return 404 when no repo connected"
            );
        }

        // Stop server
        let _ = server.stop();
    }

    // ============================================================================
    // Error Handling Tests
    // ============================================================================

    #[tokio::test]
    #[ignore = "Requires Kopia binary - Run with: cargo test -- --ignored --test-threads=1"]
    async fn test_stop_server_when_not_running() {
        let mut server = KopiaServer::new();

        // Try to stop server that's not running
        let stop_result = server.stop();
        assert!(
            stop_result.is_err(),
            "Should fail when stopping non-running server"
        );
        assert!(
            matches!(stop_result.unwrap_err(), KopiaError::ServerNotRunning),
            "Should return ServerNotRunning error"
        );
    }

    #[tokio::test]
    #[ignore = "Requires Kopia binary - Run with: cargo test -- --ignored --test-threads=1"]
    async fn test_start_server_twice() {
        let config_dir_temp = get_test_config_dir();
        let config_dir = config_dir_temp.path().to_str().expect("Invalid temp path");
        let mut server = KopiaServer::new();

        // Start server first time
        let start1 = server.start(config_dir);
        assert!(start1.is_ok(), "First start should succeed");

        // Try to start again - should fail
        let start2 = server.start(config_dir);
        assert!(start2.is_err(), "Second start should fail");

        if let Err(KopiaError::ServerAlreadyRunning { port }) = start2 {
            assert!(port > 0, "Error should include port number");
        } else {
            panic!("Expected ServerAlreadyRunning error");
        }

        // Cleanup
        let _ = server.stop();
    }

    #[tokio::test]
    #[ignore = "Requires Kopia binary - Run with: cargo test -- --ignored --test-threads=1"]
    async fn test_operations_require_running_server() {
        let server = KopiaServer::new();

        // HTTP client should be None
        assert!(
            server.get_http_client().is_none(),
            "HTTP client should not be available"
        );
        assert!(
            server.get_server_url().is_none(),
            "Server URL should not be available"
        );

        // Ready waiter should fail
        let ready_waiter = server.get_ready_waiter();
        assert!(
            ready_waiter.is_err(),
            "Ready waiter should fail when server not running"
        );
    }

    // ============================================================================
    // Server Lifecycle Edge Cases
    // ============================================================================

    #[tokio::test]
    #[ignore = "Requires Kopia binary - Run with: cargo test -- --ignored --test-threads=1"]
    async fn test_server_uptime_tracking() {
        let config_dir_temp = get_test_config_dir();
        let config_dir = config_dir_temp.path().to_str().expect("Invalid temp path");
        let mut server = KopiaServer::new();

        // Uptime should be None before start
        let status1 = server.status();
        assert!(
            status1.uptime.is_none(),
            "Uptime should be None when not running"
        );

        // Start server
        let _ = server.start(config_dir).expect("Failed to start server");
        let _ = server.get_ready_waiter().unwrap().await;

        // Wait a bit for uptime to accumulate
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        // Uptime should be Some and > 0
        let status2 = server.status();
        assert!(status2.uptime.is_some(), "Uptime should be tracked");
        assert!(
            status2.uptime.unwrap() >= 1,
            "Uptime should be at least 1 second"
        );

        // Stop server
        let _ = server.stop();

        // Uptime should be None again
        let status3 = server.status();
        assert!(status3.uptime.is_none(), "Uptime should be None after stop");
    }
}
