import { describe, it, expect } from "vitest";
import {
  nextIncompleteStory,
  allStoriesComplete,
  shouldBreak,
  isStale,
  type Prd,
  type Session,
} from "../hooks/src/env.js";

describe("nextIncompleteStory", () => {
  it("returns first incomplete story", () => {
    const prd: Prd = {
      task: "test",
      mode: "solo",
      stories: [
        { id: "a", title: "A", passes: true },
        { id: "b", title: "B", passes: false },
        { id: "c", title: "C", passes: false },
      ],
      iteration: 0,
      errors: [],
      started_at: new Date().toISOString(),
    };
    expect(nextIncompleteStory(prd)?.id).toBe("b");
  });

  it("returns null when all complete", () => {
    const prd: Prd = {
      task: "test",
      mode: "solo",
      stories: [{ id: "a", title: "A", passes: true }],
      iteration: 0,
      errors: [],
      started_at: new Date().toISOString(),
    };
    expect(nextIncompleteStory(prd)).toBeNull();
  });
});

describe("allStoriesComplete", () => {
  it("returns true when all pass", () => {
    const prd: Prd = {
      task: "test",
      mode: "solo",
      stories: [
        { id: "a", title: "A", passes: true },
        { id: "b", title: "B", passes: true },
      ],
      iteration: 0,
      errors: [],
      started_at: new Date().toISOString(),
    };
    expect(allStoriesComplete(prd)).toBe(true);
  });

  it("returns false with incomplete story", () => {
    const prd: Prd = {
      task: "test",
      mode: "solo",
      stories: [
        { id: "a", title: "A", passes: true },
        { id: "b", title: "B", passes: false },
      ],
      iteration: 0,
      errors: [],
      started_at: new Date().toISOString(),
    };
    expect(allStoriesComplete(prd)).toBe(false);
  });

  it("returns false with empty stories", () => {
    const prd: Prd = {
      task: "test",
      mode: "solo",
      stories: [],
      iteration: 0,
      errors: [],
      started_at: new Date().toISOString(),
    };
    expect(allStoriesComplete(prd)).toBe(false);
  });
});

describe("shouldBreak", () => {
  it("returns false with fewer than 3 errors", () => {
    const prd: Prd = {
      task: "test",
      mode: "solo",
      stories: [],
      iteration: 0,
      errors: ["err1", "err1"],
      started_at: new Date().toISOString(),
    };
    expect(shouldBreak(prd)).toBe(false);
  });

  it("returns true with 3 identical errors", () => {
    const prd: Prd = {
      task: "test",
      mode: "solo",
      stories: [],
      iteration: 0,
      errors: ["same error", "same error", "same error"],
      started_at: new Date().toISOString(),
    };
    expect(shouldBreak(prd)).toBe(true);
  });

  it("returns false with 3 different errors", () => {
    const prd: Prd = {
      task: "test",
      mode: "solo",
      stories: [],
      iteration: 0,
      errors: ["err1", "err2", "err3"],
      started_at: new Date().toISOString(),
    };
    expect(shouldBreak(prd)).toBe(false);
  });
});

describe("isStale", () => {
  it("returns false for recent session", () => {
    const session: Session = {
      active: true,
      mode: "solo",
      sessionId: "test",
      started_at: new Date().toISOString(),
    };
    expect(isStale(session)).toBe(false);
  });

  it("returns true for old session", () => {
    const session: Session = {
      active: true,
      mode: "solo",
      sessionId: "test",
      started_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    };
    expect(isStale(session)).toBe(true);
  });
});
