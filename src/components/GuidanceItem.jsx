import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

function GuidanceItem({ country, guidance }) {
  return (
    <details className="guidanceItem guidanceAccordion" open>
      <summary className="guidanceSummary">
        <h3>{country}</h3>
      </summary>
      <p className="detail">IBTS guidance for this country:</p>
      <div className="guidanceText">
        <ReactMarkdown
          remarkPlugins={[remarkBreaks]}
          components={{
            a: ({ ...props }) => (
              <a {...props} target="_blank" rel="noreferrer noopener" />
            )
          }}
        >
          {guidance || ""}
        </ReactMarkdown>
      </div>
    </details>
  );
}

export default GuidanceItem;
