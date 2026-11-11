# v1.0.6

- Add a "Recent" section under the global pins. Conversations used today that are not pinned
  collect there newest-first from every workspace, so a new conversation is reachable without
  opening its workspace. The list refreshes at local midnight and when the window becomes visible
  again, so yesterday's unpinned conversations fall back into their own workspace. Rows there
  cannot be dragged or moved up/down; rename, fork, archive/restore and pin still work.
- "Today" means the local calendar day of the `updatedAt` value Harness exposes to plugins, so a
  conversation created earlier but used today also counts as recent. Pinned, archived and blank
  conversations never enter the section.
- The "Global pins" heading now has the same fold triangle as workspace headings, and folding
  keeps the clicked heading where it was on screen instead of jumping the list to the top.
  Collapsed sections keep only a small gap, so several folded workspaces stay compact.

All 71 automated tests pass on Node 22. Syntax, formatting and package checks pass. The user has
not yet confirmed the recent section, the fold buttons or the tighter spacing in the desktop app;
the VM tests do not prove real layout, scroll anchoring or paint.

# v1.0.5

- Add a target button beside the magnifier that jumps to the current session. It expands that
  session's workspace when folded, turns on archived rows when the session is archived, scrolls
  the row to the middle and flashes it once.
- Give every section heading a translucent grey glass band, slightly darker than the sidebar
  background, so the pinned block and each workspace are easier to tell apart. Conversation rows
  keep their normal background instead of a white card.
- Shrink conversation rows to 13px text on 32px tracks so more sessions fit without clipping
  titles or actions.

All 65 automated tests pass on Node 22. Syntax and formatting checks pass. The user confirmed
the locator, the glass section band and the compact rows in the desktop app; the VM tests do not
prove real layout or paint.

# v1.0.4

- Add a search overlay behind the magnifier beside the "Global pins" heading. It searches conversation titles and workspace names locally, then the Host message-content index, with the same 20-result bound as the native browser.
- Title matches list first under a small "Sessions" heading in last-updated order; content-only hits follow under a "Content" heading with a snippet, and duplicates appear once. Queries are trimmed, stripped of NUL and clamped to 500 UTF-16 units; typing is debounced by 250ms and superseded or closed requests abort. When a deployment turns the session-query index off (openAt "never"), the overlay keeps the name matches and shows a short note instead of a failure.
- Up/Down select, Enter opens the highlighted conversation and closes the overlay, Escape closes and returns focus to the magnifier, and Tab stays inside the dialog. Loading, empty, error and "narrow your search" states are announced.
- Archived conversations and blank drafts stay out of results.

All 62 automated tests pass on Node 22. Syntax, formatting, package checks, and independent engineering review pass. Automated tests exercise the VM harness only; the real overlay layout, snippets from the Host index, and focus behavior in the desktop app still need the user's visual confirmation.

Download the `.tgz` asset and install its URL in Harness. Tested with DeepSeek Harness 0.2.1-rc.5. No build step is needed.

This plugin replaces the workspace browser. The native search dialog's filter tabs, saved searches and result grouping, workspace tree mode, custom row slots, child-activity/scheduled-task indicators, and approval/question badges are not preserved; see README compatibility limits. Sorting preferences are browser-local. Disable the bundle to restore the original browser.

# v1.0.3

- Running conversations show a continuously animated spinning ring on the row's right instead of the faint "◌" glyph before the title.
- While running, the ring is the only trailing control until the row is hovered or focused; then the pin and archive buttons take its place in the same 48px slot, so the title never shifts.
- Remove the per-row three-dot button. The same action menu (rename, fork, archive/restore, move up/down) stays on right-click or Shift+F10 / the context-menu key, with keyboard navigation, Escape focus restoration, and focus-out dismissal.
- Rename still opens with the whole title selected, so typing replaces it directly.

All 54 automated tests pass on Node 22. Syntax, formatting, package checks, and independent engineering review pass. The user confirmed the spinning ring, hover swap, right-click menu and whole-title selection in the desktop app; automated hook tests alone do not prove real animation timing or hit-testing.

Download the `.tgz` asset and install its URL in Harness. Tested with DeepSeek Harness 0.2.1-rc.5. No build step is needed.

This plugin replaces the workspace browser. Content search, workspace tree mode, custom row slots, child-activity/scheduled-task indicators, and approval/question badges are not preserved; see README compatibility limits. Sorting preferences are browser-local. Disable the bundle to restore the original browser.

# v1.0.2

- Fix session rename dependency injection and edit titles directly in their conversation row. Enter saves, Escape cancels, and failures preserve the draft.
- Share the action menu between right-click and the ellipsis, with keyboard navigation and focus restoration.
- Restore small pin/archive actions and full-row hover highlighting without changing selected-row behavior.
- Preserve global pins, drag insertion hints, sorting, workspace membership, and completion-unread dots.

All 50 automated tests pass on Node 22. Syntax, formatting, and independent engineering review pass. The user confirmed the repaired desktop interactions work before approving this release; automated hook tests alone do not establish end-to-end visual coverage.

Download the `.tgz` asset and install its URL in Harness. Tested with DeepSeek Harness 0.2.1-rc.5. No build step is needed.

This plugin replaces the workspace browser. Content search, workspace tree mode, custom row slots, child-activity/scheduled-task indicators, and approval/question badges are not preserved; see README compatibility limits. Sorting preferences are browser-local. Disable the bundle to restore the original browser.
