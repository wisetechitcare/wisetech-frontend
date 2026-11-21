// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RefreshCw, Trash2 } from "lucide-react";
import { ConfigColorChip } from "./ConfigColorChip";
import { DeleteSection } from "./DeleteSection";

// Nobody may delete anywhere, so a chip inside a DeleteSection must hide its destructive action.
vi.mock("@utils/can", () => ({ canDelete: () => false }));

afterEach(cleanup);

const noop = () => undefined;

describe("ConfigColorChip — the destructive-action gate", () => {
  it("hides a destructive action inside a section where the user may not delete", () => {
    render(
      <DeleteSection section="billing.configure">
        <ConfigColorChip
          name="Draft"
          color="#2563eb"
          action={{ icon: Trash2, title: "Delete Draft", danger: true, onClick: noop }}
        />
      </DeleteSection>,
    );
    expect(screen.queryByRole("button", { name: "Delete Draft" })).toBeNull();
  });

  /**
   * THE REGRESSION THIS FILE EXISTS FOR.
   *
   * The gate used to read `!action.icon.includes('trash')`, so whether the permission check
   * applied was decided by the icon's NAME. A destructive action drawn with any other icon —
   * exactly this case — sailed straight through it. It is also why `icon` could not widen from
   * `string` to `IconSource`: a Lucide component has no `.includes`, so passing one would have
   * silently turned the gate off everywhere.
   */
  it("gates on `danger`, not on the icon's name", () => {
    render(
      <DeleteSection section="billing.configure">
        <ConfigColorChip
          name="Draft"
          color="#2563eb"
          action={{ icon: RefreshCw, title: "Purge Draft", danger: true, onClick: noop }}
        />
      </DeleteSection>,
    );
    expect(screen.queryByRole("button", { name: "Purge Draft" })).toBeNull();
  });

  it("leaves a non-destructive action in the same section alone", () => {
    render(
      <DeleteSection section="billing.configure">
        <ConfigColorChip
          name="Draft"
          color="#2563eb"
          action={{ icon: RefreshCw, title: "Restore Draft", tone: "revert", onClick: noop }}
        />
      </DeleteSection>,
    );
    expect(screen.getByRole("button", { name: "Restore Draft" })).toBeTruthy();
  });

  it("does not gate outside a DeleteSection — there the screen gates itself", () => {
    render(
      <ConfigColorChip
        name="Draft"
        color="#2563eb"
        action={{ icon: Trash2, title: "Delete Draft", danger: true, onClick: noop }}
      />,
    );
    expect(screen.getByRole("button", { name: "Delete Draft" })).toBeTruthy();
  });

  it("accepts a legacy registry name as well as a Lucide component", () => {
    render(
      <ConfigColorChip
        name="Draft"
        color="#2563eb"
        action={{ icon: "bi-trash", title: "Delete Draft", danger: true, onClick: noop }}
      />,
    );
    expect(screen.getByRole("button", { name: "Delete Draft" })).toBeTruthy();
  });
});
