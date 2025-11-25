#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    #[cfg(windows)]
    {
        // Check if running as Windows service
        let args: Vec<String> = std::env::args().collect();

        // Check for service mode flag
        if args.len() > 1 && args[1] == "--service" {
            // Running as Windows service
            if let Err(e) = kopia_desktop_lib::run_service() {
                eprintln!("Service error: {}", e);
                std::process::exit(1);
            }
            return;
        }
    }

    // Normal GUI mode
    kopia_desktop_lib::run();
}
