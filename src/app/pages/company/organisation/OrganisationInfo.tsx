import { resolveActiveOrg } from '@utils/activeOrg';

import React, { useState, useEffect } from 'react';
import { Box, Link, Stack, Typography } from '@mui/material';
import { fetchCompanyOverview, fetchOrganizationById } from '@services/company';
import { ICompanyOverview } from "@models/company";
import { resolveFormSchema } from './formSchema';
import { pdf } from '@react-pdf/renderer';
import OrganizationTemplate from './OrganisationReportTemplet';
import { useEventBus } from '@hooks/useEventBus';
import { errorConfirmation } from '@utils/modal';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import { AppIcon, GlassSurface, WhatsAppIcon, WtButton, WtIconButton, WtEmptyState } from '@app/modules/common/components/ui';
import SmartAvatar from '@app/modules/common/components/SmartAvatar';
import { DetailCard, DetailRow, type AccentColor } from '@app/modules/detail-page/DetailPageComponents';
import { StatGrid, TwoUpGrid } from '@pages/employee/entity/detail/sections/SummarySection';
import { DASH } from '@pages/employee/entity/detail/entityViewModel';

interface OrganisationInfoProps {
    onEditClick?: () => void;
    /** When provided, show this specific organization instead of the default one. */
    organizationId?: string;
    /** When provided, renders a back button inline with the title. */
    onBack?: () => void;
    /** When provided, renders a "Branches" button beside Download PDF. */
    onBranchesClick?: () => void;
}

const OrganisationInfo: React.FC<OrganisationInfoProps> = ({ onEditClick, organizationId, onBack, onBranchesClick }) => {
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

    const fetchData = async () => {
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
    };

    useEffect(() => {
        fetchData();
    }, [organizationId]);

    // Listen for organization profile updates
    useEventBus('organisationProfileUpdated', () => {
        fetchData();
    });

    if (loading) {
        return (
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </Stack>
        );
    }

    if (!companyData) {
        return (
            <WtEmptyState
                title="No organization profile yet"
                hint="Set up the organization profile to see its details here."
                actionLabel={onEditClick ? 'Set up profile' : undefined}
                onAction={onEditClick}
            />
        );
    }

    // ─── Schema-driven info rendering ───────────────────────────────────────────
    // The info page renders from the SAME `sectionConfig` the edit form uses
    // (resolveFormSchema), so any section/field added, renamed, reordered or hidden
    // in "Manage Form Fields" reflects here automatically. `showOnInfoPage` (default
    // true) lets admins curate what appears without affecting the edit form.
    const infoSections = resolveFormSchema(companyData).filter(s => s.showOnInfoPage !== false);

    const SECTION_STYLE: Record<string, { icon: string; accent: AccentColor; subtitle: string }> = {
        basic_info: { icon: 'bi bi-briefcase', accent: 'primary', subtitle: 'Who the organization is' },
        govt: { icon: 'bi bi-file-earmark-text', accent: 'purple', subtitle: 'Registration and addresses' },
        admin: { icon: 'bi bi-patch-check', accent: 'teal', subtitle: 'Registrations and certificates' },
        tax: { icon: 'bi bi-receipt', accent: 'amber', subtitle: 'Tax identifiers' },
        bank: { icon: 'bi bi-bank', accent: 'green', subtitle: 'Where payments go' },
    };
    const sectionStyle = (id: string) => SECTION_STYLE[id] || { icon: 'bi bi-card-text', accent: 'blue' as AccentColor, subtitle: '' };
    // Section titles are stored UPPERCASE in the schema; show them in Title Case here.
    const titleCase = (s: string) => s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

    const clean = (v?: string | null) => {
        const t = (v ?? '').toString().trim();
        return t && t !== '-NA-' ? t : '';
    };
    const href = (v: string) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);

    const renderFieldValue = (f: any): React.ReactNode => {
        const val = clean(f.isSystem ? (companyData as any)[f.id] : f.value);
        if (!val) return DASH;
        if (f.id === 'websiteUrl') return <Link href={href(val)} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ fontSize: 'inherit', wordBreak: 'break-all' }}>{val}</Link>;
        if (f.type === 'file' && /^https?:\/\//i.test(val)) return <Link href={val} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ fontSize: 'inherit' }}>View file</Link>;
        if (/email/i.test(f.id) && val.includes('@')) return <Link href={`mailto:${val}`} underline="hover" sx={{ fontSize: 'inherit' }}>{val}</Link>;
        return val;
    };

    const website = clean(companyData.websiteUrl);
    const phone = clean(companyData.contactNumber);
    const email = clean(companyData.superAdminEmail);
    const canEdit = !!onEditClick && hasPermission(resourceNameMapWithCamelCase.organisationProfile, permissionConstToUseWithHasPermission.editOthers);

    /** Logo or stamp: the image on a quiet plate, or a dashed placeholder that says what is missing. */
    const assetSlot = (url: string | undefined, label: string) => (
        <Stack alignItems="center" gap={1.25} sx={{ flex: 1, minWidth: 0, py: 1 }}>
            <Box sx={{
                width: '100%', maxWidth: 200, height: 110, borderRadius: '12px', display: 'grid', placeItems: 'center', p: 1.5, overflow: 'hidden',
                ...(url ? { bgcolor: 'action.hover' } : { border: '1.5px dashed', borderColor: 'divider', color: 'text.disabled' }),
            }}>
                {url
                    ? <Box component="img" src={url} alt={label} sx={{ display: 'block', maxHeight: 86, maxWidth: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }} />
                    : <AppIcon name="bi-image" className="fs-2qx" />}
            </Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: url ? 'text.primary' : 'text.disabled' }}>
                {url ? label : `No ${label.toLowerCase()} uploaded`}
            </Typography>
        </Stack>
    );

    return (
        <Box sx={{ px: { xs: 1, md: 2 }, py: { xs: 1.5, md: 2 } }}>
            {/* Identity header — the contact / company page's shape: avatar, name, the ways to
                reach the organization as links, and every action in one row. */}
            <GlassSurface
                variant="thin"
                radius={16}
                sx={{ p: { xs: 2, md: 2.5 }, mb: { xs: 2, md: 2.5 }, display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, md: 2.5 }, flexWrap: { xs: 'wrap', lg: 'nowrap' } }}
            >
                {onBack && (
                    <WtIconButton
                        onClick={onBack}
                        title="Back to organizations"
                        sx={{ mt: 0.25, flexShrink: 0, width: 32, height: 32, borderRadius: '10px', bgcolor: 'transparent', borderColor: 'transparent', '& .fs-3': { fontSize: '1.05rem' } }}
                    >
                        <AppIcon name="arrow-left" className="fs-3" />
                    </WtIconButton>
                )}
                <Box sx={{ flexShrink: 0 }}>
                    <SmartAvatar name={companyData.name} imageUrl={companyData.logo} size={84} shape="rounded" imageFit="contain" enablePreview />
                </Box>
                <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{companyData.name}</Typography>
                    <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap">
                        {clean(companyData.businessType) && <Typography variant="body2" sx={{ fontWeight: 600 }}>{companyData.businessType}</Typography>}
                        {clean(companyData.foundedIn) && <Typography variant="body2" color="text.secondary">Founded {companyData.foundedIn}</Typography>}
                    </Stack>
                    <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap" sx={{ pt: 0.25 }}>
                        {phone && (
                            <Link href={`tel:${phone.replace(/[^\d+]/g, '')}`} underline="hover" variant="body2" color="text.primary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                                <AppIcon name="phone" className="fs-6" />{phone}
                            </Link>
                        )}
                        {email && (
                            <Link href={`mailto:${email}`} underline="hover" variant="body2" color="text.primary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                                <AppIcon name="sms" className="fs-6" />
                                <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</Box>
                            </Link>
                        )}
                        {website && (
                            <Link href={href(website)} target="_blank" rel="noopener noreferrer" underline="hover" variant="body2" color="text.primary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                                <AppIcon name="bi-globe" className="fs-6" />{website.replace(/^https?:\/\//i, '')}
                            </Link>
                        )}
                    </Stack>
                </Stack>
                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ flexShrink: 0, width: { xs: '100%', lg: 'auto' }, justifyContent: { lg: 'flex-end' } }}>
                    {onBranchesClick && (
                        <WtButton inverted size="small" onClick={onBranchesClick} startIcon={<AppIcon name="bi-geo-alt" className="fs-5" />} sx={{ whiteSpace: 'nowrap' }}>
                            Branches
                        </WtButton>
                    )}
                    <WtButton inverted size="small" onClick={handleWhatsAppShare} startIcon={<WhatsAppIcon size={16} />} sx={{ whiteSpace: 'nowrap' }}>
                        Share
                    </WtButton>
                    <WtButton inverted size="small" onClick={handleDownloadPdf} disabled={pdfGenerating} startIcon={<AppIcon name="bi-download" className="fs-5" />} sx={{ whiteSpace: 'nowrap' }}>
                        {pdfGenerating ? 'Generating…' : 'Download PDF'}
                    </WtButton>
                    {canEdit && (
                        <WtButton size="small" onClick={onEditClick} startIcon={<AppIcon name="pencil" className="fs-5" />} sx={{ whiteSpace: 'nowrap' }}>
                            Edit details
                        </WtButton>
                    )}
                </Stack>
            </GlassSurface>

            {/* The facts people look up most, before the full sections. */}
            <Box sx={{ mb: 2.5 }}>
                <StatGrid
                    items={[
                        { label: 'Fiscal Year', value: clean(companyData.fiscalYear) || DASH, icon: 'bi bi-calendar-range', accent: 'teal' },
                        { label: 'Founded', value: clean(companyData.foundedIn) || DASH, icon: 'bi bi-flag', accent: 'purple' },
                        { label: 'GST Number', value: clean(companyData.gstNumber) || DASH, icon: 'bi bi-receipt', accent: 'amber' },
                        { label: 'PAN', value: clean(companyData.panNo) || DASH, icon: 'bi bi-person-vcard', accent: 'primary' },
                        { label: 'TAN', value: clean(companyData.tanNo) || DASH, icon: 'bi bi-card-text', accent: 'blue' },
                        { label: 'Contact', value: phone || DASH, icon: 'bi bi-telephone', accent: 'green' },
                    ]}
                />
            </Box>

            <TwoUpGrid>
                <DetailCard title="Logo & Stamp" subtitle="Used on documents and payslips" icon="bi bi-building" accentColor="blue">
                    <Stack direction="row" alignItems="stretch" gap={2} sx={{ pt: 1.5 }}>
                        {assetSlot(companyData.logo, 'Organization logo')}
                        <Box sx={{ width: '1px', bgcolor: 'divider' }} />
                        {assetSlot(companyData.salaryStamp, 'Stamp')}
                    </Stack>
                </DetailCard>

                {/* Dynamic sections — rendered from the shared form schema so the info
                    page always mirrors the edit form (see infoSections above). */}
                {infoSections.map(sec => {
                    const fields = sec.fields.filter((f: any) => !f.hidden && f.showOnInfoPage !== false);
                    if (!fields.length) return null;
                    const st = sectionStyle(sec.id);
                    return (
                        <DetailCard key={sec.id} title={titleCase(sec.title)} subtitle={st.subtitle || undefined} icon={st.icon} accentColor={st.accent}>
                            {fields.map((f: any, i: number) => (
                                <DetailRow key={f.id} label={f.label} value={renderFieldValue(f)} isLast={i === fields.length - 1} />
                            ))}
                        </DetailCard>
                    );
                })}
            </TwoUpGrid>
        </Box>
    );
};

export default OrganisationInfo;
