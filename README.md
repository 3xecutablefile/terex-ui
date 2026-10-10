<div align="center">
  <img src="public/terex-mark.svg" width="144" height="144" alt="Terex UI" />
  <h1>Terex UI</h1>
  <p><strong>A native AI terminal and system console.</strong></p>
  <p>
    <a href="https://github.com/3xecutablefile/terex-ui/releases/latest">Downloads</a>
    · <a href="https://github.com/3xecutablefile/terex-ui/issues">Issues</a>
    · <a href="https://github.com/3xecutablefile/terex-ui/actions/workflows/release.yml">Release builds</a>
  </p>
  <p>
    <img src="https://github.com/3xecutablefile/terex-ui/actions/workflows/release.yml/badge.svg?branch=main" alt="Release builds" />
    <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-9856df" alt="Supported platforms" />
    <img src="https://img.shields.io/github/license/3xecutablefile/terex-ui" alt="License" />
  </p>
</div>

Terex UI combines a native Tauri/Rust backend with an eDEX-style desktop layout:
live system and network panels, a three-column file browser, terminal tabs, and
an on-screen keyboard. The default palette is purple and lime; the dashboard
and terminal follow the selected theme together.

## Download

Installers are published to [Releases](https://github.com/3xecutablefile/terex-ui/releases)
after successful pushes to `main`:

| Platform | Downloads |
| --- | --- |
| macOS Apple Silicon | DMG and `.app.tar.gz` |
| macOS Intel | DMG and `.app.tar.gz` |
| Linux x64 | AppImage, DEB, RPM |
| Windows x64 | EXE, MSI |

Each release includes `SHA256SUMS` and signed updater metadata. macOS app bundles
use ad-hoc signing and are not notarized; Windows installers lack Authenticode signing.
The packaged desktop app does not require Node.js or pnpm to run.

### Automatic Updates

macOS, Windows, and Linux AppImage builds check for updates automatically while
the window is visible, at most every 30 minutes. New packages download in the
background and their signature and signed version are verified before use.
Choose **Review update → Install & restart** when ready. Installation waits until
edited files are saved and running terminal commands and drafts are finished.
**CONFIG → About → Check for updates** opens the same updater manually.

DEB/RPM installations use their package manager instead. Existing builds that
predate the updater need one manual installation of version 0.10.0 or later.

## Workspace

- **FILES:** native three-column browsing. Single click selects; double click or
  Enter opens a folder, editor, or preview from any column. File controls live
  here, with no duplicate bottom-left explorer. Folder navigation updates an
  idle terminal's directory; terminal `cd` changes update Files. Pending input or
  running commands are preserved; **Sync terminal** retries once the prompt is ready.
- **WORKSPACE:** GPU-rendered Ghostty terminals, persistent tabs, split panes,
  code editing, source control, and web previews.
- **AI:** chat, project context, attachments, voice, and approval-gated
  tools. Chat and autocomplete pickers show configured custom-endpoint models.
- **Files context menu:** opens a terminal in the chosen directory, creates or
  deletes entries, copies paths, and attaches files to the agent.
- **CONFIG:** endpoint settings, themes, editor preferences, shortcuts, and agents.

Shells and filesystem operations run through Rust. CPU, memory, process, disk,
and interface counters come from native system APIs. The network panel queries
ipwho.is for the public IP and approximate IP-based location; the map uses
public-domain Natural Earth land data.

### Background Work

Dashboard samples run every five seconds while visible, with process/disk scans
cached for fifteen seconds. Dashboard timers and the clock stop when the window
is hidden or occluded; filesystem watchers and listings pause when Files is not
visible. Terminal input and output retain their independent responsive path.
Right-click opens app actions, while editable fields keep their standard editing
menus. The interface still uses Tauri's system WebView.

The command bar hides while a TUI or command owns the terminal and returns at the
shell prompt. Clipboard images are written to private temporary PNG files and
pasted as paths, which image-aware TUIs such as OpenCode recognize as attachments.
The editor supports multiline AI suggestions across languages, plus Emmet HTML/CSS
expansion with Tab. **CONFIG → General → Custom terminal prompts** enables the
segmented OS-logo prompt.

## AI Setup And Existing Data

Open **CONFIG → Models**, add an **OpenAI Compatible** custom endpoint, and enter
its base URL, model ID, and API key if needed. Local endpoints can be keyless.
Existing provider keys remain available for compatible features such as voice.

When an existing Terax profile is found, Terex UI uses its settings, custom
endpoints, chats, agents, snippets, todos, custom themes, and spaces directly.
The existing keychain entries are reused; credentials are not copied into the
repository. The native app identifier is `io.github.3xecutablefile.terex-ui`.

Compatibility identifiers, including the `TERAX.md` project-memory filename,
remain supported so existing profiles and integrations continue to work.

## Development

Install Node.js 24+, pnpm, stable Rust, and the
[Tauri platform prerequisites](https://tauri.app/start/prerequisites/).

```sh
pnpm install --frozen-lockfile
pnpm tauri dev
```

`pnpm dev` alone serves the frontend at `http://127.0.0.1:1420/`. Native terminal,
filesystem, and keychain access require the Tauri desktop host.

```sh
# Production installers for the current operating system
pnpm tauri build

# macOS debug app bundle
pnpm tauri build --debug --bundles app
```

The macOS debug bundle is `src-tauri/target/debug/bundle/macos/Terex UI.app`.

### Checks

```sh
pnpm check-types
pnpm lint
pnpm exec vitest run --maxWorkers=4
node --test scripts/release.check.mjs
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings
```

## Automatic Releases

`.github/workflows/release.yml` runs on pushes to `main`, with an optional manual
dispatch. It checks the frontend, builds all four platform targets in parallel,
and publishes one release only after every build succeeds.

No manual tag push is needed. The publishing job creates its own
`build-<run-number>-<attempt>` release tag pointing to the triggering commit.
It uses GitHub's automatic `GITHUB_TOKEN` and a dedicated `TAURI_SIGNING_PRIVATE_KEY`
repository secret matching the public key in `src-tauri/tauri.conf.json`. Private
signing keys stay outside the repository. CI stamps a newer patch version for each
run, signs the final packages (after AppImage fixes), and validates all target
entries before publishing `latest.json`. macOS and Windows OS-signing identities
are not required for these updater signatures.

## Credits And License

Terex UI is derived from [Terax](https://github.com/crynta/terax-ai) by Crynta and
retains its native terminal, editor, and AI foundations. Original copyright and
third-party license notices are preserved. Licensed under [Apache-2.0](LICENSE).

[Architecture documentation](docs/README.md) describes the inherited subsystems.
