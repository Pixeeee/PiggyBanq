# Clean dashboard and native motion — 2026-10-27

Adapted the supplied dashboard reference to PiggyBanq's rose, cream and warm
neutral palette. Web has a framed dashboard, compact sidebar, rose balance card,
received/sent chart, savings cards and existing activity/actions. Native follows
the same card language with a stacked layout and persistent tab navigation.
Dark mode uses warm plum surfaces. No database migration or new dependency.

Motion follows the fade, direction, speed and grouping principles in
[Transition animations: a practical guide](https://uxdesign.cc/transition-animations-a-practical-guide-5dba4d42f659):
web card entrances run320ms with short stagger; native screen/card movement uses
240ms fades and8px translation, native-driver press springs and native sheet slides.
Web honors prefers-reduced-motion; native reads/subscribes to the system setting.
Preference resolution never replays entrance motion on already visible content.
Animated containers do not remount wallet/account providers or defer payment guards.

## Data and privacy

The shared BigInt helper uses only confirmed IN/OUT payments in the loaded sample,
separates XLM/USDC and excludes self transfers, failed or malformed amounts. It
never represents a complete history, balance trend, fiat valuation or monthly
spending. Both clients label the sample and hide chart/totals when balances hide.
Web savings cards remain plans; native local plans and shared Sync records remain
separate. No deposits or yield are invented.

## Verification

- Full suite:146 passed,9 optional integration checks skipped.
- Web/mobile TypeScript, web production build, core source check and Android release
  build passed.
- Isolated browser QA checks desktop1440px, phone390px, dark/reduced motion, no
  horizontal overflow, data totals, balance hiding and Receive/Send dialogs.
  Screenshots use browser-only fixtures, never production sample substitutions.
- Android emulator full flow passed: wallet backup, actual Testnet trustline/swap,
  agent sandbox, real x402 payment/receipt recovery, shared records, lock/unlock,
  reconnect and background lock.
- Final motion preference refinement and APK verified with a separate Android run
  with system reduced motion enabled: unlock, Money flow, Receive sheet and tab
  navigation passed. Screen-capture protection remains enabled.
- APK SHA256:51d531dbe0f6687c34eebfa6f7c38086b9404411efabd46430936419197acc49.
  Development-signed Testnet build. Physical-device smoothness and iOS remain untested.

Final hosted responsive layout verification is recorded after deployment below.
