# v1.0.2

- Fix session rename dependency injection and edit titles directly in their conversation row. Enter saves, Escape cancels, and failures preserve the draft.
- Share the action menu between right-click and the ellipsis, with keyboard navigation and focus restoration.
- Restore small pin/archive actions and full-row hover highlighting without changing selected-row behavior.
- Preserve global pins, drag insertion hints, sorting, workspace membership, and completion-unread dots.

All 50 automated tests pass on Node 22. Syntax, formatting, and independent engineering review pass. The user confirmed the repaired desktop interactions work before approving this release; automated hook tests alone do not establish end-to-end visual coverage.

Download the `.tgz` asset and install its URL in Harness. Tested with DeepSeek Harness 0.2.1-rc.5. No build step is needed.

This plugin replaces the workspace browser. Content search, workspace tree mode, custom row slots, child-activity/scheduled-task indicators, and approval/question badges are not preserved; see README compatibility limits. Sorting preferences are browser-local. Disable the bundle to restore the original browser.
