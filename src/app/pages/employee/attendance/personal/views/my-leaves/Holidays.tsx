import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { KTCard, KTCardBody } from "@metronic/helpers";
import { fetchPublicHolidays } from "@services/company";

function Holidays() {
    const [holidays, setHolidays] = useState([]);

    useEffect(() => {

        async function fetchHolidays() {

            const { data: { publicHolidays } } = await fetchPublicHolidays('2024', 'India');

            setHolidays(publicHolidays);

        }

        fetchHolidays();
    }, []);

    return (
        <>
            <KTCard>
                <KTCardBody>
                    {holidays.map((rule: any, index: number) => (
                        <>
                            <div className="d-flex justify-content-between align-items-center mb-2">

                                <div className="fw-bold">{rule.holiday.name}</div>

                                <div>{dayjs(rule.date).format('DD/MM/YYYY')}</div>

                            </div>
                            {index !== holidays.length - 1 && <hr />}
                        </>

                    ))}
                </KTCardBody>
            </KTCard>
        </>
    );
}

export default Holidays;