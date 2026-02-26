import { describe, expect, it } from "vitest";
import { buildFinancialInsights } from "@/lib/insights";

describe("buildFinancialInsights", () => {
  it("returns positive savings rate when income exceeds expenses", () => {
    const [savings] = buildFinancialInsights({
      income: 5000,
      expenses: 3000,
      debt: 1000,
      assets: 20000,
    });

    expect(savings.id).toBe("savingsRate");
    expect(savings.value).toBe(40);
    expect(savings.state).toBe("positive");
  });

  it("returns runway months when spending exceeds income", () => {
    const insights = buildFinancialInsights({
      income: 1000,
      expenses: 2500,
      debt: 0,
      assets: 12000,
    });

    const runway = insights.find((item) => item.id === "runway");
    expect(runway?.value).toBe(8);
    expect(runway?.state).toBe("warning");
  });

  it("returns stable runway when there is no burn", () => {
    const insights = buildFinancialInsights({
      income: 2000,
      expenses: 2000,
      debt: 0,
      assets: 12000,
    });

    const runway = insights.find((item) => item.id === "runway");
    expect(runway?.value).toBeNull();
    expect(runway?.state).toBe("stable");
  });
});
