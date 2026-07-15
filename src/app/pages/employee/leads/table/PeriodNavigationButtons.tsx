import React from 'react';
import PeriodNavigator from "@app/modules/common/components/PeriodNavigator";

const PeriodNavigationButtons: React.FC<{
  onPrev: () => void;
  onNext: () => void;
  displayText: string;
  isMobile?: boolean;
}> = ({ onPrev, onNext, displayText, isMobile }) => (
  <div style={{ width: isMobile ? "100%" : "auto", display: "flex", justifyContent: isMobile ? "center" : "inherit" }}>
    <PeriodNavigator
      onPrevious={onPrev}
      onNext={onNext}
      label={displayText}
    />
  </div>
);

export default PeriodNavigationButtons;
