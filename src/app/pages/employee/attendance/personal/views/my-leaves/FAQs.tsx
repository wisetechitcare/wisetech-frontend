import { KTCard, KTCardBody } from "@metronic/helpers";

interface FAQs {
    question: string;
    answer: string;
}

const faqs: FAQs[] = [
    {
        question: 'What are floater leaves ?',
        answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'
    },
    {
        question: 'What is deduction time ?',
        answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'
    },
    {
        question: 'How is work time calculated ?',
        answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'
    }
]

function FAQs() {
    return (
        <>
            <KTCard>
                <KTCardBody>
                    {faqs.map((faq: FAQs, index: number) => (
                        <>
                            <div className="fw-bold mb-2">{faq.question}</div>
                            <div>{faq.answer}</div>
                            {index !== faqs.length - 1 && <hr />}
                        </>
                    ))}

                </KTCardBody>
            </KTCard>
        </>
    );
}

export default FAQs;