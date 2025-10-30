// =================================================================================
// API Client Abstraction Layer
// =================================================================================
// This file serves as the single point of contact for all data extraction
// requests from the frontend UI.
//
// In this demonstration, it directly calls the `geminiService`.
//
// In a production, GDPR-compliant architecture, you would replace the functions
// in this file with calls to your own secure backend API.
// =================================================================================

import { InvoiceData, VendorTemplate } from "../types";
import { _extractInvoiceData, _preScanForVendor } from "./geminiService";

/**
 * Processes an invoice file to extract structured data.
 * @param file The invoice file (PDF, PNG, JPG).
 * @param templates An array of saved vendor templates to aid extraction.
 * @param loadedTemplate An optional, pre-selected vendor template to guide the extraction.
 * @returns A promise that resolves to the structured InvoiceData and info on whether a template was used.
 */
export const extractInvoiceData = async (
    file: File, 
    templates: VendorTemplate[],
    loadedTemplate: VendorTemplate | null
): Promise<{ data: InvoiceData | null; templateApplied: string | null; }> => {
    // In production, this would call your backend.
    // For this demo, it calls the client-side service that simulates the backend.
    return _extractInvoiceData(file, templates, loadedTemplate);
};

/**
 * Performs a quick scan on an invoice to detect the vendor name.
 * @param file The invoice file to scan.
 * @returns A promise that resolves to the detected vendor name string, or null.
 */
export const preScanForVendor = async (file: File): Promise<string | null> => {
    // In production, this would call your backend for a lightweight pre-scan.
    return _preScanForVendor(file);
};