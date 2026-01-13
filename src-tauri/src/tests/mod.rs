//! Test modules for Kopia Desktop
//!
//! Organized test suite covering all aspects of the application:
//! - Error handling (advanced_error_tests, error_edge_cases_tests)
//! - Command functionality (commands_tests, kopia_commands_tests)
//! - Concurrency (concurrency_tests)
//! - Integration (integration_tests, kopia_api_integration_tests)
//! - Server functionality (kopia_server_tests)
//! - System utilities (system_tests)
//! - Type definitions (types_tests, types_advanced_tests, types_unit_tests)

mod advanced_error_tests;
mod commands_tests;
mod concurrency_tests;
mod error_edge_cases_tests;
mod integration_tests;
mod kopia_api_integration_tests;
mod kopia_commands_tests;
mod kopia_server_tests;
mod system_tests;
mod types_advanced_tests;
mod types_tests;
mod types_unit_tests;
