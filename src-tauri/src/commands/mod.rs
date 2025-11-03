pub mod kopia;
pub mod system;
pub mod websocket;

// Re-export all commands for easy registration
pub use kopia::*;
pub use system::*;
pub use websocket::*;
