import type { ReactNode } from "react";
import type { IconName } from "./Icon";
import Icon from "./Icon";

export default function PageHeader({ title, sub, right, icon }: { title: string; sub?: string; right?: ReactNode; icon?: IconName }) {
  return (
    <div className="page-head">
      <div className="page-head-text">
        {icon && <span className="page-head-icon"><Icon name={icon} size={14} /></span>}
        <span className="page-head-title">{title}</span>
        {sub && <span className="page-head-sub">{sub}</span>}
      </div>
      {right && <div className="page-head-right">{right}</div>}
    </div>
  );
}
