import { useLocalStorage, useNow } from "../lib";
import PageHeader from "../components/PageHeader";

const GOAL = 8;
const ML = 250;

export default function Water() {
  const now = useNow(10000);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [state, setState] = useLocalStorage<{ date: string; count: number }>("raven.water", { date: today, count: 0 });
  const count = state.date === today ? state.count : 0;
  const pct = Math.round((count / GOAL) * 100);

  const setCount = (n: number) => setState({ date: today, count: Math.max(0, Math.min(GOAL, n)) });

  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <div className="page water has-head">
      <PageHeader title="Water Reminder" sub={`${count * ML} ml`} />

      <div className="water-main">
        <div className="water-ring">
          <svg viewBox="0 0 80 80">
            <circle className="water-ring-bg" cx="40" cy="40" r={R} />
            <circle
              className="water-ring-fg"
              cx="40"
              cy="40"
              r={R}
              strokeDasharray={C}
              strokeDashoffset={C * (1 - count / GOAL)}
            />
          </svg>
          <div className="water-ring-label">
            <span className="water-pct">{pct}%</span>
            <span className="water-goal">{count}/{GOAL}</span>
          </div>
        </div>

        <div className="water-right">
          <div className="water-glasses">
            {Array.from({ length: GOAL }).map((_, i) => (
              <button
                key={i}
                className={`glass ${i < count ? "full" : ""}`}
                onClick={() => setCount(i + 1)}
                aria-label={`Gelas ${i + 1}`}
              >
                <span className="glass-fill" />
              </button>
            ))}
          </div>
          <div className="water-actions">
            <button onClick={() => setCount(count - 1)} aria-label="Kurangi">−</button>
            <span className="water-status">
              {count === 0 ? "Ayo mulai minum" : count >= GOAL ? "Target tercapai" : "Terus minum"}
            </span>
            <button onClick={() => setCount(count + 1)} aria-label="Tambah">+</button>
          </div>
        </div>
      </div>
    </div>
  );
}
