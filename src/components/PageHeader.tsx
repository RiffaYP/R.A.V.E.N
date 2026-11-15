import type { ReactNode } from "react";

export default function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="page-head-text">
        <span className="page-head-title">{title}</span>
        {sub && <span className="page-head-sub">{sub}</span>}
      </div>
      {right && <div className="page-head-right">{right}</div>}
    </div>
  );
}
