import type { AgentSnapshotPayload } from "@getpaseo/protocol/messages";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../output/index.js";
import { runLsCommand } from "./ls.js";

const requestId = "permission-654ff862-b312-4f6e-8aac-427421ff65eb";
const agent = {
  id: "99770ec8-aae1-44e0-a6d5-8d4ae2d64448",
  pendingPermissions: [
    {
      id: requestId,
      name: "Write",
      description: "Write to a file",
    },
  ],
} as AgentSnapshotPayload;

const fetchAgents = vi.fn(async () => ({
  entries: [{ agent }],
  nextCursor: undefined,
}));
const close = vi.fn(async () => undefined);

vi.mock("../../utils/client.js", () => ({
  connectToDaemon: vi.fn(async () => ({
    fetchAgents,
    close,
  })),
}));

describe("permit ls output", () => {
  it("keeps the full request id in JSON while shortening the table column", async () => {
    const result = await runLsCommand(
      { daemonTarget: { kind: "endpoint", host: "example.test:12345" } },
      {} as never,
    );

    expect(fetchAgents).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();

    // Machine-readable output must carry the full id so it can be passed to
    // `paseo permit allow <agent> <req_id>`.
    expect(JSON.parse(render(result, { format: "json" }))).toEqual([
      {
        id: requestId,
        agentId: agent.id,
        agentShortId: "99770ec",
        name: "Write",
        description: "Write to a file",
      },
    ]);

    // The human table keeps the eight-character REQ_ID column.
    const table = render(result, { format: "table", noColor: true });
    expect(table).toContain("permissi");
    expect(table).not.toContain(requestId);
  });
});
