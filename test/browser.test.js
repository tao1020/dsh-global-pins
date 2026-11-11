import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// Hook/event unit harness only: no DOM, layout, browser or visual assertions.
const KEY = "local.global-pins.v1";
function setup({
  ids = ["a", "b", "new"],
  pinned = ["a", "b"],
  order = ids,
  locale,
  rename = async () => ({ ok: true }),
  search = async () => ({ ok: true, value: { items: [], hasMore: false } }),
} = {}) {
  let component,
    plugin,
    cursor = 0,
    dirty = false,
    tree;
  const hooks = [],
    effects = [],
    listeners = new Map(),
    storage = new Map();
  storage.set(
    KEY,
    JSON.stringify({ mode: "manual", orders: { pins: pinned, w: order } }),
  );
  const React = {
    Fragment: "fragment",
    createElement(type, props, ...children) {
      return { type, props: props || {}, children: children.flat(Infinity) };
    },
    useState(initial) {
      const i = cursor++;
      if (!(i in hooks))
        hooks[i] = typeof initial === "function" ? initial() : initial;
      return [
        hooks[i],
        (value) => {
          const next = typeof value === "function" ? value(hooks[i]) : value;
          if (!Object.is(next, hooks[i])) {
            hooks[i] = next;
            dirty = true;
          }
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      return (hooks[i] ||= { current: initial });
    },
    useEffect(fn, deps) {
      const i = cursor++,
        old = hooks[i];
      if (!old || deps.some((v, n) => !Object.is(v, old.deps[n]))) {
        effects.push(() => {
          old?.cleanup?.();
          hooks[i] = { deps, cleanup: fn() };
        });
      }
    },
  };
  vm.runInNewContext(
    fs.readFileSync(new URL("../client.js", import.meta.url), "utf8"),
    {
      window: {
        __ModuleLoader__: {
          load(entry) {
            plugin = entry.factory(() => React);
          },
        },
        addEventListener: (event, fn) => listeners.set(event, fn),
        removeEventListener: (event) => listeners.delete(event),
      },
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
      AbortController,
      setTimeout,
      clearTimeout,
    },
  );
  let messages, injected;
  const renameCalls = [],
    openCalls = [],
    searchCalls = [];
  const services = {
    uiWorkspace: {
      openSession: (id) => openCalls.push(id),
      startSession: () => {},
    },
    sessions: {
      searchResultLimit: 20,
      search: (query, signal) => {
        searchCalls.push({ query, signal });
        return search(query, signal);
      },
    },
    workspaces: {},
    remote: new Proxy(
      {},
      {
        get(_target, key) {
          assert.ok(
            plugin.inject.includes(`remote.${key}`),
            `cannot get property "remote.${key}" without inject`,
          );
          return {
            rename: (input) => {
              renameCalls.push(input);
              return rename(input);
            },
          };
        },
      },
    ),
  };
  plugin.apply(
    new Proxy(
      {
        ...services,
        effect: (fn) => fn(),
        locale: {
          register: (_namespace, values) => {
            messages = values;
            return () => {};
          },
        },
        slots: {
          inject: (_name, fn) => fn(),
          register: (options, fn) => {
            assert.equal(options.name, "sidebar.workspaces");
            assert.ok(
              options.priority < 0,
              "lowest priority must shadow built-in 0",
            );
            component = fn;
            injected = options.inject();
            return () => {};
          },
        },
      },
      {
        get(target, key) {
          if (key !== "effect")
            assert.ok(
              plugin.inject.includes(key),
              `cannot get property "${key}" without inject`,
            );
          return target[key];
        },
      },
    ),
  );
  let resolvePin;
  const unpinCalls = [];
  const pinCalls = [];
  const ws = {
    phase: "ready",
    state: "idle",
    pinnedSessionIds: [...pinned],
    archivedSessionIds: [],
    items: [{ workspaceId: "w", title: "Workspace", sessionIds: ids }],
  };
  const list = {
    ids,
    byId: Object.fromEntries(
      ids.map((id, i) => [
        id,
        { id, title: id, updatedAt: 100 - i, retainedBy: {} },
      ]),
    ),
  };
  let statuses = new Map();
  const props = {
    wide: true,
    t: (key) => (locale ? messages[locale][key] : key),
    useSessions: (select) => select(list),
    useWorkspaces: (select) => select(ws),
    useSessionStatus: (select) => select(statuses),
    api: {
      ...injected.api,
      unpin: async (id) => {
        unpinCalls.push(id);
      },
      pin: (id) => {
        pinCalls.push(id);
        return new Promise((resolve) => {
          resolvePin = resolve;
        });
      },
    },
  };
  function render() {
    let count = 0;
    do {
      assert.ok(count++ < 20, "hook effects must settle");
      dirty = false;
      cursor = 0;
      tree = component(props);
      while (effects.length) effects.shift()();
    } while (dirty);
    return tree;
  }
  function nodes(node = tree) {
    if (!node || typeof node !== "object") return [];
    return [
      node,
      ...node.children.flatMap((child) => (child == null ? [] : nodes(child))),
    ];
  }
  const find = (pred) => {
    const node = nodes().find(pred);
    assert.ok(node, "expected event target");
    return node;
  };
  const row = (id) =>
    find(
      (n) =>
        n.props.className === "gp-row" &&
        n.children.some(
          (c) => c?.props?.className === "gp-title" && c.props.title === id,
        ),
    );
  function dragBefore(id, target) {
    row(id).props.onDragStart({ dataTransfer: { setData() {} } });
    row(target).props.onDrop(dragEvent());
    render();
  }
  async function finishPin() {
    resolvePin();
    await new Promise((resolve) => setImmediate(resolve));
    render();
  }
  render();
  return {
    render,
    nodes,
    row,
    find,
    ws,
    list,
    unpinCalls,
    pinCalls,
    renameCalls,
    openCalls,
    searchCalls,
    api: injected.api,
    dragBefore,
    finishPin,
    saved: () => JSON.parse(storage.get(KEY)),
    publishStatuses(entries) {
      statuses = new Map(entries);
      render();
    },
    external(value) {
      storage.set(KEY, JSON.stringify(value));
      listeners.get("storage")({ key: KEY, newValue: JSON.stringify(value) });
      render();
    },
    dispose() {
      for (const hook of hooks) hook?.cleanup?.();
    },
  };
}

test("completion unread dot follows status updates in pinned and ordinary rows", () => {
  const f = setup({ ids: ["a", "b"], pinned: ["a"] });
  const dot = (id) =>
    f.nodes(f.row(id)).find((n) => n.props["aria-label"] === "completed");
  try {
    for (const completionUnread of [true, false, true]) {
      f.publishStatuses(
        ["a", "b"].map((id) => [id, { running: false, completionUnread }]),
      );
      for (const id of ["a", "b"])
        assert.equal(
          Boolean(dot(id)),
          completionUnread,
          `${id}: completion ${completionUnread}`,
        );
    }
    f.publishStatuses(["a", "b"].map((id) => [id, { running: false }]));
    assert.equal(Boolean(dot("a")), false);
    assert.equal(Boolean(dot("b")), false);
    f.publishStatuses([]);
    assert.equal(Boolean(dot("a")), false);
    assert.equal(Boolean(dot("b")), false);
  } finally {
    f.dispose();
  }
});

test("running status takes priority over unread and falls back to the summary", () => {
  const f = setup({ ids: ["a", "b"], pinned: ["a"] });
  const dot = (id) =>
    f.nodes(f.row(id)).some((n) => n.props["aria-label"] === "completed");
  const running = (id) =>
    f.nodes(f.row(id)).some((n) => n.props["aria-label"] === "running");
  try {
    f.list.byId.a.running = true;
    f.list.byId.b.running = false;
    f.publishStatuses([
      ["a", { running: false, completionUnread: true }],
      ["b", { running: true, completionUnread: true }],
    ]);
    assert.equal(running("a"), false, "explicit false overrides stale summary");
    assert.equal(dot("a"), true);
    assert.equal(running("b"), true);
    assert.equal(dot("b"), false, "running suppresses unread completion");
    f.publishStatuses([["a", { completionUnread: true }]]);
    assert.equal(running("a"), true, "missing running field uses summary");
    assert.equal(dot("a"), false);
    assert.equal(running("b"), false);
    f.publishStatuses([]);
    assert.equal(running("a"), true, "missing status uses summary");
    assert.equal(dot("a"), false);
    assert.equal(f.list.byId.a.running, true, "status never mutates summary");
    assert.equal(f.list.byId.b.running, false);
  } finally {
    f.dispose();
  }
});

test("archived and active blank rows suppress completion unread dots", () => {
  const f = setup({ ids: ["a", "b"], pinned: ["a"] });
  try {
    f.ws.archivedSessionIds = ["a"];
    f.list.byId.b.blank = true;
    f.list.byId.b.retainedBy.mainView = 1;
    f.find(
      (n) => n.type === "input" && n.props.type === "checkbox",
    ).props.onChange({ target: { checked: true } });
    f.publishStatuses(
      ["a", "b"].map((id) => [id, { running: false, completionUnread: true }]),
    );
    for (const id of ["a", "b"]) {
      assert.equal(
        f.nodes(f.row(id)).some((n) => n.props["aria-label"] === "completed"),
        false,
      );
    }
  } finally {
    f.dispose();
  }
});

test("completion dot has a localized accessible label and title", () => {
  for (const [locale, label] of [
    ["en", "Completed (unread)"],
    ["zh", "已完成（未读）"],
  ]) {
    const f = setup({ locale });
    try {
      f.publishStatuses([["a", { running: false, completionUnread: true }]]);
      const dot = f.nodes(f.row("a")).find((n) => n.props.role === "img");
      assert.equal(dot.props["aria-label"], label);
      assert.equal(dot.props.title, label);
      assert.ok(
        f.row("a").children.indexOf(dot) > 0,
        "dot follows title on the right",
      );
    } finally {
      f.dispose();
    }
  }
});

test("pin buttons retain the original pin artwork and state", () => {
  const f = setup();
  try {
    for (const [id, label, fill] of [
      ["a", "unpin", "currentColor"],
      ["new", "pin", "none"],
    ]) {
      const actions = f
        .row(id)
        .children.find((n) => n?.props?.className === "gp-actions")
        .children.find((n) => n?.props?.className === "gp-row-actions");
      const button = actions.children.find(
        (n) => n.props["aria-label"] === label,
      );
      const icon = button.children[0];
      assert.equal(icon.type, "svg");
      assert.equal(icon.props.viewBox, "0 0 16 16");
      assert.equal(icon.children[0].props.fill, fill);
      assert.ok(icon.children[0].props.d.startsWith("M9.96976 1.70572"));
    }
  } finally {
    f.dispose();
  }
});

test("ellipsis sorting options preserve mode switching and dismiss", () => {
  const f = setup();
  try {
    let selectedFocus = 0;
    const popup = {
      open: true,
      querySelector: () => ({ focus: () => selectedFocus++ }),
    };
    const choose = (mode) => {
      f.find((n) => n.type === "button" && n.props.key === mode).props.onClick({
        currentTarget: { closest: () => popup },
      });
      f.render();
    };
    assert.ok(f.find((n) => n.type === "summary").children.includes("⋯"));
    assert.equal(
      f.find((n) => n.type === "button" && n.props.key === "manual").props[
        "aria-pressed"
      ],
      true,
    );
    const before = f.saved();
    choose("manual");
    assert.deepEqual(f.saved(), before);
    assert.equal(popup.open, false);
    assert.equal(selectedFocus, 1);
    choose("recent");
    assert.deepEqual(f.saved(), { mode: "recent", orders: {} });
    assert.equal(
      f.find((n) => n.type === "button" && n.props.key === "recent").props[
        "aria-pressed"
      ],
      true,
    );
    choose("manual");
    assert.equal(f.saved().mode, "manual");
    assert.deepEqual(f.saved().orders.w, ["a", "b", "new"]);
    let focused = false;
    f.find((n) => n.type === "details").props.onKeyDown({
      key: "Escape",
      preventDefault() {},
      currentTarget: {
        open: true,
        querySelector: () => ({
          focus() {
            focused = true;
          },
        }),
      },
    });
    assert.equal(focused, true);
  } finally {
    f.dispose();
  }
});

test("pending pin never overwrites externally changed preferences", async () => {
  const f = setup();
  try {
    f.dragBefore("new", "b");
    const external = { mode: "recent", orders: {} };
    f.external(external);
    f.ws.pinnedSessionIds = ["new", "a", "b"];
    f.render();
    await f.finishPin();
    assert.deepEqual(f.saved(), external);
    assert.deepEqual(f.pinCalls, ["new"]);
    assert.ok(
      f
        .nodes()
        .some(
          (n) =>
            n.props.role === "alert" && n.children.includes("orderChanged"),
        ),
      JSON.stringify(f.nodes().filter((n) => n.props.role === "alert")),
    );
  } finally {
    f.dispose();
  }
});

test("pin snapshot arriving before reply preserves requested drag position", async () => {
  const f = setup();
  try {
    f.dragBefore("new", "b");
    f.ws.pinnedSessionIds = ["new", "a", "b"];
    f.render();
    await f.finishPin();
    assert.deepEqual(f.saved().orders.pins, ["a", "new", "b"]);
    assert.equal(f.saved().mode, "manual");
    assert.deepEqual(f.pinCalls, ["new"]);
    assert.equal(
      f.nodes().some((n) => n.props.role === "alert"),
      false,
    );
  } finally {
    f.dispose();
  }
});

test("move up uses visible ordinary neighbor across hidden pinned member", async () => {
  const f = setup({ ids: ["a", "pin", "b"], pinned: ["pin"] });
  try {
    openRowMenu(f, "b");
    f.find(
      (n) => n.type === "button" && n.children.includes("up"),
    ).props.onClick();
    await Promise.resolve();
    await Promise.resolve();
    f.render();
    assert.deepEqual(f.saved().orders.w, ["b", "a", "pin"]);
    assert.deepEqual(
      f.saved().orders.w.filter((id) => id !== "pin"),
      ["b", "a"],
    );
  } finally {
    f.dispose();
  }
});

function dragEvent(lower = false) {
  return {
    clientY: lower ? 19 : 1,
    currentTarget: {
      getBoundingClientRect: () => ({ top: 0, height: 20 }),
      contains: () => false,
    },
    dataTransfer: {},
    preventDefault() {},
    stopPropagation() {},
  };
}
function start(f, id) {
  f.row(id).props.onDragStart({ dataTransfer: { setData() {} } });
}
function hoverRow(f, id, lower = false) {
  f.row(id).props.onDragOver(dragEvent(lower));
  f.render();
}
const marker = (f) => f.nodes().filter((n) => n.props["data-drop"]);
const settle = async (f) => {
  await new Promise((resolve) => setImmediate(resolve));
  f.render();
};

test("row halves indicate exact before/after position and preserve hidden members", async () => {
  const f = setup({ ids: ["a", "hidden", "b", "c"], pinned: ["hidden"] });
  try {
    start(f, "c");
    hoverRow(f, "a", true);
    assert.equal(f.row("a").props["data-drop"], "after");
    f.row("a").props.onDrop(dragEvent(true));
    await settle(f);
    assert.deepEqual(f.saved().orders.w, ["a", "hidden", "c", "b"]);
    assert.equal(marker(f).length, 0);
    start(f, "c");
    hoverRow(f, "a");
    assert.equal(f.row("a").props["data-drop"], "before");
    f.row("a").props.onDrop(dragEvent());
    await settle(f);
    assert.deepEqual(f.saved().orders.w, ["c", "a", "hidden", "b"]);
  } finally {
    f.dispose();
  }
});

test("external, no-op, archived and blank targets never indicate a drop", () => {
  const f = setup({ ids: ["a", "b", "c"], pinned: [] });
  try {
    hoverRow(f, "a");
    assert.equal(marker(f).length, 0);
    start(f, "a");
    hoverRow(f, "a");
    assert.equal(marker(f).length, 0);
    hoverRow(f, "b");
    assert.equal(marker(f).length, 0); // already before b
    f.ws.archivedSessionIds = ["c"];
    f.render();
    f.find(
      (n) => n.type === "input" && n.props.type === "checkbox",
    ).props.onChange({ target: { checked: true } });
    f.render();
    hoverRow(f, "c");
    assert.equal(marker(f).length, 0);
    f.list.byId.b.blank = true;
    f.list.byId.b.retainedBy.mainView = 1;
    f.render();
    hoverRow(f, "b");
    assert.equal(marker(f).length, 0);
  } finally {
    f.dispose();
  }
});

test("section append supports empty pins and clears on leaving and dragend", async () => {
  const f = setup({ pinned: [] });
  try {
    const section = () => f.find((n) => n.props.className === "gp-drop");
    start(f, "a");
    section().props.onDragOver(dragEvent());
    f.render();
    assert.equal(section().props["data-drop"], "end");
    section().props.onDragLeave(dragEvent());
    f.render();
    assert.equal(marker(f).length, 0);
    section().props.onDragOver(dragEvent());
    f.render();
    f.row("a").props.onDragEnd();
    f.render();
    assert.equal(marker(f).length, 0);
    start(f, "a");
    section().props.onDrop(dragEvent());
    f.render();
    f.ws.pinnedSessionIds = ["a"];
    f.render();
    await f.finishPin();
    assert.deepEqual(f.pinCalls, ["a"]);
    assert.deepEqual(f.saved().orders.pins, ["a"]);
  } finally {
    f.dispose();
  }
});

test("dragged unpin uses requested insertion point without changing membership", async () => {
  const f = setup({ ids: ["a", "b", "c"], pinned: ["a"] });
  try {
    start(f, "a");
    hoverRow(f, "c", true);
    assert.equal(f.row("c").props["data-drop"], "after");
    f.row("c").props.onDrop(dragEvent(true));
    await settle(f);
    assert.deepEqual(f.unpinCalls, ["a"]);
    assert.deepEqual(f.saved().orders.w, ["b", "c", "a"]);
    assert.deepEqual(f.ws.items[0].sessionIds, ["a", "b", "c"]);
  } finally {
    f.dispose();
  }
});

test("stale sources, foreign groups and folded groups reject insertion", () => {
  const f = setup({ ids: ["a", "b", "c"], pinned: [] });
  try {
    f.ws.items.push({ workspaceId: "other", title: "Other", sessionIds: [] });
    f.render();
    start(f, "c");
    hoverRow(f, "a");
    assert.equal(marker(f).length, 1);
    f.ws.archivedSessionIds = ["c"];
    f.render();
    assert.equal(marker(f).length, 0);
    f.ws.archivedSessionIds = [];
    f.render();
    start(f, "c");
    f.find(
      (n) => n.props.className === "gp-group" && n.props.key === "other",
    ).props.onDragOver(dragEvent());
    f.render();
    assert.equal(marker(f).length, 0);
    const group = () =>
      f.find((n) => n.props.className === "gp-group" && n.props.key === "w");
    group().children[0].children[0].props.onClick();
    f.render();
    group().props.onDragOver(dragEvent());
    f.render();
    assert.equal(marker(f).length, 0);
  } finally {
    f.dispose();
  }
});

test("registered rename API declares its scoped remote dependency", async () => {
  const f = setup();
  try {
    await f.api.rename("a", "Renamed");
    assert.deepEqual(JSON.parse(JSON.stringify(f.renameCalls)), [
      { sessionId: "a", title: "Renamed" },
    ]);
  } finally {
    f.dispose();
  }
});

function openRowMenu(f, id = "a", origin = { focus() {} }) {
  f.row(id).props.onContextMenu({
    preventDefault() {},
    stopPropagation() {},
    target: { closest: () => null },
    currentTarget: { querySelector: () => origin },
  });
  f.render();
}
function openRename(f, id = "a") {
  openRowMenu(f, id);
  f.find(
    (n) => n.type === "button" && n.children.includes("rename"),
  ).props.onClick();
  f.render();
}
const renameInput = (f) =>
  f.find((n) => n.type === "input" && n.props["aria-label"] === "rename");
const renameForm = (f) =>
  f.find((n) => n.type === "form" && n.props.className === "gp-rename");
const keyEvent = (key, extra = {}) => ({
  key,
  preventDefault() {},
  stopPropagation() {},
  ...extra,
});

test("session rename replaces title in its own row and saves through registered API", async () => {
  const f = setup();
  try {
    openRename(f);
    const input = renameInput(f);
    const row = f.find(
      (n) => n.props.className === "gp-row" && f.nodes(n).includes(input),
    );
    assert.equal(row.props.draggable, false);
    assert.equal(
      f.nodes(row).some((n) => n.props.className === "gp-title"),
      false,
    );
    input.props.onChange({ target: { value: "  New name  " } });
    f.render();
    renameForm(f).props.onSubmit(keyEvent());
    await settle(f);
    assert.deepEqual(JSON.parse(JSON.stringify(f.renameCalls)), [
      { sessionId: "a", title: "New name" },
    ]);
    assert.equal(
      f.nodes().some((n) => n.props.className === "gp-rename"),
      false,
    );
  } finally {
    f.dispose();
  }
});

test("opening the rename editor focuses and selects the whole title once", () => {
  const f = setup();
  try {
    openRename(f);
    const input = renameInput(f);
    assert.equal(input.props.value, "a");
    assert.equal(input.props.autoFocus, undefined);
    const calls = [];
    const node = {
      focus: () => calls.push("focus"),
      select: () => calls.push("select"),
    };
    const mountRef = input.props.ref;
    assert.equal(typeof mountRef, "function");
    mountRef(node);
    assert.deepEqual(calls, ["focus", "select"]);
    assert.doesNotThrow(() => mountRef(null));
    assert.deepEqual(calls, ["focus", "select"]);
    // Typing re-renders the row; the mount ref must keep its identity so the
    // browser never re-runs focus/select and steal the caret mid-edit.
    input.props.onChange({ target: { value: "New name" } });
    f.render();
    assert.equal(renameInput(f).props.ref, mountRef);
    // Closing and reopening another row mounts a fresh editor with the same
    // stable ref, so the new title is selected again.
    renameForm(f).props.onKeyDown(keyEvent("Escape"));
    f.render();
    openRename(f, "b");
    assert.equal(renameInput(f).props.value, "b");
    assert.equal(renameInput(f).props.ref, mountRef);
    mountRef(node);
    assert.deepEqual(calls, ["focus", "select", "focus", "select"]);
  } finally {
    f.dispose();
  }
});

test("rename failure retains draft, pending blocks duplicates and Escape cancels", async () => {
  let reply;
  const f = setup({
    rename: () =>
      new Promise((resolve) => {
        reply = resolve;
      }),
  });
  try {
    openRename(f);
    renameInput(f).props.onChange({ target: { value: "Draft" } });
    f.render();
    renameForm(f).props.onSubmit(keyEvent());
    renameForm(f).props.onSubmit(keyEvent());
    f.render();
    assert.equal(f.renameCalls.length, 1);
    renameForm(f).props.onKeyDown(keyEvent("Escape"));
    f.render();
    assert.equal(
      renameInput(f).props.value,
      "Draft",
      "pending cancellation cannot hide a committing rename",
    );
    reply({ ok: false, error: { message: "Host refused" } });
    await settle(f);
    assert.equal(renameInput(f).props.value, "Draft");
    assert.ok(
      f
        .nodes()
        .some(
          (n) =>
            n.props.role === "alert" && n.children.includes("Host refused"),
        ),
    );
    renameForm(f).props.onKeyDown(keyEvent("Escape"));
    f.render();
    assert.equal(
      f.nodes().some((n) => n.props.className === "gp-rename"),
      false,
    );
  } finally {
    f.dispose();
  }
});

test("IME Enter and empty rename never submit or start dragging", () => {
  const f = setup();
  try {
    openRename(f);
    const form = renameForm(f);
    let prevented = 0;
    form.props.onKeyDown(
      keyEvent("Enter", {
        nativeEvent: { isComposing: true },
        preventDefault() {
          prevented++;
        },
      }),
    );
    assert.equal(prevented, 1);
    form.props.onDragStart(keyEvent());
    renameInput(f).props.onChange({ target: { value: "   " } });
    f.render();
    renameForm(f).props.onSubmit(keyEvent());
    assert.equal(f.renameCalls.length, 0);
  } finally {
    f.dispose();
  }
});

test("right-click opens the accessible actions and Escape restores focus", () => {
  const f = setup();
  try {
    let prevented = 0,
      focused = 0;
    const origin = {
      focus() {
        focused++;
      },
    };
    f.row("a").props.onContextMenu({
      preventDefault() {
        prevented++;
      },
      stopPropagation() {},
      target: { closest: () => null },
      currentTarget: { querySelector: () => origin },
    });
    f.render();
    const menu = f.find((n) => n.props.role === "menu");
    const actions = f
      .nodes(menu)
      .filter((n) => n.props.role === "menuitem")
      .map((n) => n.children[0]);
    assert.equal(prevented, 1);
    assert.equal(f.row("a").props.draggable, false);
    menu.props.onKeyDown(keyEvent("Escape"));
    f.render();
    assert.equal(focused, 1);
    assert.equal(
      f.nodes().some((n) => n.props.role === "menu"),
      false,
    );
    assert.equal(
      f.nodes(f.row("a")).some((n) => n.props["aria-label"] === "more"),
      false,
      "rows no longer expose an ellipsis button",
    );
    openRowMenu(f, "a", origin);
    assert.deepEqual(
      f
        .nodes(f.find((n) => n.props.role === "menu"))
        .filter((n) => n.props.role === "menuitem")
        .map((n) => n.children[0]),
      actions,
    );
    assert.ok(actions.includes("rename") && actions.includes("archive"));
  } finally {
    f.dispose();
  }
});

test("inline input preserves native context menu", () => {
  const f = setup();
  try {
    openRename(f);
    const input = renameInput(f);
    const row = f.find(
      (n) => n.props.className === "gp-row" && f.nodes(n).includes(input),
    );
    let prevented = false;
    row.props.onContextMenu({
      target: { closest: () => ({}) },
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, false);
  } finally {
    f.dispose();
  }
});

test("pin and native archive glyphs are both right-side 14px actions", () => {
  const f = setup();
  try {
    for (const id of ["a", "new"]) {
      const row = f.row(id);
      const container = row.children.find(
        (n) => n?.props?.className === "gp-actions",
      );
      assert.ok(row.children.indexOf(container) > 0);
      const actions = container.children.find(
        (n) => n?.props?.className === "gp-row-actions",
      );
      for (const label of [id === "a" ? "unpin" : "pin", "archive"]) {
        const icon = actions.children.find(
          (n) => n.props["aria-label"] === label,
        ).children[0];
        assert.equal(icon.type, "svg");
        assert.equal(icon.props.width, 14);
        assert.equal(icon.props.height, 14);
      }
      const archive = actions.children.find(
        (n) => n.props["aria-label"] === "archive",
      ).children[0];
      assert.equal(archive.children[2].props.d, "M6.5 9.5H9.5");
    }
  } finally {
    f.dispose();
  }
});

test("rejected rename retains draft and retries successfully with local focus restoration", async () => {
  let calls = 0,
    focused = 0;
  const f = setup({
    rename: async () => {
      if (++calls === 1) throw new Error("Disconnected");
      return { ok: true };
    },
  });
  try {
    openRowMenu(f, "a", {
      focus() {
        focused++;
      },
    });
    f.find(
      (n) => n.type === "button" && n.children.includes("rename"),
    ).props.onClick();
    f.render();
    renameInput(f).props.onChange({ target: { value: "Retry title" } });
    f.render();
    renameForm(f).props.onSubmit(keyEvent());
    await settle(f);
    assert.equal(renameInput(f).props.value, "Retry title");
    assert.ok(
      f
        .nodes()
        .some(
          (n) =>
            n.props.role === "alert" && n.children.includes("Disconnected"),
        ),
    );
    renameForm(f).props.onSubmit(keyEvent());
    await settle(f);
    assert.equal(calls, 2);
    assert.equal(focused, 1);
    assert.equal(
      f.nodes().some((n) => n.props.className === "gp-rename"),
      false,
    );
  } finally {
    f.dispose();
  }
});

test("composition lifecycle guards Enter and Escape until composition ends", () => {
  const f = setup();
  try {
    openRename(f);
    renameInput(f).props.onCompositionStart();
    renameForm(f).props.onKeyDown(keyEvent("Escape"));
    renameForm(f).props.onSubmit(keyEvent());
    f.render();
    assert.equal(f.renameCalls.length, 0);
    assert.ok(renameInput(f));
    renameInput(f).props.onCompositionEnd();
    renameForm(f).props.onKeyDown(keyEvent("Escape"));
    f.render();
    assert.equal(
      f.nodes().some((n) => n.props.className === "gp-rename"),
      false,
    );
  } finally {
    f.dispose();
  }
});

test("menu keyboard navigation and focus-out dismissal stay within owned menu", () => {
  const f = setup();
  try {
    openRowMenu(f, "a");
    const menu = f.find((n) => n.props.role === "menu");
    let focused = -1;
    const items = [0, 1, 2].map((i) => ({
      focus() {
        focused = i;
      },
    }));
    for (const [key, expected] of [
      ["ArrowDown", 1],
      ["ArrowUp", 2],
      ["Home", 0],
      ["End", 2],
    ]) {
      menu.props.onKeyDown(
        keyEvent(key, {
          target: items[0],
          currentTarget: { querySelectorAll: () => items },
        }),
      );
      assert.equal(focused, expected);
    }
    menu.props.onBlur({
      currentTarget: { contains: () => false },
      relatedTarget: null,
    });
    f.render();
    assert.equal(
      f.nodes().some((n) => n.props.role === "menu"),
      false,
    );
  } finally {
    f.dispose();
  }
});

const findDialog = (f) => f.find((n) => n.props.role === "dialog");
const findInput = (f) =>
  f.find((n) => n.props["aria-controls"] === "gp-find-results");
const findRows = (f) => f.nodes().filter((n) => n.props.role === "option");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SEARCH_WAIT = 260;
function openFind(f) {
  f.find((n) => n.props.className === "gp-search-open").props.onClick();
  f.render();
}

test("pinned header opens the search overlay and Escape restores focus", () => {
  const f = setup();
  try {
    let focused = 0;
    const trigger = f.find((n) => n.props.className === "gp-search-open");
    assert.equal(trigger.props["aria-label"], "searchOpen");
    trigger.props.ref.current = { focus: () => focused++ };
    openFind(f);
    const dialog = findDialog(f);
    assert.equal(dialog.props["aria-modal"], "true");
    assert.equal(findInput(f).props.placeholder, "searchPlaceholder");
    dialog.props.onKeyDown(keyEvent("Escape"));
    f.render();
    assert.equal(
      f.nodes().some((n) => n.props.role === "dialog"),
      false,
    );
    assert.equal(focused, 1);
  } finally {
    f.dispose();
  }
});

test("search debounces, keeps local matches first and appends content hits", async () => {
  let resolve;
  const f = setup({
    ids: ["a", "b", "g"],
    pinned: [],
    search: (query) =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  try {
    f.list.byId.a.title = "Alpha release";
    f.list.byId.b.title = "Beta notes";
    f.list.byId.g.title = "Gamma";
    openFind(f);
    assert.equal(f.searchCalls.length, 0, "no request before typing");
    findInput(f).props.onChange({ target: { value: "alp" } });
    f.render();
    assert.equal(f.searchCalls.length, 0, "debounced");
    assert.deepEqual(
      findRows(f).map((n) => n.props.key),
      ["a"],
      "name matches show before the content request resolves",
    );
    assert.equal(
      f.nodes().some((n) => n.props.className === "gp-find-status"),
      false,
      "no empty-state text while local rows exist",
    );
    await wait(SEARCH_WAIT);
    assert.equal(f.searchCalls.length, 1);
    assert.equal(f.searchCalls[0].query, "alp");
    resolve({
      ok: true,
      value: {
        items: [{ sessionId: "g", snippet: "gamma alpha snippet" }],
        hasMore: false,
      },
    });
    await settle(f);
    assert.deepEqual(
      findRows(f).map((n) => n.props.key),
      ["a", "g"],
    );
    assert.ok(
      f
        .nodes(findRows(f)[1])
        .some(
          (n) =>
            n.props.className === "gp-find-snippet" &&
            n.children[0] === "gamma alpha snippet",
        ),
    );
    assert.deepEqual(
      f
        .nodes()
        .filter((n) => n.props.className === "gp-find-group")
        .map((n) => n.children[0]),
      ["groupSessions", "groupContent"],
      "results are split by a small group heading",
    );
    assert.equal(findDialog(f).props["aria-label"], "searchOpen");
  } finally {
    f.dispose();
  }
});

test("Enter opens the highlighted result and closes the overlay", async () => {
  const f = setup({
    ids: ["a", "b", "g"],
    pinned: [],
    search: async () => ({ ok: true, value: { items: [], hasMore: false } }),
  });
  try {
    f.list.byId.g.title = "Gamma";
    openFind(f);
    findInput(f).props.onChange({ target: { value: "gam" } });
    f.render();
    await wait(SEARCH_WAIT);
    await settle(f);
    assert.deepEqual(
      findRows(f).map((n) => n.props.key),
      ["g"],
    );
    findDialog(f).props.onKeyDown(keyEvent("Enter"));
    f.render();
    assert.equal(f.openCalls.length, 1);
    assert.equal(f.openCalls[0], "g");
    assert.equal(
      f.nodes().some((n) => n.props.role === "dialog"),
      false,
    );
  } finally {
    f.dispose();
  }
});

test("search reports failures, empty results and hidden archived sessions", async () => {
  const failing = setup({
    ids: ["a"],
    pinned: [],
    search: async () => ({ ok: false, error: { message: "boom" } }),
  });
  try {
    openFind(failing);
    findInput(failing).props.onChange({ target: { value: "zzz" } });
    failing.render();
    await wait(SEARCH_WAIT);
    await settle(failing);
    const status = failing.find((n) => n.props.className === "gp-find-status");
    assert.match(String(status.children[0]), /boom/);
  } finally {
    failing.dispose();
  }

  const empty = setup({ ids: ["a"], pinned: [] });
  try {
    openFind(empty);
    findInput(empty).props.onChange({ target: { value: "zzz" } });
    empty.render();
    await wait(SEARCH_WAIT);
    await settle(empty);
    assert.equal(
      empty.find((n) => n.props.className === "gp-find-status").children[0],
      "noMatches",
    );
  } finally {
    empty.dispose();
  }

  const archived = setup({
    ids: ["a", "g"],
    pinned: [],
    search: async () => ({
      ok: true,
      value: {
        items: [{ sessionId: "g", snippet: "archived alpha" }],
        hasMore: false,
      },
    }),
  });
  try {
    archived.list.byId.g.title = "Gamma";
    archived.ws.archivedSessionIds = ["g"];
    openFind(archived);
    findInput(archived).props.onChange({ target: { value: "gam" } });
    archived.render();
    await wait(SEARCH_WAIT);
    await settle(archived);
    assert.equal(findRows(archived).length, 0);
  } finally {
    archived.dispose();
  }
});

test("a deployment without the content index keeps name matches and explains it", async () => {
  const f = setup({
    ids: ["a", "b"],
    pinned: [],
    search: async () => ({
      ok: false,
      error: {
        message:
          'session search failed: SessionQueryError: session search is disabled: this deployment configures the session-query index with openAt "never"',
      },
    }),
  });
  try {
    f.list.byId.a.title = "星富通";
    f.list.byId.b.title = "星富通慢查询";
    f.ws.archivedSessionIds = ["b"];
    openFind(f);
    findInput(f).props.onChange({ target: { value: "星富通" } });
    f.render();
    await wait(SEARCH_WAIT);
    await settle(f);
    assert.deepEqual(
      findRows(f).map((n) => n.props.key),
      ["a"],
      "name matches stay usable",
    );
    const note = f.nodes().find((n) => n.props.className === "gp-find-status");
    assert.equal(note.children[0], "contentDisabled");
    assert.match(note.props.title, /session search is disabled/);
    assert.equal(
      f
        .nodes()
        .some((n) => n.children[0] === "searchFailed: " + note.props.title),
      false,
      "a disabled index is not reported as a failure",
    );
  } finally {
    f.dispose();
  }
});

test("search trigger and group collapse are disabled while renaming", () => {
  const f = setup();
  try {
    openRename(f);
    const trigger = f.find((n) => n.props.className === "gp-search-open");
    assert.equal(trigger.props.disabled, true);
    trigger.props.onClick();
    f.render();
    assert.equal(
      f.nodes().some((n) => n.props.role === "dialog"),
      false,
    );
    const group = f.find(
      (n) => n.props.className === "gp-group" && n.props.key === "w",
    );
    assert.equal(group.children[0].children[0].props.disabled, true);
  } finally {
    f.dispose();
  }
});

test("search clamps the query to the Host contract and strips NUL", async () => {
  const f = setup({ ids: ["a"], pinned: [] });
  try {
    openFind(f);
    findInput(f).props.onChange({
      target: { value: "x".repeat(600) + "\0tail" },
    });
    f.render();
    await wait(SEARCH_WAIT);
    assert.equal(f.searchCalls.length, 1);
    assert.equal(f.searchCalls[0].query.length, 500);
    assert.equal(f.searchCalls[0].query.includes("\0"), false);
  } finally {
    f.dispose();
  }
});

test("search dedupes content hits and announces a truncated list", async () => {
  const ids = Array.from({ length: 21 }, (_, i) => `s${i}`);
  const f = setup({
    ids,
    pinned: [],
    search: async () => ({
      ok: true,
      value: {
        items: [{ sessionId: "s0", snippet: "duplicate snippet" }],
        hasMore: false,
      },
    }),
  });
  try {
    for (const id of ids) f.list.byId[id].title = `match ${id}`;
    openFind(f);
    findInput(f).props.onChange({ target: { value: "match" } });
    f.render();
    await wait(SEARCH_WAIT);
    await settle(f);
    const rows = findRows(f);
    assert.equal(rows.length, 20);
    assert.equal(rows.filter((n) => n.props.key === "s0").length, 1);
    assert.equal(
      f
        .nodes()
        .some(
          (n) =>
            n.props.className === "gp-find-status" &&
            n.children[0] === "searchMore",
        ),
      true,
    );
  } finally {
    f.dispose();
  }
});

test("closing the overlay aborts the in-flight request", async () => {
  let signal;
  const f = setup({
    ids: ["a"],
    pinned: [],
    search: (query, incoming) =>
      new Promise(() => {
        signal = incoming;
      }),
  });
  try {
    openFind(f);
    findInput(f).props.onChange({ target: { value: "zzz" } });
    f.render();
    await wait(SEARCH_WAIT);
    assert.equal(f.searchCalls.length, 1);
    assert.equal(signal.aborted, false);
    findDialog(f).props.onKeyDown(keyEvent("Escape"));
    f.render();
    assert.equal(signal.aborted, true);
  } finally {
    f.dispose();
  }
});

test("running rows show an animated spinner instead of a title glyph", () => {
  const f = setup();
  try {
    const css = f.find((n) => n.type === "style").children.join("");
    assert.match(
      css,
      /\.gp-row\[data-running=true\] \.gp-spin\{display:inline-flex\}/,
    );
    assert.match(
      css,
      /\.gp-row\[data-running=true\] \.gp-row-actions\{display:none\}/,
    );
    assert.match(
      css,
      /\.gp-row\[data-running=true\]:hover \.gp-row-actions[^{]*\{display:inline-flex\}/,
    );
    assert.match(
      css,
      /\.gp-row\[data-running=true\]:focus-within \.gp-spin\{display:none\}/,
    );
    assert.match(
      css,
      /\.gp-row\[data-running=true\]:focus-within \.gp-row-actions\{display:inline-flex\}/,
    );
    assert.match(
      css,
      /\.gp-row\[data-running=true\]:hover \.gp-spin,[^{]*\{display:none\}/,
    );
    assert.match(css, /\.gp-actions\{[^}]*min-width:48px\}/);
    assert.match(
      css,
      /\.gp-spin svg\{animation:gp-spin-frame 1s linear infinite\}/,
    );
    assert.match(
      css,
      /@keyframes gp-spin-frame\{to\{transform:rotate\(360deg\)\}\}/,
    );
    assert.match(
      css,
      /prefers-reduced-motion:reduce\)\{\.gp-spin svg\{animation:none\}\}/,
    );
    f.publishStatuses([["a", { running: true }]]);
    const row = f.row("a");
    assert.equal(row.props["data-running"], "true");
    assert.equal(f.row("b").props["data-running"], undefined);
    const spin = f.nodes(row).find((n) => n.props["aria-label"] === "running");
    assert.equal(spin.type, "span");
    assert.equal(spin.props.role, "img");
    assert.equal(spin.props.title, "running");
    assert.equal(spin.props.className, "gp-spin");
    const icon = spin.children[0];
    assert.equal(icon.type, "svg");
    assert.equal(icon.props.width, 14);
    assert.equal(icon.props.height, 14);
    assert.equal(icon.children[0].props.r, 6);
    assert.equal(icon.children[1].props.d, "M8 2a6 6 0 0 1 6 6");
    const title = row.children.find((n) => n?.props?.className === "gp-title");
    assert.equal(title.children.join(""), "a", "title has no glyph prefix");
    const actions = row.children.find(
      (n) => n?.props?.className === "gp-actions",
    );
    assert.equal(
      row.children[row.children.length - 1],
      actions,
      "actions are the last row child, so the spinner sits on the right",
    );
    assert.equal(
      actions.children[actions.children.length - 1].props.className,
      "gp-row-actions",
      "pin and archive follow the spinner",
    );
    assert.ok(
      actions.children.some((n) => n?.props?.className === "gp-row-actions"),
      "pin and archive stay mounted for the hover state",
    );
  } finally {
    f.dispose();
  }
});

test("running indicator has a localized accessible label", () => {
  for (const [locale, label] of [
    ["en", "Running"],
    ["zh", "运行中"],
  ]) {
    const f = setup({ locale });
    try {
      f.publishStatuses([["a", { running: true }]]);
      const spin = f
        .nodes(f.row("a"))
        .find((n) => n.props["aria-label"] === label);
      assert.equal(spin.props.title, label);
    } finally {
      f.dispose();
    }
  }
});

test("rows drop the ellipsis button but keep the right-click menu", () => {
  const f = setup();
  try {
    for (const id of ["a", "b", "new"])
      assert.equal(
        f.nodes(f.row(id)).some((n) => n.props["aria-label"] === "more"),
        false,
        `${id}: no ellipsis`,
      );
    openRowMenu(f, "a");
    const items = f
      .nodes(f.find((n) => n.props.role === "menu"))
      .filter((n) => n.props.role === "menuitem")
      .map((n) => n.children[0]);
    assert.deepEqual(items, ["rename", "fork", "archive", "up", "down"]);
  } finally {
    f.dispose();
  }
});

test("row hover covers title and all actions without a title-only patch", () => {
  const f = setup();
  try {
    const css = f.find((n) => n.type === "style").children.join("");
    assert.match(
      css,
      /\.gp-row:hover[^{}]*\{background:var\(--dsw-alias-bg-layer-2\)\}/,
    );
    assert.match(css, /\.gp \.gp-title:hover\{background:transparent\}/);
  } finally {
    f.dispose();
  }
});

test("the locator stays disabled until a row is the current session", () => {
  const f = setup();
  try {
    const button = f.find((n) => n.props.className === "gp-locate");
    assert.equal(button.props["aria-label"], "locate");
    assert.equal(button.props.disabled, true);
    f.list.byId.b.retainedBy.mainView = 1;
    f.render();
    assert.equal(
      f.find((n) => n.props.className === "gp-locate").props.disabled,
      false,
    );
  } finally {
    f.dispose();
  }
});

test("locating expands the collapsed workspace holding the current session", () => {
  const f = setup({ ids: ["a", "b"], pinned: [] });
  const workspaceToggle = () =>
    f
      .nodes()
      .find(
        (n) =>
          n.props.className === "gp-header" &&
          n.children.some((c) => c?.children?.[0] === "Workspace"),
      )
      .children.find((c) => c?.props?.["aria-expanded"] !== undefined);
  try {
    f.list.byId.b.retainedBy.mainView = 1;
    f.render();
    workspaceToggle().props.onClick();
    f.render();
    assert.equal(
      f.nodes().some((n) => n.props.className === "gp-row"),
      false,
    );
    f.find((n) => n.props.className === "gp-locate").props.onClick();
    f.render();
    assert.equal(workspaceToggle().props["aria-expanded"], true);
    assert.equal(f.row("b").props["data-session"], "b");
  } finally {
    f.dispose();
  }
});

test("the pinned header folds its rows without losing its tools", () => {
  const f = setup({ ids: ["a", "b"], pinned: ["a"] });
  try {
    const pins = () => f.find((n) => n.props.className === "gp-pins");
    assert.equal(
      f.nodes(pins()).some((n) => n.props["data-session"] === "a"),
      true,
    );
    const pinsHeader = () =>
      f.find(
        (n) =>
          n.props.className === "gp-header" &&
          n.children.some((c) => c?.props?.className === "gp-fold"),
      );
    assert.equal(
      pinsHeader().children.find((c) => c?.props?.className === "gp-fold")
        .props["aria-expanded"],
      true,
    );
    f.find((n) => n.props.className === "gp-fold").props.onClick();
    f.render();
    assert.equal(
      f.nodes().some((n) => n.props.className === "gp-pins"),
      false,
    );
    assert.equal(
      pinsHeader().children.find((c) => c?.props?.className === "gp-fold")
        .props["aria-expanded"],
      false,
    );
    assert.ok(
      f.nodes(pinsHeader()).some((n) => n.props.className === "gp-search-open"),
      "search stays reachable while folded",
    );
  } finally {
    f.dispose();
  }
});

test("section spacing stays compact between folded groups", () => {
  const f = setup();
  try {
    const css = f.find((n) => n.type === "style").children.join("");
    assert.match(css, /\.gp-header\{margin:6px 0 3px/);
    assert.match(css, /\.gp-group\{margin-top:8px/);
  } finally {
    f.dispose();
  }
});

test("pinned rows get their own container and the list uses a compact scale", () => {
  const f = setup({ ids: ["a", "b"], pinned: ["a"] });
  try {
    const css = f.find((n) => n.type === "style").children.join("");
    assert.match(css, /\.gp\{font-size:13px\}/);
    assert.match(css, /\.gp-row\{min-height:32px\}/);
    assert.match(css, /\.gp-header\{[^}]*background:rgba\(127,127,127,\.13\)/);
    assert.match(css, /\.gp-locate\{[^}]*width:26px;height:26px/);
    assert.match(css, /@keyframes gp-flash\{/);
    const pins = f.find((n) => n.props.className === "gp-pins");
    assert.ok(
      f.nodes(pins).some((n) => n.props["data-session"] === "a"),
      "pinned row sits inside the pins container",
    );
    assert.equal(
      f.nodes(pins).some((n) => n.props["data-session"] === "b"),
      false,
      "workspace row stays outside the pins container",
    );
  } finally {
    f.dispose();
  }
});

test("sessions touched today sit in a recent section above the workspaces", () => {
  const f = setup({ ids: ["a", "b", "c"], pinned: [] });
  try {
    const now = Date.now();
    f.list.byId.a.updatedAt = now - 1000;
    f.list.byId.b.updatedAt = now;
    f.list.byId.c.updatedAt = now - 2 * 86400000;
    f.render();
    const rows = (node) =>
      f
        .nodes(node)
        .filter((n) => n.props.className === "gp-row")
        .map((n) => n.props["data-session"]);
    const recent = f.find((n) => n.props.className === "gp-group gp-recent");
    assert.equal(recent.children[0].children[0].children[0], "recentSessions");
    assert.deepEqual(rows(recent), ["b", "a"]);
    const workspace = f.find((n) => n.props.className === "gp-group");
    assert.deepEqual(rows(workspace), ["c"]);
    assert.equal(f.row("a").props.draggable, false);
    openRowMenu(f, "a");
    const actions = f
      .nodes(f.find((n) => n.props.role === "menu"))
      .filter((n) => n.props.role === "menuitem")
      .map((n) => n.children[0]);
    assert.deepEqual(actions, ["rename", "fork", "archive"]);
  } finally {
    f.dispose();
  }
});

test("sessions from earlier days return to their own workspace", () => {
  const f = setup({ ids: ["a", "b"], pinned: [] });
  try {
    const before = Date.now() - 2 * 86400000;
    f.list.byId.a.updatedAt = before;
    f.list.byId.b.updatedAt = before;
    f.render();
    assert.equal(
      f.nodes().some((n) => n.props.className === "gp-group gp-recent"),
      false,
    );
    const workspace = f.find((n) => n.props.className === "gp-group");
    assert.deepEqual(
      f
        .nodes(workspace)
        .filter((n) => n.props.className === "gp-row")
        .map((n) => n.props["data-session"]),
      ["a", "b"],
    );
  } finally {
    f.dispose();
  }
});

test("pinned, archived and blank sessions stay out of the recent section", () => {
  const f = setup({ ids: ["a", "b", "c", "d"], pinned: ["a"] });
  try {
    const now = Date.now();
    for (const id of ["a", "b", "c", "d"]) f.list.byId[id].updatedAt = now;
    f.list.byId.c.blank = true;
    f.ws.archivedSessionIds.push("d");
    f.render();
    const recent = f.find((n) => n.props.className === "gp-group gp-recent");
    assert.deepEqual(
      f
        .nodes(recent)
        .filter((n) => n.props.className === "gp-row")
        .map((n) => n.props["data-session"]),
      ["b"],
    );
    assert.equal(
      f
        .nodes(f.find((n) => n.props.className === "gp-pins"))
        .some((n) => n.props["data-session"] === "a"),
      true,
    );
  } finally {
    f.dispose();
  }
});
