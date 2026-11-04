# Global pinned conversations

会话散落在不同工作区，重要内容不好找？全局置顶把你选中的会话集中到侧边栏顶部，支持拖拽排序和清晰的插入位置提示，也可按最近更新时间自动排序。会话完成后，小绿点提醒你查看。

A standalone DSH bundle for the `sidebar.workspaces` public slot. It replaces that browsing region at priority -100 (this Harness version selects the lowest numeric priority); it does not modify Harness files or import internal Client modules. Disable the bundle to restore the shipped browser.

## Install

Install the prebuilt release in DeepSeek Harness using this package URL:

```text
https://github.com/tao1020/dsh-global-pins/releases/download/v1.0.2/local-global-pins-1.0.2.tgz
```

Or with the Harness CLI:

```sh
dsh plugin add https://github.com/tao1020/dsh-global-pins/releases/download/v1.0.2/local-global-pins-1.0.2.tgz
```

Tested with DeepSeek Harness `0.2.1-rc.5`. No build step or npm account is required. The package keeps its original `@local/global-pins` identity so existing local installations update rather than install a second copy.

## Behavior

- Pins use the existing Host workspace pin registry, shared across workspaces. Workspace membership is never rewritten.
- Pinned rows appear once in the global section. Unpin returns a conversation to its original workspace and preserves its saved group position.
- Last updated uses the same Client summary `updatedAt` value as the original browser. Manual order is stored in this browser under `local.global-pins.v1`.
- Drag a conversation into the pin section to pin it. Drag within a section to reorder and switch to manual mode. A highlighted line and dot show the insertion point above/below a row or at the section end. Invalid or unchanged positions show no marker. Drag a pin back onto its own workspace to unpin and insert at the indicated position; the ordinary unpin button still restores the saved group position. Cross-workspace moves are rejected.
- The pinned heading's ellipsis opens Manual / Last updated options, with a check beside the current mode. Selecting an option, leaving the control, or pressing Escape closes the popup. Selecting the current mode preserves its order.
- New pins lead existing manual pins. Switching to recent clears saved manual layout; switching back freezes the currently visible chronology, including hidden archive positions.
- Right-click a conversation or use its ellipsis to open the same owned action menu: rename, fork, archive/restore, and move up/down. Arrow keys/Home/End navigate; Escape closes and restores focus, and leaving the menu dismisses it. The ellipsis remains available for touch.
- Session rename replaces the title in that same row. Enter saves; Escape cancels. Composition input does not accidentally save/cancel. Empty names are rejected; failed saves keep the draft for retry; pending requests cannot duplicate. The input retains its native text-edit context menu. Workspace rename and Add workspace keep their separate forms.
- Pin and archive actions sit on the right with native 14px SVG artwork and 24px button targets. Hover highlights the full conversation row, not only its title. Workspace rows support new sessions and rename. Add workspace accepts an existing absolute directory path.
- Search filters titles and workspace names. Archived conversations cannot be opened until restored. Operations report Host errors instead of pretending to succeed.
- Pinned and ordinary rows show a small green completion-unread dot on the right, using the native `useSessionStatus` snapshot and theme token. The dot has an English/Chinese accessible label. Running takes priority; archived and blank rows never show completion dots. Native status overrides the summary's running flag when present, including explicit `false`; otherwise the summary remains the fallback. Harness owns unread tracking and acknowledgement when opening a session; the plugin does not keep a separate unread registry.

## Compatibility limits

This is a replacement browser, not a wrapper around private components. It does not preserve original content-search, workspace tree mode, child-activity/scheduled-task indicators, approval/question status badges, directory-picker dialogs, per-workspace show-more watermarks, custom row slots, or stop-and-archive confirmation. Running-session archive refusal is displayed; work is not stopped automatically. Workspace removal is not provided. Saved view layout is browser-local, not synced between devices; storage events synchronize other tabs of the same origin. Host authorization remains authoritative.

Live Client Inspect confirms the plugin owns the sidebar slot, and the user confirmed the pinned section is visible and pinning/dragging work. The agent could not independently inspect screenshots or drive the desktop UI: the browser entry requires authentication and native accessibility permission is unavailable. Unit tests are not a substitute for full end-to-end visual coverage.

## Development checks

```sh
node --check client.js
npm test
npx --yes prettier@3.6.2 --check client.js index.js test/*.test.js package.json locale/en.json locale/zh.json
```

The 50 regression tests cover ordering/partition helpers, Host delegation/validation, and Browser hook/event behavior using a small VM harness (26 tests). Existing sorting, drag/storage races, and unread status checks remain. New checks execute the registered `apply`/slot `inject` API with scoped injection enforcement for both `remote` and `remote.session`; cover same-row rename, success/refusal/rejection/retry, pending duplicates, empty input, composition, cancellation and focus; compare right-click and ellipsis actions; and check native icon dimensions and full-row hover CSS. These are hook/event and CSS-contract tests, not actual DOM layout or desktop interaction. Native unread lifecycle, real focus/IME behavior, and menu positioning/clipping still need end-to-end visual checks. This patch was not independently desktop-validated.

The bundle logo is original artwork. Row pin icons match the shipped Harness outline/filled pin paths. No runtime dependencies or install scripts are required.
