import test from "node:test";
import assert from "node:assert/strict";
import { apply, inject } from "../index.js";

function setup(failure) {
  let tool;
  let cleanup;
  let disposed = false;
  const calls = [];
  const result = { committed: true };
  const method = (name) => async (args) => {
    calls.push([name, args]);
    if (failure) throw failure;
    return result;
  };
  apply({
    effect(callback) {
      cleanup = callback();
    },
    tools: {
      register(value) {
        tool = value;
        return () => {
          disposed = true;
        };
      },
    },
    workspaceController: Object.fromEntries(
      [
        "pinSession",
        "unpinSession",
        "archiveSession",
        "unarchiveSession",
        "create",
        "rename",
      ].map((name) => [name, method(`workspace.${name}`)]),
    ),
    sessionController: {
      rename: method("session.rename"),
      fork: method("session.fork"),
    },
  });
  const execute = (args, signal = new AbortController().signal) =>
    tool.execute(args, { signal });
  return {
    tool,
    calls,
    result,
    execute,
    cleanup: () => cleanup(),
    isDisposed: () => disposed,
  };
}

test("registers one exclusive tool and existing services only", () => {
  const { tool } = setup();
  assert.deepEqual(inject, [
    "tools",
    "workspaceController",
    "sessionController",
  ]);
  assert.equal(tool.name, "global_pins_manage");
  assert.equal(tool.isConcurrencySafe, undefined);
  assert.equal(tool.parameters.additionalProperties, false);
});

test("plugin effect returns registration cleanup", () => {
  const f = setup();
  assert.equal(f.isDisposed(), false);
  f.cleanup();
  assert.equal(f.isDisposed(), true);
});

const cases = [
  ["pin", { sessionId: "s" }, "workspace.pinSession"],
  ["unpin", { sessionId: "s" }, "workspace.unpinSession"],
  ["archive", { sessionId: "s" }, "workspace.archiveSession"],
  ["restore", { sessionId: "s" }, "workspace.unarchiveSession"],
  ["createWorkspace", { path: "/existing" }, "workspace.create"],
  ["renameWorkspace", { workspaceId: "w", title: "Work" }, "workspace.rename"],
  ["renameSession", { sessionId: "s", title: "Chat" }, "session.rename"],
  ["fork", { sessionId: "s" }, "session.fork"],
];
for (const [action, args, method] of cases) {
  test(`${action} delegates exactly once and returns committed result`, async () => {
    const f = setup();
    const value = await f.execute({ action, ...args });
    assert.deepEqual(f.calls, [
      [method, action === "fork" ? { ...args, allowMigration: false } : args],
    ]);
    assert.deepEqual(value, { action, result: f.result });
    assert.deepEqual(
      JSON.parse(f.tool.output.render({}, value)[0].text),
      value,
    );
  });
}

test("invalid inputs never reach a business operation", async () => {
  for (const args of [
    null,
    [],
    "pin",
    {},
    { action: "__proto__" },
    { action: "pin" },
    { action: "pin", sessionId: 1 },
    { action: "pin", sessionId: "  " },
    { action: "renameSession", sessionId: "s", title: "" },
    { action: "archive", sessionId: "s", stopActivity: true },
    { action: "pin", sessionId: "s", workspaceId: "other" },
  ]) {
    const f = setup();
    await assert.rejects(f.execute(args), TypeError);
    assert.deepEqual(f.calls, []);
  }
});

test("business refusal preserves exact error and never retries or stops work", async () => {
  const error = Object.assign(new Error("Session has running work"), {
    code: "workspace/session-active",
  });
  const f = setup(error);
  await assert.rejects(
    f.execute({ action: "archive", sessionId: "s" }),
    (value) => value === error,
  );
  assert.deepEqual(f.calls, [["workspace.archiveSession", { sessionId: "s" }]]);
});

test("cancelled calls do not mutate", async () => {
  const f = setup();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    f.execute({ action: "pin", sessionId: "s" }, controller.signal),
    { name: "AbortError" },
  );
  assert.deepEqual(f.calls, []);
});
