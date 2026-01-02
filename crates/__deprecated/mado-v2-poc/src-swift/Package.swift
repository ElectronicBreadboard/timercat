// swift-tools-version:5.3
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "MadoSwift",
    platforms: [
        .macOS(.v10_15),
    ],
    products: [
        .library(
            name: "MadoSwift",
            type: .static,
            targets: ["MadoSwift"]),
    ],
    dependencies: [
        .package(url: "https://github.com/Brendonovich/swift-rs", from: "1.0.5")
    ],
    targets: [
        .target(
            name: "MadoSwift",
            dependencies: [
                .product(name: "SwiftRs", package: "swift-rs")
            ],
            path: "Sources")
    ]
)

