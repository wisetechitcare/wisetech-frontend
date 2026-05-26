import Faqs from '../information/Faqs';

/** Leaves FAQ tab — delegates to the shared Faqs component with the "leaves" type key. */
function FAQs({ fromAdmin = false }: { fromAdmin?: boolean }) {
    return <Faqs typeKey="leaves" fromAdmin={fromAdmin} />;
}

export default FAQs;
