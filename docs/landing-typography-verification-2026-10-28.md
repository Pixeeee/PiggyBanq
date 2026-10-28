# Landing typography across PiggyBanq

The landing page's Grandstander headings and Geist body font now continue through web authentication and every dashboard route, and through the native sign-in, recovery, dashboard and feature screens. Existing sizes, colors, local signing and payment behavior are retained. Public addresses, wallet backups and other selectable native transaction details use Geist Mono for character clarity.

Web uses the existing Next font assets and one shared stylesheet. Native uses explicit Text/TextInput components that preserve props, refs and font scaling without changing React Native defaults or icon fonts. Static fonts are bundled with their SIL Open Font Licenses; no runtime font download is required. Semantic heading roles select Grandstander and nested heading text inherits that role.

Validation on 2026-10-28:
- Node suite: 161 passed, 9 optional tests skipped, zero failures.
- Production web build, native TypeScript and Android release/instrumentation builds passed.
- Web sign-in/create-password layouts and font families verified at desktop and 390px phone widths.
- Web dashboard regression passed on desktop/phone in both themes, with explicit heading and button font checks, all feature routes, overflow, dialogs and reduced motion.
- Android emulator smoke checked unlock, dashboard, Save/Send/Swap/Agent/Sync/You navigation, both themes and receive sheets with reduced motion. No payment was submitted.

Native screenshots remain protected. Physical devices, iOS and enlarged accessibility font sizes were not visually tested. The APK is a development-signed Testnet review build.
