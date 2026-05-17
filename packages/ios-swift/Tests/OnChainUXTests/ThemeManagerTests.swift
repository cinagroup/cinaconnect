import XCTest
@testable import OnChainUX

/// Tests for theme switching and theme color token injection.
/// iOS uses `ThemeColors` structs and `ThemeMode` enums defined in OnChainUX.swift.
final class ThemeManagerTests: XCTestCase {

    // MARK: - Theme Mode Defaults

    func testOnChainUXDefaultThemeIsDark() {
        let sdk = OnChainUX.shared
        sdk.configure(with: OnChainUXConfig(
            projectId: "test",
            chains: [.ethereum]
        ))
        XCTAssertEqual(sdk.themeMode, .dark)
    }

    func testThemeModeLightCaseCount() {
        XCTAssertEqual(ThemeMode.allCases.count, 3)
        XCTAssertTrue(ThemeMode.allCases.contains(.light))
        XCTAssertTrue(ThemeMode.allCases.contains(.dark))
        XCTAssertTrue(ThemeMode.allCases.contains(.minimal))
    }

    // MARK: - Theme Switching

    func testSetThemeModeUpdatesColors() {
        let sdk = OnChainUX.shared
        let config = OnChainUXConfig(
            projectId: "test",
            chains: [.ethereum],
            themeMode: .dark
        )
        sdk.configure(with: config)

        let initialColors = sdk.themeColors

        // Switch to light
        sdk.themeMode = .light
        let lightColors = sdk.themeColors

        // Verify colors changed
        XCTAssertNotEqual(initialColors.accent500, lightColors.accent500)
    }

    func testThemeColorsLightMode() {
        let light = ThemeColors(mode: .light)
        XCTAssertEqual(light.accent500, "#2563EB")
        XCTAssertEqual(light.bgPrimary, "#FFFFFF")
    }

    func testThemeColorsMinimalMode() {
        let minimal = ThemeColors(mode: .minimal)
        XCTAssertEqual(minimal.accent500, "#94A3B8")
        XCTAssertEqual(minimal.bgPrimary, "#000000")
    }

    // MARK: - Token Injection

    func testThemeColorsDarkTokenInjection() {
        let dark = ThemeColors(mode: .dark)
        // Verify all dark-mode color tokens are properly set
        XCTAssertNotEqual(dark.accent500, "")
        XCTAssertNotEqual(dark.bgPrimary, "")
        XCTAssertNotEqual(dark.bgSecondary, "")
        XCTAssertNotEqual(dark.bgCard, "")
        XCTAssertNotEqual(dark.textPrimary, "")
        XCTAssertNotEqual(dark.textSecondary, "")
        XCTAssertNotEqual(dark.textTertiary, "")
        XCTAssertNotEqual(dark.border, "")
        XCTAssertNotEqual(dark.success, "")
        XCTAssertNotEqual(dark.warning, "")
        XCTAssertNotEqual(dark.error, "")
    }

    func testThemeColorsMinimalTokenInjection() {
        let minimal = ThemeColors(mode: .minimal)
        XCTAssertNotEqual(minimal.accent500, "")
        XCTAssertNotEqual(minimal.bgPrimary, "")
        XCTAssertNotEqual(minimal.bgSecondary, "")
        XCTAssertNotEqual(minimal.bgCard, "")
        XCTAssertNotEqual(minimal.textPrimary, "")
        XCTAssertNotEqual(minimal.textSecondary, "")
        XCTAssertNotEqual(minimal.textTertiary, "")
        XCTAssertNotEqual(minimal.border, "")
        XCTAssertNotEqual(minimal.success, "")
        XCTAssertNotEqual(minimal.warning, "")
        XCTAssertNotEqual(minimal.error, "")
    }
}
