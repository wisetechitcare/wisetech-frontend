
import React, { useState, useEffect } from 'react';
import { KTCard } from '@metronic/helpers';
import { fetchCompanyOverview, fetchCompanyLogo } from '@services/company';
import { ICompanyOverview } from "@models/company";
import { BlobProvider } from '@react-pdf/renderer';
import OrganizationTemplate from './OrganisationReportTemplet';
import { useEventBus } from '@hooks/useEventBus';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';

interface OrganisationInfoProps {
    onEditClick?: () => void;
}

const OrganisationInfo: React.FC<OrganisationInfoProps> = ({ onEditClick }) => {
    const [companyData, setCompanyData] = useState<ICompanyOverview | null>(null);
    const [logoUrl, setLogoUrl] = useState('');
    const [stampUrl, setStampUrl] = useState('');
    const [loading, setLoading] = useState(true);

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
            const { data: { companyOverview } } = await fetchCompanyOverview();
            if (companyOverview[0]) {
                setCompanyData(companyOverview[0]);
            }

            const logoData = await fetchCompanyLogo();
            setLogoUrl(logoData?.data?.logo);
            setStampUrl(logoData?.data?.salaryStamp);
        } catch (error) {
            console.error('Failed to fetch company details', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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

    return (
        <div className="px-3 px-lg-4 py-3 py-lg-4" style={{ backgroundColor: '#f7f9fc' }}>
            {/* Header */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3 gap-3">
                <h3 className="mb-0" style={{ fontFamily: 'Barlow', fontWeight: '600', fontSize: 'clamp(18px, 4vw, 24px)', letterSpacing: '0.24px', color: '#000' }}>
                    Organization Info
                </h3>
                <div className="d-flex flex-wrap gap-2 w-100 w-sm-auto">
                    {/* PDF Download Button */}
                    <BlobProvider
                        document={
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
                        }
                    >
                        {({ blob, url, loading, error }: {
                            blob: Blob | null;
                            url: string | null;
                            loading: boolean;
                            error: Error | null
                        }) => {
                            if (loading) {
                                return (
                                    <button type="button" className="btn btn-primary" disabled>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Generating...
                                    </button>
                                );
                            }

                            if (error) {
                                return (
                                    <button type="button" className="btn btn-danger" disabled>
                                        Error
                                    </button>
                                );
                            }

                            if (blob && url) {
                                return (
                                    <a
                                        href={url}
                                        download={`${companyData?.name || 'organization'}_profile.pdf`}
                                        className="btn btn-primary flex-grow-1 flex-sm-grow-0"
                                        style={{ fontSize: 'clamp(12px, 2.5vw, 14px)' }}
                                    >
                                        <i className="bi bi-download me-2"></i>
                                        <span className="d-none d-sm-inline">Download PDF</span>
                                        <span className="d-inline d-sm-none">PDF</span>
                                    </a>
                                );
                            }

                            return null;
                        }}
                    </BlobProvider>

                    {onEditClick && hasPermission(resourceNameMapWithCamelCase.organisationProfile, permissionConstToUseWithHasPermission.editOthers) && (
                        <button
                            type="button"
                            className="btn flex-grow-1 flex-sm-grow-0"
                            style={{ backgroundColor: '#9d4141', borderColor: '#9d4141', color: 'white', padding: '8px clamp(16px, 4vw, 32px)', fontSize: 'clamp(12px, 2.5vw, 14px)', borderRadius: '6px' }}
                            onClick={onEditClick}
                        >
                            Edit
                        </button>
                    )}
                </div>
            </div>

            {/* First Row - Company & Overview */}
            <div className="row g-3 mb-3">
                {/* Company Name & Logo Card */}
                <div className="col-12 col-lg-6">
                    <KTCard className="shadow-sm h-100">
                        <div className="d-flex flex-column h-100" style={{ padding: 'clamp(16px, 3vw, 24px)', gap: 'clamp(16px, 3vw, 24px)' }}>
                            <div className="d-flex flex-column" style={{ gap: '8px' }}>
                                <h5 className="mb-0" style={{ fontFamily: 'Barlow', fontWeight: '600', fontSize: 'clamp(16px, 3vw, 18px)', letterSpacing: '0.18px', color: 'black' }}>
                                    {companyData.name || 'Wisetech'}
                                </h5>
                                <p className="mb-0" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', lineHeight: '1.56', color: '#7a8597' }}>
                                    {companyData.name} Private Limited
                                </p>
                            </div>
                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
                                {logoUrl && (
                                    <img
                                        src={logoUrl}
                                        alt="Company Logo"
                                        className="img-fluid"
                                        style={{ maxHeight: '52px', maxWidth: '100%', objectFit: 'contain' }}
                                    />
                                )}
                                {stampUrl && (
                                    <img
                                        src={stampUrl}
                                        alt="Company Stamp"
                                        className="img-fluid"
                                        style={{ maxHeight: '68px', maxWidth: '67px', objectFit: 'contain' }}
                                    />
                                )}
                            </div>
                        </div>
                    </KTCard>
                </div>

                {/* Overview Card */}
                <div className="col-12 col-lg-6">
                    <KTCard className="shadow-sm h-100">
                        <div className="d-flex flex-column" style={{ padding: 'clamp(16px, 3vw, 24px)', gap: 'clamp(16px, 3vw, 24px)' }}>
                            <div className="d-flex align-items-center gap-2">
                                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', backgroundColor: '#e6eaf1' }}>
                                    <i className="bi bi-briefcase fs-2 text-primary"></i>
                                </div>
                                <h5 className="mb-0" style={{ fontFamily: 'Barlow', fontWeight: '600', fontSize: 'clamp(16px, 3vw, 19px)', letterSpacing: '0.19px', color: 'black' }}>
                                    Overview
                                </h5>
                            </div>

                            <div className="d-flex flex-column" style={{ gap: '8px' }}>
                                <div className="d-flex justify-content-between align-items-center gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Founded in</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.foundedIn || '-NA-'}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Business Type</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.businessType || '-NA-'}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Founder</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.founder || '-NA-'}</span>
                                </div>
                            </div>
                        </div>
                    </KTCard>
                </div>
            </div>

            {/* Second Row - Contact, Bank & Credentials */}
            <div className="row g-3">
                {/* Contact Details Card - Left side full height */}
                <div className="col-12 col-lg-6">
                    <KTCard className="shadow-sm h-100">
                        <div className="d-flex flex-column h-100" style={{ padding: 'clamp(16px, 3vw, 24px)', gap: 'clamp(16px, 3vw, 24px)' }}>
                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', backgroundColor: '#e6eaf1' }}>
                                        <i className="bi bi-telephone fs-2 text-info"></i>
                                    </div>
                                    <h5 className="mb-0" style={{ fontFamily: 'Barlow', fontWeight: '600', fontSize: 'clamp(16px, 3vw, 19px)', letterSpacing: '0.19px', color: 'black' }}>
                                        Contact Details
                                    </h5>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log('Button clicked directly!');
                                        handleWhatsAppShare();
                                    }}
                                    className="btn btn-success d-flex align-items-center w-100 w-sm-auto justify-content-center"
                                    style={{
                                        backgroundColor: '#25D366',
                                        borderColor: '#25D366',
                                        color: 'white',
                                        padding: '8px 16px',
                                        fontSize: 'clamp(12px, 2.5vw, 14px)',
                                        gap: '8px'
                                    }}
                                >
                                    <i className="bi bi-whatsapp"></i>
                                    <span>Share</span>
                                </button>
                            </div>

                            <div className="d-flex flex-column gap-4">
                                {/* Primary Contact Section */}
                                <div className="d-flex flex-column gap-3">
                                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                        <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Website</span>
                                        <a href={companyData.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-decoration-none text-break" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#9d4141' }}>
                                            {companyData.websiteUrl || '-NA-'}
                                        </a>
                                    </div>

                                    <div style={{ backgroundColor: '#d8dee8', height: '1px', width: '100%' }}></div>

                                    <div className="d-flex flex-column gap-2">
                                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                            <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Address</span>
                                            <span className="text-sm-end" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>
                                                {companyData.address || '-NA-'}
                                            </span>
                                        </div>

                                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                            <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Phone</span>
                                            <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.contactNumber || '-NA-'}</span>
                                        </div>

                                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                            <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Email</span>
                                            <span className="text-break" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.superAdminEmail || '-NA-'}</span>
                                        </div>

                                        {/* <div className="d-flex justify-content-between align-items-center">
                                            <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: '14px', color: 'black' }}>Location</span>
                                            <span className="d-flex align-items-center" style={{ gap: '4px', fontFamily: 'Inter', fontWeight: '400', fontSize: '14px', color: '#9d4141', cursor: 'pointer' }}>
                                                <i className="bi bi-geo-alt" style={{ width: '20px', height: '20px' }}></i>
                                                View on map
                                            </span>
                                        </div> */}
                                    </div>

                                    {/* Secondary Contact - only if additional address exists */}
                                    {companyData.additionalplacesofbusiness && (
                                        <>
                                            <div style={{ backgroundColor: '#d8dee8', height: '1px', width: '100%' }}></div>

                                            <div className="d-flex flex-column gap-2">
                                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Address 2</span>
                                                    <span className="text-sm-end" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>
                                                        {companyData.additionalplacesofbusiness}
                                                    </span>
                                                </div>
                                                {/* <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Phone 2</span>
                                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>-NA-</span>
                                                </div>
                                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Email 2</span>
                                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>-NA-</span>
                                                </div> */}
                                                {/* <div className="d-flex justify-content-between align-items-center">
                                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: '14px', color: 'black' }}>Location</span>
                                                    <span className="d-flex align-items-center" style={{ gap: '4px', fontFamily: 'Inter', fontWeight: '400', fontSize: '14px', color: '#9d4141', cursor: 'pointer' }}>
                                                        <i className="bi bi-geo-alt" style={{ width: '20px', height: '20px' }}></i>
                                                        View on map
                                                    </span>
                                                </div> */}
                                            </div>
                                        </>
                                    )}
                                     <div className="d-flex justify-content-between align-items-center gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>contact Person</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.contactPerson || '-NA-'}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Accountant No</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.accountantNo || '-NA-'}</span>
                                </div>
                                </div>
                            </div>
                        </div>
                    </KTCard>
                </div>

                {/* Bank & Credentials Column - Stacked on right side */}
                <div className="col-12 col-lg-6">
                    <div className="d-flex flex-column gap-3 h-100">
                    {/* Bank Details Card */}
                    <KTCard className="shadow-sm">
                        <div className="d-flex flex-column" style={{ padding: 'clamp(16px, 3vw, 24px)', gap: 'clamp(16px, 3vw, 24px)' }}>
                            <div className="d-flex align-items-center gap-2">
                                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', backgroundColor: '#e6eaf1' }}>
                                    <i className="bi bi-bank fs-2 text-success"></i>
                                </div>
                                <h5 className="mb-0" style={{ fontFamily: 'Barlow', fontWeight: '600', fontSize: 'clamp(16px, 3vw, 19px)', letterSpacing: '0.19px', color: 'black' }}>
                                    Bank Details
                                </h5>
                            </div>

                            <div className="d-flex flex-column gap-2">
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Bank Account Number</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.accountNo || '-NA-'}</span>
                                </div>
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Beneficiary Name</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.beneficiaryName || '-NA-'}</span>
                                </div>
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>IFSC Code</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.ifscCode || '-NA-'}</span>
                                </div>
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Bank Address</span>
                                    <span className="text-sm-end" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>
                                        {companyData.bankNameAndAddress || '-NA-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </KTCard>

                    {/* Credentials Card */}
                    <KTCard className="shadow-sm">
                        <div className="d-flex flex-column" style={{ padding: 'clamp(16px, 3vw, 24px)', gap: 'clamp(16px, 3vw, 24px)' }}>
                            <div className="d-flex align-items-center gap-2">
                                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', backgroundColor: '#e6eaf1' }}>
                                    <i className="bi bi-file-earmark-text fs-2 text-primary"></i>
                                </div>
                                <h5 className="mb-0" style={{ fontFamily: 'Barlow', fontWeight: '600', fontSize: 'clamp(16px, 3vw, 19px)', letterSpacing: '0.19px', color: 'black' }}>
                                    Credentials
                                </h5>
                            </div>

                            <div className="d-flex flex-column gap-2">
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>PAN</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.panNo || '-NA-'}</span>
                                </div>
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>TAN</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.tanNo || '-NA-'}</span>
                                </div>
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>GST Number</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.gstNumber || '-NA-'}</span>
                                </div>
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>Certificate of Incorporation</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.certificateOfIncorporation || '-NA-'}</span>
                                </div>
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>PTEC Certificate</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.ptecCertificate || '-NA-'}</span>
                                </div>
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>HSN/SAC Number</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.hsnSacNo || '-NA-'}</span>
                                </div>
                                {/* <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>SAC Codes</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>-NA-</span>
                                </div> */}
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                                    <span style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>MICR</span>
                                    <span style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'black' }}>{companyData.micrCode || '-NA-'}</span>
                                </div>
                            </div>
                        </div>
                    </KTCard>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganisationInfo;
