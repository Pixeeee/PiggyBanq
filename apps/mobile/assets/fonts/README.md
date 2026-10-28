# PiggyBanq landing typography

Geist (body and controls), Grandstander (headings), and Geist Mono (wallet backup text) are bundled locally so the native app needs no font download at runtime.

Source: the official [Google Fonts repository](https://github.com/google/fonts), `ofl/geist`, `ofl/grandstander` and `ofl/geistmono`, retrieved 2026-10-28. The matching SIL Open Font Licenses are included beside the fonts.

Static weight instances were generated from the upstream variable TTFs with FontTools `instantiateVariableFont(font, {'wght': weight})` for consistent Android/iOS weight selection. UI text uses explicit font aliases rather than changing React Native global defaults or icon fonts.
