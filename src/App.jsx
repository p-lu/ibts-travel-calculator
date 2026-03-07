import { useMemo, useState } from "react";
import rules from "../ibts_deferrals.json";
import GuidanceItem from "./components/GuidanceItem";
import {
  buildCountries,
  buildRulesByName,
  calculateEligibility,
  formatDate,
  formatList,
} from "./lib/eligibility";

const CONTACT_NUMBER = "1800 731 137";

const countries = buildCountries(rules);
const rulesByName = buildRulesByName(rules);

function App() {
  const [trips, setTrips] = useState([{ country: "", leaveDate: "" }]);

  const result = useMemo(() => calculateEligibility(trips, rulesByName), [trips]);

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

  return (
    <main className="app">
      <h1>IBTS Travel Deferral Checker</h1>
      <p className="subtitle">
        Enter your trips to estimate when you can next donate blood per IBTS guidance.
      </p>
      <p className="disclaimer">
        This tool is not affiliated with the IBTS. Travel
        deferral data may be incomplete or incorrect, so always confirm your
        eligibility with official IBTS guidance before donating.
      </p>

      <section className="card">
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
        </div>
      </section>

      {result && (
        <section className="result card">
          {result.type === "empty" && (
            <p>Please enter at least one trip with country and leave date.</p>
          )}

          {result.type === "contact" && (
            <>
              <h2>Please contact IBTS</h2>
              <p>
                Based on your travel to{" "}
                <strong>{formatList(result.contactCountries)}</strong>,
                you should contact the IBTS Donor Infoline for advice:{" "}
                <strong>{CONTACT_NUMBER}</strong>.
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

          {result.type === "eligible_now_conditional" && (
            <>
              <h2>You may be eligible now (WNV seasonal testing applies)</h2>
              <p>
                Your travel includes a West Nile Virus (WNV) risk area. IBTS
                usually tests donations during the WNV season (01 May to 30
                November), so a 28-day wait often does not apply while testing
                is active.
              </p>
              <p>
                Final eligibility is confirmed at donation screening. If unsure,
                contact the Donor Infoline: <strong>{CONTACT_NUMBER}</strong>.
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
                Your latest wait period is based on your trip to <strong>{result.country}</strong>.
              </p>
            </>
          )}

          {result.guidance?.length > 0 && (
            <div className="guidanceList">
              {result.guidance.map((item) => (
                <GuidanceItem
                  key={item.country}
                  country={item.country}
                  guidance={item.rawText}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default App;
