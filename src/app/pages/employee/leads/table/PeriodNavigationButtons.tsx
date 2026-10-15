import React from 'react';
import PeriodNavigator, { PeriodPickGranularity } from "@app/modules/common/components/PeriodNavigator";

const PeriodNavigationButtons: React.FC<{
  onPrev: () => void;
  onNext: () => void;
  displayText: string;
  isMobile?: boolean;
  onPickDate?: (value: string) => void;
  pickValue?: string;
  pickGranularity?: PeriodPickGranularity;
}> = ({ onPrev, onNext, displayText, isMobile, onPickDate, pickValue, pickGranularity }) => (
  <div style={{ width: isMobile ? "100%" : "auto", display: "flex", justifyContent: isMobile ? "center" : "inherit" }}>
    <PeriodNavigator
      onPrevious={onPrev}
      onNext={onNext}
      label={displayText}
      onPickDate={onPickDate}
      pickValue={pickValue}
      pickGranularity={pickGranularity}
    />
  </div>
);

export default PeriodNavigationButtons;
