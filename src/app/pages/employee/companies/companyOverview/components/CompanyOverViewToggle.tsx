import { toAbsoluteUrl } from "@metronic/helpers";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { resourseAndView } from "@models/company";
import Yearly from "./Yearly";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export type ToggleItemsCallBackFunctions = {
  monthly: (date: Dayjs, endDate: Dayjs) => void;
  yearly: (date: Dayjs, endDate: Dayjs) => void;
  custom: (startDate: Dayjs, endDate: Dayjs) => void;
};

interface MaterialToggleProps {
  toggleItemsActions?: ToggleItemsCallBackFunctions;
  fromAdmin?: boolean;
  resourseAndView: resourseAndView[];
  dateSettingsEnabled: boolean;
  checkOwnWithOthers?: boolean;
}

const CompanyOverViewToggle = ({
  toggleItemsActions,
  fromAdmin = false,
  resourseAndView,
  dateSettingsEnabled,
  checkOwnWithOthers,
}: MaterialToggleProps) => {
  const dispatch = useDispatch();
  const today = dayjs();

  const [yearStart, setYearStart] = useState<Dayjs | null>(null);
  const [yearEnd, setYearEnd] = useState<Dayjs | null>(null);
  const [fiscalYearDisplay, setFiscalYearDisplay] = useState("");

  const isCurrentFiscalYear = (
    fiscalStart: Dayjs,
    fiscalEnd: Dayjs
  ): boolean => {
    return (
      today.isSameOrAfter(fiscalStart, "day") &&
      today.isSameOrBefore(fiscalEnd, "day")
    );
  };

  useEffect(() => {
    dispatch(fetchRolesAndPermissions() as any);
  }, []);

  useEffect(() => {
    async function calculateFiscalYear() {
      const { startDate, endDate } = await generateFiscalYearFromGivenYear(
        today
      );
      const fiscalStart = dayjs(startDate);
      const fiscalEnd =
        isCurrentFiscalYear(fiscalStart, dayjs(endDate)) && dateSettingsEnabled
          ? today
          : dayjs(endDate);

      setYearStart(fiscalStart);
      setYearEnd(fiscalEnd);
      setFiscalYearDisplay(
        `${fiscalStart.format("DD MMM, YYYY")} - ${fiscalEnd.format(
          "DD MMM, YYYY"
        )}`
      );

      if (toggleItemsActions?.yearly) {
        toggleItemsActions.yearly(fiscalStart, fiscalEnd);
      }
    }

    calculateFiscalYear();
  }, [dateSettingsEnabled]);

  const navigateYear = async (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -1 : 1;
    const base = yearStart ?? today;
    const newFiscalYearDate = base.add(offset, "year");

    const { startDate, endDate } = await generateFiscalYearFromGivenYear(
      newFiscalYearDate
    );
    const fiscalStart = dayjs(startDate);
    const fiscalEnd =
      isCurrentFiscalYear(fiscalStart, dayjs(endDate)) && dateSettingsEnabled
        ? today
        : dayjs(endDate);

    setYearStart(fiscalStart);
    setYearEnd(fiscalEnd);
    setFiscalYearDisplay(
      `${fiscalStart.format("DD MMM, YYYY")} - ${fiscalEnd.format(
        "DD MMM, YYYY"
      )}`
    );
    toggleItemsActions?.yearly(fiscalStart, fiscalEnd);
  };

  const NavigationButtons = ({
    onPrev,
    onNext,
    displayText,
  }: {
    onPrev: () => void;
    onNext: () => void;
    displayText: string;
  }) => (
    <div className="d-flex align-items-center">
      <button className="btn btn-sm p-0" onClick={onPrev}>
        <img src={toAbsoluteUrl("media/svg/misc/back.svg")} alt="Previous" />
      </button>
      <span className="mx-2 mt-0 fw-bold lh-base font-barlow">{displayText}</span>
      <button className="btn btn-sm p-0" onClick={onNext}>
        <img src={toAbsoluteUrl("media/svg/misc/next.svg")} alt="Next" />
      </button>
    </div>
  );

  return (
    <>
      <div className="d-flex flex-row justify-content-end align-items-center mb-6 ">
        <NavigationButtons
          onPrev={() => navigateYear("prev")}
          onNext={() => navigateYear("next")}
          displayText={fiscalYearDisplay}
        />
      </div>

      {yearStart && yearEnd && (
        <Yearly
          year={yearStart}
          endDate={yearEnd}
          fromAdmin={fromAdmin}
          dateSettingsEnabled={dateSettingsEnabled}
        />
      )}
    </>
  );
};

export default CompanyOverViewToggle;
