export interface ScanHistoryItem {
  id: string;
  timestamp: number;
  ingredients: string[];
  isBased: boolean;
  unknown: boolean;
  imageUrl?: string;
  rawText?: string;
  productName?: string;
  category?: string;
  brand?: string;
  barcode?: string;
  stringDetails?: string;
}
