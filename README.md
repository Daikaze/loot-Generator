# Loot Generator v0.2.1

**Foundry VTT v14** module for **Loot**, **Shops**, and **Magic Items**, with D&D 5e **5.3.3** inventory support. GM-only interface. No changes to the NPC Shops or Gathering & Crafting source files.

## Install
Manifest URL: `https://raw.githubusercontent.com/Daikaze/loot-Generator/main/module.json`

If installing from the GitHub source ZIP, extract the files into `FoundryVTT/Data/modules/loot-generator/` so that `module.json` is immediately inside the `loot-generator` folder. Activate via **Manage Modules**.

Open from **Token Controls → Loot Generator** or press **Ctrl+Shift+L**.

## v0.2.1 updates

- **Dropdown contrast fixed** — dark scheme on select controls and option menu items; styling is scoped to the module only.
- **Drag & Drop** — drag any generated result row onto a D&D 5e character or NPC actor sheet that accepts Foundry's standard `{type:'Item',data:...}` drag payload. Existing World/Compendium items preserve their native system data and effects. Dragging doesn't touch an inventory until the sheet accepts a drop.
- **Internet sources** — select `Online · Open5e Equipment` or `Online · Open5e Magic Items`, with optional **Online Search** name filter. Fetches up to 150 items from the public Open5e API v2 (no account required). Source names and descriptions appear beside results. Requests can fail offline or due to browser CORS restrictions, and the module displays an error.
- **Prices** — where absent, online magic items use an approximate rarity-based price.
- Existing GM-only/public chat sharing, history, JSON export, Journal entries, item-giving, loot themes/CR, 11 shop categories, NPC Shops inventory injection, and Gathering & Crafting materials are retained.

## Available data sources
Built-in offline catalog, World Items, Foundry Item Compendiums, optional Gathering & Crafting materials, and Open5e V2 equipment/magic items.

### Important distinctions
Items from Foundry Compendiums contain actual Foundry Item system data and keep it when dragged. Items generated from Open5e are **descriptive loot objects**, not complete automated weapon attacks, spells or Active Effects. They can be dragged into inventory but mechanics may require manual GM setup. Custom third-party character sheets must accept standard Foundry Item drag data. Online results depend on API coverage, selected rarity and shop category; use the Online Search filter when needed.

Source API: https://open5e.com/api-docs/ and https://api.open5e.com/schema/redoc/ . Please respect each item's license/attribution.

## Tests
`node --check scripts/main.mjs`
`node test.mjs`

This release has syntax and mocked integration tests, but has **not yet been verified inside a running Foundry v14 session**. Back up your world before updating.