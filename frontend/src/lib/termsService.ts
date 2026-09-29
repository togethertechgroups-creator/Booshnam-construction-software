export interface TermsConditionsData {
  invoiceTerms: string;
  quotationTerms: string;
  subconTerms: string;
  boqTerms: string;
  purchaseOrderTerms: string;
  invoiceTermsUpdatedAt?: string;
  quotationTermsUpdatedAt?: string;
  subconTermsUpdatedAt?: string;
  boqTermsUpdatedAt?: string;
  purchaseOrderTermsUpdatedAt?: string;
}

export const DEFAULT_TERMS: TermsConditionsData = {
  invoiceTerms:
    'Late payments may result in late payment fees. Please reach out to us in case of any Invoice errors. All disputes are subject to India jurisdiction only',
  quotationTerms:
    'Any changes must be requested in writing and agreed upon by both parties. Additional work or design changes may incur additional costs. Some delays may occur due to unforeseen circumstances. Late payments may result in late payment fees. All disputes are subject to India jurisdiction only',
  subconTerms: '',
  boqTerms: '',
  purchaseOrderTerms: '',
  invoiceTermsUpdatedAt: 'Default Template',
  quotationTermsUpdatedAt: 'Default Template',
  subconTermsUpdatedAt: '',
  boqTermsUpdatedAt: '',
  purchaseOrderTermsUpdatedAt: '',
};

const STORAGE_KEY = 'booshnam_terms_conditions_v1';

/**
 * Retrieve saved Terms and Conditions or fallback to default
 */
export function getTermsConditions(): TermsConditionsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_TERMS,
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Error loading terms and conditions:', e);
  }
  return { ...DEFAULT_TERMS };
}

/**
 * Save all or partial Terms and Conditions and dispatch custom event
 */
export function saveTermsConditions(data: Partial<TermsConditionsData>): TermsConditionsData {
  const current = getTermsConditions();
  const updated: TermsConditionsData = {
    ...current,
    ...data,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent('booshnam_terms_updated', {
        detail: updated,
      })
    );
  } catch (e) {
    console.error('Error saving terms and conditions:', e);
  }

  return updated;
}

/**
 * Save Invoice Terms separately
 */
export function saveInvoiceTerms(terms: string): TermsConditionsData {
  return saveTermsConditions({
    invoiceTerms: terms.trim(),
    invoiceTermsUpdatedAt: new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  });
}

/**
 * Save Quotation Terms separately
 */
export function saveQuotationTerms(terms: string): TermsConditionsData {
  return saveTermsConditions({
    quotationTerms: terms.trim(),
    quotationTermsUpdatedAt: new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  });
}

/**
 * Save Subcon Terms separately
 */
export function saveSubconTerms(terms: string): TermsConditionsData {
  return saveTermsConditions({
    subconTerms: terms.trim(),
    subconTermsUpdatedAt: new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  });
}

/**
 * Save BOQ Terms separately
 */
export function saveBOQTerms(terms: string): TermsConditionsData {
  return saveTermsConditions({
    boqTerms: terms.trim(),
    boqTermsUpdatedAt: new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  });
}

/**
 * Save Purchase Order Terms separately
 */
export function savePurchaseOrderTerms(terms: string): TermsConditionsData {
  return saveTermsConditions({
    purchaseOrderTerms: terms.trim(),
    purchaseOrderTermsUpdatedAt: new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  });
}
