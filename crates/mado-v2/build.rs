use swift_rs::SwiftLinker;

fn main() {
    // Ensure this matches the versions set in your `Package.swift` file.
    SwiftLinker::new("10.15")
        .with_package("MadoSwift", "./src-swift/")
        .link();
}
