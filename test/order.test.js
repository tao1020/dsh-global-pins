import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
let plugin;
vm.runInNewContext(
  fs.readFileSync(new URL("../client.js", import.meta.url), "utf8"),
  {
    window: {
      __ModuleLoader__: {
        load: (entry) => {
          plugin = entry.factory((name) => {
            assert.equal(name, "react");
            return { createElement() {} };
          });
        },
      },
    },
  },
);
const { reconcile, reconcilePins, move, recent, clean, partition } =
  plugin.test;
test("new pins prepend; unpin then repin regains first place", () => {
  assert.deepEqual(plain(reconcilePins(["new", "a", "b"], ["b", "a"])), [
    "new",
    "b",
    "a",
  ]);
  const unpinned = reconcilePins(["b"], ["a", "b"]);
  assert.deepEqual(plain(reconcilePins(["a", "b"], unpinned)), ["a", "b"]);
});
test("global pins partition across workspaces without changing membership", () => {
  const w1 = ["a", "b"],
    w2 = ["c", "d"];
  const pins = ["c", "a"];
  assert.deepEqual(plain(partition([...w1, ...w2], pins, []).pinned), [
    "a",
    "c",
  ]);
  assert.deepEqual(plain(partition(w1, pins, []).ordinary), ["b"]);
  assert.deepEqual(plain(partition(w2, pins, []).ordinary), ["d"]);
  assert.deepEqual(plain(partition(w1, ["c"], []).ordinary), w1);
  assert.deepEqual(w1, ["a", "b"]);
});
test("archived pins excluded from global and returned to archived group", () =>
  assert.deepEqual(plain(partition(["a", "b"], ["a"], ["a"])), {
    pinned: [],
    ordinary: ["a", "b"],
  }));
const plain = (x) => JSON.parse(JSON.stringify(x));
test("complete manual order retains archived and hidden members", () =>
  assert.deepEqual(
    plain(reconcile(["a", "b", "hidden", "c"], ["c", "hidden", "a"])),
    ["c", "hidden", "a", "b"],
  ));
test("reconcile removes stale IDs and duplicate rows", () =>
  assert.deepEqual(plain(reconcile(["a", "b", "a"], ["gone", "a", "a"])), [
    "a",
    "b",
  ]));
test("drag moves before target and preserves hidden order", () =>
  assert.deepEqual(plain(move(["a", "hidden", "b", "c"], "c", "a")), [
    "c",
    "a",
    "hidden",
    "b",
  ]));
test("drag appends and rejects missing source/self", () => {
  assert.deepEqual(plain(move(["a", "b"], "a")), ["b", "a"]);
  assert.deepEqual(plain(move(["a", "b"], "gone", "a")), ["a", "b"]);
  assert.deepEqual(plain(move(["a", "b"], "a", "a")), ["a", "b"]);
});
test("recent deterministic timestamp then ID", () =>
  assert.deepEqual(
    plain(
      recent(["z", "b", "a"], {
        a: { updatedAt: 9 },
        b: { updatedAt: 9 },
        z: { updatedAt: 1 },
      }),
    ),
    ["a", "b", "z"],
  ));
test("inputs never mutated", () => {
  const ids = ["b", "a"];
  recent(ids, {});
  move(ids, "a", "b");
  reconcile(ids, ["a"]);
  assert.deepEqual(ids, ["b", "a"]);
});
test("invalid preferences sanitized", () => {
  assert.equal(clean(null).mode, "recent");
  assert.deepEqual(
    plain(clean({ mode: "evil", orders: { bad: [3], ok: ["a"] } })),
    { mode: "recent", orders: { ok: ["a"] } },
  );
});
test("packaged metadata and runtime exports exist", () => {
  const root = new URL("../", import.meta.url);
  const pkg = JSON.parse(fs.readFileSync(new URL("package.json", root)));
  for (const file of [
    "index.js",
    "client.js",
    "cordis.patch.yml",
    "locale/en.json",
    "locale/zh.json",
    "icon.svg",
  ])
    assert.ok(fs.statSync(new URL(file, root)).isFile());
  assert.equal(pkg.dsh.client.platform, "web");
  for (const locale of ["en", "zh"])
    assert.ok(
      JSON.parse(fs.readFileSync(new URL(`locale/${locale}.json`, root))).meta
        .description,
    );
});
