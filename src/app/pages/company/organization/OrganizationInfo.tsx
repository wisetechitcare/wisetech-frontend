import { resolveActiveOrg } from '@utils/activeOrg';

import React, { useState, useEffect, useCallback } from 'react';
import { BadgeCheck, Briefcase, Download, FileText, Globe, Image as ImageIcon, ImageOff, Landmark, Mail, MapPin, Pencil, Phone, Receipt, ScrollText } from 'lucide-react';
import type { Tone } from '@/ds/lib/tone';
import { Button } from '@/ds/ui/button';
import { Card, CardContent, CardHeader } from '@/ds/ui/card';
import { Spinner } from '@/ds/ui/spinner';
import { DescriptionList } from '@/ds/patterns/description-list';
import { EmptyState } from '@/ds/patterns/empty-state';
import { PersonHeader } from '@/ds/patterns/person';
import { SectionHeader } from '@/ds/patterns/section-header';
import { fetchCompanyOverview, fetchOrganizationById } from '@services/company';
import { ICompanyOverview } from "@models/company";
import { resolveFormSchema } from './formSchema';
import { pdf } from '@react-pdf/renderer';
import OrganizationTemplate from './OrganizationReportTemplet';
import { useEventBus } from '@hooks/useEventBus';
import { errorConfirmation } from '@utils/modal';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import { WhatsAppIcon } from '@/ds/lib/icons/brandIcons';
import { formatFiscalYearRange, parseFiscalDateString } from '@utils/fiscalYearRange';
import { formatDate } from '@utils/dateFormats';

/** Per-section look (icon + category hue), shared with the edit form. Unknown (custom) sections: slate. */
export const ORG_SECTION_LOOK: Record<string, { icon: React.ReactNode; tone: Tone; subtitle: string }> = {
    basic_info: { icon: <Briefcase aria-hidden />, tone: 'blue', subtitle: 'Who the organization is' },
    govt: { icon: <FileText aria-hidden />, tone: 'purple', subtitle: 'Registration and addresses' },
    admin: { icon: <BadgeCheck aria-hidden />, tone: 'cyan', subtitle: 'Registrations and certificates' },
    tax: { icon: <Receipt aria-hidden />, tone: 'amber', subtitle: 'Tax identifiers' },
    bank: { icon: <Landmark aria-hidden />, tone: 'green', subtitle: 'Where payments go' },
};
export const orgSectionLook = (id: string) =>
    ORG_SECTION_LOOK[id] || { icon: <ScrollText aria-hidden />, tone: 'slate' as Tone, subtitle: '' };

/** Long free text (addresses) spans the full row. */
export const isWideOrgField = (f: { id: string; label: string; type?: string }) =>
    f.type === 'file' || /address|places/i.test(f.id) || /address/i.test(f.label);

/** The kit's inline-link look (the same recipe Person Header uses for its links). */
const LINK = 'break-all text-primary underline-offset-4 hover:underline';

interface OrganizationInfoProps {
    onEditClick?: () => void;
    /** When provided, show this specific organization instead of the default one. */
    organizationId?: string;
    /** When provided, renders a back button inline with the title. */
    onBack?: () => void;
    /** When provided, renders a "Branches" button beside Download PDF. */
    onBranchesClick?: () => void;
}

/**
 * "Founded In" is free text: rows hold ISO dates, legacy DD/MM/YYYY, or just a year. A full date shows in the
 * company format (2017.05.16); a bare year, or anything unreadable, is shown as typed rather than guessed.
 */
const formatFounded = (raw: string): string => {
    if (!raw) return '';
    if (/^\d{4}$/.test(raw)) return raw;
    const d = parseFiscalDateString(raw);
    return d ? formatDate(d, raw) : raw;
};

const OrganizationInfo: React.FC<OrganizationInfoProps> = ({ onEditClick, organizationId, onBack, onBranchesClick }) => {
    const [companyData, setCompanyData] = useState<ICompanyOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [pdfGenerating, setPdfGenerating] = useState(false);

    // Build the PDF and trigger a download on demand. Generating the document is
    // expensive (react-pdf lays out the whole template and fetches remote logo/
    // stamp images), so we do it only when the user clicks — never on page open.
    const handleDownloadPdf = async () => {
        if (!companyData) return;
        try {
            setPdfGenerating(true);
            const doc = (
                <OrganizationTemplate organizationData={{
                    companyName: companyData?.name || 'Company Name',
                    address: {
                        street: companyData?.address || '',
                        city: '',
                        state: '',
                        pincode: '',
                        country: 'India',
                    },
                    companyURL: companyData?.websiteUrl || '',
                    numberOfEmployees: companyData?.numberOfEmployees || '',
                    additionalplacesofbusiness: companyData?.additionalplacesofbusiness || '',
                    contact: {
                        phone: companyData?.contactNumber || '',
                        email: companyData?.superAdminEmail || '',
                        website: companyData?.websiteUrl || ''
                    },
                    registration: {
                        gstNumber: companyData?.gstNumber || '',
                        panNumber: companyData?.panNo || '',
                        cinNumber: companyData?.certificateOfIncorporation || '',
                        incorporationDate: companyData?.foundedIn || '',
                        tanNumber: companyData?.tanNo || '',
                        ptecCertificate: companyData?.ptecCertificate || '',
                        hsnSacNo: companyData?.hsnSacNo || '',
                    },
                    banking: {
                        beneficiaryName: companyData?.beneficiaryName || '',
                        bankName: companyData?.bankNameAndAddress || '',
                        accountNumber: companyData?.accountNo || '',
                        ifscCode: companyData?.ifscCode || '',
                        micrCode: companyData?.micrCode || '',
                        bankAddress: companyData?.bankNameAndAddress || '',
                        contactPerson: companyData?.contactPerson || '',
                        accountant: companyData?.accountantNo || '',
                    },
                    authorizedSignatory: {
                        name: companyData?.name || '',
                    },
                    logoUrl: companyData?.logo,
                    stampUrl: companyData?.salaryStamp
                }} />
            );
            const blob = await pdf(doc).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${companyData?.name || 'organization'}_profile.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to generate PDF', error);
            errorConfirmation('Failed to generate PDF');
        } finally {
            setPdfGenerating(false);
        }
    };

    const handleWhatsAppShare = () => {
        if (!companyData) return;

        const message = `🏢 Organization Information:

📋 COMPANY DETAILS:
• Name: ${companyData.name || '-NA-'}
• Founded In: ${companyData.foundedIn || '-NA-'}
• Business Type: ${companyData.businessType || '-NA-'}
• Founder: ${companyData.founder || '-NA-'}
• Fiscal Year: ${companyData.fiscalYear || '-NA-'}

📞 CONTACT DETAILS:
• Website: ${companyData.websiteUrl || '-NA-'}
• Phone: ${companyData.contactNumber || '-NA-'}
• Email: ${companyData.superAdminEmail || '-NA-'}
• Address: ${companyData.address || '-NA-'}
${companyData.additionalplacesofbusiness ? `• Additional Address: ${companyData.additionalplacesofbusiness}` : ''}
• Contact Person: ${companyData.contactPerson || '-NA-'}

🏦 BANK DETAILS:
• Account Number: ${companyData.accountNo || '-NA-'}
• Beneficiary Name: ${companyData.beneficiaryName || '-NA-'}
• IFSC Code: ${companyData.ifscCode || '-NA-'}
• Bank Address: ${companyData.bankNameAndAddress || '-NA-'}

📄 CREDENTIALS:
• PAN: ${companyData.panNo || '-NA-'}
• TAN: ${companyData.tanNo || '-NA-'}
• GST Number: ${companyData.gstNumber || '-NA-'}
• Certificate of Incorporation: ${companyData.certificateOfIncorporation || '-NA-'}
• PTEC Certificate: ${companyData.ptecCertificate || '-NA-'}
• HSN/SAC Number: ${companyData.hsnSacNo || '-NA-'}
• MICR: ${companyData.micrCode || '-NA-'}`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            if (organizationId) {
                // Specific organization (clicked from the Organizations tree)
                const { data: { companyOverview } } = await fetchOrganizationById(organizationId);
                const org = resolveActiveOrg(companyOverview);
                if (org) {
                    setCompanyData(org);
                }
            } else {
                // Default / active organization (today's behavior)
                const { data: { companyOverview } } = await fetchCompanyOverview();
                if (resolveActiveOrg(companyOverview)) {
                    setCompanyData(resolveActiveOrg(companyOverview));
                }
            }
        } catch (error) {
            console.error('Failed to fetch company details', error);
        } finally {
            setLoading(false);
        }
    }, [organizationId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Listen for organization profile updates
    useEventBus('organizationProfileUpdated', () => {
        fetchData();
    });

    if (loading) {
        return (
            <p className="flex min-h-[400px] items-center justify-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-5" aria-label="Loading organization" /> Loading organization…
            </p>
        );
    }

    if (!companyData) {
        return (
            <EmptyState
                title="No organization profile yet"
                description="Set up the organization profile to see its details here."
                action={onEditClick ? <Button size="sm" onClick={onEditClick}>Set up profile</Button> : undefined}
            />
        );
    }

    // ─── Schema-driven info rendering ───────────────────────────────────────────
    // The info page renders from the SAME `sectionConfig` the edit form uses
    // (resolveFormSchema), so any section/field added, renamed, reordered or hidden
    // in "Manage Form Fields" reflects here automatically. `showOnInfoPage` (default
    // true) lets admins curate what appears without affecting the edit form.
    const infoSections = resolveFormSchema(companyData).filter(s => s.showOnInfoPage !== false);
    // Section titles are stored UPPERCASE in the schema; show them in Title Case here.
    const titleCase = (s: string) => s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

    const clean = (v?: string | null) => {
        const t = (v ?? '').toString().trim();
        return t && t !== '-NA-' ? t : '';
    };
    const href = (v: string) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);

    /** Empty values come back as '' — Description List renders those as an em dash. */
    const renderFieldValue = (f: any): React.ReactNode => {
        const val = clean(f.isSystem ? (companyData as any)[f.id] : f.value);
        if (!val) return '';
        if (f.id === 'fiscalYear') return formatFiscalYearRange(val, val);
        if (f.id === 'websiteUrl') return <a href={href(val)} target="_blank" rel="noopener noreferrer" className={LINK}>{val}</a>;
        if (f.type === 'file' && /^https?:\/\//i.test(val)) return <a href={val} target="_blank" rel="noopener noreferrer" className={LINK}>View file</a>;
        if (/email/i.test(f.id) && val.includes('@')) return <a href={`mailto:${val}`} className={LINK}>{val}</a>;
        return val;
    };

    const website = clean(companyData.websiteUrl);
    const phone = clean(companyData.contactNumber);
    const email = clean(companyData.superAdminEmail);
    const canEdit = !!onEditClick && hasPermission(resourceNameMapWithCamelCase.organizationProfile, permissionConstToUseWithHasPermission.editOthers);

    /** Logo or stamp: the image on a quiet plate, or a dashed placeholder that says what is missing. */
    const assetSlot = (url: string | undefined, label: string) => (
        <figure className="flex min-w-0 flex-1 flex-col items-center gap-2.5 py-1">
            {url ? (
                <div className="grid h-28 w-full max-w-52 place-items-center overflow-hidden rounded-xl bg-muted p-3">
                    <img src={url} alt={label} className="block max-h-20 max-w-full object-contain" />
                </div>
            ) : (
                <div className="grid h-28 w-full max-w-52 place-items-center rounded-xl border-[1.5px] border-dashed border-border text-muted-foreground">
                    <ImageOff className="size-7" aria-hidden />
                </div>
            )}
            <figcaption className={url ? 'text-xs font-semibold' : 'text-xs font-semibold text-muted-foreground'}>
                {url ? label : `No ${label.toLowerCase()} uploaded`}
            </figcaption>
        </figure>
    );

    // Codes read as codes: tabular figures, so 0/O and 1/I line up and the eye can compare two numbers.
    const code = (v?: string | null) => (clean(v) ? <span className="tabular">{clean(v)}</span> : '');
    const founded = formatFounded(clean(companyData.foundedIn));
    const facts = [
        { label: 'Fiscal year', value: <span className="tabular">{formatFiscalYearRange(companyData.fiscalYear)}</span> },
        { label: 'Founded', value: founded ? <span className="tabular">{founded}</span> : '' },
        { label: 'GST number', value: code(companyData.gstNumber) },
        { label: 'PAN', value: code(companyData.panNo) },
        { label: 'TAN', value: code(companyData.tanNo) },
        { label: 'Contact', value: phone ? <span className="tabular">{phone}</span> : '' },
    ];

    return (
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-1 py-3 md:px-2 md:py-4">
            {/* Identity header — the contact / company page's shape: logo, name, the ways to
                reach the organization as links, and every action in one row. */}
            <PersonHeader
                name={companyData.name}
                avatarUrl={companyData.logo}
                avatarFit="contain"
                meta={[
                    clean(companyData.businessType),
                    founded ? `Founded ${founded}` : '',
                ].filter(Boolean)}
                links={[
                    ...(phone ? [{ href: `tel:${phone.replace(/[^\d+]/g, '')}`, label: phone, icon: <Phone aria-hidden /> }] : []),
                    ...(email ? [{ href: `mailto:${email}`, label: email, icon: <Mail aria-hidden /> }] : []),
                    ...(website ? [{ href: href(website), label: website.replace(/^https?:\/\//i, ''), icon: <Globe aria-hidden />, external: true }] : []),
                ]}
                onBack={onBack}
                backLabel="Back to organizations"
                actions={
                    <>
                        {onBranchesClick && (
                            <Button variant="inverted" size="sm" onClick={onBranchesClick}>
                                <MapPin data-icon="inline-start" aria-hidden /> Branches
                            </Button>
                        )}
                        <Button variant="inverted" size="sm" onClick={handleWhatsAppShare}>
                            <WhatsAppIcon size={16} /> Share
                        </Button>
                        <Button variant="inverted" size="sm" onClick={handleDownloadPdf} disabled={pdfGenerating}>
                            {pdfGenerating
                                ? <Spinner className="size-4" aria-hidden />
                                : <Download data-icon="inline-start" aria-hidden />}
                            {pdfGenerating ? 'Generating…' : 'Download PDF'}
                        </Button>
                        {canEdit && (
                            <Button size="sm" onClick={onEditClick}>
                                <Pencil data-icon="inline-start" aria-hidden /> Edit details
                            </Button>
                        )}
                    </>
                }
            />

            {/* The facts people look up most, before the full sections. Facts, not KPIs: a Description List at
                reading size (a Stat Card's headline figure clipped the GST number and wrapped the fiscal year),
                as many columns as the page has room for. */}
            <Card tone="cyan">
                <CardHeader>
                    <SectionHeader icon={<ScrollText aria-hidden />} tone="cyan" title="At a glance" description="Registration, fiscal year and contact" />
                </CardHeader>
                <CardContent>
                    <DescriptionList columns="auto" rows={facts} />
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card tone="blue">
                    <CardHeader>
                        <SectionHeader icon={<ImageIcon aria-hidden />} tone="blue" title="Logo & stamp" description="Used on documents and payslips" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-stretch gap-4">
                            {assetSlot(companyData.logo, 'Organization logo')}
                            <div aria-hidden className="w-px bg-border" />
                            {assetSlot(companyData.salaryStamp, 'Stamp')}
                        </div>
                    </CardContent>
                </Card>

                {/* Dynamic sections — rendered from the shared form schema so the info
                    page always mirrors the edit form (see infoSections above). */}
                {infoSections.map(sec => {
                    const fields = sec.fields.filter((f: any) => !f.hidden && f.showOnInfoPage !== false);
                    if (!fields.length) return null;
                    const look = orgSectionLook(sec.id);
                    return (
                        <Card key={sec.id} tone={look.tone}>
                            <CardHeader>
                                <SectionHeader icon={look.icon} tone={look.tone} title={titleCase(sec.title)} description={look.subtitle || undefined} />
                            </CardHeader>
                            <CardContent>
                                <DescriptionList
                                    rows={fields.map((f: any) => ({ label: f.label, value: renderFieldValue(f), wide: isWideOrgField(f) }))}
                                />
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default OrganizationInfo;
