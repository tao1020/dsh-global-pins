# Global pinned conversations

A standalone DSH bundle for the `sidebar.workspaces` public slot. It replaces that browsing region at priority -100 (this Harness version selects the lowest numeric priority); it does not modify Harness files or import internal Client modules. Disable the bundle to restore the shipped browser.

## Install

Install the prebuilt release in DeepSeek Harness using this package URL:

```text
https://github.com/tao1020/dsh-global-pins/releases/download/v1.0.0/local-global-pins-1.0.0.tgz
```

Or with the Harness CLI:

```sh
dsh plugin add https://github.com/tao1020/dsh-global-pins/releases/download/v1.0.0/local-global-pins-1.0.0.tgz
```

Tested with DeepSeek Harness `0.2.1-rc.5`. No build step or npm account is required. The package keeps its original `@local/global-pins` identity so existing local installations update rather than install a second copy.

## Behavior

- Pins use the existing Host workspace pin registry, shared across workspaces. Workspace membership is never rewritten.
- Pinned rows appear once in the global section. Unpin returns a conversation to its original workspace and preserves its saved group position.
- Last updated uses the same Client summary `updatedAt` value as the original browser. Manual order is stored in this browser under `local.global-pins.v1`.
- Drag a conversation into the pin section to pin it. Drag within a section to reorder and switch to manual mode. A highlighted line and dot show the insertion point above/below a row or at the section end. Invalid or unchanged positions show no marker. Drag a pin back onto its own workspace to unpin and insert at the indicated position; the ordinary unpin button still restores the saved group position. Cross-workspace moves are rejected.
- The pinned heading's ellipsis opens Manual / Last updated options, with a check beside the current mode. Selecting an option, leaving the control, or pressing Escape closes the popup. Selecting the current mode preserves its order.
- New pins lead existing manual pins. Switching to recent clears saved manual layout; switching back freezes the currently visible chronology, including hidden archive positions.
- Row actions support rename, fork, archive/restore, and keyboard-accessible move up/down. Workspace rows support new sessions and rename. Add workspace accepts an existing absolute directory path.
- Search filters titles and workspace names. Archived conversations cannot be opened until restored. Operations report Host errors instead of pretending to succeed.

## Compatibility limits

This is a replacement browser, not a wrapper around private components. It does not preserve original content-search, workspace tree mode, unread/child-activity/scheduled-task indicators, directory-picker dialogs, per-workspace show-more watermarks, custom row slots, or stop-and-archive confirmation. Running-session archive refusal is displayed; work is not stopped automatically. Workspace removal is not provided. Saved view layout is browser-local, not synced between devices; storage events synchronize other tabs of the same origin. Host authorization remains authoritative.

Live Client Inspect confirms the plugin owns the sidebar slot, and the user confirmed the pinned section is visible and pinning/dragging work. The agent could not independently inspect screenshots or drive the desktop UI: the browser entry requires authentication and native accessibility permission is unavailable. Unit tests are not a substitute for full end-to-end visual coverage.

## Development checks

```sh
node --check client.js
npm test
npx --yes prettier@3.6.2 --check client.js index.js test/*.test.js package.json locale/en.json locale/zh.json
```

The regression tests cover pure ordering/partition helpers, Host operation delegation and validation, and Browser hook/event behavior using a small VM harness. The latter verifies asynchronous pin/storage races and visible-neighbor moves, not DOM rendering or visual interaction. Registration asserts a priority below the shipped browser's 0. Live Client Inspect confirms the installed -100 entry is active. End-to-end pointer/visual checks remain outstanding.

The bundle logo is original artwork. Row pin icons match the shipped Harness outline/filled pin paths. No runtime dependencies or install scripts are required.
