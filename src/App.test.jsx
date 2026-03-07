import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

async function setTrip({ index, country, leaveDate }) {
  const selects = screen.getAllByRole("combobox");
  const dateInputs = screen.getAllByLabelText("Date you left");

  await userEvent.selectOptions(selects[index], country);
  fireEvent.change(dateInputs[index], { target: { value: leaveDate } });
}

describe("App", () => {
  it("shows contact guidance for countries that require direct advice", async () => {
    render(<App />);

    await setTrip({
      index: 0,
      country: "Algeria",
      leaveDate: "2026-03-01",
    });

    expect(
      screen.getByRole("heading", { name: "Please contact IBTS" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Algeria", level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/contact the IBTS Donor Infoline for advice/i),
    ).toBeInTheDocument();
  });

  it("shows WNV conditional eligibility for seasonal testing rules", async () => {
    render(<App />);

    await setTrip({
      index: 0,
      country: "Austria",
      leaveDate: "2026-03-01",
    });

    expect(
      screen.getByRole("heading", {
        name: "You may be eligible now (WNV seasonal testing applies)",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/West Nile Virus \(WNV\) risk area/i)).toBeInTheDocument();
  });

  it("uses the later deferral when a second trip is added", async () => {
    render(<App />);

    await setTrip({
      index: 0,
      country: "Bahrain",
      leaveDate: "2026-01-01",
    });

    expect(
      screen.getByRole("heading", { name: "You may be eligible now" }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Add another trip" }),
    );

    await setTrip({
      index: 1,
      country: "Australia",
      leaveDate: "2026-02-01",
    });

    expect(
      screen.getByRole("heading", { name: "Next estimated donation date" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/latest wait period is based on your trip to/i),
    ).toHaveTextContent("Australia");
  });

  it("updates the result when a trip is removed", async () => {
    render(<App />);

    await setTrip({
      index: 0,
      country: "Bahrain",
      leaveDate: "2026-01-01",
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Add another trip" }),
    );

    await setTrip({
      index: 1,
      country: "Algeria",
      leaveDate: "2026-03-01",
    });

    expect(
      screen.getByRole("heading", { name: "Please contact IBTS" }),
    ).toBeInTheDocument();

    const tripTwo = screen.getByRole("heading", { name: "Trip 2" }).closest("section");
    await userEvent.click(
      within(tripTwo).getByRole("button", { name: "Remove trip" }),
    );

    expect(
      screen.getByRole("heading", { name: "You may be eligible now" }),
    ).toBeInTheDocument();
  });

  it("renders guidance for each selected country", async () => {
    render(<App />);

    await setTrip({
      index: 0,
      country: "Bahrain",
      leaveDate: "2026-01-01",
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Add another trip" }),
    );

    await setTrip({
      index: 1,
      country: "Austria",
      leaveDate: "2026-03-01",
    });

    expect(
      screen.getByRole("heading", { name: "Bahrain", level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Austria", level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("IBTS guidance for this country:")).toHaveLength(2);
  });
});
