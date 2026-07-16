import { resolveActiveOrg } from '@utils/activeOrg';

import React, { useState, useEffect } from 'react';
import { KTCard } from '@metronic/helpers';
import { fetchCompanyOverview, fetchOrganizationById } from '@services/company';
import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons';
import { ICompanyOverview } from "@models/company";
import { resolveFormSchema } from './formSchema';
import { pdf } from '@react-pdf/renderer';
import OrganizationTemplate from './OrganisationReportTemplet';
import { useEventBus } from '@hooks/useEventBus';
import { errorConfirmation } from '@utils/modal';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';

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
        console.log('Share button clicked!', companyData);

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
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!companyData) {
        return (
            <div className="alert alert-warning" role="alert">
                No organization data found. Please configure your organization profile first.
            </div>
        );
    }

    // ─── Schema-driven info rendering ───────────────────────────────────────────
    // The info page renders from the SAME `sectionConfig` the edit form uses
    // (resolveFormSchema), so any section/field added, renamed, reordered or hidden
    // in "Manage Form Fields" reflects here automatically. `showOnInfoPage` (default
    // true) lets admins curate what appears without affecting the edit form.
    const infoSections = resolveFormSchema(companyData).filter(s => s.showOnInfoPage !== false);

    const SECTION_ICONS: Record<string, string> = {
        basic_info: 'bi-briefcase', govt: 'bi-file-earmark-text', admin: 'bi-patch-check',
        tax: 'bi-receipt', bank: 'bi-bank',
    };
    const sectionIcon = (id: string) => SECTION_ICONS[id] || 'bi-card-text';
    // Section titles are stored UPPERCASE in the schema; show them in Title Case here.
    const titleCase = (s: string) => s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

    // A single logo/stamp slot: shows the image, or a clean placeholder when none is set.
    const renderAssetSlot = (url: string | undefined, label: string) => (
        <div className="d-flex flex-column align-items-center text-center" style={{ flex: 1, gap: '10px', minWidth: 0 }}>
            {url ? (
                <div style={{ height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={url} alt={label} style={{ maxHeight: 84, maxWidth: '100%', objectFit: 'contain' }} />
                </div>
            ) : (
                <div style={{ width: 84, height: 84, borderRadius: 16, border: '1.5px dashed #d3dae6', background: '#f7f9fc', display: 'grid', placeItems: 'center', color: '#aab4c6' }}>
                    <i className="bi bi-image" style={{ fontSize: 28 }} />
                </div>
            )}
            <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 'clamp(11px, 2vw, 13px)', color: url ? '#2c3e50' : '#9aa4b6' }}>{label}</span>
        </div>
    );

    const renderFieldValue = (f: any) => {
        const raw = f.isSystem ? (companyData as any)[f.id] : f.value;
        const val = (raw ?? '').toString().trim();
        if (!val) return '-NA-';
        const isUrl = /^https?:\/\//i.test(val);
        if (f.id === 'websiteUrl' || (f.type === 'file' && isUrl)) {
            return (
                <a href={val} target="_blank" rel="noopener noreferrer" className="text-decoration-none text-break" style={{ color: '#1E3A8A' }}>
                    {f.type === 'file' ? 'View' : val}
                </a>
            );
        }
        return val;
    };

    return (
        <div className="px-3 px-lg-4 py-3 py-lg-4" style={{ backgroundColor: '#f7f9fc' }}>
            {/* Header */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3 gap-3">
                <div className="d-flex align-items-center gap-2 gap-md-3">
                    {onBack && (
                        <button
                            type="button"
                            className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm flex-shrink-0"
                            onClick={onBack}
                            title="Back to Organizations"
                        >
                            <img src={miscellaneousIcons.leftArrow} alt="Back" style={{ width: '22px', height: '22px', cursor: 'pointer' }} />
                        </button>
                    )}
                    <h3 className="mb-0" style={{ fontFamily: 'Barlow', fontWeight: '600', fontSize: 'clamp(18px, 4vw, 24px)', letterSpacing: '0.24px', color: '#000' }}>
                        Organization Info
                    </h3>
                </div>
                <div className="d-flex flex-wrap gap-2 w-100 w-sm-auto">
                    {onBranchesClick && (
                        <button
                            type="button"
                            className="btn btn-primary flex-grow-1 flex-sm-grow-0"
                            style={{ fontSize: 'clamp(12px, 2.5vw, 14px)' }}
                            onClick={onBranchesClick}
                        >
                            <i className="bi bi-geo-alt me-2"></i>
                            <span className="d-none d-sm-inline">Branches</span>
                            <span className="d-inline d-sm-none">Branch</span>
                        </button>
                    )}
                    {/* Share the organization's contact details over WhatsApp */}
                    <button
                        type="button"
                        onClick={handleWhatsAppShare}
                        className="btn flex-grow-1 flex-sm-grow-0 d-flex align-items-center justify-content-center"
                        style={{ backgroundColor: '#25D366', borderColor: '#25D366', color: 'white', fontSize: 'clamp(12px, 2.5vw, 14px)', gap: '8px' }}
                    >
                        <i className="bi bi-whatsapp"></i>
                        <span>Share</span>
                    </button>
                    {/* PDF Download Button — generates on demand (see handleDownloadPdf) */}
                    <button
                        type="button"
                        className="btn btn-primary flex-grow-1 flex-sm-grow-0"
                        style={{ fontSize: 'clamp(12px, 2.5vw, 14px)' }}
                        onClick={handleDownloadPdf}
                        disabled={pdfGenerating}
                    >
                        {pdfGenerating ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                <span className="d-none d-sm-inline">Generating...</span>
                                <span className="d-inline d-sm-none">PDF</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-download me-2"></i>
                                <span className="d-none d-sm-inline">Download PDF</span>
                                <span className="d-inline d-sm-none">PDF</span>
                            </>
                        )}
                    </button>

                    {onEditClick && hasPermission(resourceNameMapWithCamelCase.organisationProfile, permissionConstToUseWithHasPermission.editOthers) && (
                        <button
                            type="button"
                            className="btn flex-grow-1 flex-sm-grow-0"
                            style={{ backgroundColor: '#1E3A8A', borderColor: '#1E3A8A', color: 'white', padding: '8px clamp(16px, 4vw, 32px)', fontSize: 'clamp(12px, 2.5vw, 14px)', borderRadius: '6px' }}
                            onClick={onEditClick}
                        >
                            Edit
                        </button>
                    )}
                </div>
            </div>

            {/* Info sections grid */}
            <div className="row g-3 mb-3">
                {/* Logo & Stamp — shows the org's assets, or a clean placeholder when unset */}
                <div className="col-12 col-lg-6">
                    <KTCard className="shadow-sm h-100">
                        <div className="d-flex flex-column h-100" style={{ padding: 'clamp(16px, 3vw, 24px)', gap: 'clamp(14px, 3vw, 20px)' }}>
                            <div className="d-flex align-items-center gap-2">
                                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', backgroundColor: '#e6eaf1' }}>
                                    <i className="bi bi-building fs-2 text-primary"></i>
                                </div>
                                <h5 className="mb-0" style={{ fontFamily: 'Barlow', fontWeight: '600', fontSize: 'clamp(16px, 3vw, 19px)', letterSpacing: '0.19px', color: 'black' }}>
                                    Logo & Stamp
                                </h5>
                            </div>
                            <div className="d-flex flex-row justify-content-around align-items-center gap-3 flex-grow-1">
                                {renderAssetSlot(companyData.logo, 'Organization Logo')}
                                <div style={{ width: 1, alignSelf: 'stretch', background: '#eef1f6' }} />
                                {renderAssetSlot(companyData.salaryStamp, 'Stamp')}
                            </div>
                        </div>
                    </KTCard>
                </div>

                {/* Dynamic sections — rendered from the shared form schema so the info
                    page always mirrors the edit form (see infoSections above). */}
                {infoSections.map(sec => {
                    const fields = sec.fields.filter((f: any) => !f.hidden && f.showOnInfoPage !== false);
                    if (!fields.length) return null;
                    return (
                        <div className="col-12 col-lg-6" key={sec.id}>
                            <KTCard className="shadow-sm h-100">
                                <div className="d-flex flex-column h-100" style={{ padding: 'clamp(16px, 3vw, 24px)', gap: 'clamp(16px, 3vw, 24px)' }}>
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', backgroundColor: '#e6eaf1' }}>
                                            <i className={`bi ${sectionIcon(sec.id)} fs-2 text-primary`}></i>
                                        </div>
                                        <h5 className="mb-0" style={{ fontFamily: 'Barlow', fontWeight: '600', fontSize: 'clamp(16px, 3vw, 19px)', letterSpacing: '0.19px', color: 'black' }}>
                                            {titleCase(sec.title)}
                                        </h5>
                                    </div>

                                    <div className="d-flex flex-column" style={{ gap: '10px' }}>
                                        {fields.map((f: any) => (
                                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2" key={f.id}>
                                                <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{f.label}</span>
                                                <span className="text-sm-end text-break" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black', maxWidth: '60%' }}>
                                                    {renderFieldValue(f)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </KTCard>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OrganisationInfo;
