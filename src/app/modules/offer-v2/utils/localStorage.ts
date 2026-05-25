import { OfferData } from '../types/offer.types';

export const saveOfferDraft = (leadId: string, data: OfferData): void => {
  try {
    const key = `offer_v2_${leadId}`;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving offer draft:', error);
  }
};

export const loadOfferDraft = (leadId: string): OfferData | null => {
  try {
    const key = `offer_v2_${leadId}`;
    const rawData = localStorage.getItem(key);
    if (!rawData) return null;
    
    const data = JSON.parse(rawData);
    
    // Sanitize any array fields that might cause React child errors
    if (Array.isArray(data.services)) {
      data.services = data.services
        .map((s: any) => s?.service?.name || s?.name || s?.serviceId || '')
        .filter(Boolean)
        .join(', ');
    }
    
    return data;
  } catch (error) {
    console.error('Error loading offer draft:', error);
    return null;
  }
};

export const clearOfferDraft = (leadId: string): void => {
  try {
    const key = `offer_v2_${leadId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing offer draft:', error);
  }
};
