export interface BoundingBox {
  page: number; // 1-indexed page number
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface FieldMetadata {
  boundingBox?: BoundingBox;
  confidence?: number; // A score from 0.0 to 1.0
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  countryOfOrigin: string;
  hsCode: string;
  cdsOverrides?: string[];
  boundingBox?: BoundingBox; // For the entire row
  fields?: {
    description?: FieldMetadata;
    quantity?: FieldMetadata;
    unitPrice?: FieldMetadata;
    totalPrice?: FieldMetadata;
    countryOfOrigin?: FieldMetadata;
    hsCode?: FieldMetadata;
  }
}

export interface Party {
  name: string;
  address: string;
  fields?: {
    name?: FieldMetadata;
    address?: FieldMetadata;
  }
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  shipper: Party;
  consignee: Party;
  totalDeclaredValue: number;
  currency: string;
  lineItems: LineItem[];
  fields?: {
    invoiceNumber?: FieldMetadata;
    invoiceDate?: FieldMetadata;
    totalDeclaredValue?: FieldMetadata;
    currency?: FieldMetadata;
  }
}