
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Client, Product, QuoteItem, QuoteSettings, SavedQuote, CompanyInfo } from '../types';
import { safeSetItem } from '../utils/storage';
import { FileDownIcon } from './icons/FileDownIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { SaveIcon } from './icons/SaveIcon';
import { SearchIcon } from './icons/SearchIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { ProductImageZoom } from './ProductImageZoom';
import { FileText, X, Calendar, ExternalLink } from 'lucide-react';
import { SearchableCombobox } from './SearchableCombobox';
import { generateQuoteHTML as generateSharedQuoteHTML } from '../utils/quoteExportService';


interface QuotesProps {
  clients: Client[];
  products: Product[];
  logo: string | null;
  quoteSettings: QuoteSettings;
  onSetQuoteSettings?: (settings: QuoteSettings) => void;
  saveQuote: (quoteData: Omit<SavedQuote, 'id'>) => void;
  quoteToEdit: SavedQuote | null;
  clearQuoteToEdit: () => void;
  savedQuotes: SavedQuote[];
  deleteQuote: (id: string) => void;
  editQuote: (id: string) => void;
  companyInfo: CompanyInfo | null;
  preSelectedClientId?: string | null;
  onClearPreSelectedClientId?: () => void;
}

const Quotes: React.FC<QuotesProps> = ({ 
  clients, products, logo, quoteSettings, onSetQuoteSettings, saveQuote, quoteToEdit, clearQuoteToEdit,
  savedQuotes, deleteQuote, editQuote, companyInfo,
  preSelectedClientId, onClearPreSelectedClientId
}) => {
  // State for new quote
  const [selectedClientId, setSelectedClientId] = useState<string>(() => preSelectedClientId || '');
  const [quoteDate, setQuoteDate] = useState<string>(() => {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  });
  const [quoteTime, setQuoteTime] = useState<string>(() => {
      const d = new Date();
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  });

  // State for Products selection
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productQuantity, setProductQuantity] = useState<number>(1);
  
  // State for Services selection
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [serviceQuantity, setServiceQuantity] = useState<number>(1);

  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [notes, setNotes] = useState<string>(quoteSettings.defaultNotes || '');
  const [discount, setDiscount] = useState<string>('0');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const quoteRef = useRef<HTMLDivElement>(null);
  const [draftExists, setDraftExists] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saving' | 'saved' | ''>('');
  const [isCurrentQuoteSaved, setIsCurrentQuoteSaved] = useState(false);
  const [editingQuoteNumber, setEditingQuoteNumber] = useState<number | undefined>(undefined);

  // State and refs for saved quotes list
  const [searchTerm, setSearchTerm] = useState('');
  const [numberFilter, setNumberFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [valueFilter, setValueFilter] = useState('');
  const [isSavedQuotesModalOpen, setIsSavedQuotesModalOpen] = useState(false);
  const [isClientHistoryModalOpen, setIsClientHistoryModalOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (localStorage.getItem('quoteDraft')) {
      setDraftExists(true);
    }
  }, []);
  
  // Any change to the quote marks it as "unsaved"
  useEffect(() => {
    setIsCurrentQuoteSaved(false);
  }, [selectedClientId, quoteItems, notes, discount, discountType, quoteDate, quoteTime]);


  useEffect(() => {
    if (!quoteSettings.autoSave) {
        return;
    }

    setAutoSaveStatus('saving');
    const handler = setTimeout(() => {
        const draft = {
            selectedClientId,
            quoteItems,
            notes,
            discount,
            discountType,
            quoteDate,
            quoteTime,
        };
        safeSetItem('quoteDraft', JSON.stringify(draft));
        setDraftExists(true);
        setAutoSaveStatus('saved');
        
        setTimeout(() => setAutoSaveStatus(''), 2000);

    }, 1000);

    return () => {
        clearTimeout(handler);
    };
  }, [selectedClientId, quoteItems, notes, discount, discountType, quoteDate, quoteTime, quoteSettings.autoSave]);

  useEffect(() => {
    if (quoteToEdit) {
      setSelectedClientId(quoteToEdit.client?.id ?? '');
      setQuoteItems(quoteToEdit.items ?? []);
      setNotes(quoteToEdit.notes ?? quoteSettings.defaultNotes ?? '');
      setDiscount(quoteToEdit.discount ?? '0');
      setDiscountType(quoteToEdit.discountType ?? 'fixed');
      setEditingQuoteNumber(quoteToEdit.number);
      if (quoteToEdit.createdAt) {
        const d = new Date(quoteToEdit.createdAt);
        if (!isNaN(d.getTime())) {
          setQuoteDate(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
          setQuoteTime(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
        }
      }
      clearQuoteToEdit();
      alert('Orçamento carregado para edição. Faça suas alterações e salve-o.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [quoteToEdit, clearQuoteToEdit, quoteSettings.defaultNotes]);

  useEffect(() => {
    if (preSelectedClientId) {
      setSelectedClientId(preSelectedClientId);
      onClearPreSelectedClientId?.();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [preSelectedClientId, onClearPreSelectedClientId]);


  const handleLoadDraft = () => {
    const savedDraftJSON = localStorage.getItem('quoteDraft');
    if (savedDraftJSON) {
      const savedDraft = JSON.parse(savedDraftJSON);
      setSelectedClientId(savedDraft.selectedClientId || '');
      setQuoteItems(savedDraft.quoteItems || []);
      setNotes(savedDraft.notes || '');
      setDiscount(savedDraft.discount || '0');
      setDiscountType(savedDraft.discountType || 'fixed');
      setQuoteDate(savedDraft.quoteDate || new Date().toISOString().split('T')[0]);
      if (savedDraft.quoteTime) setQuoteTime(savedDraft.quoteTime);
      alert('Rascunho carregado com sucesso!');
    } else {
      alert('Nenhum rascunho encontrado.');
    }
  };

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);

  const selectedClientQuotes = useMemo(() => {
    if (!selectedClient) return [];
    return savedQuotes.filter(q => {
      const matchId = Boolean(q.client?.id && q.client.id === selectedClient.id);
      const matchName = Boolean(
        q.client?.name && 
        selectedClient.name && 
        q.client.name.trim().toLowerCase() === selectedClient.name.trim().toLowerCase()
      );
      const matchCode = Boolean(
        q.client?.code && 
        selectedClient.code && 
        q.client.code.trim().toLowerCase() === selectedClient.code.trim().toLowerCase()
      );
      return matchId || matchName || matchCode;
    });
  }, [savedQuotes, selectedClient]);
  
  // Filter lists for dropdowns
  const productList = useMemo(() => products.filter(p => p.type !== 'service'), [products]);
  const serviceList = useMemo(() => products.filter(p => p.type === 'service'), [products]);

  // Options prepared for SearchableCombobox (supports search by name, code, internalCode, sector)
  const clientComboboxOptions = useMemo(() => {
    return clients.map(c => {
      const doc = c.cnpj || c.cpf || '';
      const phone = c.phone || '';
      const city = c.city ? ` - ${c.city}` : '';
      const extraInfo = [doc, phone, city].filter(Boolean).join(' • ');
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        extraInfo,
      };
    });
  }, [clients]);

  const productComboboxOptions = useMemo(() => {
    return productList.map(p => {
      const hasDiscount = Boolean(p.discountPercent && p.discountPercent > 0);
      const finalPrice = hasDiscount ? p.sellPrice * (1 - p.discountPercent! / 100) : p.sellPrice;
      return {
        id: p.id,
        name: p.name,
        code: p.code,
        internalCode: p.internalCode,
        sector: p.sector,
        price: finalPrice,
        stock: p.stock ?? 0,
        type: 'product' as const,
        discountPercent: p.discountPercent,
        extraInfo: p.observation || undefined,
      };
    });
  }, [productList]);

  const serviceComboboxOptions = useMemo(() => {
    return serviceList.map(s => {
      const hasDiscount = Boolean(s.discountPercent && s.discountPercent > 0);
      const finalPrice = hasDiscount ? s.sellPrice * (1 - s.discountPercent! / 100) : s.sellPrice;
      return {
        id: s.id,
        name: s.name,
        code: s.code,
        internalCode: s.internalCode,
        sector: s.sector,
        price: finalPrice,
        type: 'service' as const,
        discountPercent: s.discountPercent,
        extraInfo: s.observation || undefined,
      };
    });
  }, [serviceList]);

  // Derived lists for rendering
  const productItems = useMemo(() => quoteItems.filter(i => i.product.type !== 'service'), [quoteItems]);
  const serviceItems = useMemo(() => quoteItems.filter(i => i.product.type === 'service'), [quoteItems]);

  const handleAddItem = (itemId: string, qty: number, type: 'product' | 'service') => {
    if (!itemId || qty <= 0) {
      alert(`Selecione um ${type === 'product' ? 'produto' : 'serviço'} e uma quantidade válida.`);
      return;
    }
    const productToAdd = products.find(p => p.id === itemId);
    
    if (productToAdd) {
        const existingItem = quoteItems.find(item => item.product.id === itemId);
        const totalQuantityNeeded = (existingItem?.quantity || 0) + qty;
        
        // Stock check only for products
        if (type === 'product' && !quoteSettings.allowQuoteWithoutStock && totalQuantityNeeded > productToAdd.stock) {
            alert(`Quantidade indisponível em estoque. Disponível: ${productToAdd.stock}.`);
            return;
        }

        const hasDiscount = Boolean(productToAdd.discountPercent && productToAdd.discountPercent > 0);
        const effectiveSellPrice = hasDiscount
          ? Number((productToAdd.sellPrice * (1 - productToAdd.discountPercent! / 100)).toFixed(2))
          : productToAdd.sellPrice;

        const productWithEffectivePrice: Product = {
          ...productToAdd,
          sellPrice: effectiveSellPrice,
          originalSellPrice: productToAdd.sellPrice,
        };

        const existingItemIndex = quoteItems.findIndex(item => item.product.id === itemId);
        if(existingItemIndex !== -1){
            const updatedItems = [...quoteItems];
            updatedItems[existingItemIndex].quantity += qty;
            updatedItems[existingItemIndex].product = productWithEffectivePrice;
            setQuoteItems(updatedItems);
        } else {
            setQuoteItems([...quoteItems, { product: productWithEffectivePrice, quantity: qty }]);
        }
      
      if (type === 'product') {
          setSelectedProductId('');
          setProductQuantity(1);
      } else {
          setSelectedServiceId('');
          setServiceQuantity(1);
      }
    }
  };
  
  const handleRemoveItem = (productId: string) => {
    setQuoteItems(quoteItems.filter(item => item.product.id !== productId));
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    const validatedQuantity = Math.max(1, newQuantity || 1);
    
    const productInCart = products.find(p => p.id === productId);
    // Only check stock for products
    if (productInCart?.type !== 'service' && !quoteSettings.allowQuoteWithoutStock && productInCart && validatedQuantity > productInCart.stock) {
        alert(`Quantidade indisponível em estoque. Disponível: ${productInCart.stock}.`);
        const updatedItems = quoteItems.map(item => 
            item.product.id === productId ? { ...item, quantity: productInCart.stock } : item
        );
        setQuoteItems(updatedItems);
        return;
    }

    const updatedItems = quoteItems.map(item => 
      item.product.id === productId ? { ...item, quantity: validatedQuantity } : item
    );
    setQuoteItems(updatedItems);
  };
  
  const productsSubtotal = useMemo(() => {
      return productItems.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0);
  }, [productItems]);

  const servicesSubtotal = useMemo(() => {
      return serviceItems.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0);
  }, [serviceItems]);

  const subtotal = useMemo(() => {
    return productsSubtotal + servicesSubtotal;
  }, [productsSubtotal, servicesSubtotal]);

  const discountAmount = useMemo(() => {
    const numericDiscount = parseFloat(discount) || 0;
    if (numericDiscount <= 0) return 0;
    if (discountType === 'percent') {
      return (subtotal * numericDiscount) / 100;
    }
    return numericDiscount > subtotal ? subtotal : numericDiscount;
  }, [subtotal, discount, discountType]);

  const finalTotal = useMemo(() => {
    return subtotal - discountAmount;
  }, [subtotal, discountAmount]);

  const currentDisplayNumber = useMemo(() => {
    if (editingQuoteNumber !== undefined) {
      return editingQuoteNumber;
    }
    if (quoteSettings.enableSequentialNumber !== false) {
      return quoteSettings.nextQuoteNumber || 1;
    }
    return undefined;
  }, [editingQuoteNumber, quoteSettings.enableSequentialNumber, quoteSettings.nextQuoteNumber]);

  const currentSavedQuoteIndex = useMemo(() => {
    if (editingQuoteNumber !== undefined) {
      return savedQuotes.findIndex(q => q.number === editingQuoteNumber);
    }
    return -1;
  }, [savedQuotes, editingQuoteNumber]);

  const loadQuoteIntoEditor = (quote: SavedQuote) => {
    setSelectedClientId(quote.client?.id ?? '');
    setQuoteItems(quote.items ?? []);
    setNotes(quote.notes ?? quoteSettings.defaultNotes ?? '');
    setDiscount(quote.discount ?? '0');
    setDiscountType(quote.discountType ?? 'fixed');
    setEditingQuoteNumber(quote.number);
    if (quote.createdAt) {
      const d = new Date(quote.createdAt);
      if (!isNaN(d.getTime())) {
        setQuoteDate(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
        setQuoteTime(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
      }
    }
    setIsCurrentQuoteSaved(true);
  };

  const handleFirstQuote = () => {
    if (savedQuotes.length > 0) {
      loadQuoteIntoEditor(savedQuotes[0]);
    }
  };

  const handlePrevQuote = () => {
    if (savedQuotes.length === 0) return;
    if (currentSavedQuoteIndex > 0) {
      loadQuoteIntoEditor(savedQuotes[currentSavedQuoteIndex - 1]);
    } else if (currentSavedQuoteIndex === -1) {
      loadQuoteIntoEditor(savedQuotes[savedQuotes.length - 1]);
    }
  };

  const handleNextQuote = () => {
    if (savedQuotes.length === 0) return;
    if (currentSavedQuoteIndex >= 0 && currentSavedQuoteIndex < savedQuotes.length - 1) {
      loadQuoteIntoEditor(savedQuotes[currentSavedQuoteIndex + 1]);
    }
  };

  const handleLastQuote = () => {
    if (savedQuotes.length > 0) {
      loadQuoteIntoEditor(savedQuotes[savedQuotes.length - 1]);
    }
  };

  const handleShowTable = () => {
    setIsSavedQuotesModalOpen(true);
  };

  const handleIncluir = () => {
    setSelectedClientId('');
    setQuoteItems([]);
    setNotes(quoteSettings.defaultNotes || '');
    setDiscount('0');
    setDiscountType('fixed');
    setEditingQuoteNumber(undefined);
    const d = new Date();
    setQuoteDate(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    setQuoteTime(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
    localStorage.removeItem('quoteDraft');
    setDraftExists(false);
    setIsCurrentQuoteSaved(false);
  };

  const handleApagar = () => {
    if (currentSavedQuoteIndex >= 0 && savedQuotes[currentSavedQuoteIndex]) {
      const targetQuote = savedQuotes[currentSavedQuoteIndex];
      deleteQuote(targetQuote.id);
      handleIncluir();
    } else if (quoteItems.length > 0 || selectedClientId) {
      handleIncluir();
    }
  };

  const handlePesquisar = () => {
    setIsSavedQuotesModalOpen(true);
  };

  const clearQuoteForm = () => {
    handleIncluir();
  };

  const saveCurrentQuote = (): SavedQuote | null => {
    if (!selectedClient) {
        alert('Por favor, selecione um cliente para salvar, imprimir ou gerar o PDF.');
        return null;
    }
    if (quoteItems.length === 0) {
        alert('Adicione pelo menos um item ao orçamento para salvar, imprimir ou gerar o PDF.');
        return null;
    }

    if (isCurrentQuoteSaved) {
        const lastSaved = savedQuotes.find(q => 
          q.client.id === selectedClient.id && 
          q.finalTotal === finalTotal && 
          q.items.length === quoteItems.length
        ) || savedQuotes[savedQuotes.length - 1];
        
        if (lastSaved) return lastSaved;
    }

    const assignedNumber = editingQuoteNumber !== undefined 
      ? editingQuoteNumber 
      : (quoteSettings.enableSequentialNumber !== false ? (quoteSettings.nextQuoteNumber || 1) : undefined);

    const [year, month, day] = quoteDate.split('-').map(Number);
    const [hours, minutes] = (quoteTime || '00:00').split(':').map(Number);
    const dateObj = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0);
    const createdAtIso = isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString();

    const quoteToSave: Omit<SavedQuote, 'id'> = {
        client: selectedClient,
        items: quoteItems,
        notes,
        productsSubtotal,
        servicesSubtotal,
        subtotal,
        discountAmount,
        finalTotal,
        discount,
        discountType,
        createdAt: createdAtIso,
        number: editingQuoteNumber,
    };

    saveQuote(quoteToSave);
    setIsCurrentQuoteSaved(true);
    if (assignedNumber !== undefined) {
      setEditingQuoteNumber(assignedNumber);
    }

    return {
      ...quoteToSave,
      id: crypto.randomUUID(),
      number: assignedNumber,
    };
  };

  const handlePrint = () => {
    const saved = saveCurrentQuote();
    if (!saved) return;
    handlePrintSavedQuote(saved);
  };

  const handleExportPDF = async () => {
    const saved = saveCurrentQuote();
    if (!saved) return;
    await handleGeneratePdfFromSaved(saved);
  };

  const handleWhatsApp = async () => {
    if (currentSavedQuoteIndex >= 0 && savedQuotes[currentSavedQuoteIndex]) {
      await handleSendWhatsApp(savedQuotes[currentSavedQuoteIndex]);
      return;
    }
    const saved = saveCurrentQuote();
    if (!saved) return;
    await handleSendWhatsApp(saved);
  };
  
  const formatDateDisplay = (dateString: string, timeString?: string) => {
      if (!dateString) return '';
      const [year, month, day] = dateString.split('-');
      let result = `${day}/${month}/${year}`;
      if (timeString) {
          result += ` - ${timeString}`;
      }
      return result;
  };

  const formatDateTime = (isoString: string) => {
      if (!isoString) return '';
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} - ${hours}:${minutes}`;
  };

  const tableCols = 3 + (quoteSettings.showProductCode ? 1 : 0) + (quoteSettings.showProductInternalCode ? 1 : 0) + (quoteSettings.showProductSector ? 1 : 0) + (quoteSettings.showProductImage ? 1 : 0) + (quoteSettings.showProductStock ? 1 : 0);

  // --- Logic from SavedQuotes component ---

  const filteredSavedQuotes = useMemo(() => {
    return savedQuotes.filter(quote => {
      const formattedNum = quote.number ? String(quote.number).padStart(4, '0') : '';
      const rawNum = quote.number ? String(quote.number) : '';
      const formattedDate = formatDateTime(quote.createdAt);

      // General Search Term matches client name, quote sequence number (#0001 or 1), item names/codes, notes, date, total
      const searchLower = searchTerm.toLowerCase().trim();
      const searchMatch = !searchLower ? true : (
        quote.client.name.toLowerCase().includes(searchLower) ||
        formattedNum.includes(searchLower) ||
        rawNum.includes(searchLower) ||
        `#${formattedNum}`.includes(searchLower) ||
        (quote.notes && quote.notes.toLowerCase().includes(searchLower)) ||
        formattedDate.includes(searchLower) ||
        String(quote.finalTotal).includes(searchLower) ||
        quote.items.some(i => i.product.name.toLowerCase().includes(searchLower) || (i.product.code && i.product.code.toLowerCase().includes(searchLower)) || (i.product.internalCode && i.product.internalCode.toLowerCase().includes(searchLower)))
      );

      const numMatch = numberFilter 
        ? (formattedNum.includes(numberFilter.trim()) || rawNum.includes(numberFilter.trim()) || `#${formattedNum}`.includes(numberFilter.trim())) 
        : true;
      const nameMatch = nameFilter ? quote.client.name.toLowerCase().includes(nameFilter.toLowerCase()) : true;
      const dateMatch = dateFilter ? formattedDate.includes(dateFilter) : true;
      const valueMatch = valueFilter ? String(quote.finalTotal).includes(valueFilter) : true;

      return searchMatch && numMatch && nameMatch && dateMatch && valueMatch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [savedQuotes, searchTerm, numberFilter, nameFilter, dateFilter, valueFilter]);

  const generateQuoteHTML = (quote: SavedQuote): string => {
    return generateSharedQuoteHTML(quote, quoteSettings, companyInfo, logo);
  };
  
  const handlePrintSavedQuote = (quote: SavedQuote) => {
    const printContent = generateQuoteHTML(quote);
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = `<style> body { font-family: sans-serif; margin: 0; padding: 0; } </style>` + printContent;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };
  
  const createQuotePdf = async (quote: SavedQuote) => {
    const input = printRef.current;
    // @ts-ignore
    if (!input || !window.html2canvas || !window.jspdf) {
        throw new Error("Recursos para gerar PDF não carregados.");
    }
    input.innerHTML = generateQuoteHTML(quote);

    try {
        // @ts-ignore
        const canvas = await window.html2canvas(input, { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 });
        const imgData = canvas.toDataURL('image/png');
        // @ts-ignore
        const { jsPDF } = window.jspdf;
        
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        const clientName = (quote.client?.name || 'Cliente').replace(/\s+/g, '_');
        const date = new Date(quote.createdAt || Date.now()).toISOString().slice(0, 10);
        const fileName = `Orcamento-${clientName}-${date}.pdf`;
        const pdfBlob = pdf.output('blob') as Blob;

        return { pdf, fileName, pdfBlob };
    } finally {
        input.innerHTML = '';
    }
  };

  const handleGeneratePdfFromSaved = async (quote: SavedQuote) => {
    try {
        const { pdf, fileName } = await createQuotePdf(quote);
        pdf.save(fileName);
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF.");
    }
  };

  const handleSendWhatsApp = async (quote: SavedQuote) => {
    let phone = quote.client.phone ? quote.client.phone.replace(/\D/g, '') : '';
    if (!phone) {
        const inputPhone = prompt("O cliente não possui um telefone cadastrado.\nInforme o número com DDD para enviar via WhatsApp (ex: 11999998888):");
        if (!inputPhone) return;
        phone = inputPhone.replace(/\D/g, '');
        if (!phone) {
            alert("Número de telefone inválido.");
            return;
        }
    }
    // Simple heuristic for Brazil: if 10 or 11 digits, add 55.
    if (phone.length >= 10 && phone.length <= 11) {
        phone = '55' + phone;
    }

    const quoteNumText = quote.number ? `Nº ${String(quote.number).padStart(4, '0')}` : '';
    const formattedDate = formatDateTime(quote.createdAt);

    // Formatação visual e estruturada de documento / proposta de orçamento PDF
    let message = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📄 *ORÇAMENTO / PROPOSTA COMERCIAL ${quoteNumText}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n`;

    if (companyInfo?.name) {
        message += `🏢 *${companyInfo.name.toUpperCase()}*\n`;
        if (companyInfo.cnpj) message += `CNPJ: ${companyInfo.cnpj}\n`;
        if (companyInfo.phone) message += `Tel: ${companyInfo.phone}\n`;
        if (companyInfo.email) message += `E-mail: ${companyInfo.email}\n`;
        if (companyInfo.address) message += `End.: ${companyInfo.address}\n`;
        message += `──────────────────────\n`;
    }

    message += `👤 *DADOS DO CLIENTE*\n`;
    message += `*Cliente:* ${quote.client.name}\n`;
    if (quote.client.cpf) message += `*CPF:* ${quote.client.cpf}\n`;
    if (quote.client.cnpj) message += `*CNPJ:* ${quote.client.cnpj}\n`;
    if (quote.client.phone) message += `*Telefone:* ${quote.client.phone}\n`;
    if (quote.client.address) {
        const addrDetails = [quote.client.address, quote.client.city, quote.client.zipCode ? `CEP ${quote.client.zipCode}` : ''].filter(Boolean).join(' - ');
        message += `*Endereço:* ${addrDetails}\n`;
    }
    message += `*Data/Hora de Emissão:* ${formattedDate}\n`;
    message += `──────────────────────\n`;

    message += `📦 *ITENS DA PROPOSTA*\n`;
    message += `──────────────────────\n`;

    quote.items.forEach((item, idx) => {
        const totalItem = (item.quantity * item.product.sellPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const unitPrice = item.product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const discountNote = item.product.discountPercent && item.product.discountPercent > 0 ? ` (${item.product.discountPercent}% desc.)` : '';
        const internalCodeText = quoteSettings.showProductInternalCode && item.product.internalCode ? ` [Cód. Int: ${item.product.internalCode}]` : (quoteSettings.showProductCode && item.product.code ? ` [Cód: ${item.product.code}]` : '');

        message += `${idx + 1}. *${item.quantity}x ${item.product.name}*${internalCodeText}\n`;
        message += `   Unit: R$ ${unitPrice}${discountNote}  |  Subtotal: *R$ ${totalItem}*\n`;
    });

    message += `──────────────────────\n`;
    message += `💰 *RESUMO FINANCEIRO*\n`;
    if (quote.discountAmount > 0) {
        const subtotalFormatted = quote.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const discountFormatted = quote.discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        message += `Subtotal: R$ ${subtotalFormatted}\n`;
        message += `Desconto (${quote.discountType === 'percent' ? quote.discount + '%' : 'R$'}): - R$ ${discountFormatted}\n`;
    }
    const finalFormatted = quote.finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    message += `*VALOR TOTAL: R$ ${finalFormatted}*\n`;
    message += `──────────────────────\n`;

    if (quote.notes && quote.notes.trim()) {
        message += `📝 *OBSERVAÇÕES:*\n${quote.notes.trim()}\n`;
        message += `──────────────────────\n`;
    }

    message += `📎 *Documento PDF oficial anexado / gerado com sucesso.* \n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━`;

    // 1. Gera o PDF oficial do orçamento e baixa para o dispositivo
    let generatedPdf: { pdf: any; fileName: string; pdfBlob: Blob } | null = null;
    try {
        generatedPdf = await createQuotePdf(quote);
        generatedPdf.pdf.save(generatedPdf.fileName);
    } catch (err) {
        console.warn("Aviso ao gerar arquivo PDF antes do WhatsApp:", err);
    }

    // 2. Se o dispositivo suportar compartilhamento nativo de arquivo (ex: navegadores móveis), abre o menu de compartilhamento com o PDF anexado
    if (generatedPdf && typeof navigator !== 'undefined' && 'canShare' in navigator) {
        try {
            const pdfFile = new File([generatedPdf.pdfBlob], generatedPdf.fileName, { type: 'application/pdf' });
            if (navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({
                    files: [pdfFile],
                    title: `Orçamento ${quoteNumText} - ${quote.client.name}`,
                    text: message,
                });
                return;
            }
        } catch (shareErr: any) {
            if (shareErr.name !== 'AbortError') {
                console.log("Web Share não concluído, abrindo WhatsApp diretamente:", shareErr);
            } else {
                return; // Usuário cancelou o compartilhamento
            }
        }
    }

    // 3. Abre diretamente a conversa no WhatsApp Web / App com a proposta formatada no estilo PDF
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        if (document.body.contains(link)) {
            document.body.removeChild(link);
        }
    }, 100);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 md:p-8">
      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg h-fit">
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Novo Orçamento</h2>
            <button 
                type="button"
                onClick={handleIncluir} 
                className="px-3 py-1.5 text-xs font-semibold rounded bg-gradient-to-b from-emerald-100 to-emerald-200 hover:from-emerald-200 hover:to-emerald-300 text-emerald-900 border border-emerald-300 shadow-xs transition-colors"
                title="Incluir (Novo Orçamento)"
            >
                <u>I</u>ncluir
            </button>
         </div>
         
         {draftExists && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex justify-between items-center">
                <span className="text-amber-800 text-sm">Rascunho encontrado.</span>
                <button onClick={handleLoadDraft} className="text-sm font-medium text-amber-700 hover:text-amber-800 underline">
                    Carregar
                </button>
            </div>
         )}

          <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                <SearchableCombobox 
                    placeholder="Selecione ou busque um cliente..."
                    searchPlaceholder="Buscar cliente por nome, código, CPF/CNPJ..."
                    options={clientComboboxOptions}
                    value={selectedClientId}
                    onChange={(id) => setSelectedClientId(id)}
                    itemType="client"
                />

                {selectedClient && (
                  <div className="mt-2 p-2 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between text-xs text-sky-900">
                    <div className="flex items-center gap-1.5 font-medium">
                      <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>
                        {selectedClientQuotes.length === 0 
                          ? 'Sem orçamentos anteriores' 
                          : `${selectedClientQuotes.length} orçamento(s) já emitido(s)`}
                      </span>
                    </div>
                    {selectedClientQuotes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsClientHistoryModalOpen(true)}
                        className="font-bold text-sky-700 hover:text-sky-900 underline hover:no-underline cursor-pointer"
                      >
                        Ver Histórico &rarr;
                      </button>
                    )}
                  </div>
                )}
            </div>
            
            <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Adicionar Produto</h3>
                <div className="space-y-3">
                    <SearchableCombobox 
                        placeholder="Selecione ou busque um produto..."
                        searchPlaceholder="Buscar produto por nome, código ou setor..."
                        options={productComboboxOptions}
                        value={selectedProductId}
                        onChange={(id) => setSelectedProductId(id)}
                        showStock={true}
                        showPrice={true}
                        itemType="product"
                    />

                    {(() => {
                        const selProd = productList.find(p => p.id === selectedProductId);
                        if (!selProd) return null;
                        const stockVal = Number(selProd.stock) || 0;
                        return (
                            <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-slate-100 border border-slate-200">
                                <span className="text-slate-600 font-medium">Estoque atual:</span>
                                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                    stockVal > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {stockVal > 0 ? `${stockVal} unidade(s) em estoque` : 'Sem estoque (0 un.)'}
                                </span>
                            </div>
                        );
                    })()}

                    {(() => {
                        const selProd = productList.find(p => p.id === selectedProductId);
                        if (selProd && selProd.discountPercent && selProd.discountPercent > 0) {
                            const discountedPrice = selProd.sellPrice * (1 - selProd.discountPercent / 100);
                            return (
                                <div className="text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-md border border-emerald-200 flex justify-between items-center animate-in fade-in">
                                    <span className="font-medium">Item com <strong>{selProd.discountPercent}% de desconto</strong></span>
                                    <span>De: <span className="line-through text-slate-400">R$ {selProd.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> por <strong className="text-emerald-700 text-sm">R$ {discountedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            min="1" 
                            value={productQuantity} 
                            onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-20 border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[--color-primary-500] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button 
                            onClick={() => handleAddItem(selectedProductId, productQuantity, 'product')}
                            className="flex-grow bg-[--color-primary-600] text-white rounded-md py-2 hover:bg-[--color-primary-700] cursor-pointer"
                        >
                            Adicionar
                        </button>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Adicionar Serviço</h3>
                 <div className="space-y-3">
                    <SearchableCombobox 
                        placeholder="Selecione ou busque um serviço..."
                        searchPlaceholder="Buscar serviço por nome, código ou setor..."
                        options={serviceComboboxOptions}
                        value={selectedServiceId}
                        onChange={(id) => setSelectedServiceId(id)}
                        showPrice={true}
                        itemType="service"
                    />

                    {(() => {
                        const selServ = serviceList.find(s => s.id === selectedServiceId);
                        if (selServ && selServ.discountPercent && selServ.discountPercent > 0) {
                            const discountedPrice = selServ.sellPrice * (1 - selServ.discountPercent / 100);
                            return (
                                <div className="text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-md border border-emerald-200 flex justify-between items-center animate-in fade-in">
                                    <span className="font-medium">Serviço com <strong>{selServ.discountPercent}% de desconto</strong></span>
                                    <span>De: <span className="line-through text-slate-400">R$ {selServ.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> por <strong className="text-emerald-700 text-sm">R$ {discountedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            min="1" 
                            value={serviceQuantity} 
                            onChange={(e) => setServiceQuantity(parseInt(e.target.value) || 1)}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-20 border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[--color-primary-500] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button 
                             onClick={() => handleAddItem(selectedServiceId, serviceQuantity, 'service')}
                            className="flex-grow bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700"
                        >
                            Adicionar
                        </button>
                    </div>
                </div>
            </div>

             <div className="pt-4 border-t border-slate-100">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-slate-900">Desconto</h3>
                     <div className="flex items-center gap-2 bg-slate-100 p-1 rounded text-xs">
                        <button 
                            onClick={() => setDiscountType('fixed')}
                            className={`px-2 py-1 rounded ${discountType === 'fixed' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                        >
                            R$
                        </button>
                        <button 
                             onClick={() => setDiscountType('percent')}
                             className={`px-2 py-1 rounded ${discountType === 'percent' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                        >
                            %
                        </button>
                    </div>
                 </div>
                <input 
                    type="number" 
                    min="0" 
                    step="any"
                    value={discount} 
                    onChange={(e) => setDiscount(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[--color-primary-500] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0.00"
                />
            </div>

             <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Observações</h3>
                <textarea 
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
                />
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-1.5">
                <button 
                    type="button"
                    onClick={() => {
                        if (isCurrentQuoteSaved) {
                            alert("Este orçamento já está salvo.");
                        } else {
                            saveCurrentQuote();
                        }
                    }} 
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors cursor-pointer"
                >
                    <SaveIcon className="h-4 w-4" />
                    <span>Salvar Orçamento (Dar Baixa no Estoque)</span>
                </button>
                <p className="text-[11px] text-slate-500 text-center">
                    Ao salvar, as quantidades dos produtos são debitadas do estoque automaticamente como venda.
                </p>
            </div>
         </div>
      </div>

      <div className="lg:col-span-2 space-y-8">
         {/* Quote Preview */}
         <div className="bg-white rounded-xl shadow-lg overflow-hidden">
             {/* Toolbar */}
              <div className="bg-slate-50 p-2.5 sm:p-3 border-b border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                      {/* Button groups */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          {/* Navigation Pager */}
                          <div className="inline-flex items-center gap-0.5 bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/80 shadow-2xs shrink-0">
                              <button 
                                  type="button"
                                  onClick={handleFirstQuote}
                                  disabled={savedQuotes.length === 0 || currentSavedQuoteIndex === 0}
                                  title="Primeiro Orçamento"
                                  className="h-8 min-w-[32px] px-1.5 inline-flex items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer"
                              >
                                  <svg className="w-3.5 h-3.5 fill-slate-700" viewBox="0 0 16 16">
                                      <rect x="2" y="2.5" width="2" height="11" rx="0.5" />
                                      <polygon points="13,2.5 5,8 13,13.5" />
                                  </svg>
                              </button>
                              <button 
                                  type="button"
                                  onClick={handlePrevQuote}
                                  disabled={savedQuotes.length === 0 || currentSavedQuoteIndex === 0}
                                  title="Orçamento Anterior"
                                  className="h-8 min-w-[32px] px-1.5 inline-flex items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer"
                              >
                                  <svg className="w-3.5 h-3.5 fill-slate-700" viewBox="0 0 16 16">
                                      <polygon points="12,2.5 4,8 12,13.5" />
                                  </svg>
                              </button>
                              <button 
                                  type="button"
                                  onClick={handleNextQuote}
                                  disabled={savedQuotes.length === 0 || currentSavedQuoteIndex === -1 || currentSavedQuoteIndex === savedQuotes.length - 1}
                                  title="Próximo Orçamento"
                                  className="h-8 min-w-[32px] px-1.5 inline-flex items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer"
                              >
                                  <svg className="w-3.5 h-3.5 fill-slate-700" viewBox="0 0 16 16">
                                      <polygon points="4,2.5 12,8 4,13.5" />
                                  </svg>
                              </button>
                              <button 
                                  type="button"
                                  onClick={handleLastQuote}
                                  disabled={savedQuotes.length === 0 || currentSavedQuoteIndex === savedQuotes.length - 1}
                                  title="Último Orçamento"
                                  className="h-8 min-w-[32px] px-1.5 inline-flex items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer"
                              >
                                  <svg className="w-3.5 h-3.5 fill-slate-700" viewBox="0 0 16 16">
                                      <polygon points="3,2.5 11,8 3,13.5" />
                                      <rect x="12" y="2.5" width="2" height="11" rx="0.5" />
                                  </svg>
                              </button>
                          </div>

                          {/* Management Group */}
                          <div className="flex flex-wrap items-center gap-1.5">
                              <button 
                                  type="button"
                                  onClick={handleShowTable}
                                  title="Orçamentos Salvos"
                                  className="px-2.5 h-8 inline-flex items-center gap-1.5 rounded border border-sky-300 bg-gradient-to-b from-sky-100 to-sky-200 hover:from-sky-200 hover:to-sky-300 text-sky-900 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                              >
                                  <svg className="w-4 h-4 text-sky-800 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                                      <rect x="1" y="1" width="14" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
                                      <rect x="1" y="1" width="14" height="4" fill="#0284c7" />
                                      <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1" />
                                      <line x1="1" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="1" />
                                      <line x1="6" y1="5" x2="6" y2="15" stroke="currentColor" strokeWidth="1" />
                                      <line x1="11" y1="5" x2="11" y2="15" stroke="currentColor" strokeWidth="1" />
                                  </svg>
                                  <span className="whitespace-nowrap">Orçamentos Salvos</span>
                              </button>

                              <button 
                                  type="button"
                                  onClick={handleApagar}
                                  title="Apagar Orçamento"
                                  className="px-2.5 h-8 inline-flex items-center gap-1 rounded border border-red-300 bg-gradient-to-b from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 text-red-900 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                              >
                                  <TrashIcon className="h-3.5 w-3.5 text-red-800" />
                                  <span>Apagar</span>
                              </button>

                              <button 
                                  type="button"
                                  onClick={handlePesquisar}
                                  title="Pesquisar Orçamento"
                                  className="px-2.5 h-8 inline-flex items-center gap-1 rounded border border-amber-300 bg-gradient-to-b from-amber-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 text-amber-900 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                              >
                                  <SearchIcon className="h-3.5 w-3.5 text-amber-800" />
                                  <span>Pesquisar</span>
                              </button>
                          </div>

                          {/* Export / Action Group */}
                          <div className="flex flex-wrap items-center gap-1.5">
                              <button 
                                  type="button"
                                  onClick={() => {
                                      const updated = { ...quoteSettings, showProductStock: !quoteSettings.showProductStock };
                                      if (onSetQuoteSettings) {
                                          onSetQuoteSettings(updated);
                                      }
                                  }} 
                                  title={quoteSettings.showProductStock ? "Ocultar coluna de quantidade em estoque ao gerar PDF ou imprimir" : "Mostrar coluna de quantidade em estoque de cada produto ao gerar PDF ou imprimir"}
                                  className={`px-2.5 h-8 inline-flex items-center gap-1.5 border rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer select-none ${
                                      quoteSettings.showProductStock 
                                          ? 'border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 ring-1 ring-emerald-300' 
                                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                  }`}
                              >
                                  <span className={`w-2 h-2 rounded-full ${quoteSettings.showProductStock ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300'}`} />
                                  <span>{quoteSettings.showProductStock ? 'Estoque no PDF: Ativo' : 'Mostrar Estoque'}</span>
                              </button>

                              <button 
                                  type="button"
                                  onClick={handlePrint} 
                                  title="Imprimir Orçamento"
                                  className="px-2.5 h-8 inline-flex items-center gap-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 bg-gradient-to-b from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 shadow-xs transition-colors cursor-pointer"
                              >
                                  <PrinterIcon className="h-3.5 w-3.5 text-slate-600"/>
                                  <span>Imprimir</span>
                              </button>

                              <button 
                                  type="button"
                                  onClick={handleExportPDF} 
                                  title="Exportar em PDF"
                                  className="px-2.5 h-8 inline-flex items-center gap-1.5 border border-orange-300 rounded text-xs font-semibold text-orange-900 bg-gradient-to-b from-orange-100 to-orange-200 hover:from-orange-200 hover:to-orange-300 shadow-xs transition-colors cursor-pointer"
                              >
                                  <FileDownIcon className="h-3.5 w-3.5 text-orange-800"/>
                                  <span>PDF</span>
                              </button>

                              <button 
                                  type="button"
                                  onClick={handleWhatsApp} 
                                  title="Enviar Orçamento por WhatsApp"
                                  className="px-2.5 h-8 inline-flex items-center gap-1.5 border border-emerald-300 rounded text-xs font-semibold text-emerald-900 bg-gradient-to-b from-emerald-100 to-emerald-200 hover:from-emerald-200 hover:to-emerald-300 shadow-xs transition-colors cursor-pointer"
                              >
                                  <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-800"/>
                                  <span>WhatsApp</span>
                              </button>

                              <button 
                                  type="button"
                                  onClick={() => {
                                      if (isCurrentQuoteSaved) {
                                          alert("Este orçamento já está salvo em Orçamentos Salvos.");
                                      } else {
                                          saveCurrentQuote();
                                      }
                                  }} 
                                  title="Salvar Orçamento"
                                  className="px-2.5 h-8 inline-flex items-center gap-1.5 border border-blue-300 rounded text-xs font-semibold text-blue-900 bg-gradient-to-b from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 shadow-xs transition-colors cursor-pointer"
                              >
                                  <SaveIcon className="h-3.5 w-3.5 text-blue-800"/>
                                  <span>Salvar</span>
                              </button>
                          </div>
                      </div>

                      {/* Auto-save Status */}
                      {autoSaveStatus && (
                          <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shrink-0">
                              {autoSaveStatus === "saving" ? "Salvando..." : "Rascunho salvo."}
                          </span>
                      )}
                  </div>
              </div>
              
              {/* Printable Area */}
                           <div ref={quoteRef} className="p-6 bg-white text-slate-900 font-sans text-xs min-h-[600px]" id="printable-quote">
                                   {/* Company Header */}
                  <div className="relative mb-2 min-h-[60px]">
                      {logo && (
                          <div className="absolute left-0 top-0">
                              <img src={logo} alt="Logo" className="max-h-14 max-w-[120px] object-contain" />
                          </div>
                      )}
                      {quoteSettings.text ? (
                          <div 
                              className="whitespace-pre-wrap leading-tight text-slate-900"
                              style={{
                                  fontFamily: quoteSettings.fontFamily || 'sans-serif',
                                  textAlign: quoteSettings.textAlign || 'center',
                                  fontSize: quoteSettings.fontSize ? `${quoteSettings.fontSize}px` : '12px'
                              }}
                          >
                              {quoteSettings.text}
                          </div>
                      ) : companyInfo?.name ? (
                          <div className="text-center text-[11px] leading-tight text-slate-900 font-sans">
                              <div className="font-bold text-xs uppercase tracking-wide mb-0.5">-- {companyInfo.name.toUpperCase()} --</div>
                              {companyInfo.address && <div>{companyInfo.address}</div>}
                              {companyInfo.phone && <div>{companyInfo.phone}</div>}
                              {companyInfo.email && <div>{companyInfo.email}</div>}
                              {(companyInfo.zipCode || companyInfo.city) && (
                                  <div>CEP {companyInfo.zipCode || ''} {companyInfo.city ? `- ${companyInfo.city}` : ''}</div>
                              )}
                              {companyInfo.cnpj && <div>CNPJ: {companyInfo.cnpj}</div>}
                          </div>
                      ) : null}
                  </div>

                   {/* Document Title */}
                  <div className="text-center font-bold text-xs uppercase tracking-wider my-3 text-slate-900">
                      ORÇAMENTO
                  </div>

                  {/* Client Data (Enlarged font size for generated quote) */}
                  <div className="text-[15px] leading-relaxed mb-3 text-slate-900">
                      {selectedClient ? (
                          <>
                              <div><strong className="font-bold">Para :</strong> {selectedClient.name}</div>
                              {selectedClient.address && <div><strong className="font-bold">End. :</strong> {selectedClient.address}{selectedClient.city ? ` - ${selectedClient.city}` : ''}{selectedClient.zipCode ? ` - CEP ${selectedClient.zipCode}` : ''}</div>}
                              {selectedClient.phone && <div><strong className="font-bold">Tel. :</strong> {selectedClient.phone}</div>}
                              {selectedClient.type === 'juridical' && selectedClient.cnpj ? (
                                  <div><strong className="font-bold">CNPJ :</strong> {selectedClient.cnpj}</div>
                              ) : (selectedClient.cpf ? (
                                  <div><strong className="font-bold">CPF :</strong> {selectedClient.cpf}</div>
                              ) : null)}
                          </>
                      ) : (
                          <div className="text-slate-400 italic text-sm">Nenhum cliente selecionado</div>
                      )}
                  </div>

                  {/* Quote Number & Date & Page (Enlarged font size for generated quote) */}
                  <div className="flex justify-between items-start text-[15px] mb-3 text-slate-900">
                      <div>
                          <div className="text-base font-bold"><strong>Orçamento</strong> {currentDisplayNumber !== undefined ? `Nº ${String(currentDisplayNumber).padStart(4, '0')}` : ''}</div>
                          <div className="print-hidden flex items-center gap-1.5 mt-0.5">
                              <input 
                                  type="date" 
                                  id="quoteDateDisplay"
                                  value={quoteDate}
                                  onChange={(e) => setQuoteDate(e.target.value)}
                                  className="text-slate-800 border-b border-slate-300 focus:border-[--color-primary-500] focus:outline-none text-sm bg-transparent"
                              />
                              <input 
                                  type="time" 
                                  id="quoteTimeDisplay"
                                  value={quoteTime}
                                  onChange={(e) => setQuoteTime(e.target.value)}
                                  className="text-slate-800 border-b border-slate-300 focus:border-[--color-primary-500] focus:outline-none text-sm bg-transparent"
                              />
                          </div>
                          <span className="hidden print-visible-inline text-sm text-slate-600">{formatDateDisplay(quoteDate, quoteTime)}</span>
                      </div>
                      <div className="text-right text-sm text-slate-600">
                          <div>Página 1</div>
                          <div>Via 1</div>
                      </div>
                  </div>

                  {/* Table (Enlarged font size for generated quote) */}
                  <table className="w-full text-sm mb-2 border-collapse">
                      <thead>
                          <tr className="border-y-2 border-slate-700 text-left text-slate-900 font-semibold">
                              <th className="py-1.5 px-2 w-16 text-center">Quantidade</th>
                              {quoteSettings.showProductImage && <th className="py-1.5 px-2 w-14 text-center">Imagem</th>}
                              {quoteSettings.showProductCode && <th className="py-1.5 px-2 w-28">Código</th>}
                              {quoteSettings.showProductInternalCode && <th className="py-1.5 px-2 w-24">Cód. Interno</th>}
                              {quoteSettings.showProductSector && <th className="py-1.5 px-2 w-20">Setor</th>}
                              <th className="py-1.5 px-2 font-semibold">Descrição</th>
                              {quoteSettings.showProductStock && <th className="py-1.5 px-2 w-20 text-center font-semibold">Estoque</th>}
                              <th className="py-1.5 px-2 w-28 text-right font-semibold">Valor Unitário</th>
                              <th className="py-1.5 px-2 w-28 text-right font-semibold">Valor Total</th>
                              <th className="py-1.5 px-2 w-8 print-hidden"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                          {productItems.map((item, idx) => (
                              <tr key={`prod-${idx}`}>
                                  <td className="py-1.5 px-2 text-center align-middle font-semibold text-sm">
                                      <input 
                                         type="number" 
                                         min="1"
                                         value={item.quantity}
                                         onChange={(e) => handleUpdateQuantity(item.product.id, parseInt(e.target.value))}
                                         className="w-12 bg-transparent border-b border-slate-200 hover:border-slate-400 focus:border-[--color-primary-500] focus:outline-none text-center text-sm font-semibold print-hidden"
                                      />
                                      <span className="hidden print-visible-inline">{item.quantity}</span>
                                  </td>
                                  {quoteSettings.showProductImage && (
                                      <td className="py-1.5 px-2 text-center align-middle">
                                          {item.product.image ? (
                                              <ProductImageZoom 
                                                  src={item.product.image} 
                                                  alt={item.product.name} 
                                                  className="w-10 h-10 object-contain rounded border border-slate-200 mx-auto" 
                                                  containerClassName="w-10 h-10 relative inline-block"
                                              />
                                          ) : (
                                              <span className="text-slate-300 text-xs">-</span>
                                          )}
                                      </td>
                                  )}
                                  {quoteSettings.showProductCode && <td className="py-1.5 px-2 text-slate-600 align-middle text-[13px]">{item.product.code || '-'}</td>}
                                  {quoteSettings.showProductInternalCode && <td className="py-1.5 px-2 font-semibold text-indigo-700 align-middle text-sm">{item.product.internalCode || '-'}</td>}
                                  {quoteSettings.showProductSector && <td className="py-1.5 px-2 text-slate-600 align-middle text-[13px]">{item.product.sector || '-'}</td>}
                                  <td className="py-1.5 px-2 align-middle text-sm font-medium">
                                      <div>{item.product.name}</div>
                                      {item.product.discountPercent && item.product.discountPercent > 0 && (
                                          <span className="inline-block text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5">
                                              Desconto de {item.product.discountPercent}% já aplicado
                                          </span>
                                      )}
                                  </td>
                                  {quoteSettings.showProductStock && (
                                      <td className="py-1.5 px-2 text-center align-middle text-sm font-semibold text-slate-800">
                                          {item.product.stock !== undefined ? `${item.product.stock} un` : '-'}
                                      </td>
                                  )}
                                  <td className="py-1.5 px-2 text-right align-middle text-sm font-semibold">{item.product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="py-1.5 px-2 text-right align-middle text-sm font-semibold">{ (item.product.sellPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }</td>
                                  <td className="py-1.5 px-2 text-center align-middle print-hidden">
                                      <button onClick={() => handleRemoveItem(item.product.id)} className="text-slate-400 hover:text-[--color-destructive-500]">
                                          <TrashIcon className="h-3.5 w-3.5" />
                                      </button>
                                  </td>
                              </tr>
                          ))}

                          {serviceItems.map((item, idx) => (
                              <tr key={`serv-${idx}`}>
                                  <td className="py-1.5 px-2 text-center align-middle font-semibold text-sm">
                                      <input 
                                         type="number" 
                                         min="1"
                                         value={item.quantity}
                                         onChange={(e) => handleUpdateQuantity(item.product.id, parseInt(e.target.value))}
                                         className="w-12 bg-transparent border-b border-slate-200 hover:border-slate-400 focus:border-[--color-primary-500] focus:outline-none text-center text-sm font-semibold print-hidden"
                                      />
                                      <span className="hidden print-visible-inline">{item.quantity}</span>
                                  </td>
                                  {quoteSettings.showProductImage && (
                                      <td className="py-1.5 px-2 text-center align-middle">
                                          {item.product.image ? (
                                              <ProductImageZoom 
                                                  src={item.product.image} 
                                                  alt={item.product.name} 
                                                  className="w-10 h-10 object-contain rounded border border-slate-200 mx-auto" 
                                                  containerClassName="w-10 h-10 relative inline-block"
                                              />
                                          ) : (
                                              <span className="text-slate-300 text-xs">-</span>
                                          )}
                                      </td>
                                  )}
                                  {quoteSettings.showProductCode && <td className="py-1.5 px-2 text-slate-600 align-middle text-[13px]">{item.product.code || '-'}</td>}
                                  {quoteSettings.showProductInternalCode && <td className="py-1.5 px-2 font-semibold text-indigo-700 align-middle text-sm">{item.product.internalCode || '-'}</td>}
                                  {quoteSettings.showProductSector && <td className="py-1.5 px-2 text-slate-600 align-middle text-[13px]">{item.product.sector || '-'}</td>}
                                  <td className="py-1.5 px-2 align-middle text-sm font-medium">
                                      <div>{item.product.name}</div>
                                      {item.product.discountPercent && item.product.discountPercent > 0 && (
                                          <span className="inline-block text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5">
                                              Desconto de {item.product.discountPercent}% já aplicado
                                          </span>
                                      )}
                                  </td>
                                  {quoteSettings.showProductStock && (
                                      <td className="py-1.5 px-2 text-center align-middle text-sm text-slate-400">
                                          -
                                      </td>
                                  )}
                                  <td className="py-1.5 px-2 text-right align-middle text-sm font-semibold">{item.product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="py-1.5 px-2 text-right align-middle text-sm font-semibold">{ (item.product.sellPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }</td>
                                  <td className="py-1.5 px-2 text-center align-middle print-hidden">
                                      <button onClick={() => handleRemoveItem(item.product.id)} className="text-slate-400 hover:text-[--color-destructive-500]">
                                          <TrashIcon className="h-3.5 w-3.5" />
                                      </button>
                                  </td>
                              </tr>
                          ))}

                          {quoteItems.length === 0 && (
                              <tr>
                                  <td colSpan={4 + (quoteSettings.showProductImage ? 1 : 0) + (quoteSettings.showProductCode ? 1 : 0) + (quoteSettings.showProductInternalCode ? 1 : 0) + (quoteSettings.showProductSector ? 1 : 0) + (quoteSettings.showProductStock ? 1 : 0) + 1} className="py-8 text-center text-slate-400 italic text-sm">
                                      Adicione produtos ou serviços para começar o orçamento
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>

                  {/* Total & Notes Footer (Enlarged Totals) */}
                  <div className="border-t-2 border-slate-700 pt-2.5 text-slate-900">
                      {discountAmount > 0 ? (
                          <div className="text-right space-y-1 mb-3">
                              <div className="text-slate-600 text-[15px]">
                                  Subtotal &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-red-600 font-semibold text-[15px]">
                                  Desconto{discountType === 'percent' && parseFloat(discount) > 0 ? ` (${discount}%)` : ''} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="font-extrabold text-[17px] text-slate-900 pt-1 border-t border-slate-200 inline-block">
                                  Total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                          </div>
                      ) : (
                          <div className="text-right font-extrabold text-[17px] mb-3">
                              Total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                      )}
                      {notes ? (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                              <div className="text-slate-700 whitespace-pre-wrap text-xs">{notes}</div>
                          </div>
                      ) : null}
                  </div>
             </div>
         </div>

         {/* Saved Quotes Modal */}
      {isSavedQuotesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-1.5 sm:p-4 md:p-6 overflow-hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[96vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-sky-100 rounded-lg text-sky-800 shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="1" width="14" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="1" y="1" width="14" height="4" fill="#0284c7" />
                    <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1" />
                    <line x1="1" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="1" />
                    <line x1="6" y1="5" x2="6" y2="15" stroke="currentColor" strokeWidth="1" />
                    <line x1="11" y1="5" x2="11" y2="15" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-bold text-slate-900">Orçamentos Salvos</h2>
                  <p className="text-xs text-slate-500">{filteredSavedQuotes.length} orçamento(s) encontrado(s)</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSavedQuotesModalOpen(false)}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                title="Fechar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-2.5 sm:p-6 overflow-y-auto flex-1 space-y-3 sm:space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 bg-slate-50 p-2.5 sm:p-3.5 rounded-lg border border-slate-200">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                     id="search-quotes-input"
                     type="text" 
                     placeholder="Filtrar por Nº do orçamento..." 
                     value={numberFilter}
                     onChange={(e) => setNumberFilter(e.target.value)}
                     className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                     autoFocus
                  />
                </div>
                <div className="relative">
                  <input 
                     type="text" 
                     placeholder="Filtrar por cliente..." 
                     value={nameFilter}
                     onChange={(e) => setNameFilter(e.target.value)}
                     className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                </div>
                <div className="relative">
                  <input 
                     type="text" 
                     placeholder="Filtrar por data (DD/MM/AAAA)..." 
                     value={dateFilter}
                     onChange={(e) => setDateFilter(e.target.value)}
                     className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                </div>
                <div className="relative">
                  <input 
                     type="text" 
                     placeholder="Filtrar por valor..." 
                     value={valueFilter}
                     onChange={(e) => setValueFilter(e.target.value)}
                     className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                </div>
              </div>

              {/* Mobile View: Cards (md:hidden) */}
              <div className="block md:hidden space-y-2.5">
                {filteredSavedQuotes.length > 0 ? (
                  filteredSavedQuotes.map((quote) => (
                    <div key={quote.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-800 text-sm">
                          {quote.number ? `Nº ${String(quote.number).padStart(4, "0")}` : "Sem número"}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {formatDateTime(quote.createdAt)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-slate-500">Cliente:</span>
                        <span className="font-semibold text-slate-900 truncate max-w-[200px]">{quote.client?.name || "Não informado"}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Valor Total:</span>
                        <span className="font-bold text-emerald-700 text-sm">
                          R$ {quote.finalTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <button 
                          onClick={() => {
                            editQuote(quote.id);
                            setIsSavedQuotesModalOpen(false);
                          }}
                          className="flex-1 py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Carregar / Editar Orçamento"
                        >
                          <PencilIcon className="h-3.5 w-3.5 text-sky-700" />
                          <span>Carregar</span>
                        </button>

                        <button 
                          onClick={() => handleSendWhatsApp(quote)} 
                          className="p-1.5 text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer" 
                          title="Enviar WhatsApp"
                        >
                          <WhatsAppIcon className="h-4 w-4" />
                        </button>

                        <button 
                          onClick={() => handlePrintSavedQuote(quote)} 
                          className="p-1.5 text-slate-700 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors cursor-pointer" 
                          title="Imprimir"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </button>

                        <button 
                          onClick={() => handleGeneratePdfFromSaved(quote)} 
                          className="p-1.5 text-orange-700 hover:text-orange-900 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors cursor-pointer" 
                          title="PDF"
                        >
                          <FileDownIcon className="h-4 w-4" />
                        </button>

                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            deleteQuote(quote.id);
                          }} 
                          className="p-1.5 text-red-600 hover:text-red-800 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors cursor-pointer" 
                          title="Excluir Orçamento"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 italic bg-white rounded-lg border border-slate-200 text-xs">
                    Nenhum orçamento salvo encontrado.
                  </div>
                )}
              </div>

              {/* Desktop / Tablet View: Table (hidden md:block) */}
              <div className="hidden md:block border border-slate-200 rounded-lg overflow-x-auto shadow-xs bg-white">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nº</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredSavedQuotes.length > 0 ? (
                      filteredSavedQuotes.map((quote) => (
                        <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-800">
                            {quote.number ? `Nº ${String(quote.number).padStart(4, "0")}` : "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                            {formatDateTime(quote.createdAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                            {quote.client.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-700">
                            R$ {quote.finalTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleSendWhatsApp(quote)} className="p-1 text-slate-400 hover:text-green-600 transition-colors cursor-pointer" title="Enviar via WhatsApp">
                                <WhatsAppIcon className="h-5 w-5" />
                              </button>
                              <button onClick={() => handlePrintSavedQuote(quote)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" title="Imprimir">
                                <PrinterIcon className="h-5 w-5" />
                              </button>
                              <button onClick={() => handleGeneratePdfFromSaved(quote)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" title="PDF">
                                <FileDownIcon className="h-5 w-5" />
                              </button>
                              <button 
                                onClick={() => {
                                  editQuote(quote.id);
                                  setIsSavedQuotesModalOpen(false);
                                }} 
                                className="p-1 text-[--color-accent-600] hover:text-[--color-accent-800] transition-colors cursor-pointer" 
                                title="Editar"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  deleteQuote(quote.id);
                                }} 
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer" 
                                title="Excluir Orçamento"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                          Nenhum orçamento salvo encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
              <button
                onClick={() => setIsSavedQuotesModalOpen(false)}
                className="px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Quotes History Modal in Quotes tab */}
      {isClientHistoryModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-sky-100 text-sky-700 rounded-xl shrink-0 mt-0.5">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                      Cód: {selectedClient.code || 'N/A'}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900">{selectedClient.name}</h2>
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
                      selectedClient.type === 'physical' ? 'bg-[--color-primary-100] text-[--color-primary-800]' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {selectedClient.type === 'physical' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedClient.phone && <span>Tel: {selectedClient.phone} • </span>}
                    {selectedClient.cpf && <span>CPF: {selectedClient.cpf} • </span>}
                    {selectedClient.cnpj && <span>CNPJ: {selectedClient.cnpj} • </span>}
                    <span>{selectedClientQuotes.length} orçamento(s) registrado(s) para este cliente</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsClientHistoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quotes List Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-grow bg-slate-50/50">
              {selectedClientQuotes.length > 0 ? (
                selectedClientQuotes.map((quote) => {
                  const quoteNumberFormatted = quote.number 
                    ? `Nº ${String(quote.number).padStart(4, '0')}` 
                    : 'Sem número';

                  return (
                    <div 
                      key={quote.id} 
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-sky-300 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="bg-sky-100 text-sky-800 font-mono font-bold text-xs px-2.5 py-1 rounded-md border border-sky-200">
                            Orçamento {quoteNumberFormatted}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDateDisplay(quote.createdAt)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-500 mr-1.5">Total:</span>
                          <span className="text-base font-extrabold text-emerald-700">
                            R$ {quote.finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-100 bg-slate-50/50">
                              <th className="py-1 px-2 font-medium w-16 text-center">Quant.</th>
                              <th className="py-1 px-2 font-medium">Item / Descrição</th>
                              <th className="py-1 px-2 font-medium w-24 text-right">Unitário</th>
                              <th className="py-1 px-2 font-medium w-24 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {quote.items.map((item, idx) => (
                              <tr key={`client-modal-item-${idx}`} className="hover:bg-slate-50/70">
                                <td className="py-1.5 px-2 text-center font-bold text-slate-700">{item.quantity}</td>
                                <td className="py-1.5 px-2 font-medium text-slate-800">
                                  {item.product.name}
                                  {item.product.code && <span className="text-[10px] text-slate-400 font-mono ml-1.5">({item.product.code})</span>}
                                </td>
                                <td className="py-1.5 px-2 text-right text-slate-600">
                                  R$ {item.product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-1.5 px-2 text-right font-semibold text-slate-900">
                                  R$ {(item.product.sellPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Card actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {quote.items.length} item(s) incluído(s)
                        </span>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              loadQuoteIntoEditor(quote);
                              setIsClientHistoryModalOpen(false);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-700 text-white transition-colors cursor-pointer"
                            title="Carregar este orçamento para edição/visualização"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Carregar Orçamento</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintSavedQuote(quote)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                          >
                            <PrinterIcon className="w-3.5 h-3.5 text-slate-600" />
                            <span>Imprimir</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleGeneratePdfFromSaved(quote)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800 transition-colors cursor-pointer"
                          >
                            <FileDownIcon className="w-3.5 h-3.5 text-orange-700" />
                            <span>PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(quote)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-700" />
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-6 space-y-2">
                  <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-slate-600 font-medium">Nenhum orçamento emitido para este cliente ainda.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                {selectedClientQuotes.length} orçamento(s) encontrado(s)
              </span>

              <button
                type="button"
                onClick={() => setIsClientHistoryModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Div for Saved Quote PDF Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px' }}>
        <div ref={printRef} style={{ width: '800px', backgroundColor: '#ffffff' }}></div>
      </div>
    </div>
    </div>
  );
};

export default Quotes;
