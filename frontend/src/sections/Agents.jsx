import { useState } from "react";
import { AGENTS } from "../data/agents";

export default function AgentsSection() {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const radius = 235;
  const center = 280;

  const active = hovered || selected;

  const positions = AGENTS.map((a, i) => {
    const angle = (i / AGENTS.length) * Math.PI * 2 - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  });

  const activeAgent = AGENTS.find((a) => a.id === active);

  function toggleAgent(id) {
    setSelected((prev) => (prev === id ? null : id));
  }

  function handleKeyDown(e, id) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleAgent(id);
    }
  }

  return (
    <section className="ga-agents-section" id="ai-agents">
      <div className="ga-section-head">
        <div className="ga-eyebrow ga-eyebrow-alt">
          <span className="dot"></span>
          Agent Architecture
        </div>
        <h2 className="ga-section-title">Six specialized agents. One coordinated core.</h2>
        <p className="ga-section-sub">
          Hover or click any agent to see its role — every output still passes through
          verification before it reaches you.
        </p>
      </div>

      <div className="ga-agent-diagram-wrap">
        <div
          className="ga-agent-diagram"
          style={{ width: center * 2, height: center * 2 }}
          onMouseLeave={() => setHovered(null)}
        >
          <svg
            className="ga-agent-lines"
            width={center * 2}
            height={center * 2}
            viewBox={`0 0 ${center * 2} ${center * 2}`}
          >
            {positions.map((p, i) => {
              const isActive = active === AGENTS[i].id;
              const dx = p.x - center;
              const dy = p.y - center;
              return (
                <g key={i}>
                  <line
                    x1={center}
                    y1={center}
                    x2={p.x}
                    y2={p.y}
                    className={`ga-agent-line ${isActive ? "line-active" : ""}`}
                  />
                  <circle
                    r={isActive ? 4 : 2.5}
                    className={`ga-agent-pulse ${isActive ? "pulse-active" : ""}`}
                    style={{
                      "--ox": `${center}px`,
                      "--oy": `${center}px`,
                      "--dx": `${dx}px`,
                      "--dy": `${dy}px`,
                      animationDelay: `${i * -0.5}s`,
                    }}
                  />
                </g>
              );
            })}
          </svg>

          <div className={`ga-agent-core ${active ? "core-active" : ""}`}>
            <span className="ga-core-ring" />
            <span className="ga-core-ring ga-core-ring-2" />
            <span className="ga-core-label">AI Core</span>
          </div>

          {AGENTS.map((agent, i) => (
            <div
              key={agent.id}
              role="button"
              tabIndex={0}
              aria-pressed={selected === agent.id}
              aria-label={`${agent.name}: ${agent.short}`}
              className={`ga-agent-node ${active === agent.id ? "agent-active" : ""} ${
                selected === agent.id ? "agent-selected" : ""
              }`}
              style={{ left: positions[i].x, top: positions[i].y }}
              onMouseEnter={() => setHovered(agent.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(agent.id)}
              onBlur={() => setHovered(null)}
              onClick={() => toggleAgent(agent.id)}
              onKeyDown={(e) => handleKeyDown(e, agent.id)}
            >
              <span className="ga-agent-dot" />
              <span className="ga-agent-name">{agent.name}</span>
            </div>
          ))}
        </div>

        <div className={`ga-agent-detail ${activeAgent ? "detail-visible" : ""}`}>
          {activeAgent ? (
            <>
              <div className="ga-agent-detail-title">{activeAgent.name}</div>
              <div className="ga-agent-detail-text">{activeAgent.detail}</div>
              {selected === activeAgent.id && (
                <button
                  className="ga-agent-detail-clear"
                  onClick={() => setSelected(null)}
                >
                  Clear selection
                </button>
              )}
            </>
          ) : (
            <>
              <div className="ga-agent-detail-title">AI Core</div>
              <div className="ga-agent-detail-text">
                Orchestrates task delegation, sequencing, and consensus across all six
                agents — hover a node to inspect its role.
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
