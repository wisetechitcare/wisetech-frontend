import { describe, it, expect } from 'vitest';
import { contactCompanyName, contactLabel, missingEmailNotice } from './contactLabel';

describe('contactLabel', () => {
    it('puts the company in brackets, the way the contacts table does', () => {
        expect(contactLabel({ fullName: 'Manish', company: { companyName: 'A2O Realty' } }))
            .toBe('Manish (A2O Realty)');
    });

    it('a sub-company names its parent too — "(Vashi)" alone identifies nobody', () => {
        expect(contactLabel({
            fullName: 'Ajay',
            subCompany: { subCompanyName: 'Vashi', mainCompany: { companyName: 'A&O Realty' } },
        })).toBe('Ajay (A&O Realty (Vashi))');
    });

    it('falls back to the sub-company alone when the parent did not come down', () => {
        expect(contactCompanyName({ subCompany: { subCompanyName: 'Vashi' } })).toBe('Vashi');
    });

    it('prefers the direct company when a contact has both', () => {
        expect(contactCompanyName({
            company: { companyName: 'A2O Realty' },
            subCompany: { subCompanyName: 'Vashi', mainCompany: { companyName: 'A&O Realty' } },
        })).toBe('A2O Realty');
    });

    it('no company means no empty brackets', () => {
        expect(contactLabel({ fullName: 'Manish' })).toBe('Manish');
        expect(contactLabel({ fullName: 'Manish', company: { companyName: '   ' } })).toBe('Manish');
    });

    it('a nameless contact is still pickable — never a uuid, never blank', () => {
        expect(contactLabel({})).toBe('Unnamed contact');
        expect(contactLabel({ fullName: '  ', company: { companyName: 'A2O Realty' } }))
            .toBe('Unnamed contact (A2O Realty)');
    });
});

describe('missingEmailNotice', () => {
    it('names one person, and says what the consequence is', () => {
        // The consequence is the point: a contact with no address is a guest the invitation
        // silently does not go to, and there is no bounce to notice afterwards.
        expect(missingEmailNotice(['Bipradip']))
            .toBe('Bipradip has no email address on file, so the invitation cannot reach them.');
    });

    it('joins two with "and", and switches the verb', () => {
        expect(missingEmailNotice(['Bipradip', 'Manish']))
            .toBe('Bipradip and Manish have no email address on file, so the invitation cannot reach them.');
    });

    it('lists three in full', () => {
        expect(missingEmailNotice(['Bipradip', 'Manish', 'Rahul']))
            .toBe('Bipradip, Manish and Rahul have no email address on file, so the invitation cannot reach them.');
    });

    it('counts the rest past three — the chips carry their own marker by then', () => {
        expect(missingEmailNotice(['Bipradip', 'Manish', 'Rahul', 'Priya']))
            .toBe('Bipradip, Manish, Rahul and 1 other have no email address on file, so the invitation cannot reach them.');
        expect(missingEmailNotice(['A', 'B', 'C', 'D', 'E']))
            .toBe('A, B, C and 2 others have no email address on file, so the invitation cannot reach them.');
    });

    it('nobody means NOTHING — a caller renders no notice, not an empty one', () => {
        expect(missingEmailNotice([])).toBe('');
        expect(missingEmailNotice(['  ', ''])).toBe('');
    });
});
