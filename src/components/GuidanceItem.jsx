function GuidanceItem({ country, guidance }) {
  return (
    <details className="guidanceItem guidanceAccordion" open>
      <summary className="guidanceSummary">
        <h3>{country}</h3>
      </summary>
      <p className="detail">IBTS guidance for this country:</p>
      <div className="guidanceText">{guidance}</div>
    </details>
  );
}

export default GuidanceItem;
