import { useState, useEffect } from 'react';
import { OfferData } from '../types/offer.types';
import { saveOfferDraft, loadOfferDraft } from '../utils/localStorage';
import { applyLeadData } from '../utils/applyLeadData';

export const useOfferBuilder = (leadId: string, initialLeadData: any, companyData?: any, contactData?: any, currentUser?: any) => {
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!leadId) return;

    // Try to load from draft first
    const draft = loadOfferDraft(leadId);
    
    if (draft) {
      if (initialLeadData && (initialLeadData.proposalTemplateId || initialLeadData.leadTemplateId)) {
        const newTemplateId = initialLeadData.proposalTemplateId || initialLeadData.leadTemplateId;
        if (draft.proposalTemplateId !== newTemplateId) {
          draft.proposalTemplateId = newTemplateId;
          saveOfferDraft(leadId, draft);
        }
      }
      setOffer(draft);
    } else if (initialLeadData) {
      // If no draft, autofill from lead data
      const initialOffer = applyLeadData(initialLeadData, companyData, contactData, currentUser);
      setOffer(initialOffer);
      saveOfferDraft(leadId, initialOffer);
    }
    
    setIsReady(true);
  }, [leadId, initialLeadData, companyData, contactData, currentUser]);

  const resetToLeadData = (freshOffer?: OfferData) => {
    if (freshOffer) {
      setOffer(freshOffer);
      saveOfferDraft(leadId, freshOffer);
      return;
    }
    
    if (!initialLeadData) return;
    const initialOffer = applyLeadData(initialLeadData, companyData, contactData, currentUser);
    setOffer(initialOffer);
    saveOfferDraft(leadId, initialOffer);
  };

  const updateOfferField = (field: keyof OfferData, value: any) => {
    setOffer((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      saveOfferDraft(leadId, updated); // Auto-save
      return updated;
    });
  };

  return { offer, setOffer, updateOfferField, isReady, resetToLeadData };
};
