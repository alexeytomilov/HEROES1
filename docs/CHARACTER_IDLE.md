# Character selection wind animation

The game uses native 115×160 portraits. Each runtime atlas in `dist/assets/characters/idle/` is 345×160: three frames laid out left to right. The loop is 1–2–3–2, 520 ms per phase.

Editable masters are in Google Drive **Game/Online/Characters/PSD**:

- `wanderer_select_wind_3phases_115x160.psd`
- `mage_select_wind_3phases_115x160.psd`
- `knight_select_wind_3phases_115x160.psd`

Each PSD contains full-canvas pixel layers `Phase 1`, `Phase 2`, `Phase 3`. Only Phase 1 is initially visible. Edit the layers at native resolution and preserve these names and canvas dimensions. Layer visibility does not affect export.

After syncing the PSD folder, regenerate the atlases:
```sh
pip install pillow psd-tools
python tools/export-character-idle.py "/path/to/Game/Online/Characters/PSD"
```
Commit the updated `dist/assets/characters/idle/*.webp` files. PSD edits on Drive take effect in the game after export and publication.

The original game images were checked against the current layout sources before creating these phases:
- wanderer: `f40317e182ff959dc9bab1e1d3a9483eb7022a4e.png`
- mage: `2ecc0ecbf583a11c025a80661324094dc8572ecc.png`
- knight: `833b3edee700c533c4a9dc2fadfddbf6fd7e872a.png`

Playback lives in `current-ui.js` and shares the main renderer clock in `full-bridge.js`. It resets on character change, pauses when the page is hidden or the presentation is paused, and preserves the portrait border.
