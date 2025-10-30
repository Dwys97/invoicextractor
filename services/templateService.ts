import { InvoiceData, VendorTemplate } from '../types';

const TEMPLATES_STORAGE_KEY = 'customs_invoice_vendor_templates';

// Helper to generate a unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Retrieves all saved vendor templates from localStorage.
 * @returns {VendorTemplate[]} An array of vendor templates.
 */
export const getTemplates = (): VendorTemplate[] => {
  try {
    const templatesJson = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return templatesJson ? JSON.parse(templatesJson) : [];
  } catch (error) {
    console.error("Failed to load templates from localStorage:", error);
    return [];
  }
};

/**
 * Saves a new or updated vendor template to localStorage.
 * @param {string} vendorName - The name of the vendor for the template.
 * @param {InvoiceData} invoiceData - The corrected invoice data to be saved as the template.
 */
export const saveTemplate = (vendorName: string, invoiceData: InvoiceData): void => {
  const templates = getTemplates();
  const existingTemplateIndex = templates.findIndex(t => t.vendorName.toLowerCase() === vendorName.toLowerCase());

  const newTemplate: VendorTemplate = {
    id: generateId(),
    vendorName,
    invoiceData,
  };

  if (existingTemplateIndex !== -1) {
    // Update existing template
    newTemplate.id = templates[existingTemplateIndex].id; // Retain original ID
    templates[existingTemplateIndex] = newTemplate;
  } else {
    // Add new template
    templates.push(newTemplate);
  }

  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error("Failed to save template to localStorage:", error);
  }
};

/**
 * Updates an existing vendor template with new invoice data.
 * @param {string} templateId - The ID of the template to update.
 * @param {InvoiceData} invoiceData - The new, corrected invoice data.
 */
export const updateTemplate = (templateId: string, invoiceData: InvoiceData): void => {
  const templates = getTemplates();
  const templateIndex = templates.findIndex(t => t.id === templateId);

  if (templateIndex !== -1) {
    templates[templateIndex].invoiceData = invoiceData;
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error("Failed to update template in localStorage:", error);
    }
  } else {
    console.warn(`Attempted to update a template that does not exist with ID: ${templateId}`);
  }
};


/**
 * Deletes a vendor template from localStorage by its ID.
 * @param {string} templateId - The ID of the template to delete.
 */
export const deleteTemplate = (templateId: string): void => {
  let templates = getTemplates();
  templates = templates.filter(t => t.id !== templateId);
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error("Failed to delete template from localStorage:", error);
  }
};