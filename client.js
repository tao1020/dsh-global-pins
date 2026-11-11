window.__ModuleLoader__.load({
  id: "@local/global-pins",
  factory(require) {
    const React = require("react"),
      h = React.createElement;
    const KEY = "local.global-pins.v1";
    // Match the shipped IconPinOutlineRegular / IconPinFillRegular artwork.
    function pinIcon(pinned = false) {
      return h(
        "svg",
        {
          width: 14,
          height: 14,
          viewBox: "0 0 16 16",
          fill: "none",
          "aria-hidden": "true",
          focusable: "false",
          strokeWidth: 1,
        },
        h("path", {
          d: "M9.96976 1.70572L13.1554 3.93629L10.9019 8.12317L11.5158 11.605L10.7192 12.7427L2.52767 7.00693L3.3243 5.86922L6.80612 5.25528L9.96976 1.70572Z",
          stroke: "currentColor",
          strokeLinejoin: "round",
          fill: pinned ? "currentColor" : "none",
        }),
        h("path", {
          d: "M6.05285 9.47511C6.27284 9.16094 6.70586 9.08458 7.02003 9.30457C7.3342 9.52455 7.41055 9.95757 7.19057 10.2717L3.98587 14.4708L3.21223 13.9291L6.05285 9.47511Z",
          fill: "currentColor",
        }),
      );
    }
    // Shipped IconArchiveOutlineRegular, displayed at the native row size.
    function archiveIcon() {
      return h(
        "svg",
        {
          width: 14,
          height: 14,
          viewBox: "0 0 16 16",
          fill: "none",
          strokeWidth: 1,
          "aria-hidden": "true",
          focusable: "false",
        },
        ...[
          "M13.5 2.5H2.5C1.94772 2.5 1.5 2.94772 1.5 3.5V4.5C1.5 5.05228 1.94772 5.5 2.5 5.5H13.5C14.0523 5.5 14.5 5.05228 14.5 4.5V3.5C14.5 2.94772 14.0523 2.5 13.5 2.5Z",
          "M2.5 5.5V13.5C2.5 13.7652 2.60536 14.0196 2.79289 14.2071C2.98043 14.3946 3.23478 14.5 3.5 14.5H12.5C12.7652 14.5 13.0196 14.3946 13.2071 14.2071C13.3946 14.0196 13.5 13.7652 13.5 13.5V5.5",
          "M6.5 9.5H9.5",
        ].map((d) => h("path", { key: d, d, stroke: "currentColor" })),
      );
    }
    // Right-side running indicator; the CSS animation keeps the arc moving.
    function spinnerIcon() {
      return h(
        "svg",
        {
          width: 14,
          height: 14,
          viewBox: "0 0 16 16",
          fill: "none",
          "aria-hidden": "true",
          focusable: "false",
        },
        h("circle", {
          cx: 8,
          cy: 8,
          r: 6,
          stroke: "currentColor",
          strokeWidth: 1.5,
          opacity: 0.25,
        }),
        h("path", {
          d: "M8 2a6 6 0 0 1 6 6",
          stroke: "currentColor",
          strokeWidth: 1.5,
          strokeLinecap: "round",
        }),
      );
    }
    // Shipped magnifier artwork for the search trigger.
    function searchIcon() {
      return h(
        "svg",
        {
          width: 14,
          height: 14,
          viewBox: "0 0 16 16",
          fill: "none",
          strokeWidth: 1.2,
          "aria-hidden": "true",
          focusable: "false",
        },
        h("circle", {
          cx: 6.75,
          cy: 6.75,
          r: 4.25,
          stroke: "currentColor",
        }),
        h("path", {
          d: "M10.25 10.25L14 14",
          stroke: "currentColor",
          strokeLinecap: "round",
        }),
      );
    }
    // Target artwork for the jump-to-current-session trigger.
    function locateIcon() {
      return h(
        "svg",
        {
          width: 14,
          height: 14,
          viewBox: "0 0 16 16",
          fill: "none",
          strokeWidth: 1.2,
          "aria-hidden": "true",
          focusable: "false",
        },
        h("circle", {
          cx: 8,
          cy: 8,
          r: 4.25,
          stroke: "currentColor",
        }),
        h("path", {
          d: "M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15",
          stroke: "currentColor",
          strokeLinecap: "round",
        }),
      );
    }
    function reconcile(ids, saved = []) {
      const allowed = new Set(ids);
      return [...new Set([...saved.filter((id) => allowed.has(id)), ...ids])];
    }
    function move(ids, id, before) {
      if (!ids.includes(id) || id === before) return ids;
      const result = ids.filter((x) => x !== id);
      const index = result.indexOf(before);
      result.splice(index < 0 ? result.length : index, 0, id);
      return result;
    }
    function recent(ids, byId) {
      return [...ids].sort(
        (a, b) =>
          (byId[b]?.updatedAt ?? 0) - (byId[a]?.updatedAt ?? 0) ||
          a.localeCompare(b),
      );
    }
    function dayKey(timestamp) {
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }
    function reconcilePins(ids, saved = []) {
      return reconcile(ids, [
        ...ids.filter((id) => !saved.includes(id)),
        ...saved,
      ]);
    }
    function partition(ids, pinned, archived) {
      const pins = new Set(pinned),
        archive = new Set(archived);
      return {
        pinned: ids.filter((id) => pins.has(id) && !archive.has(id)),
        ordinary: ids.filter((id) => !pins.has(id) || archive.has(id)),
      };
    }
    function clean(value) {
      return {
        mode: value?.mode === "manual" ? "manual" : "recent",
        orders: Object.fromEntries(
          Object.entries(value?.orders ?? {}).filter(
            ([k, v]) =>
              Array.isArray(v) && v.every((x) => typeof x === "string"),
          ),
        ),
      };
    }
    const en = {
      pins: "Pinned",
      workspaces: "Workspaces",
      recent: "Last updated",
      recentSessions: "Recent",
      manual: "Manual order",
      empty: "Pin a conversation or drag it here",
      searchOpen: "Search sessions and content",
      searchPlaceholder: "Search session names or content",
      searching: "Searching session history…",
      noMatches: "No matching sessions",
      searchMore: "Showing the first {n} results. Narrow your search.",
      searchFailed: "Search failed",
      groupSessions: "Sessions",
      groupContent: "Content",
      contentDisabled:
        "Message-content search is disabled in this deployment; showing name matches only.",
      searchHint: "↑↓ to select · Enter to open · Esc to close",
      locate: "Jump to current session",
      new: "New session",
      add: "Add workspace",
      pin: "Pin",
      unpin: "Unpin",
      archive: "Archive",
      restore: "Restore",
      rename: "Rename",
      fork: "Fork",
      more: "Actions",
      sort: "Sort conversations",
      untitled: "Untitled",
      ungrouped: "Ungrouped",
      archived: "Show archived",
      up: "Move up",
      down: "Move down",
      cancel: "Cancel",
      save: "Save",
      path: "Workspace folder path",
      delete:
        "Remove workspace registration? Files and conversations are retained.",
      remove: "Remove workspace",
      failure: "Operation failed",
      loading: "Loading…",
      completed: "Completed (unread)",
      running: "Running",
      invalidOrder: "Invalid saved order",
      orderChanged:
        "Order changed during the operation. Pin state saved; drag again to reorder.",
    };
    const zh = {
      pins: "全局置顶",
      workspaces: "工作区",
      recent: "最近更新",
      recentSessions: "最近会话",
      manual: "手动排序",
      empty: "置顶会话或拖拽到这里",
      searchOpen: "搜索会话和内容",
      searchPlaceholder: "搜索会话名称或内容",
      searching: "正在搜索会话历史…",
      noMatches: "无匹配会话",
      searchMore: "仅显示前 {n} 条结果，请缩小搜索范围。",
      searchFailed: "搜索失败",
      groupSessions: "会话",
      groupContent: "内容",
      contentDisabled: "此部署未启用消息内容索引，只能匹配会话名称。",
      searchHint: "↑↓ 选择 · Enter 打开 · Esc 关闭",
      locate: "定位当前会话",
      new: "新会话",
      add: "添加工作区",
      pin: "置顶",
      unpin: "取消置顶",
      archive: "归档",
      restore: "恢复",
      rename: "重命名",
      fork: "分叉",
      more: "操作",
      sort: "会话排序",
      untitled: "未命名",
      ungrouped: "未分组",
      archived: "显示归档",
      up: "上移",
      down: "下移",
      cancel: "取消",
      save: "保存",
      path: "工作区文件夹路径",
      delete: "移除工作区登记？文件和会话会保留。",
      remove: "移除工作区",
      failure: "操作失败",
      loading: "加载中…",
      completed: "已完成（未读）",
      running: "运行中",
      invalidOrder: "保存的排序数据无效",
      orderChanged: "操作期间排序已变化。置顶状态已保存，请重新拖拽排序。",
    };
    const css = `.gp{min-height:0;overflow:auto;padding:8px;font:inherit;color:var(--dsw-alias-label-primary);flex:1}.gp button,.gp input,.gp select{font:inherit;color:inherit}.gp button{cursor:pointer;background:transparent;border:0;border-radius:7px;padding:6px}.gp button:hover,.gp-row:hover,.gp-row[data-selected=true]{background:var(--dsw-alias-bg-layer-2)}.gp .gp-title:hover{background:transparent}.gp button:focus-visible,.gp input:focus-visible,.gp select:focus-visible{outline:2px solid currentColor;outline-offset:1px}.gp-header{display:flex;align-items:center;gap:4px;margin:12px 0 5px}.gp-header strong{flex:1;font-size:13px;color:var(--dsw-alias-label-secondary)}.gp input,.gp select{box-sizing:border-box;max-width:100%;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:5px}.gp-row{display:flex;align-items:center;min-height:36px;border-radius:8px;gap:2px}.gp-title{flex:1;text-align:left;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gp-actions{display:flex;align-items:center}.gp-menu{padding:4px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;display:flex;flex-wrap:wrap}.gp-note{font-size:12px;color:var(--dsw-alias-label-secondary);padding:8px}.gp-error{padding:8px;overflow-wrap:anywhere;border:1px solid currentColor}.gp-drop{min-height:40px;border-radius:8px}.gp-group{margin-top:12px}.gp-row[draggable=true]{cursor:grab}.gp-sort{position:relative}.gp-sort summary{list-style:none;cursor:pointer;border-radius:7px;padding:4px 8px;font-size:20px;line-height:1}.gp-sort summary::-webkit-details-marker{display:none}.gp-sort summary:hover{background:var(--dsw-alias-bg-layer-2)}.gp-sort summary:focus-visible{outline:2px solid currentColor}.gp-sort-options{position:absolute;right:0;top:100%;z-index:10;min-width:160px;padding:5px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:12px}.gp-sort-options button{display:flex;justify-content:space-between;gap:20px;width:100%;text-align:left;padding:9px}.gp-sort-options span{width:1em}.gp-search-open{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0}.gp-find{position:fixed;inset:0;z-index:50;display:flex;align-items:flex-start;justify-content:center;padding:12vh 16px 16px;background:rgba(0,0,0,.28)}.gp-find-panel{display:flex;flex-direction:column;width:min(680px,100%);max-height:64vh;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.25);overflow:hidden}.gp-find-input{margin:10px;padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-base)}.gp-find-results{overflow:auto;padding:0 6px 6px}.gp-find-row{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"title where" "snippet snippet";gap:2px 10px;width:100%;padding:8px 10px;border-radius:8px;text-align:left}.gp-find-row[data-active=true]{background:var(--dsw-alias-bg-layer-2)}.gp-find-title{grid-area:title;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gp-find-where{grid-area:where;font-size:12px;color:var(--dsw-alias-label-secondary)}.gp-find-snippet{grid-area:snippet;font-size:12px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gp-find-group{padding:10px 12px 2px;font-size:11px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-secondary)}.gp-find-status{padding:6px 12px;font-size:12px;color:var(--dsw-alias-label-secondary)}.gp-find-hint{border-top:1px solid var(--dsw-alias-border-l1);padding:7px 12px;font-size:12px;color:var(--dsw-alias-label-secondary)}`;
    function Browser(p) {
      const { t, api } = p,
        list = p.useSessions((s) => s),
        ws = p.useWorkspaces((s) => s),
        statuses = p.useSessionStatus((s) => s);
      const [prefs, setPrefs] = React.useState(() => {
        try {
          return clean(JSON.parse(localStorage.getItem(KEY) || "null"));
        } catch {
          return clean(null);
        }
      });
      const [editor, setEditor] = React.useState(null);
      const [rename, setRename] = React.useState(null);
      const actionOrigin = React.useRef(null);
      const focusPending = React.useRef(false);
      // Stable mount ref: focus the editor and select the whole title once, so
      // typing replaces it instead of appending. Later renders keep the same
      // function identity and never re-select while the user edits.
      const focusRename = React.useRef(null);
      if (!focusRename.current)
        focusRename.current = (node) => {
          if (!node) return;
          node.focus();
          node.select();
        };
      const composing = React.useRef(false);
      function cancelRename() {
        if (lock.current) return;
        setRename(null);
        setError("");
        focusPending.current = true;
      }
      const [error, setError] = React.useState(""),
        [showArchived, setShowArchived] = React.useState(false),
        [fold, setFold] = React.useState({}),
        [menu, setMenu] = React.useState(null),
        [busy, setBusy] = React.useState(false),
        [over, setOver] = React.useState(null),
        [find, setFind] = React.useState(null),
        [hits, setHits] = React.useState(null),
        [pinsOpen, setPinsOpen] = React.useState(true),
        [reveal, setReveal] = React.useState(null),
        [flash, setFlash] = React.useState(null),
        // Local calendar day; the Recent section is rebuilt when it changes.
        [day, setDay] = React.useState(() => dayKey(Date.now()));
      const findInput = React.useRef(null),
        findTrigger = React.useRef(null),
        scrollBox = React.useRef(null),
        foldAnchor = React.useRef(null);
      // Collapsing removes rows, so keep the clicked header at the same
      // viewport position instead of letting the scroll container jump.
      function scrollable(node) {
        if (typeof document === "undefined") return null;
        for (let el = node?.parentElement; el; el = el.parentElement) {
          const overflow = getComputedStyle(el).overflowY;
          if (
            (overflow === "auto" || overflow === "scroll") &&
            el.scrollHeight > el.clientHeight
          )
            return el;
        }
        return null;
      }
      function toggleFold(button, apply) {
        const box = scrollable(button) || scrollBox.current;
        foldAnchor.current =
          typeof document !== "undefined" &&
          box &&
          button?.getBoundingClientRect
            ? { button, box, top: button.getBoundingClientRect().top }
            : null;
        apply();
      }
      React.useEffect(() => {
        const saved = foldAnchor.current;
        foldAnchor.current = null;
        if (!saved?.button?.isConnected || !saved.box) return;
        saved.box.scrollTop +=
          saved.button.getBoundingClientRect().top - saved.top;
      }, [fold, pinsOpen]);
      React.useEffect(() => {
        // Wait until React re-enables the row action after rename/pending state.
        if (focusPending.current && !busy && !rename && !menu) {
          focusPending.current = false;
          actionOrigin.current?.focus();
        }
      }, [busy, rename, menu]);
      React.useEffect(() => {
        // One timer at the next local midnight keeps the day boundary fresh
        // without polling; a resumed tab rechecks on visibility instead.
        function sync() {
          const next = dayKey(Date.now());
          setDay((current) => (current === next ? current : next));
        }
        const now = Date.now();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const timer = setTimeout(
          sync,
          Math.max(1000, midnight.getTime() - now + 1000),
        );
        function onVisible() {
          if (
            typeof document === "undefined" ||
            document.visibilityState === "visible"
          )
            sync();
        }
        window.addEventListener("visibilitychange", onVisible);
        return () => {
          clearTimeout(timer);
          window.removeEventListener("visibilitychange", onVisible);
        };
      }, [day]);
      React.useEffect(() => {
        // Drop the transient locate highlight once the row has settled.
        if (flash === null) return;
        const timer = setTimeout(() => setFlash(null), 1400);
        return () => clearTimeout(timer);
      }, [flash]);
      React.useEffect(() => {
        // Runs again after a fold change has rendered the target row.
        if (!reveal || typeof document === "undefined") return;
        const nodes = document.querySelectorAll("[data-session]");
        const node = Array.prototype.find.call(
          nodes,
          (el) => el.getAttribute("data-session") === reveal.id,
        );
        if (!node) return;
        node.scrollIntoView?.({ block: "center" });
        setFlash(reveal.id);
        setReveal(null);
      }, [reveal, fold, showArchived]);
      const prefsRef = React.useRef(prefs);
      prefsRef.current = prefs;
      const drag = React.useRef(null),
        lock = React.useRef(false),
        mounted = React.useRef(true);
      React.useEffect(() => {
        mounted.current = true;
        try {
          const raw = localStorage.getItem(KEY);
          if (raw) JSON.parse(raw);
        } catch (e) {
          setError(e.message);
        }
        return () => {
          mounted.current = false;
          drag.current = null;
        };
      }, []);
      React.useEffect(() => {
        function sync(e) {
          if (e.key === KEY) {
            try {
              const next = clean(JSON.parse(e.newValue));
              prefsRef.current = next;
              setPrefs(next);
            } catch {
              setError(t("invalidOrder"));
            }
          }
        }
        window.addEventListener("storage", sync);
        return () => window.removeEventListener("storage", sync);
      }, []);
      function save(next) {
        if (!mounted.current) return;
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
          prefsRef.current = next;
          setPrefs(next);
        } catch (e) {
          setError(e.message);
        }
      }
      async function run(fn) {
        if (lock.current || ws.phase !== "ready" || ws.state === "loading")
          return;
        lock.current = true;
        setBusy(true);
        setError("");
        try {
          await fn();
        } catch (e) {
          if (mounted.current) setError(e.message || String(e));
        } finally {
          lock.current = false;
          if (mounted.current) setBusy(false);
        }
      }
      const byId = list.byId,
        pins = new Set(ws.pinnedSessionIds),
        archives = new Set(ws.archivedSessionIds),
        groups = ws.items;
      React.useEffect(() => {
        // A pin response can publish its snapshot before the awaiting drop resumes.
        // Reconcile after that operation, not during its pending ordering commit.
        if (
          busy ||
          lock.current ||
          ws.phase !== "ready" ||
          prefs.mode !== "manual"
        )
          return;
        const next = reconcilePins(ws.pinnedSessionIds, prefs.orders.pins);
        if (JSON.stringify(next) !== JSON.stringify(prefs.orders.pins))
          save({ ...prefs, orders: { ...prefs.orders, pins: next } });
      }, [ws.pinnedSessionIds, ws.phase, prefs, busy]);
      const owner = new Map(
        groups.flatMap((g) => g.sessionIds.map((id) => [id, g.workspaceId])),
      );
      const active = list.ids.find(
        (id) => (byId[id]?.retainedBy?.mainView ?? 0) > 0,
      );
      const valid = (id) =>
        byId[id] &&
        byId[id].origin !== "subagent" &&
        (!byId[id].blank || id === active);
      const title = (id) =>
        byId[id]?.title || t(byId[id]?.blank ? "new" : "untitled");
      const label = (id) =>
        groups.find((g) => g.workspaceId === owner.get(id))?.title ??
        t("ungrouped");
      const visible = (id) =>
        valid(id) && (rename?.id === id || showArchived || !archives.has(id));
      function ordered(ids, key) {
        return prefs.mode === "recent"
          ? recent(ids, byId)
          : key === "pins"
            ? reconcilePins(ids, prefs.orders[key])
            : reconcile(ids, prefs.orders[key]);
      }
      const pinIds = ordered(
        ws.pinnedSessionIds.filter((id) => !archives.has(id)),
        "pins",
      );
      // Sessions touched today stay in one recent bucket above the workspace
      // groups, then fall back to their own workspace on the next local day.
      // The list snapshot carries no creation time, so today's activity is the
      // durable signal available to the plugin.
      const today = dayKey(day);
      const recentIds = recent(
        list.ids.filter(
          (id) =>
            valid(id) &&
            !byId[id].blank &&
            !pins.has(id) &&
            !archives.has(id) &&
            byId[id].updatedAt != null &&
            dayKey(byId[id].updatedAt) === today,
        ),
        byId,
      );
      const recentSet = new Set(recentIds);
      function reorder(key, ids, id, before) {
        const currentPrefs = prefsRef.current;
        const orders = { ...currentPrefs.orders };
        if (currentPrefs.mode === "recent") {
          orders.pins = recent(ws.pinnedSessionIds, byId);
          for (const g of groups)
            orders[g.workspaceId] = recent(g.sessionIds, byId);
          orders.ungrouped = recent(
            list.ids.filter((id) => !owner.has(id)),
            byId,
          );
        }
        save({
          ...currentPrefs,
          mode: "manual",
          orders: { ...orders, [key]: move(ids, id, before) },
        });
      }
      function eligible(id) {
        return valid(id) && !byId[id].blank && !archives.has(id);
      }
      function shownIds(key, ids) {
        return ids.filter(
          (id) =>
            visible(id) && eligible(id) && (key === "pins" || !pins.has(id)),
        );
      }
      // Search: local title/Workspace matches plus Host message-content hits.
      // Archived conversations stay out of results, like the default list.
      const SEARCH_DEBOUNCE_MS = 250,
        SEARCH_LIMIT = 20,
        SEARCH_MAX_CODE_UNITS = 500;
      // Keep the sent phrase inside the Host's session.search contract: strip
      // NUL and cap length without splitting a surrogate pair.
      function sanitizeQuery(value) {
        const withoutNul = value.replaceAll("\0", "");
        if (withoutNul.length <= SEARCH_MAX_CODE_UNITS) return withoutNul;
        let end = SEARCH_MAX_CODE_UNITS;
        const last = withoutNul.charCodeAt(end - 1),
          next = withoutNul.charCodeAt(end);
        if (
          last >= 0xd800 &&
          last <= 0xdbff &&
          next >= 0xdc00 &&
          next <= 0xdfff
        )
          end--;
        return withoutNul.slice(0, end);
      }
      const searchText = find === null ? "" : sanitizeQuery(find.query).trim();
      const limit = api.searchLimit?.() > 0 ? api.searchLimit() : SEARCH_LIMIT;
      React.useEffect(() => {
        if (searchText === "") {
          setHits(null);
          return;
        }
        const controller = new AbortController();
        let cancelled = false;
        setHits({
          query: searchText,
          status: "loading",
          items: [],
          hasMore: false,
          error: "",
        });
        const timer = setTimeout(() => {
          api
            .searchContent(searchText, controller.signal)
            .then((result) => {
              if (cancelled) return;
              setHits({
                query: searchText,
                status: "ready",
                items: result.items,
                hasMore: result.hasMore,
                error: "",
              });
            })
            .catch((reason) => {
              if (cancelled || controller.signal.aborted) return;
              const message = String(reason?.message || reason);
              // Deployments can turn the session-query index off (openAt
              // "never"). That is a configuration, not a failure: keep the
              // name matches and explain the missing content results.
              const disabled =
                /session search is disabled|session-query index/i.test(message);
              setHits({
                query: searchText,
                status: disabled ? "disabled" : "error",
                items: [],
                hasMore: false,
                error: message,
              });
            });
        }, SEARCH_DEBOUNCE_MS);
        return () => {
          cancelled = true;
          clearTimeout(timer);
          controller.abort();
        };
      }, [searchText, find !== null, api]);
      React.useEffect(() => {
        if (find !== null) findInput.current?.focus?.();
      }, [find !== null]);
      function searchRows() {
        if (searchText === "") return { total: 0, rows: [] };
        const q = searchText.toLowerCase();
        const include = (id) =>
          valid(id) && !byId[id].blank && !archives.has(id);
        const snippetOf = new Map();
        const content =
          hits && hits.query === searchText && hits.status === "ready"
            ? hits.items
            : [];
        for (const item of content)
          if (!snippetOf.has(item.sessionId))
            snippetOf.set(item.sessionId, item.snippet || "");
        const ids = [],
          groups = new Map(),
          seen = new Set();
        for (const id of recent(
          list.ids.filter(
            (id) =>
              include(id) &&
              (title(id).toLowerCase().includes(q) ||
                label(id).toLowerCase().includes(q)),
          ),
          byId,
        )) {
          seen.add(id);
          ids.push(id);
          groups.set(id, "sessions");
        }
        for (const id of snippetOf.keys())
          if (!seen.has(id) && include(id)) {
            ids.push(id);
            groups.set(id, "content");
          }
        return {
          total: ids.length,
          rows: ids.slice(0, limit).map((id) => ({
            id,
            group: groups.get(id) || "sessions",
            title: title(id),
            workspace: label(id),
            snippet: snippetOf.get(id) || "",
          })),
        };
      }
      function openFind() {
        if (lock.current || busy || rename) return;
        setMenu(null);
        setFind({ query: "", active: 0 });
      }
      function closeFind() {
        setFind(null);
        setHits(null);
        findTrigger.current?.focus?.();
      }
      function openResult(id) {
        setFind(null);
        setHits(null);
        api.open(id);
      }
      function locateCurrent() {
        if (!active) return;
        const key = pins.has(active)
          ? "pins"
          : (owner.get(active) ?? "ungrouped");
        if (fold[key]) {
          const next = { ...fold };
          delete next[key];
          setFold(next);
        }
        if (archives.has(active)) setShowArchived(true);
        setReveal({ id: active });
      }
      function findKeys(e) {
        const { rows } = searchRows(),
          active = find === null ? 0 : find.active;
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation?.();
          closeFind();
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const delta = e.key === "ArrowDown" ? 1 : -1;
          setFind(
            (f) =>
              f && {
                ...f,
                active: Math.max(
                  0,
                  Math.min(Math.max(0, rows.length - 1), f.active + delta),
                ),
              },
          );
        } else if (e.key === "Enter") {
          const row = rows[Math.min(active, Math.max(0, rows.length - 1))];
          if (row) {
            e.preventDefault();
            openResult(row.id);
          }
        } else if (
          e.key === "Tab" &&
          typeof document !== "undefined" &&
          e.currentTarget
        ) {
          const focusable = [
            ...e.currentTarget.querySelectorAll(
              "button:not(:disabled), input:not(:disabled)",
            ),
          ];
          const first = focusable[0],
            last = focusable[focusable.length - 1];
          if (!first) return;
          if (first === last) {
            e.preventDefault();
            first.focus();
            return;
          }
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      function target(key, ids, rowId, e) {
        const id = drag.current;
        if (
          lock.current ||
          ws.phase !== "ready" ||
          ws.state === "loading" ||
          !id ||
          !eligible(id) ||
          (key !== "pins" &&
            (fold[key] || (owner.get(id) || "ungrouped") !== key))
        )
          return null;
        const shown = shownIds(key, ids);
        let before,
          edge = "end";
        if (rowId !== undefined) {
          if (!shown.includes(rowId)) return null;
          const rect = e.currentTarget.getBoundingClientRect();
          edge = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
          before = edge === "before" ? rowId : shown[shown.indexOf(rowId) + 1];
        }
        if (before === id) return null;
        const sameSection = key === "pins" ? pins.has(id) : !pins.has(id);
        if (
          sameSection &&
          move(shown, id, before).every((x, i) => x === shown[i])
        )
          return null;
        return { key, before, row: rowId, edge };
      }
      function hover(e, key, ids, rowId) {
        e.stopPropagation();
        const next = target(key, ids, rowId, e);
        setOver(next);
        if (next) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }
      }
      function leave(e) {
        if (!e.currentTarget.contains(e.relatedTarget)) setOver(null);
      }
      function indicator(key, ids, rowId) {
        if (!over || over.key !== key || over.row !== rowId) return undefined;
        // Revalidate after snapshot changes without retaining a DOM event.
        const current = target(key, ids, rowId, {
          clientY: over.edge === "before" ? 0 : 1,
          currentTarget: {
            getBoundingClientRect: () => ({ top: 0, height: 1 }),
          },
        });
        return current && current.before === over.before
          ? over.edge
          : undefined;
      }
      function drop(e, key, ids, rowId) {
        e.preventDefault();
        e.stopPropagation();
        const next = target(key, ids, rowId, e);
        const id = drag.current;
        drag.current = null;
        setOver(null);
        if (!next) return;
        run(async () => {
          const startingPrefs = prefsRef.current;
          if (key === "pins" && !pins.has(id)) await api.pin(id);
          else if (key !== "pins" && pins.has(id)) await api.unpin(id);
          if (prefsRef.current !== startingPrefs) {
            if (mounted.current) setError(t("orderChanged"));
            return;
          }
          reorder(key, reconcile([id, ...ids], ids), id, next.before);
        });
      }
      function closeMenu(restoreFocus = true) {
        setMenu(null);
        if (restoreFocus) focusPending.current = true;
      }
      function openMenu(id, origin) {
        if (lock.current || rename) return;
        actionOrigin.current = origin;
        setMenu(id);
        drag.current = null;
        setOver(null);
      }
      function menuKeys(e) {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          closeMenu();
        } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const items = [
            ...e.currentTarget.querySelectorAll(
              '[role="menuitem"]:not(:disabled)',
            ),
          ];
          const index = items.indexOf(e.target);
          const next =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? items.length - 1
                : (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
                  items.length;
          items[next]?.focus();
        }
      }
      function row(id, key, ids, fixed = false) {
        if (!visible(id)) return null;
        const archived = archives.has(id),
          status = statuses.get(id),
          running = status?.running ?? byId[id].running,
          completed =
            !running &&
            !archived &&
            !byId[id].blank &&
            status?.completionUnread === true;
        return h(
          "div",
          { key: id, className: "gp-row-wrap" },
          h(
            "div",
            {
              className: "gp-row",
              "data-session": id,
              "data-selected": id === active,
              "data-running": running ? "true" : undefined,
              "data-flash": flash === id ? "true" : undefined,
              "data-drop": fixed ? undefined : indicator(key, ids, id),
              draggable:
                !fixed &&
                !busy &&
                !rename &&
                !menu &&
                ws.phase === "ready" &&
                !archived &&
                !byId[id].blank,
              onContextMenu: (e) => {
                if (
                  e.target.closest("input,textarea") ||
                  byId[id].blank ||
                  rename
                )
                  return;
                e.preventDefault();
                e.stopPropagation();
                openMenu(
                  id,
                  e.currentTarget.querySelector(".gp-title:not([disabled])") ||
                    e.currentTarget.querySelector(
                      ".gp-actions button:not([disabled])",
                    ),
                );
              },
              onDragStart: (e) => {
                if (
                  fixed ||
                  rename ||
                  menu ||
                  lock.current ||
                  e.target?.closest("button,input,form")
                ) {
                  e.preventDefault();
                  return;
                }
                drag.current = id;
                e.dataTransfer.setData("text/plain", id);
                e.dataTransfer.effectAllowed = "move";
              },
              onDragEnd: () => {
                drag.current = null;
                setOver(null);
              },
              onDragOver: fixed ? undefined : (e) => hover(e, key, ids, id),
              onDragLeave: fixed ? undefined : leave,
              onDrop: fixed ? undefined : (e) => drop(e, key, ids, id),
            },
            rename?.id === id
              ? h(
                  "form",
                  {
                    className: "gp-rename",
                    onClick: (e) => e.stopPropagation(),
                    onDragStart: (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    },
                    onSubmit: (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const value = rename.value.trim();
                      if (!value || composing.current) return;
                      run(async () => {
                        await api.rename(id, value);
                        if (mounted.current) {
                          setRename(null);
                          focusPending.current = true;
                        }
                      });
                    },
                    onKeyDown: (e) => {
                      e.stopPropagation();
                      if (
                        e.isComposing ||
                        e.nativeEvent?.isComposing ||
                        e.keyCode === 229 ||
                        composing.current
                      ) {
                        if (e.key === "Enter") e.preventDefault();
                        return;
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelRename();
                      }
                    },
                  },
                  h("input", {
                    ref: focusRename.current,
                    "aria-label": t("rename"),
                    value: rename.value,
                    disabled: busy,
                    onCompositionStart: () => {
                      composing.current = true;
                    },
                    onCompositionEnd: () => {
                      composing.current = false;
                    },
                    onChange: (e) => setRename({ id, value: e.target.value }),
                  }),
                  h(
                    "button",
                    {
                      type: "submit",
                      disabled: busy || !rename.value.trim(),
                      "aria-label": t("save"),
                      title: t("save"),
                    },
                    "✓",
                  ),
                  h(
                    "button",
                    {
                      type: "button",
                      disabled: busy,
                      onClick: cancelRename,
                      "aria-label": t("cancel"),
                      title: t("cancel"),
                    },
                    "×",
                  ),
                )
              : h(
                  "button",
                  {
                    className: "gp-title",
                    disabled: archived,
                    title: title(id),
                    onClick: () => api.open(id),
                  },
                  title(id),
                ),
            completed &&
              h("span", {
                className: "gp-completed",
                role: "img",
                "aria-label": t("completed"),
                title: t("completed"),
              }),
            !byId[id].blank &&
              h(
                "span",
                { className: "gp-actions" },
                running
                  ? h(
                      "span",
                      {
                        className: "gp-spin",
                        role: "img",
                        "aria-label": t("running"),
                        title: t("running"),
                      },
                      spinnerIcon(),
                    )
                  : null,
                h(
                  "span",
                  { className: "gp-row-actions" },
                  h(
                    "button",
                    {
                      disabled: busy || archived || Boolean(rename),
                      title: t(pins.has(id) ? "unpin" : "pin"),
                      "aria-label": t(pins.has(id) ? "unpin" : "pin"),
                      onClick: () =>
                        run(() => (pins.has(id) ? api.unpin(id) : api.pin(id))),
                    },
                    pinIcon(pins.has(id)),
                  ),
                  h(
                    "button",
                    {
                      disabled: busy || Boolean(rename),
                      title: t(archived ? "restore" : "archive"),
                      "aria-label": t(archived ? "restore" : "archive"),
                      onClick: () =>
                        run(() =>
                          archived ? api.restore(id) : api.archive(id),
                        ),
                    },
                    archiveIcon(),
                  ),
                ),
              ),
          ),
          menu === id &&
            h(
              "div",
              {
                className: "gp-menu gp-row-menu",
                role: "menu",
                "aria-label": t("more"),
                ref: (node) => {
                  if (node && !node.contains(node.ownerDocument.activeElement))
                    node.querySelector('[role="menuitem"]')?.focus();
                },
                onKeyDown: menuKeys,
                onBlur: (e) => {
                  if (
                    e.relatedTarget !== actionOrigin.current &&
                    !e.currentTarget.contains(e.relatedTarget)
                  )
                    closeMenu(false);
                },
                onContextMenu: (e) => e.preventDefault(),
              },
              ...[
                "rename",
                "fork",
                archived ? "restore" : "archive",
                ...(fixed ? [] : ["up", "down"]),
              ].map((action) =>
                h(
                  "button",
                  {
                    key: action,
                    role: "menuitem",
                    disabled: busy,
                    onClick: () => {
                      closeMenu(action !== "rename");
                      if (lock.current) return;
                      if (action === "rename") {
                        composing.current = false;
                        setError("");
                        setRename({ id, value: title(id) });
                        return;
                      }
                      run(async () => {
                        if (action === "up" || action === "down") {
                          const visibleIds = ids.filter(
                            (x) =>
                              visible(x) && (key === "pins" || !pins.has(x)),
                          );
                          const i = visibleIds.indexOf(id);
                          reorder(
                            key,
                            ids,
                            id,
                            action === "up"
                              ? visibleIds[Math.max(0, i - 1)]
                              : visibleIds[i + 2],
                          );
                        } else await api[action](id);
                      });
                    },
                  },
                  t(action),
                ),
              ),
            ),
        );
      }
      if (!p.wide)
        return h(
          "button",
          { onClick: p.expandSidebar, title: t("pins") },
          pinIcon(),
        );
      return h(
        "section",
        {
          className: "gp",
          ref: scrollBox,
          "aria-label": t("pins"),
          onKeyDown: (e) => {
            if (
              rename &&
              e.key === "Escape" &&
              !e.isComposing &&
              !e.nativeEvent?.isComposing &&
              !composing.current
            ) {
              e.preventDefault();
              e.stopPropagation();
              cancelRename();
            }
          },
        },
        h(
          "style",
          null,
          css +
            `
.gp-row-wrap{position:relative}.gp-row-menu{position:absolute;right:0;top:100%;z-index:20;min-width:150px;display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay)}.gp-row-menu button{text-align:left}.gp-actions button{color:var(--dsw-alias-label-tertiary)}.gp-actions button:hover{color:var(--dsw-alias-label-primary)}
.gp-rename{display:flex;align-items:center;flex:1;min-width:0}.gp-rename input{min-width:0;width:100%;flex:1}.gp-actions{display:flex;align-items:center;justify-content:flex-end;flex:none;min-width:48px}.gp-row-actions{display:inline-flex;align-items:center}.gp-actions button{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0}.gp-actions svg{flex:none;display:block}.gp-spin{display:none;align-items:center;justify-content:center;width:24px;height:24px;color:var(--dsw-alias-label-tertiary)}.gp-row[data-running=true] .gp-spin{display:inline-flex}.gp-row[data-running=true] .gp-row-actions{display:none}.gp-row[data-running=true]:hover .gp-spin,.gp-row[data-running=true]:focus-within .gp-spin{display:none}.gp-row[data-running=true]:hover .gp-row-actions,.gp-row[data-running=true]:focus-within .gp-row-actions{display:inline-flex}.gp-spin svg{animation:gp-spin-frame 1s linear infinite}@keyframes gp-spin-frame{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.gp-spin svg{animation:none}}
.gp-completed{width:6px;height:6px;flex:none;border-radius:50%;margin:0 5px;background:var(--dsw-alias-state-success-primary)}
.gp-row,.gp-drop,.gp-group{position:relative}
.gp [data-drop]::before{content:"";position:absolute;left:8px;right:8px;height:2px;background:var(--dsw-alias-brand-primary);z-index:2;pointer-events:none}
.gp [data-drop]::after{content:"";position:absolute;left:5px;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary);z-index:2;pointer-events:none}
.gp [data-drop="before"]::before{top:-1px}.gp [data-drop="before"]::after{top:-3px}
.gp [data-drop="after"]::before,.gp [data-drop="end"]::before{bottom:-1px}
.gp [data-drop="after"]::after,.gp [data-drop="end"]::after{bottom:-3px}
.gp{font-size:13px}.gp-header strong{font-size:12px}.gp-row{min-height:32px}.gp-header{background:rgba(127,127,127,.13);backdrop-filter:blur(8px);border-radius:7px;padding:2px 6px}.gp-pins{display:flex;flex-direction:column}.gp-group{margin-top:8px;padding-top:0}.gp-recent{margin-top:8px}.gp-header{margin:6px 0 3px;padding:2px 6px}.gp-locate{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0}.gp-locate:disabled{opacity:.4;cursor:default}.gp-row[data-flash=true]{animation:gp-flash 1.4s ease-out}@keyframes gp-flash{0%,55%{background:var(--dsw-alias-bg-layer-3)}100%{background:transparent}}@media (prefers-reduced-motion:reduce){.gp-row[data-flash=true]{animation:none}}
`,
        ),
        editor &&
          h(
            "form",
            {
              className: "gp-menu",
              onSubmit: (e) => {
                e.preventDefault();
                const value = editor.value.trim();
                if (value)
                  run(async () => {
                    await editor.submit(value);
                    if (mounted.current) setEditor(null);
                  });
              },
              onKeyDown: (e) => {
                if (e.key === "Escape") setEditor(null);
              },
            },
            h(
              "label",
              null,
              editor.label,
              h("input", {
                autoFocus: true,
                value: editor.value,
                onChange: (e) =>
                  setEditor({ ...editor, value: e.target.value }),
              }),
            ),
            h(
              "button",
              { type: "submit", disabled: busy || !editor.value.trim() },
              t("save"),
            ),
            h(
              "button",
              {
                type: "button",
                disabled: busy,
                onClick: () => setEditor(null),
              },
              t("cancel"),
            ),
          ),
        h(
          "div",
          { className: "gp-header" },
          h("button", { onClick: () => api.start() }, "+ " + t("new")),
          h(
            "button",
            {
              disabled: busy,
              onClick: () =>
                setEditor({
                  label: t("path"),
                  value: "",
                  submit: (path) => api.create(path),
                }),
            },
            "+ " + t("add"),
          ),
        ),
        (ws.phase !== "ready" || ws.state === "loading") &&
          h("div", { className: "gp-note", role: "status" }, t("loading")),
        ws.error &&
          h(
            "div",
            { className: "gp-error", role: "alert" },
            ws.error.message || String(ws.error),
          ),
        error &&
          h(
            "div",
            { className: "gp-error", role: "alert" },
            t("failure"),
            ": ",
            error,
          ),
        h(
          "div",
          { className: "gp-header" },
          h(
            "button",
            {
              className: "gp-fold",
              disabled: Boolean(rename),
              "aria-expanded": pinsOpen,
              onClick: (e) =>
                toggleFold(e?.currentTarget, () => setPinsOpen(!pinsOpen)),
            },
            pinsOpen ? "▾" : "▸",
          ),
          h("strong", null, t("pins")),
          h(
            "button",
            {
              ref: findTrigger,
              className: "gp-search-open",
              title: t("searchOpen"),
              "aria-label": t("searchOpen"),
              disabled: busy || Boolean(rename),
              onClick: openFind,
            },
            searchIcon(),
          ),
          h(
            "button",
            {
              className: "gp-locate",
              title: t("locate"),
              "aria-label": t("locate"),
              disabled: !active || busy || Boolean(rename),
              onClick: locateCurrent,
            },
            locateIcon(),
          ),
          h(
            "details",
            {
              className: "gp-sort",
              onBlur: (e) => {
                if (!e.currentTarget.contains(e.relatedTarget))
                  e.currentTarget.open = false;
              },
              onKeyDown: (e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.currentTarget.open = false;
                  e.currentTarget.querySelector("summary").focus();
                }
              },
            },
            h(
              "summary",
              {
                title: t("sort"),
                "aria-label": t("sort"),
                "aria-disabled": busy || ws.phase !== "ready",
                onClick: (e) => {
                  if (busy || ws.phase !== "ready") e.preventDefault();
                },
              },
              "⋯",
            ),
            h(
              "div",
              {
                className: "gp-sort-options",
                role: "group",
                "aria-label": t("sort"),
              },
              ...["manual", "recent"].map((mode) =>
                h(
                  "button",
                  {
                    key: mode,
                    type: "button",
                    disabled: busy || ws.phase !== "ready",
                    "aria-pressed": prefs.mode === mode,
                    onClick: (e) => {
                      const popup = e.currentTarget.closest("details");
                      popup.open = false;
                      popup.querySelector("summary").focus();
                      if (mode === prefs.mode) return;
                      const orders = {};
                      if (mode === "manual") {
                        orders.pins = pinIds;
                        for (const g of groups)
                          orders[g.workspaceId] = recent(g.sessionIds, byId);
                        orders.ungrouped = recent(
                          list.ids.filter((id) => !owner.has(id)),
                          byId,
                        );
                      }
                      save({ mode, orders });
                    },
                  },
                  t(mode),
                  h(
                    "span",
                    { "aria-hidden": "true" },
                    prefs.mode === mode ? "✓" : "",
                  ),
                ),
              ),
            ),
          ),
        ),
        pinsOpen &&
          h(
            "div",
            {
              className: "gp-drop",
              "data-drop": indicator("pins", pinIds),
              onDragOver: (e) => hover(e, "pins", pinIds),
              onDragLeave: leave,
              onDrop: (e) => drop(e, "pins", pinIds),
            },
            h(
              "div",
              { className: "gp-pins" },
              pinIds.some(visible)
                ? pinIds.map((id) => row(id, "pins", pinIds))
                : h("div", { className: "gp-note" }, t("empty")),
            ),
          ),
        recentIds.length > 0 &&
          h(
            "section",
            {
              className: "gp-group gp-recent",
              "aria-label": t("recentSessions"),
            },
            h(
              "div",
              { className: "gp-header" },
              h("strong", null, t("recentSessions")),
            ),
            recentIds.map((id) => row(id, "recent", recentIds, true)),
          ),
        h(
          "div",
          { className: "gp-header" },
          h("strong", null, t("workspaces")),
        ),
        ...[
          ...groups,
          {
            workspaceId: "ungrouped",
            title: t("ungrouped"),
            sessionIds: list.ids.filter((id) => !owner.has(id)),
          },
        ].map((g) => {
          const ids = ordered(g.sessionIds, g.workspaceId),
            shown = partition(
              ids,
              ws.pinnedSessionIds,
              ws.archivedSessionIds,
            ).ordinary.filter((id) => !recentSet.has(id));
          return h(
            "section",
            {
              key: g.workspaceId,
              className: "gp-group",
              "data-drop": indicator(g.workspaceId, ids),
              onDragOver: (e) => hover(e, g.workspaceId, ids),
              onDragLeave: leave,
              onDrop: (e) => drop(e, g.workspaceId, ids),
            },
            h(
              "div",
              { className: "gp-header" },
              h(
                "button",
                {
                  className: "gp-fold",
                  disabled: Boolean(rename),
                  "aria-expanded": !fold[g.workspaceId],
                  onClick: (e) =>
                    toggleFold(e?.currentTarget, () =>
                      setFold({
                        ...fold,
                        [g.workspaceId]: !fold[g.workspaceId],
                      }),
                    ),
                },
                fold[g.workspaceId] ? "▸" : "▾",
              ),
              h("strong", null, g.title),
              g.workspaceId !== "ungrouped" &&
                h(
                  "button",
                  { title: t("new"), onClick: () => api.start(g.workspaceId) },
                  "+",
                ),
              g.workspaceId !== "ungrouped" &&
                h(
                  "button",
                  {
                    title: t("rename"),
                    onClick: () =>
                      setEditor({
                        label: t("rename"),
                        value: g.title,
                        submit: (title) =>
                          api.renameWorkspace(g.workspaceId, title),
                      }),
                  },
                  "✎",
                ),
            ),
            !fold[g.workspaceId] &&
              shown.map((id) => row(id, g.workspaceId, ids)),
          );
        }),
        h(
          "label",
          { className: "gp-note" },
          h("input", {
            type: "checkbox",
            checked: showArchived,
            onChange: (e) => setShowArchived(e.target.checked),
          }),
          t("archived"),
        ),
        find !== null &&
          h(
            "div",
            {
              className: "gp-find",
              onMouseDown: (e) => {
                if (e.target === e.currentTarget) closeFind();
              },
            },
            (() => {
              const { rows, total } = searchRows(),
                active = Math.min(find.active, Math.max(0, rows.length - 1));
              const pending =
                searchText !== "" &&
                (!hits ||
                  hits.query !== searchText ||
                  hits.status === "loading");
              const failed =
                hits && hits.query === searchText && hits.status === "error"
                  ? hits.error
                  : "";
              const ready =
                Boolean(hits) &&
                hits.query === searchText &&
                hits.status === "ready";
              const disabled =
                Boolean(hits) &&
                hits.query === searchText &&
                hits.status === "disabled";
              const statusText =
                pending && rows.length === 0
                  ? t("searching")
                  : failed
                    ? t("searchFailed") + ": " + failed
                    : disabled
                      ? t("contentDisabled")
                      : ready && rows.length === 0
                        ? t("noMatches")
                        : "";
              return h(
                "div",
                {
                  className: "gp-find-panel",
                  role: "dialog",
                  "aria-modal": "true",
                  "aria-label": t("searchOpen"),
                  onKeyDown: findKeys,
                },
                h("input", {
                  ref: findInput,
                  className: "gp-find-input",
                  type: "search",
                  value: find.query,
                  placeholder: t("searchPlaceholder"),
                  "aria-label": t("searchPlaceholder"),
                  "aria-controls": "gp-find-results",
                  onChange: (e) =>
                    setFind({ ...find, query: e.target.value, active: 0 }),
                }),
                h(
                  "div",
                  {
                    id: "gp-find-results",
                    className: "gp-find-results",
                    role: "listbox",
                    "aria-label": t("searchOpen"),
                  },
                  rows.map((row, i) => {
                    const header =
                      i === 0 || row.group !== rows[i - 1].group
                        ? h(
                            "div",
                            {
                              key: "group-" + row.group,
                              className: "gp-find-group",
                              role: "presentation",
                            },
                            row.group === "content"
                              ? t("groupContent")
                              : t("groupSessions"),
                          )
                        : null;
                    return [
                      header,
                      h(
                        "button",
                        {
                          key: row.id,
                          role: "option",
                          "aria-selected": i === active,
                          "data-active": i === active ? "true" : undefined,
                          className: "gp-find-row",
                          onClick: () => openResult(row.id),
                        },
                        h("span", { className: "gp-find-title" }, row.title),
                        h(
                          "span",
                          { className: "gp-find-where" },
                          row.workspace,
                        ),
                        row.snippet
                          ? h(
                              "span",
                              { className: "gp-find-snippet" },
                              row.snippet,
                            )
                          : null,
                      ),
                    ];
                  }),
                ),
                statusText
                  ? h(
                      "div",
                      {
                        className: "gp-find-status",
                        role: "status",
                        title: disabled ? hits.error : undefined,
                      },
                      statusText,
                    )
                  : null,
                ready &&
                  (hits.hasMore || total > limit) &&
                  h(
                    "div",
                    { className: "gp-find-status", role: "status" },
                    t("searchMore").replace("{n}", String(limit)),
                  ),
                h("div", { className: "gp-find-hint" }, t("searchHint")),
              );
            })(),
          ),
      );
    }
    return {
      inject: [
        "slots",
        "locale",
        "uiWorkspace",
        "workspaces",
        "sessions",
        "remote",
        "remote.session",
      ],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register("local.globalPins", { en, zh }));
        ctx.slots.inject("sidebar.workspaces", () =>
          ctx.slots.register(
            {
              name: "sidebar.workspaces",
              // SlotCore selects the lowest numeric priority before the built-in 0.
              priority: -100,
              locale: "local.globalPins",
              inject: () => ({
                api: {
                  open: (id) => ctx.uiWorkspace.openSession(id),
                  searchLimit: () => ctx.sessions.searchResultLimit,
                  searchContent: async (query, signal) => {
                    const r = await ctx.sessions.search(query, signal);
                    if (!r.ok) throw new Error(r.error.message);
                    return {
                      items: r.value.items,
                      hasMore: r.value.hasMore,
                    };
                  },
                  start: (id) => ctx.uiWorkspace.startSession(id),
                  pin: (id) => ctx.workspaces.pinSession(id),
                  unpin: (id) => ctx.workspaces.unpinSession(id),
                  archive: (id) => ctx.uiWorkspace.archiveSession(id),
                  restore: (id) => ctx.uiWorkspace.unarchiveSession(id),
                  fork: (id) =>
                    ctx.uiWorkspace.forkSession(id, undefined, {
                      allowMigration: false,
                    }),
                  rename: async (sessionId, title) => {
                    const r = await ctx.remote.session.rename({
                      sessionId,
                      title,
                    });
                    if (!r.ok) throw new Error(r.error.message);
                  },
                  create: async (path) => {
                    const g = await ctx.workspaces.create({ path });
                    await ctx.uiWorkspace.openWorkspace(g.workspaceId);
                  },
                  renameWorkspace: (id, title) =>
                    ctx.workspaces.rename(id, title),
                },
              }),
            },
            Browser,
          ),
        );
      },
      test: {
        reconcile,
        reconcilePins,
        move,
        recent,
        clean,
        partition,
        dayKey,
      },
    };
  },
});
