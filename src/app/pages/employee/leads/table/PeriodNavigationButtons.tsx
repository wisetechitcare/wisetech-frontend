import { toAbsoluteUrl } from "@metronic/helpers";

const PeriodNavigationButtons: React.FC<{
  onPrev: () => void;
  onNext: () => void;
  displayText: string;
  isMobile?: boolean;
}> = ({ onPrev, onNext, displayText, isMobile }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: isMobile ? "space-between" : "center",
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: "6px",
    height: "32px",
    padding: "0 8px",
    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
    gap: "6px",
    width: isMobile ? "100%" : "auto"
  }}>
    <button
      className="btn btn-sm p-0"
      onClick={onPrev}
      style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: "pointer", borderRadius: "4px" }}
    >
      <img src={toAbsoluteUrl("media/svg/misc/back.svg")} alt="Previous" style={{ width: "12px", height: "12px" }} />
    </button>
    <span
      className="mx-2"
      style={{ fontSize: "12px", fontFamily: "Inter, sans-serif", fontWeight: 600, color: "#1E293B", whiteSpace: "nowrap", textAlign: "center", flex: isMobile ? 1 : "none" }}
    >
      {displayText}
    </span>
    <button
      className="btn btn-sm p-0"
      onClick={onNext}
      style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: "pointer", borderRadius: "4px" }}
    >
      <img src={toAbsoluteUrl("media/svg/misc/next.svg")} alt="Next" style={{ width: "12px", height: "12px" }} />
    </button>
  </div>
);

export default PeriodNavigationButtons;
