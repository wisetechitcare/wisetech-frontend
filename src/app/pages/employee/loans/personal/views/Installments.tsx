import CommonCard from '@app/modules/common/components/CommonCard'
import { toAbsoluteUrl } from '@metronic/helpers';
import { RootState } from '@redux/store';
import { fetchEmployeeMonthlyInstallments } from '@services/employee';
import dayjs, { Dayjs, ManipulateType } from "dayjs";
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux';
import Monthly from './monthly/Monthly';
import { resourceNameMapWithCamelCase } from '@constants/statistics';

function Installments() {
    const [alignment, setAlignment] = useState("monthly");
    const employeeId = useSelector(
        (state: RootState) => state.employee.currentEmployee.id
    );

    const [month, setMonth] = useState(dayjs());
    const toggleItemsActions = {
        monthly: function (month: Dayjs): void {
            const currMonth = month.format("YYYY-MM-DD")
            const startDate = dayjs(currMonth).startOf('month').format('YYYY-MM-DD')
            const endDate = dayjs(currMonth).endOf('month').format('YYYY-MM-DD')
            fetchEmployeeMonthlyInstallments(startDate.toString(), endDate.toString(), employeeId);
        }
    };

    const handleDatesChange = (
        action: string,
        type: ManipulateType,
        setState: React.Dispatch<React.SetStateAction<Dayjs>>
    ) => {
        switch (action) {
            case "increment":
                setState((state) => state.add(1, type));
                return;
            case "decrement":
                setState((state) => state.subtract(1, type));
                return;
            default:
                return;
        }
    };

    return (
        <div>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-3" >
                    <h2 className="text-start text-md-start">
                        Monthly Installment
                    </h2>

                    {/* Toggler: centered on mobile, right on md+ */}
                    <div className="mb-2">
                        <button   
                            className="btn btn-sm me-2 p-0"
                            onClick={() => {
                                handleDatesChange("decrement", "month", setMonth);
                                toggleItemsActions?.monthly(month.subtract(1, "month"));
                            }}
                        >
                            <img src={toAbsoluteUrl("media/svg/misc/back.svg")} />
                        </button>

                        <span className="mx-2 mt-3">{month.format("MMM, YYYY")}</span>

                        <button
                            className="btn btn-sm ms-2 p-0"
                            onClick={() => {
                                handleDatesChange("increment", "month", setMonth);
                                toggleItemsActions?.monthly(month.add(1, "month"));
                            }}
                        >
                            <img src={toAbsoluteUrl("media/svg/misc/next.svg")} />
                        </button>
                    </div>
                </div>
                   <Monthly resource={resourceNameMapWithCamelCase.loanInstallment} month={month} viewOthers={false} viewOwn={true} />
            </div>
         
    )
}

export default Installments