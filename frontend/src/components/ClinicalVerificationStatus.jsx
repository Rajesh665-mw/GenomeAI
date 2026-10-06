// Reusable status-checklist component. Pass a custom `steps` array to wire
// this up to real backend/orchestrator events later — each step just needs
// { id, label, status } where status is "complete" | "active" | "pending".

const DEFAULT_STEPS = [
  { id: "gene", label: "Gene Validated", status: "complete" },
  { id: "disease", label: "Disease Associations Retrieved", status: "complete" },
  { id: "evidence", label: "Evidence Verified", status: "complete" },
  { id: "guidance", label: "Preventive Guidance Generated", status: "complete" },
  { id: "report", label: "Clinical Report Ready", status: "complete" },
];

export default function ClinicalVerificationStatus({
  steps = DEFAULT_STEPS,
  title = "Clinical Verification Status",
}) {
  return (
    <div className="ga-cvs">
      {title && <div className="ga-cvs-title">{title}</div>}
      <div className="ga-cvs-row">
        {steps.map((step, i) => (
          <div className={`ga-cvs-item cvs-${step.status}`} key={step.id || i}>
            <span className="ga-cvs-icon">
              {step.status === "complete" ? "✓" : step.status === "active" ? "" : "·"}
            </span>
            <span className="ga-cvs-label">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
