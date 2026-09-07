import { describe, expect, it } from "vitest";
import { apiErrorMessage } from "./apiError";

/** The shape this API's `failureHandler` actually sends. */
const failure = (body: Record<string, unknown>) => ({ response: { data: body } });

describe("apiErrorMessage", () => {
  it("prefers `detail`, which is where the human sentence lives", () => {
    const error = failure({
      statusCode: 400,
      message: "Bad request",
      detail: '"Design Department" is still used by 3 employees, so it cannot be archived.',
    });
    expect(apiErrorMessage(error, "fallback")).toBe(
      '"Design Department" is still used by 3 employees, so it cannot be archived.',
    );
  });

  it("never shows a bare HTTP status name — the bug this exists to stop", () => {
    // `message` alone is what the dialog used to read, and it rendered "Bad request".
    expect(apiErrorMessage(failure({ message: "Bad request" }), "fallback")).toBe("fallback");
    expect(apiErrorMessage(failure({ message: "Internal Server Error" }), "fallback")).toBe("fallback");
    expect(apiErrorMessage(failure({ message: "not found" }), "fallback")).toBe("fallback");
  });

  it("still takes `message` when it carries a real sentence", () => {
    // Not every endpoint uses the envelope; some put the reason in `message`.
    expect(apiErrorMessage(failure({ message: "That name is already taken." }), "fallback")).toBe(
      "That name is already taken.",
    );
  });

  it("falls back on anything with no usable text", () => {
    expect(apiErrorMessage(failure({ detail: "   ", message: "  " }), "fallback")).toBe("fallback");
    expect(apiErrorMessage(failure({}), "fallback")).toBe("fallback");
    expect(apiErrorMessage(new Error("network down"), "fallback")).toBe("fallback");
    expect(apiErrorMessage(undefined, "fallback")).toBe("fallback");
    expect(apiErrorMessage(null, "fallback")).toBe("fallback");
  });

  it("ignores a non-string detail rather than rendering [object Object]", () => {
    expect(apiErrorMessage(failure({ detail: { nested: true } }), "fallback")).toBe("fallback");
  });
});
