// Mutations use the same Host business operations as the sidebar; no workspace
// membership or permission data is written by this plugin.
export const inject = ["tools", "workspaceController", "sessionController"];

const fields = {
  pin: ["sessionId"],
  unpin: ["sessionId"],
  archive: ["sessionId"],
  restore: ["sessionId"],
  fork: ["sessionId"],
  createWorkspace: ["path"],
  renameWorkspace: ["workspaceId", "title"],
  renameSession: ["sessionId", "title"],
};

function validate(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new TypeError("Expected an action object.");
  }
  if (!Object.hasOwn(fields, args.action))
    throw new TypeError("Unknown sidebar action.");
  const allowed = ["action", ...fields[args.action]];
  for (const key of Object.keys(args)) {
    if (!allowed.includes(key))
      throw new TypeError(`Unexpected parameter: ${key}`);
  }
  for (const key of fields[args.action]) {
    if (typeof args[key] !== "string" || !args[key].trim()) {
      throw new TypeError(`${key} must be a non-empty string.`);
    }
  }
  return args;
}

export function apply(ctx) {
  ctx.effect(() =>
    ctx.tools.register({
      name: "global_pins_manage",
      description:
        "Pin, unpin, archive or restore a session; create or rename a workspace; rename a session. Pinning never changes workspace membership. Archive refuses running work rather than stopping it. Returns the committed result. Fork creates a child at the latest completed turn without automatic migration, navigation or title increment. Sorting is a browser-only view preference.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["action"],
        properties: {
          action: { type: "string", enum: Object.keys(fields) },
          sessionId: {
            type: "string",
            description: "Required for session actions.",
          },
          workspaceId: {
            type: "string",
            description: "Required for renameWorkspace.",
          },
          title: {
            type: "string",
            description: "Non-empty title for either rename action.",
          },
          path: {
            type: "string",
            description: "Existing directory path for createWorkspace.",
          },
        },
      },
      output: {
        schema: {
          type: "object",
          properties: {
            action: { type: "string" },
            result: { type: "object", additionalProperties: true },
          },
          required: ["action", "result"],
          additionalProperties: false,
        },
        render: (_args, value) => [
          { type: "text", text: JSON.stringify(value) },
        ],
      },
      async execute(input, exec) {
        const args = validate(input);
        exec.signal.throwIfAborted();
        const workspace = ctx.workspaceController;
        let result;
        // Do not catch business errors: the tool registry retains their reasons and
        // marks the call failed. In particular, do not retry archive with stopActivity.
        switch (args.action) {
          case "pin":
            result = await workspace.pinSession({ sessionId: args.sessionId });
            break;
          case "unpin":
            result = await workspace.unpinSession({
              sessionId: args.sessionId,
            });
            break;
          case "archive":
            result = await workspace.archiveSession({
              sessionId: args.sessionId,
            });
            break;
          case "restore":
            result = await workspace.unarchiveSession({
              sessionId: args.sessionId,
            });
            break;
          case "createWorkspace":
            result = await workspace.create({ path: args.path });
            break;
          case "renameWorkspace":
            result = await workspace.rename({
              workspaceId: args.workspaceId,
              title: args.title,
            });
            break;
          case "renameSession":
            result = await ctx.sessionController.rename({
              sessionId: args.sessionId,
              title: args.title,
            });
            break;
          case "fork":
            result = await ctx.sessionController.fork({
              sessionId: args.sessionId,
              allowMigration: false,
            });
            break;
        }
        return { action: args.action, result };
      },
    }),
  );
}
