const DAY_MS = 24 * 60 * 60 * 1000;

export function buildCountries(rules) {
  return [...rules]
    .map((entry) => entry.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function buildRulesByName(rules) {
  return new Map(rules.map((entry) => [entry.name, entry]));
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "long",
  }).format(date);
}

export function formatList(items) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function toDate(dateText) {
  if (!dateText) return null;
  const date = new Date(`${dateText}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

export function isWnvSeasonalTestingDeferral(deferral) {
  return deferral?.type === "wnv_seasonal_testing";
}

export function isWaitDeferral(deferral) {
  return !deferral?.type || deferral.type === "wait_days";
}

export function hasWaitDeferral(rule) {
  return (rule.deferrals ?? []).some(
    (deferral) => isWaitDeferral(deferral) && typeof deferral.days === "number",
  );
}

export function isWnvOnlySeasonalRule(rule) {
  const deferrals = rule.deferrals ?? [];
  const hasWnvSeasonalTesting = deferrals.some(isWnvSeasonalTestingDeferral);
  return hasWnvSeasonalTesting && !hasWaitDeferral(rule);
}

function buildGuidance(selectedRules) {
  const guidanceByCountry = new Map();

  selectedRules.forEach(({ trip, rule }) => {
    if (!guidanceByCountry.has(trip.country)) {
      guidanceByCountry.set(trip.country, {
        country: trip.country,
        rawText: rule.rawText ?? "",
      });
    }
  });

  return [...guidanceByCountry.values()];
}

export function calculateEligibility(trips, rulesByName, now = new Date()) {
  const hasInput = trips.some((trip) => trip.country && trip.leaveDate);
  if (!hasInput) return null;

  const validTrips = trips.filter((trip) => trip.country && trip.leaveDate);
  if (validTrips.length === 0) {
    return { type: "empty" };
  }

  const selectedRules = validTrips
    .map((trip) => ({ trip, rule: rulesByName.get(trip.country) }))
    .filter((item) => item.rule);

  const hasWnvConditionalEligibility = selectedRules.some(({ rule }) =>
    (rule.deferrals ?? []).some(isWnvSeasonalTestingDeferral),
  );

  const guidance = buildGuidance(selectedRules);

  const mustContact = selectedRules.filter(
    (item) => item.rule.needsContact && !isWnvOnlySeasonalRule(item.rule),
  );

  if (mustContact.length > 0) {
    const contactByCountry = new Map();

    mustContact.forEach(({ trip, rule }) => {
      if (!contactByCountry.has(trip.country)) {
        contactByCountry.set(trip.country, {
          country: trip.country,
          rawText: rule.rawText ?? "",
        });
      }
    });

    return {
      type: "contact",
      contactCountries: [...contactByCountry.keys()],
      guidance,
    };
  }

  let latestDate = null;
  let latestCountry = "";

  selectedRules.forEach(({ trip, rule }) => {
    const leaveDate = toDate(trip.leaveDate);
    if (!leaveDate) return;

    rule.deferrals.forEach((deferral) => {
      if (!isWaitDeferral(deferral)) return;
      if (typeof deferral.days !== "number") return;

      const candidate = addDays(leaveDate, deferral.days);
      if (!latestDate || candidate > latestDate) {
        latestDate = candidate;
        latestCountry = trip.country;
      }
    });
  });

  if (!latestDate) {
    if (hasWnvConditionalEligibility) {
      return { type: "eligible_now_conditional", guidance };
    }

    return { type: "eligible_now", guidance };
  }

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  if (latestDate <= startOfToday) {
    if (hasWnvConditionalEligibility) {
      return { type: "eligible_now_conditional", guidance };
    }

    return { type: "eligible_now", guidance };
  }

  return {
    type: "eligible_later",
    date: latestDate,
    country: latestCountry,
    guidance,
  };
}
