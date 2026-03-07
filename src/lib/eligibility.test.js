import { describe, expect, it } from "vitest";
import {
  buildRulesByName,
  calculateEligibility,
  formatList,
} from "./eligibility";

function createRule({
  name,
  rawText = `${name} guidance`,
  needsContact = false,
  deferrals = [],
}) {
  return {
    name,
    rawText,
    needsContact,
    deferrals,
  };
}

describe("calculateEligibility", () => {
  it("returns null when there is no complete trip input", () => {
    const rulesByName = buildRulesByName([
      createRule({ name: "Spain" }),
    ]);

    expect(
      calculateEligibility(
        [{ country: "Spain", leaveDate: "" }],
        rulesByName,
        new Date("2026-03-07T12:00:00Z"),
      ),
    ).toBeNull();
  });

  it("returns contact when a selected rule requires direct advice", () => {
    const rulesByName = buildRulesByName([
      createRule({
        name: "Azerbaijan",
        needsContact: true,
      }),
    ]);

    expect(
      calculateEligibility(
        [{ country: "Azerbaijan", leaveDate: "2026-03-01" }],
        rulesByName,
        new Date("2026-03-07T12:00:00Z"),
      ),
    ).toEqual({
      type: "contact",
      contactCountries: ["Azerbaijan"],
      guidance: [
        {
          country: "Azerbaijan",
          rawText: "Azerbaijan guidance",
        },
      ],
    });
  });

  it("returns eligible now when the wait period has already passed", () => {
    const rulesByName = buildRulesByName([
      createRule({
        name: "Bahrain",
        deferrals: [{ days: 28, from: "leave_country", reason: "travel" }],
      }),
    ]);

    expect(
      calculateEligibility(
        [{ country: "Bahrain", leaveDate: "2026-01-01" }],
        rulesByName,
        new Date("2026-03-07T12:00:00Z"),
      ),
    ).toEqual({
      type: "eligible_now",
      guidance: [
        {
          country: "Bahrain",
          rawText: "Bahrain guidance",
        },
      ],
    });
  });

  it("returns conditional eligibility for WNV seasonal-only rules", () => {
    const rulesByName = buildRulesByName([
      createRule({
        name: "Austria",
        needsContact: true,
        deferrals: [{ type: "wnv_seasonal_testing", reason: "wnv_seasonal_testing" }],
      }),
    ]);

    expect(
      calculateEligibility(
        [{ country: "Austria", leaveDate: "2026-03-01" }],
        rulesByName,
        new Date("2026-03-07T12:00:00Z"),
      ),
    ).toEqual({
      type: "eligible_now_conditional",
      guidance: [
        {
          country: "Austria",
          rawText: "Austria guidance",
        },
      ],
    });
  });

  it("uses the latest future deferral date across multiple trips", () => {
    const rulesByName = buildRulesByName([
      createRule({
        name: "Bahrain",
        deferrals: [{ days: 28, from: "leave_country", reason: "travel" }],
      }),
      createRule({
        name: "Australia",
        deferrals: [{ days: 90, from: "leave_country", reason: "dengue" }],
      }),
    ]);

    const result = calculateEligibility(
      [
        { country: "Bahrain", leaveDate: "2026-02-25" },
        { country: "Australia", leaveDate: "2026-02-01" },
      ],
      rulesByName,
      new Date("2026-03-07T12:00:00Z"),
    );

    expect(result).toMatchObject({
      type: "eligible_later",
      country: "Australia",
      guidance: [
        {
          country: "Bahrain",
          rawText: "Bahrain guidance",
        },
        {
          country: "Australia",
          rawText: "Australia guidance",
        },
      ],
    });
    expect(result.date.toISOString()).toBe("2026-05-02T00:00:00.000Z");
  });

  it("deduplicates repeated countries in guidance and contact results", () => {
    const rulesByName = buildRulesByName([
      createRule({
        name: "Algeria",
        needsContact: true,
      }),
    ]);

    expect(
      calculateEligibility(
        [
          { country: "Algeria", leaveDate: "2026-03-01" },
          { country: "Algeria", leaveDate: "2026-03-02" },
        ],
        rulesByName,
        new Date("2026-03-07T12:00:00Z"),
      ),
    ).toEqual({
      type: "contact",
      contactCountries: ["Algeria"],
      guidance: [
        {
          country: "Algeria",
          rawText: "Algeria guidance",
        },
      ],
    });
  });
});

describe("formatList", () => {
  it("formats three items with an Oxford comma", () => {
    expect(formatList(["Spain", "Italy", "France"])).toBe(
      "Spain, Italy, and France",
    );
  });
});
