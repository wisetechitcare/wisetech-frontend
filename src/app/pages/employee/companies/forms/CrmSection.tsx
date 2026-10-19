import React from "react";

type Props = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

/** Lead/Onboarding section card — replaces broken fieldset/legend chrome. */
export function CrmSection({ title, children, className }: Props) {
  return (
    <div className={`wt-section-card${className ? ` ${className}` : ""}`}>
      <div className="wt-section-heading">
        <span className="wt-section-heading-text">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default CrmSection;
