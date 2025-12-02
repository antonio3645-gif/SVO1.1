
export interface Client {
  id: string;
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
}

export interface Product {
  id: string;
  type: 'product' | 'service';
  code: string;
  name: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  image?: string;
  sector?: string;
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
  showProductSector: boolean;
  showProductImage: boolean;
  showImageInPriceTable: boolean;
  defaultNotes: string;
  allowQuoteWithoutStock: boolean;
  sectors: string[];
  theme: string;
  font: string;
}

export interface SavedQuote {
  id: string;
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