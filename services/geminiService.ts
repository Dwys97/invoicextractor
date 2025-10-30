// =================================================================================
// IMPORTANT ARCHITECTURAL NOTE FOR PRODUCTION / GDPR COMPLIANCE
// =================================================================================
// This service file demonstrates a DIRECT client-side connection to a Google AI API.
// While excellent for prototyping, this is NOT a suitable architecture for a
// commercial, GDPR-compliant application.
//
// For a production system using Vertex AI, this logic MUST be moved to a
// secure backend server (e.g., a Node.js, Python, or Go service).
//
// The correct workflow would be:
// 1. Frontend (React app) uploads the file to YOUR backend.
// 2. YOUR backend authenticates securely with Vertex AI using a Service Account or
//    Workload Identity. Credentials are NEVER exposed to the client.
// 3. YOUR backend calls the Vertex AI API, specifying a data processing region
//    (e.g., 'europe-west1') to comply with GDPR data residency requirements.
// 4. YOUR backend receives the response and forwards the structured JSON data
//    back to the frontend.
//
// The model name in Vertex AI would also have a different format, e.g.:
// model: "gemini-1.5-flash-001"
// =================================================================================

import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceData } from "../types";

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            resolve('');
        }
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const BoundingBoxSchema = {
    type: Type.OBJECT,
    description: "The location of the value on the document.",
    properties: {
        page: { type: Type.INTEGER, description: "The 1-indexed page number where the value is found." },
        x1: { type: Type.NUMBER, description: "Normalized X coordinate of the top-left corner (0 to 1)." },
        y1: { type: Type.NUMBER, description: "Normalized Y coordinate of the top-left corner (0 to 1)." },
        x2: { type: Type.NUMBER, description: "Normalized X coordinate of the bottom-right corner (0 to 1)." },
        y2: { type: Type.NUMBER, description: "Normalized Y coordinate of the bottom-right corner (0 to 1)." },
    },
    required: ['page', 'x1', 'y1', 'x2', 'y2']
};

const FieldMetadataSchema = {
  type: Type.OBJECT,
  properties: {
    boundingBox: BoundingBoxSchema,
    confidence: {
      type: Type.NUMBER,
      description: "A confidence score from 0.0 (low) to 1.0 (high) for the extracted value."
    }
  }
};

const PartySchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "The name of the party." },
        address: { type: Type.STRING, description: "The full address of the party." },
        fields: {
            type: Type.OBJECT,
            properties: {
                name: FieldMetadataSchema,
                address: FieldMetadataSchema,
            }
        }
    },
};

const LineItemSchema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: "Description of the line item." },
    quantity: { type: Type.INTEGER, description: "Quantity of the item." },
    unitPrice: { type: Type.NUMBER, description: "Price per unit of the item." },
    totalPrice: { type: Type.NUMBER, description: "Total price for the line item (quantity * unitPrice)." },
    countryOfOrigin: { type: Type.STRING, description: "The country where this specific line item's goods were manufactured. Look for labels like 'Country of Origin', 'Origin', or 'COO' associated with the item." },
    hsCode: { type: Type.STRING, description: "The Harmonized System (HS) code for this specific line item. Look for labels like 'HS Code', 'HTS Code', or 'Tariff Code' associated with the item." },
    boundingBox: BoundingBoxSchema,
    fields: {
        type: Type.OBJECT,
        properties: {
            description: FieldMetadataSchema,
            quantity: FieldMetadataSchema,
            unitPrice: FieldMetadataSchema,
            totalPrice: FieldMetadataSchema,
            countryOfOrigin: FieldMetadataSchema,
            hsCode: FieldMetadataSchema
        }
    }
  },
};

const invoiceSchema = {
  type: Type.OBJECT,
  properties: {
    invoiceNumber: { type: Type.STRING, description: "The invoice number." },
    invoiceDate: { type: Type.STRING, description: "The date the invoice was issued (YYYY-MM-DD)." },
    shipper: PartySchema,
    consignee: PartySchema,
    totalDeclaredValue: { type: Type.NUMBER, description: "The total value of all goods." },
    currency: { type: Type.STRING, description: "The currency of the declared value (e.g., USD, EUR)." },
    lineItems: { type: Type.ARRAY, items: LineItemSchema },
    fields: {
      type: Type.OBJECT,
      properties: {
        invoiceNumber: FieldMetadataSchema,
        invoiceDate: FieldMetadataSchema,
        totalDeclaredValue: FieldMetadataSchema,
        currency: FieldMetadataSchema
      }
    }
  },
};

export const _extractInvoiceData = async (file: File): Promise<InvoiceData | null> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePart = await fileToGenerativePart(file);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
          parts: [
              imagePart,
              { text: "You are a meticulous data extraction expert specializing in customs documents. Extract all information from this invoice, including a bounding box object (with page number and coordinates) and a confidence score (from 0.0 to 1.0) for each value. It is critical to identify the `countryOfOrigin` and `hsCode` for each individual line item, as they may differ. These fields may have labels like 'Origin', 'COO', 'HTS Code', or 'Tariff Code'. Populate all fields in the provided JSON schema with the highest accuracy." }
          ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: invoiceSchema,
      },
    });

    const jsonText = response.text.trim();
    if (jsonText) {
      return JSON.parse(jsonText) as InvoiceData;
    }
    return null;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unexpected error occurred during API communication.");
  }
};

export const _reExtractTextFromImage = async (base64Image: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const imagePart = {
        inlineData: { data: base64Image, mimeType: 'image/png' },
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    imagePart,
                    { text: "Extract all text content from this image. Provide only the text, with no additional commentary." }
                ]
            },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for re-extraction:", error);
        throw new Error("Failed to re-extract text from the selected area.");
    }
};