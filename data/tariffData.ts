// This is a mock dataset to simulate a real HS Tariff database.
// In a real application, this would be a comprehensive, regularly updated database
// or an API service.
// Keys are HS codes without periods.

export const tariffData = {
    "85171200": {
        "description": "Telephones for cellular networks or for other wireless networks (Smartphones)",
        "suggestedOverrides": ["AI", "VATZ"]
    },
    "84713000": {
        "description": "Portable automatic data processing machines, weighing not more than 10 kg, consisting of at least a central processing unit, a keyboard and a display (Laptops)",
        "suggestedOverrides": ["AI", "VATZ", "CAP07"]
    },
    "90211000": {
        "description": "Orthopaedic or fracture appliances",
        "suggestedOverrides": ["MD021", "VATZ"]
    },
    "61091000": {
        "description": "T-shirts, singlets and other vests, of cotton, knitted or crocheted",
        "suggestedOverrides": ["TX001"]
    },
    "62034200": {
        "description": "Men's or boys' trousers, bib and brace overalls, breeches and shorts, of cotton (denim)",
        "suggestedOverrides": ["TX001", "CAP12"]
    },
    "08051022": {
        "description": "Fresh sweet oranges (excluding Navel, Naveline, Navelate, Salustiana, etc.)",
        "suggestedOverrides": ["AG01", "PH01"]
    }
};
