# Loot Generator v0.2.0

A standalone **GM-only** Foundry VTT v14 module with exactly **three generators**: **Loot**, **Shops**, and **Magic Items**. NPCs, Encounters, Dungeons, World and the separate Tables generator have been removed.

## Installation

Manifest URL:
https://raw.githubusercontent.com/Daikaze/loot-Generator/main/module.json

If direct manifest installation from the GitHub source ZIP does not work, download the repository and extract the files to FoundryVTT/Data/modules/loot-generator/ so that module.json is directly inside that folder, then enable Loot Generator.

Open as GM from Token Controls (gem icon) or Ctrl+Shift+L.

## Features

- Loot: theme, CR 0–30, individual loot or hoards, coins, World/Compendium Items and Gathering & Crafting materials.
- Shops: 11 merchant categories, economy, rarity, stock quantities and indicative gold prices.
- Magic Items: built-in original homebrew concepts or linked records from Item Compendiums and World Items.
- Repeatable generation with seeds, GM-only/published chat output, per-GM history, text copy, Journal creation, JSON export.
- D&D 5e: give Items to the selected token (does not automatically transfer currency).
- Optional NPC Shops: replace selected NPC merchant stock after confirmation, without deleting the existing merchant ledger and settings.

## Compatibility

Foundry v14, with dnd5e 5.3.3 for item transfer. Generation is system-neutral. Prices and homebrew effects are suggestions rather than official balanced items, and custom magic effects are not automatically configured.

The user interface and CSS are scoped to avoid changing other modules. Neither NPC Shops nor Gathering & Crafting source code is modified. World backup and validation in a real Foundry session are recommended; only mocked tests and syntax verification have been performed.