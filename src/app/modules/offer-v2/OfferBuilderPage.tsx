import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useOfferBuilder } from './hooks/useOfferBuilder';
import { useAuth } from '../auth';
import { LOCAL_TEMPLATES } from './data/templateRegistry';

import { Toolbar } from './components/editor/Toolbar';
import { ProposalDocument } from './components/layout/ProposalDocument';
import { CoverSection } from './components/sections/CoverSection';
import { CoverLetterSection } from './components/sections/CoverLetterSection';
import { ScopeOfWorkSection } from './components/sections/ScopeOfWorkSection';
import { DesignPhasesSection } from './components/sections/DesignPhasesSection';
import { PaymentScheduleSection } from './components/sections/PaymentScheduleSection';
import { ExtraChargesSection } from './components/sections/ExtraChargesSection';
import { GeneralTermsSection } from './components/sections/GeneralTermsSection';
import { NotInScopeSection } from './components/sections/NotInScopeSection';
import { MeetingScheduleSection } from './components/sections/MeetingScheduleSection';
import { TerminationPaymentTermsSection } from './components/sections/TerminationPaymentTermsSection';

export const OfferBuilderPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { leadId } = useParams<{ leadId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [initialLeadData, setInitialLeadData] = useState<any>(location.state?.leadData || null);
  const [companyData, setCompanyData] = useState<any>(location.state?.companyData || null);
  const [contactData, setContactData] = useState<any>(location.state?.contactData || null);
  const [isSyncing, setIsSyncing] = useState(false);

  const { offer, updateOfferField, isReady, resetToLeadData } = useOfferBuilder(
    leadId || '',
    initialLeadData,
    companyData,
    contactData,
    currentUser
  );
  const [currentSection, setCurrentSection] = useState(1);
  const totalSections = 10; // We have 10 logical sections now
  const [templateData, setTemplateData] = useState<any>(null);

  React.useEffect(() => {
    const loadTemplate = async () => {
      if (offer?.proposalTemplateId) {
        try {
          const mod = await import(`./data/templates/${offer.proposalTemplateId}.json`);
          setTemplateData(mod.default || mod);
        } catch (err) {
          console.error('Failed to load template:', err);
          setTemplateData(null);
        }
      } else {
        setTemplateData(null);
      }
    };
    loadTemplate();
  }, [offer?.proposalTemplateId]);

  const handleExportPdf = () => {
    window.print();
  };

  const handleSyncData = async () => {
    if (!leadId) return;
    setIsSyncing(true);
    try {
      // Import dynamically to avoid top-level dependency issues if any
      const { getLeadById } = await import('@services/leads');
      const { getClientCompanyById, getClientContactById } = await import('@services/companies');

      const leadResponse = await getLeadById(leadId);
      const fetchedLead = leadResponse.data?.data?.lead;
      if (fetchedLead) {
        setInitialLeadData(fetchedLead);

        let fetchedCompany = companyData;
        let fetchedContact = contactData;

        const effectiveCompanyId = fetchedLead.leadTeams?.[0]?.companyId || fetchedLead.companyId;
        const effectiveContactId = fetchedLead.leadTeams?.[0]?.contactId || fetchedLead.leadTeams?.[0]?.contactPersonId || fetchedLead.contactId;

        if (effectiveCompanyId) {
          const companyRes = await getClientCompanyById(effectiveCompanyId);
          fetchedCompany = companyRes?.data?.company || companyRes?.company || companyRes?.data?.data?.company || companyRes;
          setCompanyData(fetchedCompany);
        }
        if (effectiveContactId) {
          const contactRes = await getClientContactById(effectiveContactId);
          fetchedContact = contactRes?.data?.contact || contactRes?.contact || contactRes?.data?.data?.contact || contactRes;
          setContactData(fetchedContact);
        }

        // Pass the explicitly fetched data to the reset function immediately
        // since state updates are asynchronous
        const { applyLeadData } = await import('./utils/applyLeadData');
        const { saveOfferDraft } = await import('./utils/localStorage');

        const freshOffer = applyLeadData(fetchedLead, fetchedCompany, fetchedContact, currentUser);
        resetToLeadData(freshOffer);
      }
    } catch (err) {
      console.error('Failed to sync lead data:', err);
      alert('Failed to sync latest data from server.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveToCloud = async () => {
    try {
      setIsSyncing(true);
      const sectionsHtmlJson: any = {};
      document.querySelectorAll('[data-section-id]').forEach(el => {
        const sectionId = el.getAttribute('data-section-id');
        if (sectionId) {
          sectionsHtmlJson[sectionId] = el.innerHTML;
        }
      });
      
      console.log('Would save to DB:', {
        leadId,
        offerData: offer,
        sectionsHtmlJson,
        templateSnapshot: templateData
      });
      
      alert('Proposal saved successfully! (Backend bypassed per instructions)');
      
    } catch (err) {
      console.error('Failed to save proposal:', err);
      alert('Failed to save proposal.');
    } finally {
      setIsSyncing(false);
    }
  };

  const currentTemplateName = React.useMemo(() => {
    if (!offer?.proposalTemplateId) return '';
    const found = LOCAL_TEMPLATES.find(t => t.id === offer.proposalTemplateId);
    return found ? found.templateName : '';
  }, [offer?.proposalTemplateId]);

  if (!isReady || !offer) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Offer Builder...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#e9ecef', margin: '-20px', fontFamily: 'sans-serif' }}>
      {/* Top Sidebar: Tools */}
      <Toolbar
        onExportPdf={handleExportPdf}
        onReset={handleSyncData}
        onSaveProposal={handleSaveToCloud}
        isSyncing={isSyncing}
        onBack={() => navigate(-1)}
        templateName={currentTemplateName}
      />

      {/* Center: A4 Preview Container */}
      <div
        id="proposal-preview-container"
        style={{ flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}
      >
        <ProposalDocument id="proposal-document" templateName={currentTemplateName}>
          {templateData?.sections?.some((s: any) => s.sectionId === 'cover-page') && (
            <CoverSection 
              id="section-1" 
              offer={offer} 
              content={templateData?.sections?.find((s: any) => s.sectionId === 'cover-page')?.content} 
              onUpdate={updateOfferField} 
            />
          )}
          {templateData?.sections?.some((s: any) => s.sectionId === 'cover-letter') && (
            <CoverLetterSection 
              id="section-2" 
              offer={offer} 
              content={templateData?.sections?.find((s: any) => s.sectionId === 'cover-letter')?.content} 
            />
          )}
          {templateData?.sections?.some((s: any) => s.sectionId === 'scope-of-work') && (
            <ScopeOfWorkSection 
              id="section-3" 
              offer={offer} 
              content={templateData?.sections?.find((s: any) => s.sectionId === 'scope-of-work')?.content} 
            />
          )}
          {templateData?.sections?.some((s: any) => s.sectionId === 'design-phases') && (
            <DesignPhasesSection 
              id="section-4" 
              content={templateData?.sections?.find((s: any) => s.sectionId === 'design-phases')?.content} 
            />
          )}
          {templateData?.sections?.some((s: any) => s.sectionId === 'payment-schedule') && (
            <PaymentScheduleSection 
              id="section-5" 
              content={templateData?.sections?.find((s: any) => s.sectionId === 'payment-schedule')?.content} 
            />
          )}
          {templateData?.sections?.some((s: any) => s.sectionId === 'extra-charges') && (
            <ExtraChargesSection 
              id="section-6" 
              content={templateData?.sections?.find((s: any) => s.sectionId === 'extra-charges')?.content} 
            />
          )}
          {templateData?.sections?.some((s: any) => s.sectionId === 'general-terms') && (
            <GeneralTermsSection 
              id="section-7" 
              offer={offer} 
              content={templateData?.sections?.find((s: any) => s.sectionId === 'general-terms')?.content} 
            />
          )}
          {templateData?.sections?.some((s: any) => s.sectionId === 'not-in-scope') && (
            <NotInScopeSection 
              id="section-8" 
              content={templateData?.sections?.find((s: any) => s.sectionId === 'not-in-scope')?.content} 
            />
          )}
          {templateData?.sections?.some((s: any) => s.sectionId === 'meeting-schedule') && (
            <MeetingScheduleSection 
              id="section-9" 
              content={templateData?.sections?.find((s: any) => s.sectionId === 'meeting-schedule')?.content} 
            />
          )}
          {templateData?.sections?.some((s: any) => s.sectionId === 'termination-terms') && (
            <TerminationPaymentTermsSection 
              id="section-10" 
              content={templateData?.sections?.find((s: any) => s.sectionId === 'termination-terms')?.content} 
            />
          )}
        </ProposalDocument>

        {/* Phase 2: Add more sections here */}
        {currentSection > 10 && (
          <div style={{ padding: '50px', background: 'white', marginTop: '20px' }}>
            Section {currentSection} is under construction.
          </div>
        )}
      </div>


      {/* Print styles needed for window.print fallback */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #proposal-preview-container, #proposal-preview-container * {
            visibility: visible;
          }
          #proposal-preview-container {
            position: absolute;
            left: 0;
            top: 0;
            padding: 0;
            margin: 0;
            width: 100%;
          }
          .a4-page-preview {
            box-shadow: none !important;
            margin: 0 !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};
