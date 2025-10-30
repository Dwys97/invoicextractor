import { InvoiceData } from "../types";

// Helper to escape XML special characters
const escapeXml = (unsafe: string): string => {
    if (typeof unsafe !== 'string') return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};


export const exportToCdsXml = (data: InvoiceData): string => {
    const {
        invoiceNumber,
        shipper,
        consignee,
        lineItems,
        currency,
    } = data;
    
    // Note: This is a simplified representation of a CDS XML declaration.
    // A real-world declaration would have many more fields and complexities.
    // This serves as a structural example based on the extracted invoice data.

    const lineItemsXml = (lineItems || []).map((item, index) => {
      const overridesXml = (item.cdsOverrides || []).map(code => 
        `
      <AdditionalInformation>
        <StatementCode>${escapeXml(code)}</StatementCode>
      </AdditionalInformation>`
      ).join('');

      return `
    <GovernmentAgencyGoodsItem>
      <SequenceNumeric>${index + 1}</SequenceNumeric>
      <Commodity>
        <Description>${escapeXml(item.description)}</Description>
        <Classification>
          <ID>${escapeXml(item.hsCode || '')}</ID>
        </Classification>
      </Commodity>
      <Origin>
        <CountryCode>${escapeXml(item.countryOfOrigin || '')}</CountryCode>
      </Origin>
      <InvoiceLine>
        <ItemChargeAmount currencyID="${escapeXml(currency || 'USD')}">${item.totalPrice || 0}</ItemChargeAmount>
      </InvoiceLine>
      <GoodsMeasure>
          <TariffQuantity>${item.quantity || 0}</TariffQuantity>
      </GoodsMeasure>
      ${overridesXml}
    </GovernmentAgencyGoodsItem>`;
    }).join('');

    const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<Declaration xmlns="urn:wco:datamodel:WCO:DEC-DMS:2">
  <Function>9</Function>
  <FunctionalReferenceID>${escapeXml(invoiceNumber || '')}</FunctionalReferenceID>
  <TypeCode>IM</TypeCode>
  <GoodsShipment>
    <Exporter>
      <Name>${escapeXml(shipper?.name || '')}</Name>
      <Address>
        <Line>${escapeXml(shipper?.address || '')}</Line>
      </Address>
    </Exporter>
    <Importer>
      <Name>${escapeXml(consignee?.name || '')}</Name>
      <Address>
        <Line>${escapeXml(consignee?.address || '')}</Line>
      </Address>
    </Importer>
    ${lineItemsXml}
  </GoodsShipment>
</Declaration>
`;

    return xmlString;
};