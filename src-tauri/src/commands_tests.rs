//! Tests for commands module
//!
//! These tests verify Tauri command handlers and helper functions.

#[cfg(test)]
mod tests {
    use crate::commands::kopia::get_default_config_dir;

    #[test]
    fn test_get_default_config_dir() {
        let result = get_default_config_dir();
        assert!(result.is_ok());

        let config_dir = result.unwrap();
        assert!(!config_dir.is_empty());

        // Should end with "kopia"
        assert!(config_dir.ends_with("kopia"));

        // Should be absolute path
        #[cfg(unix)]
        assert!(config_dir.starts_with('/'));

        #[cfg(windows)]
        assert!(config_dir.contains(":\\") || config_dir.starts_with("\\\\"));
    }

    #[test]
    fn test_config_dir_creation() {
        // Test that calling it twice doesn't error (directory already exists)
        let result1 = get_default_config_dir();
        let result2 = get_default_config_dir();

        assert!(result1.is_ok());
        assert!(result2.is_ok());
        assert_eq!(result1.unwrap(), result2.unwrap());
    }

    #[cfg(unix)]
    #[test]
    fn test_config_dir_unix_structure() {
        let config_dir = get_default_config_dir().unwrap();

        // On Unix, should be $HOME/.config/kopia
        assert!(config_dir.contains(".config"));
        assert!(config_dir.ends_with("kopia"));
    }

    #[cfg(windows)]
    #[test]
    fn test_config_dir_windows_structure() {
        let config_dir = get_default_config_dir().unwrap();

        // On Windows, should be %USERPROFILE%\AppData\Roaming\kopia
        assert!(config_dir.contains("AppData"));
        assert!(config_dir.contains("Roaming"));
        assert!(config_dir.ends_with("kopia"));
    }
}
