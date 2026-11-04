# v1.0.0

- Global pinned conversations across workspaces, without changing workspace membership.
- Manual drag ordering with an insertion line and dot; recent-first automatic sorting.
- Ellipsis sorting popup, original Harness pin icons, and keyboard move controls.
- Pin/unpin, rename, fork, archive/restore, and workspace creation through existing Harness services.

Download the `.tgz` asset and install its URL in Harness. No build step is needed.

Tested with DeepSeek Harness 0.2.1-rc.5. 34 automated tests pass. The user verified the sidebar, pinning, dragging, and the insertion indicator in the desktop app.

This plugin replaces the workspace browser. Content search, workspace tree mode, custom row slots, and several original status indicators are not preserved; see README compatibility limits. Sorting preferences are browser-local. Disable the bundle to restore the original browser.
