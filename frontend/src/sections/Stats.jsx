import { STATS } from "../data/stats";
import { useCountUp } from "../hooks/useCountUp";
import { useInView } from "../hooks/useInView";

function StatCard({ stat }) {
  const [ref, inView] = useInView(0.4);
  const value = useCountUp(stat.value, inView);
  return (
    <div className="ga-stat-card" ref={ref}>
      <div className="ga-stat-value">
        {value.toLocaleString()}
        <span className="ga-stat-suffix">{stat.suffix}</span>
      </div>
      <div className="ga-stat-label">{stat.label}</div>
    </div>
  );
}

export default function StatsSection() {
  return (
    <section className="ga-stats">
      <div className="ga-stats-grid">
        {STATS.map((s) => (
          <StatCard stat={s} key={s.label} />
        ))}
      </div>
    </section>
  );
}
