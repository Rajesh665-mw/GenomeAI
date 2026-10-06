import { useInView } from "../hooks/useInView";
import { WORKFLOW_STEPS } from "../data/workflow";

function WorkflowStep({ step, index }) {
  const [ref, inView] = useInView(0.35);
  const isRight = index % 2 === 1;
  return (
    <div
      ref={ref}
      className={`ga-wf-step ${isRight ? "wf-right" : "wf-left"} ${inView ? "wf-visible" : ""}`}
    >
      <div className="ga-wf-card">
        <div className="ga-wf-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            {step.icon}
          </svg>
        </div>
        <div className="ga-wf-title">{step.title}</div>
        <div className="ga-wf-text">{step.text}</div>
      </div>
      <div className="ga-wf-node">
        <span className="ga-wf-node-dot" />
      </div>
    </div>
  );
}

export default function WorkflowSection() {
  return (
    <section className="ga-workflow-section" id="workflow">
      <div className="ga-section-head">
        <div className="ga-eyebrow ga-eyebrow-alt">
          <span className="dot"></span>
          Pipeline
        </div>
        <h2 className="ga-section-title">From raw gene to preventive guidance</h2>
        <p className="ga-section-sub">
          Every analysis moves through the same six checkpoints, in order, with nothing
          skipped.
        </p>
      </div>

      <div className="ga-wf-track">
        <div className="ga-wf-line" />
        {WORKFLOW_STEPS.map((step, i) => (
          <WorkflowStep step={step} index={i} key={step.id} />
        ))}
      </div>
    </section>
  );
}
