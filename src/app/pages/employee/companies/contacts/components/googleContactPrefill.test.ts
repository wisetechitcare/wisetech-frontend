import { describe, it, expect } from 'vitest';
import { toContactFormPrefill, toContactCreatePayload, type GoogleContactCandidate } from './googleContactPrefill';

const candidate = (overrides: Partial<GoogleContactCandidate['fields']> = {}): GoogleContactCandidate => ({
    googleResourceId: 'people/c123',
    displayLabel: 'Rahul Sharma',
    organizationName: 'Acme Engineering',
    photoUrl: null,
    unmapped: [],
    verdict: 'NEW',
    reason: 'Not in the CRM yet.',
    matchedContactId: null,
    matchedContact: null,
    importBlocked: false,
    fields: {
        fullName: 'Rahul Sharma',
        phone: '+91 98765 43210',
        phone2: '022 2654 1000',
        email: 'rahul@acme.example',
        roleInCompany: 'Project Director',
        address: '14 Marine Drive',
        area: 'Nariman Point',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        zipCode: '400021',
        dateOfBirth: '1984-03-14T00:00:00.000Z',
        anniversary: '2010-11-02T00:00:00.000Z',
        gender: 'MALE',
        note: 'Met at the Vashi site visit.',
        ...overrides,
    },
});

describe('toContactFormPrefill', () => {
    it('carries every mapped field into the existing form', () => {
        const p = toContactFormPrefill(candidate());
        expect(p).toMatchObject({
            fullName: 'Rahul Sharma',
            phone: '+91 98765 43210',
            phone2: '022 2654 1000',
            email: 'rahul@acme.example',
            roleInCompany: 'Project Director',
            address: '14 Marine Drive',
            area: 'Nariman Point',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            zipCode: '400021',
            dateOfBirth: '1984-03-14T00:00:00.000Z',
            anniversary: '2010-11-02T00:00:00.000Z',
            gender: 'MALE',
            note: 'Met at the Vashi site visit.',
        });
    });

    it('omits absent fields rather than handing the form nulls', () => {
        // The form renders `initialData.x || ""`. A null would be falsy and fine, but an
        // explicitly present key with an undefined value defeats the component's own defaults.
        const p = toContactFormPrefill(candidate({ phone2: null, note: null, gender: null }));
        expect('phone2' in p).toBe(false);
        expect('note' in p).toBe(false);
        expect('gender' in p).toBe(false);
        expect(Object.values(p).every((v) => v !== null && v !== undefined)).toBe(true);
    });

    it('a name + phone only contact prefills just those', () => {
        const p = toContactFormPrefill(candidate({
            phone2: null, email: null, roleInCompany: null, address: null, area: null,
            city: null, state: null, country: null, zipCode: null,
            dateOfBirth: null, anniversary: null, gender: null, note: null,
        }));
        expect(p.fullName).toBe('Rahul Sharma');
        expect(p.phone).toBe('+91 98765 43210');
        // Everything else gone, so the form opens with its own empty defaults.
        expect(Object.keys(p).sort()).toEqual(['fullName', 'googleResourceId', 'phone', 'visibility']);
    });

    it('marks the contact as company-visible, not the importer\'s private one', () => {
        // The ownership requirement in one assertion: an imported contact belongs to the
        // organization, never to the admin who clicked import. The manual form opens on
        // "Only Me"; this deliberately does not.
        expect(toContactFormPrefill(candidate()).visibility).toBe('Everyone');
    });

    it('carries the Google id as provenance', () => {
        expect(toContactFormPrefill(candidate()).googleResourceId).toBe('people/c123');
    });

    it('never writes the employer name into a contact field', () => {
        // company_id is a foreign key. A typed string is not one, and the nearest-looking
        // field is still the wrong field.
        const c = candidate();
        const p = toContactFormPrefill(c);
        expect(Object.values(p)).not.toContain('Acme Engineering');
    });

    it('passes the photo as a SOURCE url, never as profilePhoto', () => {
        // profilePhoto holds a path to an asset we host. googlePhotoUrl is transport: the
        // server fetches those bytes once and swaps in its own path.
        const c = candidate();
        c.photoUrl = 'https://lh3.googleusercontent.com/x';
        const p = toContactFormPrefill(c);
        expect(p.googlePhotoUrl).toBe('https://lh3.googleusercontent.com/x');
        expect('profilePhoto' in p).toBe(false);
    });

    it('a contact with no name prefills no name, leaving the form to require one', () => {
        const p = toContactFormPrefill(candidate({ fullName: '' }));
        expect('fullName' in p).toBe(false);
    });
});

describe('toContactCreatePayload (bulk path)', () => {
    it('sends every mapped field the API accepts', () => {
        const p = toContactCreatePayload(candidate());
        expect(p).toMatchObject({
            fullName: 'Rahul Sharma',
            phone: '+91 98765 43210',
            phone2: '022 2654 1000',
            email: 'rahul@acme.example',
            roleInCompany: 'Project Director',
            address: '14 Marine Drive',
            area: 'Nariman Point',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            zipCode: '400021',
            dateOfBirth: '1984-03-14T00:00:00.000Z',
            anniversary: '2010-11-02T00:00:00.000Z',
            gender: 'MALE',
            note: 'Met at the Vashi site visit.',
        });
    });

    it('uses the API enum for visibility, not the form label', () => {
        // The two paths target different consumers: the form upper-cases its label on submit,
        // this goes straight to the API. Same meaning, different vocabulary.
        expect(toContactCreatePayload(candidate()).visibility).toBe('EVERYONE');
        expect(toContactFormPrefill(candidate()).visibility).toBe('Everyone');
    });

    it('omits empty fields rather than sending nulls', () => {
        const p = toContactCreatePayload(candidate({ phone2: null, note: null, gender: null, address: null }));
        expect('phone2' in p).toBe(false);
        expect('note' in p).toBe(false);
        expect('gender' in p).toBe(false);
        expect('address' in p).toBe(false);
    });

    it('never sends status — an imported contact is the same KIND of record as a typed one', () => {
        expect('status' in toContactCreatePayload(candidate())).toBe(false);
    });

    it('never sends the employer name, and sends the photo only as a source url', () => {
        const c = candidate();
        c.photoUrl = 'https://lh3.googleusercontent.com/x';
        const p = toContactCreatePayload(c);
        expect(Object.values(p)).not.toContain('Acme Engineering');
        expect('companyId' in p).toBe(false);
        // Never the column — the server decides what profilePhoto ends up being.
        expect('profilePhoto' in p).toBe(false);
        expect(p.googlePhotoUrl).toBe('https://lh3.googleusercontent.com/x');
    });

    it('carries provenance', () => {
        expect(toContactCreatePayload(candidate()).googleResourceId).toBe('people/c123');
    });
});
