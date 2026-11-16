# Derrick is the Dungeon

An anatomy & physiology study roguelike set inside a guy named Derrick.

**Before doing anything, read `docs/design.html` in full** (Session rules, Shared conventions, then only your phase's spec). It is the source of truth and wins over any task card text. Cards may call the game "Marrow Depths" (old name).

- Game code: `game/`. Published as a private claude.ai artifact; its URL is in `README.md` once phase 1a creates it.
- One phase per session, on a `phase-<id>` branch from latest `main`, then a PR to `main`.
- Be token-frugal: stay in your phase's scope, cheap checks only.
- Never commit lab images, study materials or personal data. This repo is public.
- If you change the design, update `docs/design.html` and republish the design artifact: https://claude.ai/artifact/8NfZyfevHK834C7QhDNAkS
