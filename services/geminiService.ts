// =================================================================================
// IMPORTANT ARCHITECTURAL NOTE FOR PRODUCTION / GDPR COMPLIANCE
// =================================================================================
// This service file SIMULATES a backend that securely communicates with a
// self-hosted or API-hosted Hugging Face model (nanonets/Nanonets-OCR2-3B).
//
// The correct workflow for a production system is:
// 1. Frontend (React app) uploads the file to YOUR backend server.
// 2. YOUR backend server runs inference using the Hugging Face model. This
//    can be done via Hugging Face Inference Endpoints or by hosting the model
//    on your own infrastructure. This process is kept secure on the server.
// 3. YOUR backend receives the JSON response from the model.
// 4. YOUR backend transforms the response into the format needed by the frontend
//    (like the `transformModelResponseToInvoiceData` function below) and sends
//    it back to the React app.
// =================================================================================

import { InvoiceData, Party, LineItem, FieldMetadata, BoundingBox, VendorTemplate, Table } from "../types";

// This is a realistic mock of a structured data response from a model like
// Nanonets-OCR2-3B after it has processed a MULTI-PAGE invoice.
// FIX: The `table_grid` for the second page was incorrectly nested. It has been moved to the correct location within the `prediction` array for `page: 1`.
const MOCK_MODEL_RESPONSE = {
    "results": [
        {
            "page_data": [
                // PAGE 1 DATA
                {
                    "raw_text": "...",
                    "page": 0,
                    "tables": [
                        {
                            "cells": [
                                { "row": 1, "col": 1, "text": "Laptop Pro X1", "label": "description", "score": 0.98, "xmin": 58, "ymin": 452, "xmax": 201, "ymax": 465 },
                                { "row": 1, "col": 2, "text": "1", "label": "quantity", "score": 0.99, "xmin": 340, "ymin": 452, "xmax": 360, "ymax": 465 },
                                { "row": 1, "col": 3, "text": "1200.00", "label": "unit_price", "score": 0.97, "xmin": 400, "ymin": 452, "xmax": 460, "ymax": 465 },
                                { "row": 1, "col": 4, "text": "1200.00", "label": "total_price", "score": 0.96, "xmin": 500, "ymin": 452, "xmax": 565, "ymax": 465 },
                                { "row": 1, "col": 5, "text": "CN", "label": "country_of_origin", "score": 0.91, "xmin": 600, "ymin": 452, "xmax": 630, "ymax": 465 },
                                { "row": 1, "col": 6, "text": "8471.30.00", "label": "hs_code", "score": 0.94, "xmin": 680, "ymin": 452, "xmax": 750, "ymax": 465 },
                            ],
                            "label": "line_items"
                        }
                    ],
                    "words": [],
                    "image_url": "...",
                    "prediction": [
                        { "label": "invoice_id", "ocr_text": "INV-2024-001", "xmin": 650, "ymin": 105, "xmax": 780, "ymax": 125, "score": 0.99 },
                        { "label": "invoice_date", "ocr_text": "2024-07-15", "xmin": 650, "ymin": 130, "xmax": 780, "ymax": 150, "score": 0.98 },
                        { "label": "shipper_name", "ocr_text": "Global Exports LLC", "xmin": 58, "ymin": 200, "xmax": 250, "ymax": 220, "score": 0.99 },
                        { "label": "shipper_address", "ocr_text": "123 Export Lane, Trade City, 12345, USA", "xmin": 58, "ymin": 222, "xmax": 350, "ymax": 260, "score": 0.96 },
                        { "label": "consignee_name", "ocr_text": "Import Solutions Inc.", "xmin": 58, "ymin": 300, "xmax": 260, "ymax": 320, "score": 0.99 },
                        { "label": "consignee_address", "ocr_text": "456 Import Street, Commerce Town, 67890, GBR", "xmin": 58, "ymin": 322, "xmax": 360, "ymax": 360, "score": 0.97 },
                        { 
                            "label": "table_grid", "page": 0,
                            "xmin": 50, "ymin": 440, "xmax": 760, "ymax": 500,
                            "rows": [450, 470, 490],
                            "columns": [55, 330, 390, 480, 580, 650, 755]
                        }
                    ]
                },
                // PAGE 2 DATA
                {
                    "raw_text": "...",
                    "page": 1,
                    "tables": [
                        {
                            "cells": [
                                { "row": 1, "col": 1, "text": "Wireless Mouse", "label": "description", "score": 0.97, "xmin": 58, "ymin": 82, "xmax": 190, "ymax": 95 },
                                { "row": 1, "col": 2, "text": "2", "label": "quantity", "score": 0.99, "xmin": 340, "ymin": 82, "xmax": 360, "ymax": 95 },
                                { "row": 1, "col": 3, "text": "25.00", "label": "unit_price", "score": 0.98, "xmin": 400, "ymin": 82, "xmax": 460, "ymax": 95 },
                                { "row": 1, "col": 4, "text": "50.00", "label": "total_price", "score": 0.95, "xmin": 500, "ymin": 82, "xmax": 565, "ymax": 95 },
                                { "row": 1, "col": 5, "text": "CN", "label": "country_of_origin", "score": 0.92, "xmin": 600, "ymin": 82, "xmax": 630, "ymax": 95 },
                                { "row": 1, "col": 6, "text": "8471.60.20", "label": "hs_code", "score": 0.93, "xmin": 680, "ymin": 82, "xmax": 750, "ymax": 95 },
                            ],
                            "label": "line_items"
                        }
                    ],
                    "prediction": [
                        { "label": "total_amount", "ocr_text": "1250.00", "xmin": 650, "ymin": 600, "xmax": 780, "ymax": 620, "score": 0.99 },
                        { "label": "currency", "ocr_text": "USD", "xmin": 610, "ymin": 600, "xmax": 645, "ymax": 620, "score": 0.95 },
                        { 
                            "label": "table_grid", "page": 1,
                            "xmin": 50, "ymin": 70, "xmax": 760, "ymax": 110,
                            "rows": [80, 100],
                            "columns": [55, 330, 390, 480, 580, 650, 755]
                        }
                    ]
                }
            ],
            "file": "invoice.pdf",
            "size": 123456
        }
    ]
};

// SIMULATED PAGE DIMENSIONS FOR NORMALIZATION
const MOCK_PAGE_DIMENSIONS = [
    { width: 842, height: 1191 }, // Page 1
    { width: 842, height: 1191 }  // Page 2
];

const transformModelResponseToInvoiceData = (
    modelResponse: any, 
    pageDimensions: {width: number, height: number}[]
): InvoiceData | null => {
    if (!modelResponse?.results?.[0]?.page_data) return null;
    const allPageData = modelResponse.results[0].page_data;

    const findField = (label: string, pageNum?: number) => {
        const pagesToSearch = pageNum !== undefined ? [allPageData[pageNum]] : allPageData;
        for (const page of pagesToSearch) {
            const field = page.prediction.find((p: any) => p.label === label);
            if (field) return { ...field, page: page.page };
        }
        return null;
    };
    
    const normalizeBbox = (field: any, pageNum: number): BoundingBox | undefined => {
        if (!field || !pageDimensions[pageNum]) return undefined;
        const { width, height } = pageDimensions[pageNum];
        return {
            page: pageNum + 1, // Model is 0-indexed, app is 1-indexed
            x1: field.xmin / width,
            y1: field.ymin / height,
            x2: field.xmax / width,
            y2: field.ymax / height,
        };
    };

    const createFieldMetadata = (field: any): FieldMetadata => {
        if (!field) return {};
        return {
            confidence: field?.score,
            boundingBox: normalizeBbox(field, field.page),
        };
    };

    const invoiceNumberField = findField('invoice_id');
    const invoiceDateField = findField('invoice_date');
    const totalAmountField = findField('total_amount');
    const currencyField = findField('currency');
    const shipperNameField = findField('shipper_name');
    const shipperAddressField = findField('shipper_address');
    const consigneeNameField = findField('consignee_name');
    const consigneeAddressField = findField('consignee_address');

    const invoiceData: InvoiceData = {
        invoiceNumber: invoiceNumberField?.ocr_text || '',
        invoiceDate: invoiceDateField?.ocr_text || '',
        shipper: {
            name: shipperNameField?.ocr_text || '',
            address: shipperAddressField?.ocr_text || '',
            fields: {
                name: createFieldMetadata(shipperNameField),
                address: createFieldMetadata(shipperAddressField),
            }
        },
        consignee: {
            name: consigneeNameField?.ocr_text || '',
            address: consigneeAddressField?.ocr_text || '',
            fields: {
                name: createFieldMetadata(consigneeNameField),
                address: createFieldMetadata(consigneeAddressField),
            }
        },
        totalDeclaredValue: parseFloat(totalAmountField?.ocr_text) || 0,
        currency: currencyField?.ocr_text || '',
        lineItems: [],
        tables: [],
        fields: {
            invoiceNumber: createFieldMetadata(invoiceNumberField),
            invoiceDate: createFieldMetadata(invoiceDateField),
            totalDeclaredValue: createFieldMetadata(totalAmountField),
            currency: createFieldMetadata(currencyField),
        }
    };
    
    allPageData.forEach((pageData: any) => {
        const pageNum = pageData.page;
        const lineItemsTable = pageData.tables?.find((t: any) => t.label === 'line_items');
        if (lineItemsTable) {
            const rows: { [key: number]: any } = {};
            lineItemsTable.cells.forEach((cell: any) => {
                if (!rows[cell.row]) {
                    rows[cell.row] = { fields: {} };
                }
                const fieldMapping: { [key: string]: keyof LineItem } = {
                    'description': 'description', 'quantity': 'quantity', 'unit_price': 'unitPrice',
                    'total_price': 'totalPrice', 'country_of_origin': 'countryOfOrigin', 'hs_code': 'hsCode',
                };
                const propName = fieldMapping[cell.label];
                if (propName) {
                    let value: string | number = cell.text;
                    if (['quantity', 'unitPrice', 'totalPrice'].includes(propName)) {
                        value = parseFloat(String(value).replace(/,/g, '')) || 0;
                    }
                    rows[cell.row][propName] = value;
                    rows[cell.row].fields[propName] = createFieldMetadata({ ...cell, page: pageNum });
                }
            });
            invoiceData.lineItems.push(...Object.values(rows));
        }

        const tableGridPrediction = pageData.prediction.find((p: any) => p.label === 'table_grid');
        if (tableGridPrediction) {
            const pageDim = pageDimensions[pageNum];
            if (pageDim) {
                const newTable: Table = {
                    boundingBox: normalizeBbox(tableGridPrediction, pageNum)!,
                    rows: (tableGridPrediction.rows || []).map((y: number) => y / pageDim.height),
                    columns: (tableGridPrediction.columns || []).map((x: number) => x / pageDim.width),
                };
                invoiceData.tables?.push(newTable);
            }
        }
    });

    return invoiceData;
};


// --- TEMPLATE SIMULATION LOGIC ---

// This function simulates a "degraded" OCR result for when no template is found.
// It introduces small errors to demonstrate the value of templates.
const degradeInvoiceData = (data: InvoiceData): InvoiceData => {
    const degraded = JSON.parse(JSON.stringify(data));
    degraded.invoiceNumber = degraded.invoiceNumber.replace('001', 'O01');
    if (degraded.fields?.invoiceNumber) degraded.fields.invoiceNumber.confidence = 0.78;
    if (degraded.lineItems.length > 0) {
        degraded.lineItems[0].hsCode = '8471.3O.OO';
        if (degraded.lineItems[0].fields?.hsCode) degraded.lineItems[0].fields.hsCode.confidence = 0.65;
    }
    return degraded;
};

// This function boosts the confidence scores to simulate a perfect match from a template.
const boostConfidence = (data: InvoiceData): InvoiceData => {
    const boosted = JSON.parse(JSON.stringify(data));
    const recurse = (obj: any) => {
        if (typeof obj !== 'object' || obj === null) return;
        if (obj.confidence) {
            obj.confidence = 0.99;
        }
        Object.values(obj).forEach(recurse);
    };
    recurse(boosted);
    return boosted;
};


export const _extractInvoiceData = async (
    file: File, 
    templates: VendorTemplate[],
    loadedTemplate: VendorTemplate | null
): Promise<{ data: InvoiceData | null; templateApplied: string | null }> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    const extractedData = transformModelResponseToInvoiceData(MOCK_MODEL_RESPONSE, MOCK_PAGE_DIMENSIONS);
    if (!extractedData) {
        throw new Error("Failed to parse the mock API response.");
    }
    
    // SIMULATE TEMPLATE MATCHING
    // Priority 1: User has pre-loaded a template
    if (loadedTemplate) {
      console.log(`Pre-loaded template "${loadedTemplate.vendorName}" is being applied.`);
      // In a real system, you'd send its coordinates and gridlines to guide the model.
      // Here, we simulate this by returning its data with boosted confidence.
      return { data: boostConfidence(loadedTemplate.invoiceData), templateApplied: loadedTemplate.vendorName };
    }

    // Priority 2 (Fallback): Automatic matching by vendor name
    const vendorName = extractedData.shipper.name;
    const matchedTemplate = templates.find(t => t.vendorName.toLowerCase() === vendorName.toLowerCase());

    if (matchedTemplate) {
      console.log(`Template found for vendor: ${vendorName}. Applying template.`);
      // If a template is found, we return the perfect, corrected data from the template,
      // but with boosted confidence scores to simulate a high-accuracy extraction.
      return { data: boostConfidence(matchedTemplate.invoiceData), templateApplied: matchedTemplate.vendorName };
    } else {
      console.log(`No template found for vendor: ${vendorName}. Returning standard OCR results.`);
      // If no template is found, return the slightly degraded results to simulate
      // a standard, less-than-perfect OCR extraction that needs review.
      return { data: degradeInvoiceData(extractedData), templateApplied: null };
    }

  } catch (error) {
    console.error("Error transforming model data:", error);
    if (error instanceof Error) {
        throw new Error(`Data Transformation Error: ${error.message}`);
    }
    throw new Error("An unexpected error occurred during data transformation.");
  }
};

/**
 * SIMULATES a fast, lightweight OCR process to find just the vendor name.
 * In a real system, this would be a targeted OCR call to a specific region
 * of the document for speed.
 */
export const _preScanForVendor = async (file: File): Promise<string | null> => {
    // Simulate a short network delay for the pre-scan
    await new Promise(resolve => setTimeout(resolve, 750));

    // For this simulation, we'll just pull the shipper name from the mock response's first page.
    const shipperName = MOCK_MODEL_RESPONSE.results[0].page_data[0].prediction.find(
        (p: any) => p.label === 'shipper_name'
    )?.ocr_text;

    return shipperName || null;
};