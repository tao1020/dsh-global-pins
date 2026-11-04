# v1.0.1

- Restore completion-unread dots in pinned and ordinary conversation rows using Harness's native status snapshot.
- Add English and Chinese accessible labels. Running status takes priority; archived and blank rows do not show completion dots.
- Preserve pin icons, drag insertion hints, sorting, workspace membership, and native unread acknowledgement.

Download the `.tgz` asset and install its URL in Harness. No build step is needed.

Tested with DeepSeek Harness 0.2.1-rc.5. All 38 automated tests pass, including completion updates, cleared/missing status, running priority, and archive/blank suppression. Desktop visual confirmation of the new completion dot remains pending; automated hook tests do not verify native unread acknowledgement end to end.

This plugin replaces the workspace browser. Content search, workspace tree mode, custom row slots, child-activity/scheduled-task indicators, and approval/question badges are not preserved; see README compatibility limits. Sorting preferences are browser-local. Disable the bundle to restore the original browser.
