
export type BoundingBox = [number, number, number, number]; // [x1, y1, x2, y2] normalized

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  countryOfOrigin: string;
  hsCode: string;
  cdsOverrides?: string[];
  boundingBox?: BoundingBox;
  fields?: {
    description?: { boundingBox?: BoundingBox };
    quantity?: { boundingBox?: BoundingBox };
    unitPrice?: { boundingBox?: BoundingBox };
    totalPrice?: { boundingBox?: BoundingBox };
    countryOfOrigin?: { boundingBox?: BoundingBox };
    hsCode?: { boundingBox?: BoundingBox };
  }
}

export interface Party {
  name: string;
  address: string;
  fields?: {
    name?: { boundingBox?: BoundingBox };
    address?: { boundingBox?: BoundingBox };
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
    invoiceNumber?: { boundingBox?: BoundingBox };
    invoiceDate?: { boundingBox?: BoundingBox };
    totalDeclaredValue?: { boundingBox?: BoundingBox };
    currency?: { boundingBox?: BoundingBox };
  }
}