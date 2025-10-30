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
//
// EXAMPLE PRODUCTION `extractInvoiceData` FUNCTION:
//
// export const extractInvoiceData = async (file: File): Promise<InvoiceData | null> => {
//   const formData = new FormData();
//   formData.append('invoice', file);
//
//   const response = await fetch('https://your-backend-api.com/extract', {
//     method: 'POST',
//     body: formData,
//     // Include headers for authentication (e.g., Authorization: Bearer <token>)
//   });
//
//   if (!response.ok) {
//     throw new Error('Failed to extract data from backend.');
//   }
//
//   return await response.json();
// };
// =================================================================================

import { InvoiceData } from "../types";
import { _extractInvoiceData, _reExtractTextFromImage } from "./geminiService";

/**
 * Processes an invoice file to extract structured data.
 * @param file The invoice file (PDF, PNG, JPG).
 * @returns A promise that resolves to the structured InvoiceData.
 */
export const extractInvoiceData = async (file: File): Promise<InvoiceData | null> => {
    // In production, this would call your backend.
    // For this demo, it calls the client-side Gemini service directly.
    return _extractInvoiceData(file);
};

/**
 * Re-extracts text from a small, cropped image selection.
 * @param base64Image The base64-encoded string of the cropped image area.
 * @returns A promise that resolves to the extracted text string.
 */
export const reExtractTextFromImage = async (base64Image: string): Promise<string> => {
    // In production, this would call your backend.
    // For this demo, it calls the client-side Gemini service directly.
    return _reExtractTextFromImage(base64Image);
};
