
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


interface QuotesProps {
  clients: Client[];
  products: Product[];
  logo: string | null;
  quoteSettings: QuoteSettings;
  saveQuote: (quoteData: Omit<SavedQuote, 'id'>) => void;
  quoteToEdit: SavedQuote | null;
  clearQuoteToEdit: () => void;
  savedQuotes: SavedQuote[];
  deleteQuote: (id: string) => void;
  editQuote: (id: string) => void;
  companyInfo: CompanyInfo | null;
}

const Quotes: React.FC<QuotesProps> = ({ 
  clients, products, logo, quoteSettings, saveQuote, quoteToEdit, clearQuoteToEdit,
  savedQuotes, deleteQuote, editQuote, companyInfo 
}) => {
  // State for new quote
  const [selectedClientId, setSelectedClientId] = useState<string>('');
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
            quoteItems: quoteItems.map(i => ({
                ...i,
                product: {
                    ...i.product,
                    image: i.product.image && i.product.image.length > 50000 ? undefined : i.product.image
                }
            })),
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
  
  // Filter lists for dropdowns
  const productList = useMemo(() => products.filter(p => p.type !== 'service'), [products]);
  const serviceList = useMemo(() => products.filter(p => p.type === 'service'), [products]);

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

        const existingItemIndex = quoteItems.findIndex(item => item.product.id === itemId);
        if(existingItemIndex !== -1){
            const updatedItems = [...quoteItems];
            updatedItems[existingItemIndex].quantity += qty;
            setQuoteItems(updatedItems);
        } else {
            setQuoteItems([...quoteItems, { product: productToAdd, quantity: qty }]);
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
      if (window.confirm(`Tem certeza que deseja excluir o orçamento Nº ${String(targetQuote.number || 1).padStart(4, '0')}?`)) {
        deleteQuote(targetQuote.id);
        handleIncluir();
      }
    } else if (quoteItems.length > 0 || selectedClientId) {
      if (window.confirm("Deseja apagar as informações do orçamento atual?")) {
        handleIncluir();
      }
    }
  };

  const handlePesquisar = () => {
    setIsSavedQuotesModalOpen(true);
  };

  const clearQuoteForm = () => {
    if (quoteItems.length > 0 || selectedClientId || notes !== (quoteSettings.defaultNotes || '')) {
      if (window.confirm('Tem certeza que deseja limpar o orçamento atual? Todas as informações não salvas serão perdidas.')) {
        handleIncluir();
      }
    }
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

  const tableCols = 3 + (quoteSettings.showProductCode ? 1 : 0) + (quoteSettings.showProductSector ? 1 : 0) + (quoteSettings.showProductImage ? 1 : 0);

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
        quote.items.some(i => i.product.name.toLowerCase().includes(searchLower) || (i.product.code && i.product.code.toLowerCase().includes(searchLower)))
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
    const quoteNumText = quote.number 
      ? `Nº ${String(quote.number).padStart(4, '0')}` 
      : (quoteSettings.enableSequentialNumber !== false ? `Nº ${String(quoteSettings.nextQuoteNumber || 1).padStart(4, '0')}` : '');

    const formattedDate = formatDateTime(quote.createdAt);

    const itemsRows = quote.items.map(item => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 4px 6px; text-align: center; font-size: 12px;">${item.quantity}</td>
        ${quoteSettings.showProductCode ? `<td style="padding: 4px 6px; font-size: 12px; color: #475569;">${item.product.code || '-'}</td>` : ''}
        ${quoteSettings.showProductSector ? `<td style="padding: 4px 6px; font-size: 12px; color: #475569;">${item.product.sector || '-'}</td>` : ''}
        <td style="padding: 4px 6px; font-size: 12px;">${item.product.name}</td>
        <td style="padding: 4px 6px; text-align: right; font-size: 12px;">${item.product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 4px 6px; text-align: right; font-size: 12px;">${(item.product.sellPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const subtotalVal = quote.subtotal || (quote.finalTotal + (quote.discountAmount || 0));
    const discountVal = quote.discountAmount || 0;
    const formattedSubtotal = subtotalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedDiscount = discountVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedTotal = quote.finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const discountLabel = quote.discountType === 'percent' && parseFloat(quote.discount || '0') > 0
      ? `Desconto (${quote.discount}%)`
      : 'Desconto';

    let headerHtml = '';
    if (quoteSettings.text) {
      headerHtml = `
        <div style="white-space: pre-wrap; line-height: 1.25; color: #0f172a; font-family: ${quoteSettings.fontFamily || 'sans-serif'}; text-align: ${quoteSettings.textAlign || 'center'}; font-size: ${quoteSettings.fontSize ? quoteSettings.fontSize + 'px' : '12px'};">
          ${quoteSettings.text}
        </div>
      `;
    } else if (companyInfo?.name) {
      headerHtml = `
        <div style="text-align: center; font-size: 11px; line-height: 1.25; color: #0f172a; font-family: sans-serif;">
          <div style="font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 0.025em; margin-bottom: 2px;">-- ${companyInfo.name.toUpperCase()} --</div>
          ${companyInfo.address ? `<div>${companyInfo.address}</div>` : ''}
          ${companyInfo.phone ? `<div>${companyInfo.phone}</div>` : ''}
          ${companyInfo.email ? `<div>${companyInfo.email}</div>` : ''}
          ${(companyInfo.zipCode || companyInfo.city) ? `<div>CEP ${companyInfo.zipCode || ''} ${companyInfo.city ? '- ' + companyInfo.city : ''}</div>` : ''}
          ${companyInfo.cnpj ? `<div>CNPJ: ${companyInfo.cnpj}</div>` : ''}
        </div>
      `;
    }

    return `
      <div style="padding: 24px; font-family: sans-serif; font-size: 12px; color: #0f172a; background: #ffffff; width: 800px; box-sizing: border-box;">
        <!-- Header -->
        <div style="position: relative; margin-bottom: 8px; min-height: 60px;">
          ${logo ? `<div style="position: absolute; left: 0; top: 0;"><img src="${logo}" alt="Logo" style="max-height: 56px; max-width: 120px; object-fit: contain;"/></div>` : ''}
          ${headerHtml}
        </div>

        <!-- Document Title -->
        <div style="text-align: center; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 12px; margin-bottom: 12px; color: #0f172a;">
          ORÇAMENTO
        </div>

        <!-- Client Data -->
        <div style="font-size: 12px; line-height: 1.5; margin-bottom: 12px; color: #0f172a;">
          <div><strong>Para :</strong> ${quote.client.name}</div>
          ${quote.client.address ? `<div><strong>End. :</strong> ${quote.client.address}${quote.client.city ? ' - ' + quote.client.city : ''}${quote.client.zipCode ? ' - CEP ' + quote.client.zipCode : ''}</div>` : ''}
          ${quote.client.phone ? `<div><strong>Tel. :</strong> ${quote.client.phone}</div>` : ''}
          ${quote.client.type === 'juridical' && quote.client.cnpj ? `<div><strong>CNPJ :</strong> ${quote.client.cnpj}</div>` : (quote.client.cpf ? `<div><strong>CPF :</strong> ${quote.client.cpf}</div>` : '')}
        </div>

        <!-- Quote Info & Page/Via -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; font-size: 12px; margin-bottom: 12px; color: #0f172a;">
          <div>
            <div><strong>Orçamento</strong> ${quoteNumText}</div>
            <div>${formattedDate}</div>
          </div>
          <div style="text-align: right;">
            <div>Página 1</div>
            <div>Via 1</div>
          </div>
        </div>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px;">
          <thead>
            <tr style="border-top: 1px solid #334155; border-bottom: 1px solid #334155; text-align: left;">
              <th style="padding: 4px 6px; width: 64px; font-weight: normal; color: #0f172a;">Quantidade</th>
              ${quoteSettings.showProductCode ? '<th style="padding: 4px 6px; width: 112px; font-weight: normal; color: #0f172a;">Código</th>' : ''}
              ${quoteSettings.showProductSector ? '<th style="padding: 4px 6px; width: 80px; font-weight: normal; color: #0f172a;">Setor</th>' : ''}
              <th style="padding: 4px 6px; font-weight: normal; color: #0f172a;">Descrição</th>
              <th style="padding: 4px 6px; width: 96px; text-align: right; font-weight: normal; color: #0f172a;">Valor Unitário</th>
              <th style="padding: 4px 6px; width: 96px; text-align: right; font-weight: normal; color: #0f172a;">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Total & Notes Footer -->
        <div style="border-top: 1px solid #334155; padding-top: 8px; font-size: 12px; color: #0f172a;">
          ${discountVal > 0 ? `
            <div style="text-align: right; margin-bottom: 2px; color: #475569;">
              Subtotal &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; R$ ${formattedSubtotal}
            </div>
            <div style="text-align: right; margin-bottom: 4px; color: #dc2626; font-weight: 500;">
              ${discountLabel} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - R$ ${formattedDiscount}
            </div>
            <div style="text-align: right; font-weight: bold; font-size: 14px; margin-bottom: 12px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
              Total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; R$ ${formattedTotal}
            </div>
          ` : `
            <div style="text-align: right; font-weight: bold; font-size: 14px; margin-bottom: 12px;">
              Total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; R$ ${formattedTotal}
            </div>
          `}
          ${quote.notes ? `
            <div style="margin-top: 4px;">
              <div style="white-space: pre-wrap; font-size: 12px; color: #334155;">${quote.notes}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  const handlePrintSavedQuote = (quote: SavedQuote) => {
    const printContent = generateQuoteHTML(quote);
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = `<style> body { font-family: sans-serif; margin: 0; padding: 0; } </style>` + printContent;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };
  
  const handleSendWhatsApp = (quote: SavedQuote) => {
    let phone = quote.client.phone.replace(/\D/g, '');
    if (!phone) {
        alert("O cliente não possui um número de telefone cadastrado.");
        return;
    }
    // Simple heuristic for Brazil: if 10 or 11 digits, add 55.
    if (phone.length >= 10 && phone.length <= 11) {
        phone = '55' + phone;
    }

    const quoteNumText = quote.number ? `Nº ${String(quote.number).padStart(4, '0')} ` : '';
    let message = `Olá *${quote.client.name}*, aqui está o resumo do seu orçamento ${quoteNumText}(${formatDateTime(quote.createdAt)}):\n\n`;

    quote.items.forEach(item => {
        const totalItem = (item.quantity * item.product.sellPrice).toFixed(2);
        message += `• ${item.quantity}x ${item.product.name}: R$ ${totalItem}\n`;
    });

    if (quote.discountAmount > 0) {
         message += `\nSubtotal: R$ ${quote.subtotal.toFixed(2)}`;
         message += `\nDesconto: - R$ ${quote.discountAmount.toFixed(2)}`;
    }

    message += `\n*Total: R$ ${quote.finalTotal.toFixed(2)}*`;

    if (companyInfo?.name) {
        message += `\n\nAtt, *${companyInfo.name}*`;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleGeneratePdfFromSaved = async (quote: SavedQuote) => {
    const input = printRef.current;
    // @ts-ignore
    if (!input || !window.html2canvas || !window.jspdf) {
        alert("Erro ao carregar recursos para gerar PDF. Tente novamente.");
        return;
    }
    input.innerHTML = generateQuoteHTML(quote);

    try {
        // @ts-ignore
        const canvas = await window.html2canvas(input, { scale: 2, useCORS: true, logging: false });
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

        const clientName = quote.client.name.replace(/\s+/g, '_');
        const date = new Date(quote.createdAt).toISOString().slice(0, 10);
        pdf.save(`Orcamento-${clientName}-${date}.pdf`);

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF.");
    } finally {
        input.innerHTML = '';
    }
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
                <select 
                    value={selectedClientId} 
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
                >
                    <option value="">Selecione um cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code ? `[${c.code}] ${c.name}` : c.name}
                      </option>
                    ))}
                </select>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Adicionar Produto</h3>
                <div className="space-y-3">
                    <select 
                        value={selectedProductId} 
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
                    >
                        <option value="">Selecione um produto...</option>
                        {productList.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.code} - {p.name} (R$ {p.sellPrice.toFixed(2)})
                            </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            min="1" 
                            value={productQuantity} 
                            onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
                            className="w-20 border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
                        />
                        <button 
                            onClick={() => handleAddItem(selectedProductId, productQuantity, 'product')}
                            className="flex-grow bg-[--color-primary-600] text-white rounded-md py-2 hover:bg-[--color-primary-700]"
                        >
                            Adicionar
                        </button>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Adicionar Serviço</h3>
                 <div className="space-y-3">
                    <select 
                        value={selectedServiceId} 
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                        className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
                    >
                        <option value="">Selecione um serviço...</option>
                        {serviceList.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.code} - {s.name} (R$ {s.sellPrice.toFixed(2)})
                            </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            min="1" 
                            value={serviceQuantity} 
                            onChange={(e) => setServiceQuantity(parseInt(e.target.value) || 1)}
                            className="w-20 border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
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
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
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

                  {/* Client Data */}
                  <div className="text-xs leading-normal mb-3 text-slate-900">
                      {selectedClient ? (
                          <>
                              <div><strong>Para :</strong> {selectedClient.name}</div>
                              {selectedClient.address && <div><strong>End. :</strong> {selectedClient.address}{selectedClient.city ? ` - ${selectedClient.city}` : ''}{selectedClient.zipCode ? ` - CEP ${selectedClient.zipCode}` : ''}</div>}
                              {selectedClient.phone && <div><strong>Tel. :</strong> {selectedClient.phone}</div>}
                              {selectedClient.type === 'juridical' && selectedClient.cnpj ? (
                                  <div><strong>CNPJ :</strong> {selectedClient.cnpj}</div>
                              ) : (selectedClient.cpf ? (
                                  <div><strong>CPF :</strong> {selectedClient.cpf}</div>
                              ) : null)}
                          </>
                      ) : (
                          <div className="text-slate-400 italic">Nenhum cliente selecionado</div>
                      )}
                  </div>

                  {/* Quote Number & Date & Page */}
                  <div className="flex justify-between items-start text-xs mb-3 text-slate-900">
                      <div>
                          <div><strong>Orçamento</strong> {currentDisplayNumber !== undefined ? `Nº ${String(currentDisplayNumber).padStart(4, '0')}` : ''}</div>
                          <div className="print-hidden flex items-center gap-1.5 mt-0.5">
                              <input 
                                  type="date" 
                                  id="quoteDateDisplay"
                                  value={quoteDate}
                                  onChange={(e) => setQuoteDate(e.target.value)}
                                  className="text-slate-800 border-b border-slate-300 focus:border-[--color-primary-500] focus:outline-none text-xs bg-transparent"
                              />
                              <input 
                                  type="time" 
                                  id="quoteTimeDisplay"
                                  value={quoteTime}
                                  onChange={(e) => setQuoteTime(e.target.value)}
                                  className="text-slate-800 border-b border-slate-300 focus:border-[--color-primary-500] focus:outline-none text-xs bg-transparent"
                              />
                          </div>
                          <span className="hidden print-visible-inline">{formatDateDisplay(quoteDate, quoteTime)}</span>
                      </div>
                      <div className="text-right">
                          <div>Página 1</div>
                          <div>Via 1</div>
                      </div>
                  </div>

                                   {/* Table */}
                  <table className="w-full text-xs mb-2 border-collapse">
                      <thead>
                          <tr className="border-y border-slate-700 text-left text-slate-900 font-normal">
                              <th className="py-1 px-1.5 w-16">Quantidade</th>
                              {quoteSettings.showProductCode && <th className="py-1 px-1.5 w-28">Código</th>}
                              {quoteSettings.showProductSector && <th className="py-1 px-1.5 w-20">Setor</th>}
                              <th className="py-1 px-1.5">Descrição</th>
                              <th className="py-1 px-1.5 w-24 text-right">Valor Unitário</th>
                              <th className="py-1 px-1.5 w-24 text-right">Valor Total</th>
                              <th className="py-1 px-1.5 w-8 print-hidden"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                          {productItems.map((item, idx) => (
                              <tr key={`prod-${idx}`}>
                                  <td className="py-1 px-1.5 text-center">
                                      <input 
                                         type="number" 
                                         min="1"
                                         value={item.quantity}
                                         onChange={(e) => handleUpdateQuantity(item.product.id, parseInt(e.target.value))}
                                         className="w-10 bg-transparent border-b border-slate-200 hover:border-slate-400 focus:border-[--color-primary-500] focus:outline-none text-center print-hidden"
                                      />
                                      <span className="hidden print-visible-inline">{item.quantity}</span>
                                  </td>
                                  {quoteSettings.showProductCode && <td className="py-1 px-1.5 text-slate-600">{item.product.code || '-'}</td>}
                                  {quoteSettings.showProductSector && <td className="py-1 px-1.5 text-slate-600">{item.product.sector || '-'}</td>}
                                  <td className="py-1 px-1.5">{item.product.name}</td>
                                  <td className="py-1 px-1.5 text-right">{item.product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="py-1 px-1.5 text-right">{ (item.product.sellPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }</td>
                                  <td className="py-1 px-1.5 text-center print-hidden">
                                      <button onClick={() => handleRemoveItem(item.product.id)} className="text-slate-400 hover:text-[--color-destructive-500]">
                                          <TrashIcon className="h-3.5 w-3.5" />
                                      </button>
                                  </td>
                              </tr>
                          ))}

                          {serviceItems.map((item, idx) => (
                              <tr key={`serv-${idx}`}>
                                  <td className="py-1 px-1.5 text-center">
                                      <input 
                                         type="number" 
                                         min="1"
                                         value={item.quantity}
                                         onChange={(e) => handleUpdateQuantity(item.product.id, parseInt(e.target.value))}
                                         className="w-10 bg-transparent border-b border-slate-200 hover:border-slate-400 focus:border-[--color-primary-500] focus:outline-none text-center print-hidden"
                                      />
                                      <span className="hidden print-visible-inline">{item.quantity}</span>
                                  </td>
                                  {quoteSettings.showProductCode && <td className="py-1 px-1.5 text-slate-600">{item.product.code || '-'}</td>}
                                  {quoteSettings.showProductSector && <td className="py-1 px-1.5 text-slate-600">{item.product.sector || '-'}</td>}
                                  <td className="py-1 px-1.5">{item.product.name}</td>
                                  <td className="py-1 px-1.5 text-right">{item.product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="py-1 px-1.5 text-right">{ (item.product.sellPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }</td>
                                  <td className="py-1 px-1.5 text-center print-hidden">
                                      <button onClick={() => handleRemoveItem(item.product.id)} className="text-slate-400 hover:text-[--color-destructive-500]">
                                          <TrashIcon className="h-3.5 w-3.5" />
                                      </button>
                                  </td>
                              </tr>
                          ))}

                          {quoteItems.length === 0 && (
                              <tr>
                                  <td colSpan={quoteSettings.showProductCode ? 6 : 5} className="py-8 text-center text-slate-400 italic">
                                      Adicione produtos ou serviços para começar o orçamento
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>

                  {/* Total & Notes Footer */}
                  <div className="border-t border-slate-700 pt-2 text-xs text-slate-900">
                      {discountAmount > 0 ? (
                          <div className="text-right space-y-1 mb-3">
                              <div className="text-slate-600">
                                  Subtotal &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-red-600 font-medium">
                                  Desconto{discountType === 'percent' && parseFloat(discount) > 0 ? ` (${discount}%)` : ''} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="font-bold text-sm text-slate-900 pt-1 border-t border-slate-200 inline-block">
                                  Total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                          </div>
                      ) : (
                          <div className="text-right font-bold text-sm mb-3">
                              Total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                      )}
                      {notes ? (
                          <div className="mt-1">
                              <div className="text-slate-700 whitespace-pre-wrap">{notes}</div>
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
                          onClick={() => deleteQuote(quote.id)} 
                          className="p-1.5 text-red-600 hover:text-red-800 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors cursor-pointer" 
                          title="Excluir"
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
                              <button onClick={() => deleteQuote(quote.id)} className="p-1 text-[--color-destructive-600] hover:text-[--color-destructive-800] transition-colors cursor-pointer" title="Excluir">
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

      {/* Hidden Div for Saved Quote PDF Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px' }}>
        <div ref={printRef} style={{ width: '800px', backgroundColor: '#ffffff' }}></div>
      </div>
    </div>
    </div>
  );
};

export default Quotes;
