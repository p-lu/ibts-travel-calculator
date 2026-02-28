import { useMemo, useState } from "react";
import rules from "../ibts_deferrals.json";

const CONTACT_NUMBER = "1800 731 137";
const DAY_MS = 24 * 60 * 60 * 1000;

const countries = [...rules]
  .map((entry) => entry.name)
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b));

const rulesByName = new Map(rules.map((entry) => [entry.name, entry]));

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "long",
  }).format(date);
}

function toDate(dateText) {
  if (!dateText) return null;
  const date = new Date(`${dateText}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function App() {
  const [trips, setTrips] = useState([{ country: "", leaveDate: "" }]);
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => {
    if (!submitted) return null;

    const validTrips = trips.filter((trip) => trip.country && trip.leaveDate);
    if (validTrips.length === 0) {
      return { type: "empty" };
    }

    const selectedRules = validTrips
      .map((trip) => ({ trip, rule: rulesByName.get(trip.country) }))
      .filter((item) => item.rule);

    const mustContact = selectedRules.find((item) => item.rule.needsContact);
    if (mustContact) {
      return { type: "contact", country: mustContact.trip.country };
    }

    let latestDate = null;
    let latestReason = "";
    let latestCountry = "";

    selectedRules.forEach(({ trip, rule }) => {
      const leaveDate = toDate(trip.leaveDate);
      if (!leaveDate) return;

      rule.deferrals.forEach((deferral) => {
        const candidate = addDays(leaveDate, deferral.days);
        if (!latestDate || candidate > latestDate) {
          latestDate = candidate;
          latestReason = deferral.reason;
          latestCountry = trip.country;
        }
      });
    });

    if (!latestDate) {
      return { type: "eligible_now" };
    }

    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    if (latestDate <= startOfToday) {
      return { type: "eligible_now" };
    }

    return {
      type: "eligible_later",
      date: latestDate,
      reason: latestReason,
      country: latestCountry,
    };
  }, [submitted, trips]);

  function updateTrip(index, field, value) {
    setTrips((current) =>
      current.map((trip, i) => (i === index ? { ...trip, [field]: value } : trip)),
    );
  }

  function addTrip() {
    setTrips((current) => [...current, { country: "", leaveDate: "" }]);
  }

  function removeTrip(index) {
    setTrips((current) => current.filter((_, i) => i !== index));
  }

  function onSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="app">
      <h1>IBTS Travel Deferral Checker</h1>
      <p className="subtitle">
        Enter your trips and we will estimate when you can next donate blood.
      </p>

      <form onSubmit={onSubmit} className="card">
        {trips.map((trip, index) => (
          <section className="tripRow" key={`trip-${index}`}>
            <h2>Trip {index + 1}</h2>
            <label>
              Country or territory
              <select
                value={trip.country}
                onChange={(event) => updateTrip(index, "country", event.target.value)}
                required
              >
                <option value="">Select a location</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Date you left
              <input
                type="date"
                value={trip.leaveDate}
                onChange={(event) => updateTrip(index, "leaveDate", event.target.value)}
                required
              />
            </label>

            {trips.length > 1 && (
              <button
                type="button"
                className="ghostButton"
                onClick={() => removeTrip(index)}
              >
                Remove trip
              </button>
            )}
          </section>
        ))}

        <div className="actions">
          <button type="button" className="secondaryButton" onClick={addTrip}>
            Add another trip
          </button>
          <button type="submit">Check eligibility</button>
        </div>
      </form>

      {result && (
        <section className="result card">
          {result.type === "empty" && (
            <p>Please enter at least one trip with country and leave date.</p>
          )}

          {result.type === "contact" && (
            <>
              <h2>Please contact IBTS</h2>
              <p>
                Based on your travel to <strong>{result.country}</strong>, you should
                contact the IBTS Donor Infoline for advice: <strong>{CONTACT_NUMBER}</strong>.
              </p>
            </>
          )}

          {result.type === "eligible_now" && (
            <>
              <h2>You may be eligible now</h2>
              <p>
                No active travel deferral was found from the locations and dates
                entered.
              </p>
            </>
          )}

          {result.type === "eligible_later" && (
            <>
              <h2>Next estimated donation date</h2>
              <p>
                You can next donate on <strong>{formatDate(result.date)}</strong>.
              </p>
              <p className="detail">
                Longest deferral came from travel to {result.country} ({result.reason}).
              </p>
            </>
          )}
        </section>
      )}
    </main>
  );
}

export default App;
