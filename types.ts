
export interface Client {
  id: string;
  code?: string;
  type: 'physical' | 'juridical';
  name: string;
  cpf?: string;
  cnpj?: string;
  stateRegistration?: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  email?: string;
}

export interface CompanyInfo {
  name: string;
  cnpj: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
  professionalSegment?: string;
  customSegmentName?: string;
}

export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  professionalSegment?: string;
  customSegmentName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  type: 'product' | 'service';
  code: string;
  internalCode?: string;
  name: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  image?: string;
  sector?: string;
  observation?: string;
  discountPercent?: number;
  originalSellPrice?: number;
  updatedAt?: string;
}

export interface QuoteItem {
  product: Product;
  quantity: number;
}

export interface QuoteSettings {
  text: string;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  fontSize: number;
  showDiscount: boolean;
  autoSave: boolean;
  showProductCode: boolean;
  showProductInternalCode?: boolean;
  showProductSector: boolean;
  showProductImage: boolean;
  showImageInPriceTable: boolean;
  showItemDiscountPercent?: boolean;
  showInternalCodeInPriceTable?: boolean;
  enableProductInternalCode?: boolean;
  defaultNotes: string;
  allowQuoteWithoutStock: boolean;
  sectors: string[];
  theme: string;
  font: string;
  enableSequentialNumber?: boolean;
  nextQuoteNumber?: number;
}

export interface SavedQuote {
  id: string;
  number?: number;
  createdAt: string;
  client: Client;
  items: QuoteItem[];
  notes: string;
  productsSubtotal?: number;
  servicesSubtotal?: number;
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  discount: string;
  discountType: 'percent' | 'fixed';
}