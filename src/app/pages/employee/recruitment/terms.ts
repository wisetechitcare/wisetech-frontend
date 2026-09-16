/**
 * The words this module says to the people using it — defined once.
 *
 * WHY A FILE FOR NOUNS. The module disagreed with itself. The tab said "Candidates" while
 * the config card said "Applicant Sources" and the code said `applicant` throughout, so the
 * same person had two names depending on which screen you were looking at. HR's own tracker
 * says "Candidate", and the vocabulary a team already uses beats the one a schema happens to
 * have.
 *
 * The DATABASE keeps `applicant` — renaming a model to fix a label is a migration in
 * exchange for nothing. This is the translation layer between the schema's word and the
 * user's, and it is the only place the user's word is written down.
 *
 * KEEP THE TERMS HR RECOGNISES. "Requisition" stays: their sheet has a Job Requisition tab,
 * so it is their word, not jargon we imposed. Plain language means the words the reader
 * already uses — not the simplest words available.
 */

export const TERMS = {
    /** A person being considered. HR's word; the schema's is `applicant`. */
    candidate: 'candidate',
    candidates: 'candidates',
    Candidate: 'Candidate',
    Candidates: 'Candidates',

    /** An approved request to hire. HR's own sheet calls this a Job Requisition. */
    requisition: 'role',
    requisitions: 'roles',
    Requisition: 'Role',
    Requisitions: 'Roles',

    /** A requisition published to the careers site. */
    posting: 'job advert',
    postings: 'job adverts',
    Posting: 'Job Advert',
    Postings: 'Job Adverts',

    /** One panelist's written verdict on one interview. */
    scorecard: 'interview feedback',
    Scorecard: 'Interview Feedback',
    scorecards: 'interview feedback',

    /** Where a candidate came from — referral, WhatsApp, careers page. */
    source: 'source',
    Source: 'Source',

    /** The stage a candidate currently sits in. */
    stage: 'stage',
    Stage: 'Stage',
} as const;

/**
 * Sentences that appear in more than one place, so they cannot drift apart.
 * Written as a recruiter would say them, not as the data model would.
 */
export const COPY = {
    noCandidates: {
        title: 'No Candidates Yet',
        hint: 'Add someone by hand, import the HR tracker, or publish a job advert so people can apply.',
        action: 'Add a Candidate',
    },
    noSearchMatch: (term: string) => ({
        title: `Nothing matches “${term}”`,
        // What the search actually matches (backend applicantSearch: name, email, job title, employer).
        hint: 'Try part of a name, an email, a job title or an employer.',
    }),
    noRequisitions: {
        title: 'No Roles Open',
        hint: 'A role is the approved request to hire. Open one before adding candidates against it.',
        action: 'Open a Role',
    },
    noPostings: {
        title: 'Nothing Published Yet',
        hint: 'Publishing a role puts it on the careers page so people can apply themselves.',
        action: 'Publish a Role',
    },
    noInterviews: {
        title: 'No Interviews Scheduled',
        hint: 'Scheduling one emails the candidate and the panel with the time and the joining link.',
        action: 'Schedule an Interview',
    },
    noNotes: {
        title: 'No Notes Yet',
        hint: 'Notes are what you remember about a candidate that the form fields cannot hold.',
    },
    noStagesConfigured: {
        title: 'No Hiring Stages Set Up',
        hint: 'Stages are the steps a candidate moves through. Add them in Configure before anyone applies.',
    },
} as const;
