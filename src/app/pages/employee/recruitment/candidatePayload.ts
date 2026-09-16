import type { ApplicantPayload } from "@services/recruitment";

/**
 * What a candidate form sends: trimmed, and an empty optional text field sent as `null`.
 *
 * An empty string is not "no value" to the database. A phone-only candidate saved with `email: ""`
 * collided with the next phone-only candidate on the unique (company, email) index, so the second
 * such edit failed. Null is what "not given" means.
 */
export function cleanCandidatePayload(form: ApplicantPayload): ApplicantPayload {
    const text = (v?: string | null) => {
        const t = (v ?? "").trim();
        return t ? t : null;
    };
    return {
        ...form,
        firstName: form.firstName.trim(),
        lastName: text(form.lastName),
        email: text(form.email),
        phone: text(form.phone),
        currentEmployer: text(form.currentEmployer),
        currentTitle: text(form.currentTitle),
        currentLocation: text(form.currentLocation),
        qualification: text(form.qualification),
    };
}
