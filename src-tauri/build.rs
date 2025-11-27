use std::path::Path;

fn main() {
    // Check if Kopia binaries exist
    let bin_dir = Path::new("../bin");
    let has_binaries = bin_dir.exists()
        && std::fs::read_dir(bin_dir)
            .ok()
            .and_then(|mut entries| entries.next())
            .is_some();

    if !has_binaries {
        println!("cargo:warning=⚠️  Kopia binaries not found in bin/ directory");
        println!("cargo:warning=Run 'pnpm kopia:download' to download them");
        println!("cargo:warning=Note: This is a warning, not an error. Build will continue.");
    }

    tauri_build::build();
}
