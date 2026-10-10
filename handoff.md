# Terex UI

## Active Automatic Updater / Push
- User requested an autoupdater and a Git push, including the accumulated local work.
- Implemented a single updater host in the main window: automatic checks/downloads, native signature and signed-version verification, explicit install/restart, and dirty-editor/running-process/draft protection. Settings delegates to that host rather than creating a second installer. Checks run after startup and at most every 30 minutes while visible; development builds skip automatic checks. Linux AppImage is supported; DEB/RPM uses manual package installation.
- A dedicated updater signing key was generated outside the repository and stored as the repository's `TAURI_SIGNING_PRIVATE_KEY` Actions secret. Only its public key is in Tauri config. Do not print or commit the private key.
- Source version is now 0.10.0. CI stamps a monotonically increasing patch version from the workflow run number, builds updater artifacts, signs final bytes (including the fixed AppImage), and publishes `latest.json` only with a complete platform set. macOS and Windows targets include the right updater package formats; both MSI/NSIS entries are present.
- Validation passed: TypeScript, 1,228 Vitest tests, three Node release checks, 381 native tests (one ignored), all-targets clippy, actionlint 1.7.12, lint with existing warnings, and size budgets. Node checks include CRLF version stamping, complete platform requirements, release URL restrictions, and signed-version metadata. Actual Tauri CLI signing also succeeded with the dedicated key.
- `check-updater.cjs` in the approved temp directory passed against both development and production assets: automatic startup download, no focus stealing, signature-failure gating, explicit install, busy-terminal protection, retry and restart. Native update/install calls were mocked for the UI tests; the live GitHub channel still needs the first successful CI publication.
- Signed bootstrap build completed at `src-tauri/target/release/bundle/macos/Terex UI.app` (9.77 MiB), with its native `.app.tar.gz` updater payload/signature. macOS bundling now uses native ad-hoc signing rather than repairing the signature afterward. Build log: `updater-build.log` in the approved temp directory.
- Corrected the missing image external-open permission discovered in prior packaging. README now documents the actual update, context-menu, clipboard, editor, and public-IP behavior. Commit/push and CI publication are the remaining steps.

## Active Editor Completion Fix
- User wants VS Code-like completion that writes useful code rather than only completing HTML tag names. He confirmed the AI improvement should apply across languages.
- Confirmed the existing profile has AI autocomplete enabled with the custom endpoint provider. No credentials or endpoint URLs were inspected.
- Found concrete limits: only 128 output tokens / six visible lines, multiline results discarded before an auto-inserted HTML closing tag, all request errors swallowed, and no Emmet expansion.
- Completed: language-independent AI completion now has useful block-oriented prompts, 1,024 output tokens for ordinary built-ins and 4,096 for custom/reasoning models, no six-line truncation, and multiline support before HTML closing tags. Existing suffixes are retained without duplicate closing tags. Requests are cancelled on edits/focus loss, stale document/model/path responses are rejected, credential lookup is bound to the captured endpoint, and original/canonical protected paths are checked before reading credentials or sending code.
- Added a small editor completion footer with Generate code, loading, acceptance, empty-result, and actionable error/retry states. Tab accepts suggestions, Esc cancels/dismisses, and normal Tab/Shift+Tab indentation remains available. Configuration changes clear old suggestions.
- `emmet@2.4.11` supplies real HTML/CSS abbreviation expansion (`!`, `.card`, `ul>li.item$*3`, CSS `m10`) with snippet placeholders. It loads only with web-language support. The adapter excludes attributes/comments/scripts and bounds expansion size/repetition. The old CodeMirror Emmet plugin targets incompatible pre-v6 APIs, so the maintained core is used with the existing CodeMirror completion API. TypeScript maps Emmet to its bundled declarations because its package exports omit the types entry.
- Removed both subsequently requested buttons: top-bar **AI AGENT** and bottom-bar **Open AI agent**. Their unused component/prop were removed too.
- Verification: TypeScript and all **1,228 frontend tests** passed; full lint passed with existing warnings. Headless actual-editor checks passed for automatic multiline HTML before a closing tag, Emmet HTML/CSS, automatic Python/JavaScript suggestions, error feedback, stale-response rejection, protected symlink paths, no file-open key reads, and absence of both buttons. Provider responses in these browser checks are fixtures; no live user endpoint requests were made.
- Durable test script: `/var/folders/cc/n2mhvtmx0gqd73tgdpv1gnkc0000gp/T/opencode/check-editor.cjs`. Earlier `/tmp` test scripts may have been cleared.
- Optimized macOS bundle rebuilt (**9.77 MiB**) and installed at `/Applications/Terex UI.app` with a verified local ad-hoc signature. Running sessions were preserved through a staged directory swap. Previous bundle: `/Applications/.terex-ui-update-tov1yu8h/Previous.app`. User must restart when ready. No commit or push requested/performed.
- Emmet adds about **26 kB gzip**, loaded lazily. The total JS budget increased by 30 kB (1505 to 1535 kB) with a separate 30 kB Emmet limit; all budgets pass. Startup JS remains about **251 kB gzip**. Build log: `editor-build.log` in the approved temp directory.

## Active Clipboard / TUI Fix
- User reports image paste is swallowed in OpenCode and wants the shell/AI command bar hidden while TUI programs run.
- Completed native clipboard bridge in `src-tauri/src/modules/terminal_clipboard.rs`: read an image on a worker thread, encode it as a private temporary PNG, and paste its quoted path using the existing bracketed-paste path. Text remains unchanged; the clipboard itself is not modified. Image dimensions are bounded to 32 megapixels, scratch directories/files are private, concurrent reads are serialized, and app-owned image files are removed on app exit. The `image` crate was already present transitively; it is now a direct PNG dependency.
- Confirmed current OpenCode TUI recognizes pasted local image paths in `packages/tui/src/component/prompt/index.tsx` (`pasteInputText` / `readLocalAttachment`). This avoids tying terminal image paste to a particular application's Ctrl+V binding.
- Keyboard paste, native menu paste, on-screen keyboard paste, and the terminal context menu share `readTerminalPaste()`. Image paste at the shell command editor inserts the image path too. Encoding failures surface as errors; stale asynchronous pastes are cancelled on focus/owner changes or controller disposal.
- Foreground activity is tracked from existing OSC command events and alternate-screen mode, without process polling. `terminalActivity.ts` notifies only on transitions. The bar collapses and becomes inert during a foreground command/TUI, retains its draft, and reappears at the next completed shell prompt. Ctrl+U is passed through while a TUI runs; hidden command-editor completion requests are aborted.
- Verification: TypeScript, 1,223 frontend tests, all 380 native tests (one ignored), all-targets Rust clippy, full lint (existing warnings), focused lint (clean), `git diff --check`, and all size budgets passed.
- `/tmp/playwright-test-terex-tui.cjs` passed against the real application root with native IPC fixtures: image keyboard/menu paste, text paste, Ctrl+U passthrough, alt-screen and primary-screen foreground activity, preserved drafts/PTYs, prompt restoration, and stale image cancellation. The earlier prompt/window-control regression also passed.
- `/tmp/check-opencode-image-paste.py` launched installed **OpenCode 1.18.35** in an isolated PTY/config directory, bracketed-pasted a synthetic PNG path, and observed **[Image 1]**. No AI prompt was submitted, and the real system clipboard was not modified.
- Rebuilt optimized macOS bundle: **9.74 MiB**. Installed and ad-hoc signed at `/Applications/Terex UI.app`; strict/deep signature verification passed. Installation used a staged directory swap to preserve the running app. Previous bundle retained at `/Applications/.terex-ui-update-v651fyve/Previous.app`; do not remove while an old instance might still use it. The app was not quit or relaunched; the user needs to restart when ready.
- Build log: `/var/folders/cc/n2mhvtmx0gqd73tgdpv1gnkc0000gp/T/opencode/terex-clipboard-build.log`. Installer script: `/tmp/install-terex-update.py`. Work remains uncommitted; no push was requested in this follow-up.

## Active Update: 2026-10-07
- Latest requested change: optional **Custom terminal prompts** matching the segmented OS/home/path screenshot, plus visible Windows/Linux minimize, maximize, fullscreen, and close controls.
- Last pushed commit is `6f413db661fdb1d6cac453c99ac130d6aceda086`. The current working tree contains additional uncommitted daily-driver work; preserve it. No subagents or visible browser tests.
- Existing local changes include lazy AI/voice/editor credential reads, a targeted Chat Completions to Responses fallback, Files/image context menus, public IP/location and real land-map data, process suspend/resume/kill controls, native keyboard layouts, and terminal completion with Shift acceptance. These are not in the previously built release app.
- Prompt preference is persisted via the existing settings store and defaults off. Prompt rendering reuses native platform detection, SVG OS icons, home-relative paths, and the existing command-input mode. Existing command bars update immediately; plain integrated terminals activate on their next prompt. Bare/non-integrated shells retain direct input.
- Window controls were hidden inside the Files-obscured workspace header. They now belong to the persistent outer title bar; macOS retains native traffic lights. Fullscreen IPC permissions were added.
- Latest focused request is complete: `Settings > General > Terminal > Custom terminal prompts` persists the optional prompt. `CustomPrompt.tsx` uses the existing OS SVGs, home/folder icon, boundary-aware home-relative path, and font/theme tokens. It clamps long paths, follows font scaling, and does no extra native lookup. The prompt also works with terminal AI autocomplete disabled.
- `WindowControls.tsx` now handles maximize/restore and fullscreen separately, reads real native state, debounces resize state queries, cleans up pending listeners, and reports failed actions. Controls stay in the outer title bar in Files/Workspace and remain reachable in non-macOS zen mode. Native macOS traffic lights are retained.
- Verification: TypeScript and all 1,219 frontend tests passed. Full native tests: 378 passed, one ignored. All-targets Rust clippy passed. Full frontend lint passed with existing warnings; focused prompt/control lint is clean. `git diff --check` and all size budgets passed (startup JS 251.34 kB gzip, total JS 1.48 MB gzip).
- Headless script: `/tmp/playwright-test-terex-prompts.cjs`. Uses the actual app root and native IPC fixtures for macOS, Windows, and Linux; verifies OS glyphs, home/path changes, preference persistence via the actual General settings switch, preserved drafts/PTYs when toggling, operation with AI autocomplete disabled, 360/500/748/1440px widths, Retina scaling, and window-control commands/visibility. No native Windows/Linux window was launched.
- Optimized macOS app rebuilt successfully: `src-tauri/target/release/bundle/macos/Terex UI.app`, **9.72 MiB**. The updated bundle was not launched; an already-running instance retains the previous code. No new commit or push was performed.
- Installed that build at `/Applications/Terex UI.app` on request. The original linker-signed bundle failed strict bundle verification, so the installed copy received a local ad-hoc signature (`codesign --force --deep --sign -`). Strict/deep verification now passes. This is not Developer ID signing or notarization. The app was not launched during installation.
- The original `/tmp/playwright-test-terex.cjs` still assumes the removed Files toolbar and old path labels. Update it before using it as a complete regression of the earlier daily-driver changes.
- Remaining earlier-work issue noticed in packaging: the image preview's `openPath` command was pruned by Tauri because it lacks an opener path permission. Its external-open action needs a scoped permission review and verification; do not claim that image action is verified. Real endpoint streaming, process mutations, and native keyboard layouts still need their own end-to-end verification.
- On-push workflow delivery was observed working for `6f413db` (release run 37652491675, CI run 37652491607), superseding the older delivery observations below.
- Native Windows/Linux runtime validation and actual provider streaming through the configured endpoint remain unverified. Do not claim signed macOS builds or the complete elimination of first-use Keychain authorization.

## Request
The remaining sections are historical notes. The Active Update above supersedes their completion, build, and workflow-delivery status.

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
Performance follow-up implemented and verified locally after the user reported lag in typing, scrolling, and tab/folder switching. The user has now explicitly requested pushing these fixes. The sampled app PID 8244 was the unoptimized debug bundle. Idle host CPU samples were 0.0-0.6%; nearby WebKit WebContent/GPU processes peaked at 1.5%/1.2% in the short idle sample. macOS reported no swap and 47% memory availability, so memory exhaustion is not established. No live interaction trace or battery benchmark has been captured. Checks must remain headless; no subagents.

## Current Lag Fixes
- Confirmed a visibility mismatch: Files hid workspace CSS while TerminalStack still marked its active renderer visible. Added a presentation context so all workspace stacks become inactive while Files is displayed, preserving mounted sessions/buffers.
- New three-column file view previously mounted every entry. It now uses the existing TanStack virtualizer, measuring row heights and preserving arrow-key focus.
- Native fs_read_dir was synchronous on the command path. It now delegates enumeration to spawn_blocking; the existing sync implementation and a new async-command test preserve behavior.
- Optimized release build succeeded: `src-tauri/target/release/bundle/macos/Terex UI.app`, 9.27 MiB (versus approximately 75 MiB for the debug bundle). Prefer this release path for the next requested launch. It has not been opened yet; do not claim native interactive latency has been re-measured.
- All 1,214 frontend tests passed. Native fs_search tests (26, including the async-command regression) and all-targets clippy passed. Development and production-root headless checks passed; the 10,000-entry fixture mounted 33 rows, scrolling reached the last entry, arrow focus worked, and diagnostics confirmed terminal presentation is inactive in Files.
- Both existing GitHub releases succeeded on all four targets: build-1-1 and build-2-1. The latter includes commit 305acdd. GitHub records user pushes but has not enqueued on-push runs; explicit dispatch works. Do not claim the push trigger was observed working.

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
