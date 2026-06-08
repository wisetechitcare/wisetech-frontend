import { KTCard, KTCardBody } from "@metronic/helpers";

interface Rules {
    name: string;
    value: string;
}

const rules = [
    {
        name: 'Total shift time',
        value: '9:00 Hrs'
    },
    {
        name: 'Working time',
        value: '8:00 Hrs'
    },
    {
        name: 'Lunch time',
        value: '1:00 Hrs'
    },
    {
        name: 'Deduction time',
        value: '1:00 Hrs'
    },
];

function Rules() {

    return (
        <>
            <KTCard>
                <KTCardBody>
                    {rules.map((rule: Rules, index: number) => (
                        <>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <div className="fw-bold">{rule.name}</div>
                                <div>{rule.value}</div>
                            </div>
                            {index !== rules.length - 1 && <hr />}
                        </>
                    ))}
                </KTCardBody>
            </KTCard>
        </>
    );
}

export default Rules;