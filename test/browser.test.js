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
    },
  );
  let messages;
  plugin.apply({
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
        return () => {};
      },
    },
  });
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
    f
      .row(id)
      .children.find((n) => n?.props?.className === "gp-title")
      .children.includes("◌ ");
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
        .children.find((n) => n?.props?.className === "gp-actions");
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
    f.row("b")
      .children.find((n) => n?.props?.className === "gp-actions")
      .children.find((n) => n.props["aria-label"] === "more")
      .props.onClick();
    f.render();
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
