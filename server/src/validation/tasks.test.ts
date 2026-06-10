import { describe, expect, it } from "vitest";

import { createTaskBodySchema, listTasksQuerySchema, updateTaskBodySchema } from "./tasks.js";

describe("task validation tags", () => {
  it("normalizes array and comma-separated tags", () => {
    expect(
      createTaskBodySchema.parse({
        title: "Tagged task",
        tags: [" Work ", "urgent", "work", "home"],
      }).tags
    ).toEqual(["work", "urgent", "home"]);

    expect(updateTaskBodySchema.parse({ tags: " Work, urgent, work,  home  " }).tags).toEqual([
      "work",
      "urgent",
      "home",
    ]);
  });

  it("defaults create tags and validates list tag filters", () => {
    expect(createTaskBodySchema.parse({ title: "Untagged task" }).tags).toEqual([]);
    expect(listTasksQuerySchema.parse({ tag: " Urgent " }).tag).toBe("urgent");
  });

  it("rejects invalid tags", () => {
    expect(() =>
      createTaskBodySchema.parse({
        title: "Invalid tag task",
        tags: ["valid", "bad/tag"],
      })
    ).toThrow();

    expect(() =>
      updateTaskBodySchema.parse({
        tags: Array.from({ length: 11 }, (_, index) => `tag-${index}`),
      })
    ).toThrow();

    expect(() => listTasksQuerySchema.parse({ tag: "bad/tag" })).toThrow();
  });
});
