# Terex UI

## Request
Fork crynta/terax-ai as terex-ui. Match the supplied eDEX reference: charcoal background, electric-blue technical typography and thin frames, narrow system and network rails, central tabbed workspace, lower-left filesystem tiles, lower-right on-screen keyboard. Preserve the native desktop runtime and all AI functionality. No subagents requested.

## Repository
- Origin: https://github.com/3xecutablefile/terex-ui.git
- Upstream: https://github.com/crynta/terax-ai.git
- Starting commit: 3301de2 on main. Clean checkout.
- AGENTS.md points to TERAX.md; read and follow its architecture and conventions.

## Architecture
- Native Tauri 2 application: Rust owns PTY, files, processes, keychain, workspace authorization, and provider HTTP access.
- React 19/TypeScript frontend, Ghostty WASM terminal with WebGPU/WebGL, CodeMirror editor.
- Existing AI features include BYOK/local providers, agent workflows, approvals, chat sessions, voice, attachments, and autocomplete. Preserve their components, state, and security boundaries.
- pnpm scripts: check-types, lint, test, build; native launch: pnpm tauri dev.
- Native checks: cargo test --manifest-path src-tauri/Cargo.toml --locked; cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings.

## State
Public repository verified. Commit `841cf57` published the full app and release automation. The initial release built all four targets successfully: https://github.com/3xecutablefile/terex-ui/releases/tag/build-1-1 (run 37634415566). Commit `067b898` published the verified Files/terminal synchronization, duplicate-explorer removal, app context menu, and background-work reductions. Local keychain-backed pushes did not queue Actions runs despite active workflows, so push triggering is being checked using the authenticated GitHub CLI credential helper. Checks must remain headless; no subagents.

## Current Follow-up
- Removed FileTiles/bottom explorer. FileActions toolbar is inside Files; keyboard spans the lower area. The Files view names the actual active terminal directory rather than a hardcoded terminal label.
- Files follows the active leaf's real cwd and resets on tab/pane switches. Directory navigation submits quoted cd commands only after shell integration reports an empty prompt, no block draft exists, and the native foreground-process check is clear. Terminal output replies do not count as user input. Errors preserve pending commands and allow explicit Sync terminal retry.
- Root app context menu offers copy, terminal paste, Files, new terminal, settings. Editable controls retain their own editing menu. No claim of replacing WebView rendering with native widgets.
- Dashboard polling moved from 2s to 5s, process/disk scans cached for 15s, clock/dashboard timers stop on native occlusion/sleep or DOM hiding. Files listings/watchers stop when not visible. No measured battery-life claim.
- Headless regression passed for two-way cwd sync, no duplicate explorer, custom context menu, zero dashboard/clock updates while hidden, shared data, custom models, themes, AI draft preservation, and five viewport sizes. Frontend suite: 1,214 passed across 174 files.
- The hidden-window regression also caught the original sidebar re-listing directories; its UI watcher now coalesces hidden notifications into a single refresh on resume, while editor conflict handling is preserved. Tests verify no hidden directory listing calls.
- Additional headless checks confirm right-click actions on the terminal canvas and that existing typed input blocks automatic cd instead of being cleared or appended to.
- Follow-up native app build and size budgets passed. The final production-asset regression passed too; the changes are ready for the authorized follow-up commit/push. The first GitHub release contains all nine installers/archives plus checksums.

## Release Automation
- `.github/workflows/release.yml`: push to main or workflow_dispatch; frontend verification then macOS ARM64/Intel, Linux x64, Windows x64 builds; publish only when all builds pass.
- Artifacts: macOS DMG/app archives, Linux AppImage/DEB/RPM, Windows EXE/MSI, SHA256SUMS.
- Creates its own `build-<run-number>-<attempt>` release tag targeting the push commit. No tag push trigger or manual git tag step. GitHub releases require a tag, which the API creates automatically.
- Uses GITHUB_TOKEN only; no Apple/SignPath/updater signing secret dependencies. Installers are unsigned and macOS builds unnotarized. Automatic in-app updates remain off.
- Existing upstream Nix publishing workflow is guarded to upstream only; SignPath testing already had an upstream guard.
- `scripts/fix-appimage.sh` retains the upstream Wayland-library compatibility fix without signing/upload duplication.
- GitHub metadata description and homepage point to this public fork. Compatibility IDs, source attribution, license notices, and legacy data/keychain paths remain intact.
- Workflow checked with actionlint 1.7.12; AppImage script passed Bash syntax validation. Action versions were verified against GitHub and pinned where used for checkout, Node/pnpm setup, and artifact transfer.
- Release publish checks the current main head before marking a release latest, so an older slow build cannot replace a newer build as latest.
- Final branding checks: 1,212 frontend tests passed, complete native tests and clippy passed, macOS debug bundle built, and all size budgets passed. Canonical app path: `src-tauri/target/debug/bundle/macos/Terex UI.app`.

## Follow-up Design
- Existing Terax data found at `~/Library/Application Support/app.crynta.terax` (settings, sessions, agents, snippets, todos, custom themes, spaces). Do not print credentials or overwrite those files.
- `shared_storage_paths` resolves the legacy data/config/local-data directories when its settings file exists. The seven LazyStores use these absolute paths directly, keeping the fork's app identifier distinct. No copying, deletion, or credential migration; existing keychain service remains `terax-ai`.
- `appData.ts` resolves paths before store initialization; theme-file editing uses the shared config directory too. Native Linux secret-file fallback uses shared local-data path.
- Chat/default/autocomplete choices use only fully configured `customEndpoints`. Built-in provider keys are retained for compatibility and voice. Chat startup replaces stale built-in selection with the first valid endpoint without rewriting the saved default.
- Dashboard aliases now use the central theme tokens. Default palette is purple/lime; terminal default colors derive from the same tokens, and hidden Ghostty models accept theme changes even after their presentation surface is released.
- Commander single click selects; double click/Enter opens using that column's base path. This prevents the first click from changing a parent/preview column before its double-click fires.
- Autocomplete is inactive until a configured custom endpoint is selected; old hidden built-in selections cannot generate requests.

## Follow-up Verification
- TypeScript and 1,212 frontend tests passed (173 files).
- Native shared-storage regression passed: legacy selection preserves both profiles without copying or overwriting; Rust clippy all-targets passed.
- Headless actual-root checks passed against development and final production assets. Fixtures verify that all loaded stores use the legacy directory, custom models replace the stale built-in default, only custom models appear in the picker, parent/current/preview double-clicks navigate correctly, and file opening reaches the editor/preview workflow.
- Theme test switched to Dracula while the workspace was hidden, then verified dashboard and terminal colors after revealing the terminal. Returned to the Amethyst default successfully. Screenshot: `/tmp/terex-synced-theme.png`.
- Rebuilt macOS bundle: `src-tauri/target/debug/bundle/macos/terex-ui.app`, 74.59 MiB debug build. No live provider requests made by tests; user credentials were not printed or copied.

## Changes
- `src/modules/desktop/`: reference-style frame, native metadata file browser and tiles, keyboard, telemetry rails, pure control/path helpers and tests.
- `src/styles/desktop.css`: charcoal/blue design tokens, tight technical typography, reference proportions, responsive layouts, reduced-motion and focus states. Imported by main and settings entrypoints.
- `src/app/App.tsx`: thin Desktop wrapper around the original Header/WorkspaceSurface/StatusBar. Existing terminals and AI components stay mounted while the file view is shown. Hidden workspace is inert and visually isolated.
- Native `src-tauri/src/modules/dashboard.rs`: sysinfo-backed host/CPU/memory/process/network/disk snapshot, two-second frontend sampling, hidden-document polling paused. Runs off the UI thread. No external telemetry/geolocation requests.
- Product name, bundle identifier, generated app icons, About screen, composer label, prepaint backgrounds, and default dark theme updated. Internal Terax protocols and keychain behavior retained for compatibility.
- Updated Tauri JS packages to match the native crates already locked upstream; the original JS/native minor-version mismatch blocked packaging.
- Disabled automatic updater checks and directed manual checks to this fork. Release signing is not configured.
- Native dependency: sysinfo 0.39; no new frontend dependencies.
- Restored unrelated Rust formatting changes produced by cargo fmt.

## Verification
- TypeScript check passed; native macOS app bundle built successfully at `src-tauri/target/debug/bundle/macos/terex-ui.app` (debug build).
- Full frontend suite: 1,211 tests passed across 172 files with `pnpm exec vitest run --maxWorkers=4`. The initial unrestricted run hit a timing-sensitive upstream Svelte parser test; isolated and bounded-worker runs passed.
- Rust: 374 tests passed, one upstream test ignored. `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings` passed.
- `pnpm lint` passes with existing upstream warnings; new desktop module lint passes without warnings.
- Headless Playwright checks target the actual app root at `http://127.0.0.1:1420/`, with native IPC test fixtures. Test script: `/tmp/playwright-test-terex.cjs`. Use `TEREX_TEST_AI=1 node /tmp/playwright-test-terex.cjs` to exercise configured-AI presentation with a dummy key, without sending a provider request.
- Browser checks cover real Ghostty rendering, raw PTY input bytes, Ctrl+C/Enter, file listings/hidden toggles, terminal-here, AI connection settings, AI draft retention across file/workspace switching, five viewport sizes, and no page errors. Screenshot artifacts: `/tmp/terex-desktop-{1440,1920,1024,748,500}.png`, `/tmp/terex-ai-panel.png`.
- The same headless actual-app-root regression also passed against the final production assets served by Vite preview. Final native debug bundle rebuilt after the last code/style changes: 74.58 MiB. The bundle has not been opened.
- Browser test fixtures are confined to the external test script; production uses native commands. No live AI generation request or native GUI smoke launch performed. Windows/Linux runtime not tested here.
- Build/test logs are in the approved temp directory: `terex-app-build.log`, `terex-native-tests.log`, `terex-rust-check.log`, `terex-vite.log`, `terex-preview.log`.
