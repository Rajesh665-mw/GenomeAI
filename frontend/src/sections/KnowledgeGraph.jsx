import { useState, useRef, useEffect } from "react";
import { KG_NODES, KG_EDGES, KG_TYPE_LABEL } from "../data/knowledgeGraph";

function clampScale(s) {
  return Math.min(2.4, Math.max(0.6, s));
}

export default function KnowledgeGraphSection() {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const containerRef = useRef(null);
  const dragState = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e) {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setView((v) => {
        const newScale = clampScale(v.scale * (1 - e.deltaY * 0.0015));
        const graphX = (mouseX - v.x) / v.scale;
        const graphY = (mouseY - v.y) / v.scale;
        return {
          scale: newScale,
          x: mouseX - graphX * newScale,
          y: mouseY - graphY * newScale,
        };
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(e) {
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startViewX: view.x,
      startViewY: view.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setView((v) => ({ ...v, x: dragState.current.startViewX + dx, y: dragState.current.startViewY + dy }));
  }
  function onPointerUp() {
    dragState.current = null;
  }

  function zoomBy(factor) {
    const el = containerRef.current;
    if (!el) {
      setView((v) => ({ ...v, scale: clampScale(v.scale * factor) }));
      return;
    }
    const rect = el.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setView((v) => {
      const newScale = clampScale(v.scale * factor);
      const graphX = (centerX - v.x) / v.scale;
      const graphY = (centerY - v.y) / v.scale;
      return {
        scale: newScale,
        x: centerX - graphX * newScale,
        y: centerY - graphY * newScale,
      };
    });
  }
  function resetView() {
    setView({ scale: 1, x: 0, y: 0 });
  }

  const active = hovered || selected;
  const activeNode = KG_NODES.find((n) => n.id === active);

  const connected = new Set();
  if (active) {
    connected.add(active);
    KG_EDGES.forEach((e) => {
      if (e.from === active) connected.add(e.to);
      if (e.to === active) connected.add(e.from);
    });
  }

  const nodeById = Object.fromEntries(KG_NODES.map((n) => [n.id, n]));

  return (
    <section className="ga-kg-section" id="knowledge-graph">
      <div className="ga-section-head">
        <div className="ga-eyebrow ga-eyebrow-alt">
          <span className="dot"></span>
          Knowledge Graph
        </div>
        <h2 className="ga-section-title">How a single gene connects to guidance</h2>
        <p className="ga-section-sub">
          Scroll to zoom, drag to pan. Hover or click any node to trace its connections.
        </p>
      </div>

      <div className="ga-kg-wrap">
        <div className="ga-kg-controls">
          <button className="ga-kg-ctrl-btn" onClick={() => zoomBy(1.25)} aria-label="Zoom in">+</button>
          <button className="ga-kg-ctrl-btn" onClick={() => zoomBy(0.8)} aria-label="Zoom out">−</button>
          <button className="ga-kg-ctrl-btn ga-kg-reset" onClick={resetView} aria-label="Reset view">⟲</button>
        </div>

        <div
          className="ga-kg-canvas"
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <svg viewBox="0 0 900 480" className="ga-kg-svg">
            <g style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
              {KG_EDGES.map((edge, i) => {
                const a = nodeById[edge.from];
                const b = nodeById[edge.to];
                const isActive = active && connected.has(edge.from) && connected.has(edge.to);
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className={`ga-kg-edge ${edge.weak ? "kg-edge-weak" : ""} ${isActive ? "kg-edge-active" : ""} ${active && !isActive ? "kg-edge-dim" : ""}`}
                  />
                );
              })}

              {KG_NODES.map((node) => {
                const isActive = active === node.id;
                const isDim = active && !connected.has(node.id);
                return (
                  <g
                    key={node.id}
                    className={`ga-kg-node kg-type-${node.type} ${isActive ? "kg-node-active" : ""} ${isDim ? "kg-node-dim" : ""}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseEnter={() => setHovered(node.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected((s) => (s === node.id ? null : node.id))}
                    tabIndex={0}
                    role="button"
                    aria-label={`${node.label}, ${KG_TYPE_LABEL[node.type]}`}
                  >
                    <circle r="16" className="ga-kg-node-circle" />
                    <text className="ga-kg-node-label" y="32" textAnchor="middle">
                      {node.label}
                    </text>
                    <text className="ga-kg-node-type" y="46" textAnchor="middle">
                      {KG_TYPE_LABEL[node.type]}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <div className={`ga-kg-detail ${activeNode ? "detail-visible" : ""}`}>
          {activeNode ? (
            <>
              <div className="ga-kg-detail-title">
                {activeNode.label}
                <span className="ga-kg-detail-badge">{KG_TYPE_LABEL[activeNode.type]}</span>
              </div>
              <div className="ga-kg-detail-text">{activeNode.detail}</div>
            </>
          ) : (
            <>
              <div className="ga-kg-detail-title">BRCA1 pathway</div>
              <div className="ga-kg-detail-text">
                Hover or click any node above to see how genes, proteins, mutations,
                diseases, and preventive guidance connect.
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

