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
  properties: {
    boundingBox: {
      type: Type.ARRAY,
      description: "The bounding box coordinates [x1, y1, x2, y2] of the value on the document, normalized to a 0-1 range.",
      items: { type: Type.NUMBER }
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
                name: BoundingBoxSchema,
                address: BoundingBoxSchema,
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
    boundingBox: {
      type: Type.ARRAY,
      description: "The bounding box for the entire line item row.",
      items: { type: Type.NUMBER }
    },
    fields: {
        type: Type.OBJECT,
        properties: {
            description: BoundingBoxSchema,
            quantity: BoundingBoxSchema,
            unitPrice: BoundingBoxSchema,
            totalPrice: BoundingBoxSchema,
            countryOfOrigin: BoundingBoxSchema,
            hsCode: BoundingBoxSchema
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
        invoiceNumber: BoundingBoxSchema,
        invoiceDate: BoundingBoxSchema,
        totalDeclaredValue: BoundingBoxSchema,
        currency: BoundingBoxSchema
      }
    }
  },
};

export const extractInvoiceData = async (file: File): Promise<InvoiceData | null> => {
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
              { text: "You are a meticulous data extraction expert specializing in customs documents. Extract all information from this invoice, including the bounding box for each value. It is critical to identify the `countryOfOrigin` and `hsCode` for each individual line item, as they may differ. These fields may have labels like 'Origin', 'COO', 'HTS Code', or 'Tariff Code'. Populate all fields in the provided JSON schema with the highest accuracy." }
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

export const reExtractTextFromImage = async (base64Image: string): Promise<string> => {
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