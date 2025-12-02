
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Client, Product, QuoteItem, QuoteSettings, SavedQuote, CompanyInfo } from '../types';
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


  // State and refs for saved quotes list
  const [nameFilter, setNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [valueFilter, setValueFilter] = useState('');
  const printRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (localStorage.getItem('quoteDraft')) {
      setDraftExists(true);
    }
  }, []);
  
  // Any change to the quote marks it as "unsaved"
  useEffect(() => {
    setIsCurrentQuoteSaved(false);
  }, [selectedClientId, quoteItems, notes, discount, discountType, quoteDate]);


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
            quoteDate
        };
        localStorage.setItem('quoteDraft', JSON.stringify(draft));
        setDraftExists(true);
        setAutoSaveStatus('saved');
        
        setTimeout(() => setAutoSaveStatus(''), 2000);

    }, 1000);

    return () => {
        clearTimeout(handler);
    };
  }, [selectedClientId, quoteItems, notes, discount, discountType, quoteDate, quoteSettings.autoSave]);

  useEffect(() => {
    if (quoteToEdit) {
      setSelectedClientId(quoteToEdit.client?.id ?? '');
      setQuoteItems(quoteToEdit.items ?? []);
      setNotes(quoteToEdit.notes ?? quoteSettings.defaultNotes ?? '');
      setDiscount(quoteToEdit.discount ?? '0');
      setDiscountType(quoteToEdit.discountType ?? 'fixed');
      if (quoteToEdit.createdAt) {
        setQuoteDate(quoteToEdit.createdAt.split('T')[0]);
      }
      clearQuoteToEdit();
      alert('Orçamento carregado para edição. Faça suas alterações e salve-o como um novo orçamento.');
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
    if (!quoteSettings.showDiscount) return 0;
    const numericDiscount = parseFloat(discount) || 0;
    if (discountType === 'percent') {
      return (subtotal * numericDiscount) / 100;
    }
    return numericDiscount > subtotal ? subtotal : numericDiscount;
  }, [subtotal, discount, discountType, quoteSettings.showDiscount]);

  const finalTotal = useMemo(() => {
    return subtotal - discountAmount;
  }, [subtotal, discountAmount]);

  const clearQuoteForm = () => {
    if (quoteItems.length > 0 || selectedClientId || notes !== (quoteSettings.defaultNotes || '')) {
      if (window.confirm('Tem certeza que deseja limpar o orçamento atual? Todas as informações não salvas serão perdidas.')) {
        setSelectedClientId('');
        setQuoteItems([]);
        setNotes(quoteSettings.defaultNotes || '');
        setDiscount('0');
        setDiscountType('fixed');
        setQuoteDate(() => {
            const d = new Date();
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        });
        localStorage.removeItem('quoteDraft');
        setDraftExists(false);
        setIsCurrentQuoteSaved(false);
      }
    }
  };

  const saveCurrentQuote = (): boolean => {
    if (isCurrentQuoteSaved) {
        return true;
    }

    if (!selectedClient) {
        alert('Por favor, selecione um cliente para imprimir ou gerar o PDF.');
        return false;
    }
    if (quoteItems.length === 0) {
        alert('Adicione pelo menos um item ao orçamento para imprimir ou gerar o PDF.');
        return false;
    }

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
        createdAt: new Date(quoteDate).toISOString(), // Use the selected date
    };

    saveQuote(quoteToSave);
    setIsCurrentQuoteSaved(true);
    return true;
  };

  const handlePrint = () => {
    if (!saveCurrentQuote()) {
        return;
    }
    const printContent = quoteRef.current;
    if (printContent) {
        const originalContents = document.body.innerHTML;
        const printHtml = printContent.innerHTML;
        document.body.innerHTML = `<style>
            body { font-family: sans-serif; }
            .quote-print { padding: 2rem; }
            .quote-print h1, .quote-print h2, .quote-print h3 { color: #1e293b; }
            .quote-print table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            .quote-print th, .quote-print td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: middle; }
            .quote-print th { background-color: #f8fafc; }
            .quote-print .total-row { font-weight: bold; font-size: 1.2rem; }
            .quote-print .notes-section { margin-top: 2rem; padding: 1rem; border-top: 1px solid #e2e8f0; }
            .quote-print .notes-section p { white-space: pre-wrap; }
            .print-hidden { display: none !important; }
            .print-visible-row { display: table-row !important; }
            .print-visible-inline { display: inline !important; }
            .print-date-display { display: inline !important; }
         </style>` + printHtml;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload();
    }
  };

  const handleExportPDF = async () => {
    if (!saveCurrentQuote()) {
        return;
    }

    const input = quoteRef.current;
    // @ts-ignore
    if (!input || !window.html2canvas || !window.jspdf) {
        alert("Erro ao carregar recursos para gerar PDF. Tente novamente.");
        console.error("jsPDF or html2canvas not found on window object.");
        return;
    }

    const elementsToHide = Array.from(input.querySelectorAll('.print-hidden')) as HTMLElement[];
    const elementsToShowRows = Array.from(input.querySelectorAll('.print-visible-row')) as HTMLElement[];
    const elementsToShowInline = Array.from(input.querySelectorAll('.print-visible-inline')) as HTMLElement[];
    const elementsDateDisplay = Array.from(input.querySelectorAll('.print-date-display')) as HTMLElement[];

    elementsToHide.forEach(el => el.style.setProperty('display', 'none', 'important'));
    elementsToShowRows.forEach(el => el.style.setProperty('display', 'table-row', 'important'));
    elementsToShowInline.forEach(el => el.style.setProperty('display', 'inline', 'important'));
    elementsDateDisplay.forEach(el => el.style.setProperty('display', 'inline', 'important'));

    try {
        // @ts-ignore
        const canvas = await window.html2canvas(input, {
            scale: 2,
            useCORS: true,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        // @ts-ignore
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

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

        const clientName = selectedClient ? selectedClient.name.replace(/\s+/g, '_') : 'cliente';
        const date = quoteDate;
        pdf.save(`Orcamento-${clientName}-${date}.pdf`);

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF.");
    } finally {
        elementsToHide.forEach(el => el.style.display = '');
        elementsToShowRows.forEach(el => el.style.display = '');
        elementsToShowInline.forEach(el => el.style.display = '');
        elementsDateDisplay.forEach(el => el.style.display = 'none');
    }
  };
  
  const formatDateDisplay = (dateString: string) => {
      if (!dateString) return '';
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
  };

  const tableCols = 3 + (quoteSettings.showProductCode ? 1 : 0) + (quoteSettings.showProductSector ? 1 : 0) + (quoteSettings.showProductImage ? 1 : 0);

  // --- Logic from SavedQuotes component ---

  const filteredSavedQuotes = useMemo(() => {
    return savedQuotes.filter(quote => {
      const nameMatch = nameFilter ? quote.client.name.toLowerCase().includes(nameFilter.toLowerCase()) : true;
      const dateMatch = dateFilter ? new Date(quote.createdAt).toLocaleDateString('pt-BR').includes(dateFilter) : true;
      const valueMatch = valueFilter ? String(quote.finalTotal).includes(valueFilter) : true;
      return nameMatch && dateMatch && valueMatch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [savedQuotes, nameFilter, dateFilter, valueFilter]);

  const generateQuoteHTML = (quote: SavedQuote): string => {
    const tableCols = 2 + (quoteSettings.showProductCode ? 1 : 0) + (quoteSettings.showProductSector ? 1 : 0) + (quoteSettings.showProductImage ? 1 : 0) + 2;
    
    const productItems = quote.items.filter(i => i.product.type !== 'service');
    const serviceItems = quote.items.filter(i => i.product.type === 'service');
    const hasProducts = productItems.length > 0;
    const hasServices = serviceItems.length > 0;
    
    // Adjust to display the saved date correctly
    const displayDate = new Date(quote.createdAt).toLocaleDateString('pt-BR');

    const headerLeft = `
      <div style="display: flex; align-items: flex-start; flex-grow: 1;">
          ${logo ? `<img src="${logo}" alt="Logotipo" style="max-height: 60px; max-width: 150px; margin-right: 1.5rem;"/>` : ''}
      </div>
    `;

    // Compact styles for rows
    const renderRows = (items: QuoteItem[]) => items.map(item => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 0.3rem 0.5rem; font-size: 0.85rem; color: #334155;">${item.quantity}</td>
            ${quoteSettings.showProductImage ? `<td style="padding: 0.3rem 0.5rem;">${item.product.image ? `<img src="${item.product.image}" style="max-width: 35px; max-height: 35px; object-fit: cover; border-radius: 4px;" />` : '-'}</td>` : ''}
            ${quoteSettings.showProductCode ? `<td style="padding: 0.3rem 0.5rem; font-size: 0.85rem; color: #334155;">${item.product.code}</td>` : ''}
            ${quoteSettings.showProductSector ? `<td style="padding: 0.3rem 0.5rem; font-size: 0.85rem; color: #334155;">${item.product.sector || '-'}</td>` : ''}
            <td style="padding: 0.3rem 0.5rem; font-size: 0.85rem; color: #1e293b;">
            ${item.product.name.charAt(0).toUpperCase() + item.product.name.slice(1).toLowerCase()}
            ${item.product.type === 'service' ? '<span style="font-size: 0.7rem; background-color: #e0f2fe; color: #0369a1; padding: 1px 5px; border-radius: 9999px; margin-left: 6px; display: inline-block;">Serviço</span>' : ''}
            </td>
            <td style="padding: 0.3rem 0.5rem; font-size: 0.85rem; color: #334155;">R$ ${item.product.sellPrice.toFixed(2)}</td>
            <td style="padding: 0.3rem 0.5rem; font-size: 0.85rem; color: #334155;">R$ ${(item.product.sellPrice * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');

    let tableBodyContent = '';
    if (hasProducts) {
        tableBodyContent += renderRows(productItems);
    }
    
    if (hasProducts && hasServices) {
        tableBodyContent += `
            <tr style="background-color: #f8fafc;">
                <td colspan="${tableCols}" style="padding: 0.3rem; text-align: center; font-size: 0.8rem; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">--- Mão de Obra / Serviços ---</td>
            </tr>
        `;
    }

    if (hasServices) {
        tableBodyContent += renderRows(serviceItems);
    }

    return `
      <div class="p-8 font-sans" style="padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0;">
          ${headerLeft}
          <div style="text-align: right; flex-shrink: 0; margin-left: 2rem;">
              <h2 style="font-size: 2rem; font-weight: bold; color: #1e293b; margin: 0;">Orçamento</h2>
              <p style="font-size: 0.875rem; color: #64748b; margin-top: 0.1rem;">
                  Data: ${displayDate}
              </p>
          </div>
        </div>
        ${quoteSettings.text ? `
          <div
              style="margin-bottom: 1.5rem; white-space: pre-wrap; color: #475569; font-family: ${quoteSettings.fontFamily}; text-align: ${quoteSettings.textAlign}; font-size: ${quoteSettings.fontSize}px;"
          >
              ${quoteSettings.text.replace(/\n/g, '<br>')}
          </div>
        ` : ''}
        <div style="margin-bottom: 1.5rem; padding: 0.5rem; border: 1px solid #e2e8f0; background-color: #f8fafc; border-radius: 0.5rem;">
          <h3 style="font-size: 1.1rem; font-weight: 600; color: #334155; margin-bottom: 0.25rem;">Cliente:</h3>
          <p style="color: #475569; font-size: 0.9rem; margin-bottom: 0.2rem;"><strong>Nome:</strong> ${quote.client.name}</p>
          ${quote.client.cpf ? `<p style="color: #475569; font-size: 0.9rem; margin-bottom: 0.2rem;"><strong>CPF:</strong> ${quote.client.cpf}</p>` : ''}
          ${quote.client.cnpj ? `<p style="color: #475569; font-size: 0.9rem; margin-bottom: 0.2rem;"><strong>CNPJ:</strong> ${quote.client.cnpj}</p>` : ''}
          ${quote.client.stateRegistration ? `<p style="color: #475569; font-size: 0.9rem; margin-bottom: 0.2rem;"><strong>Inscrição Estadual:</strong> ${quote.client.stateRegistration}</p>` : ''}
          <p style="color: #475569; font-size: 0.9rem; margin-bottom: 0.2rem;"><strong>Endereço:</strong> ${quote.client.address}, ${quote.client.city} - ${quote.client.zipCode}</p>
          <p style="color: #475569; font-size: 0.9rem; margin-bottom: 0.2rem;"><strong>Telefone:</strong> ${quote.client.phone}</p>
        </div>
        <div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
            <thead style="background-color: #f1f5f9;">
              <tr>
                <th style="padding: 0.4rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase;">Qtd.</th>
                ${quoteSettings.showProductImage ? '<th style="padding: 0.4rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase;">Imagem</th>' : ''}
                ${quoteSettings.showProductCode ? '<th style="padding: 0.4rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase;">Código</th>' : ''}
                ${quoteSettings.showProductSector ? '<th style="padding: 0.4rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase;">Setor</th>' : ''}
                <th style="padding: 0.4rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase;">Item</th>
                <th style="padding: 0.4rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase;">Preço Unit.</th>
                <th style="padding: 0.4rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase;">Preço Total</th>
              </tr>
            </thead>
            <tbody style="background-color: white; border-top: 1px solid #e2e8f0;">
              ${tableBodyContent}
            </tbody>
            <tfoot>
               ${(quote.productsSubtotal ?? 0) > 0 && (quote.servicesSubtotal ?? 0) > 0 ? `
                <tr>
                  <td colspan="${tableCols - 1}" style="padding: 0.3rem 0.5rem; text-align: right; font-size: 0.85rem; font-weight: 500; color: #475569;">Subtotal Produtos</td>
                  <td style="padding: 0.3rem 0.5rem; text-align: left; font-size: 0.85rem; font-weight: 500; color: #475569;">R$ ${(quote.productsSubtotal ?? 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="${tableCols - 1}" style="padding: 0.3rem 0.5rem; text-align: right; font-size: 0.85rem; font-weight: 500; color: #475569;">Subtotal Mão de Obra</td>
                  <td style="padding: 0.3rem 0.5rem; text-align: left; font-size: 0.85rem; font-weight: 500; color: #475569;">R$ ${(quote.servicesSubtotal ?? 0).toFixed(2)}</td>
                </tr>
              ` : ''}
              ${quoteSettings.showDiscount ? `
                <tr>
                  <td colspan="${tableCols - 1}" style="padding: 0.3rem 0.5rem; text-align: right; font-size: 0.9rem; font-weight: 500; color: #475569;">Subtotal Geral</td>
                  <td style="padding: 0.3rem 0.5rem; text-align: left; font-size: 0.9rem; font-weight: 500; color: #475569;">R$ ${quote.subtotal.toFixed(2)}</td>
                </tr>
              ` : ''}
              ${quoteSettings.showDiscount && quote.discountAmount > 0 ? `
                <tr>
                  <td colspan="${tableCols - 1}" style="padding: 0.3rem 0.5rem; text-align: right; font-size: 0.9rem; font-weight: 500; color: #dc2626;">Desconto</td>
                  <td style="padding: 0.3rem 0.5rem; text-align: left; font-size: 0.9rem; font-weight: 500; color: #dc2626;">- R$ ${quote.discountAmount.toFixed(2)}</td>
                </tr>
              ` : ''}
              <tr style="background-color: #f1f5f9;">
                <td colspan="${tableCols - 1}" style="padding: 0.5rem; text-align: right; font-size: 1.1rem; font-weight: bold; color: #1e293b;">Total</td>
                <td style="padding: 0.5rem; text-align: left; font-size: 1.1rem; font-weight: bold; color: #1e293b;">R$ ${quote.finalTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        ${quote.notes ? `
          <div style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0;">
            <h3 style="font-size: 1rem; font-weight: 600; color: #334155; margin-bottom: 0.25rem;">Observações:</h3>
            <p style="color: #475569; white-space: pre-wrap; font-size: 0.9rem;">${quote.notes}</p>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  const handlePrintSavedQuote = (quote: SavedQuote) => {
    const printContent = generateQuoteHTML(quote);
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = `<style> body { font-family: sans-serif; } </style>` + printContent;
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

    let message = `Olá *${quote.client.name}*, aqui está o resumo do seu orçamento (${new Date(quote.createdAt).toLocaleDateString('pt-BR')}):\n\n`;

    quote.items.forEach(item => {
        const totalItem = (item.quantity * item.product.sellPrice).toFixed(2);
        message += `• ${item.quantity}x ${item.product.name}: R$ ${totalItem}\n`;
    });

    if (quoteSettings.showDiscount && quote.discountAmount > 0) {
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
        const canvas = await window.html2canvas(input, { scale: 2, useCORS: true, logging: false, width: input.scrollWidth, height: input.scrollHeight });
        const imgData = canvas.toDataURL('image/png');
        // @ts-ignore
        const { jsPDF } = window.jspdf;
        
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const imgWidth = pdfWidth;
        const imgHeight = imgWidth / ratio;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
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
            <button onClick={clearQuoteForm} className="text-sm text-[--color-destructive-600] hover:text-[--color-destructive-700]">
                Limpar
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
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap gap-3 items-center justify-between">
                 <span className="text-sm font-medium text-slate-600">
                     {autoSaveStatus === 'saving' && 'Salvando...'}
                     {autoSaveStatus === 'saved' && 'Rascunho salvo.'}
                     {!autoSaveStatus && quoteItems.length > 0 && 'Edição em andamento'}
                 </span>
                 <div className="flex gap-2">
                     <button onClick={handlePrint} className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
                         <PrinterIcon className="h-4 w-4 mr-2"/>
                         Imprimir
                     </button>
                      <button onClick={handleExportPDF} className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
                         <FileDownIcon className="h-4 w-4 mr-2"/>
                         PDF
                     </button>
                      <button onClick={() => saveCurrentQuote()} className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-[--color-primary-600] hover:bg-[--color-primary-700]">
                         <SaveIcon className="h-4 w-4 mr-2"/>
                         Salvar
                     </button>
                 </div>
             </div>
             
             {/* Printable Area */}
             <div ref={quoteRef} className="p-8 bg-white min-h-[600px]" id="printable-quote">
                 <div className="flex justify-between items-start mb-8 border-b border-slate-200 pb-6">
                    <div className="flex items-start gap-4">
                        {logo && <img src={logo} alt="Logo" className="max-h-20 max-w-[150px] object-contain" />}
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-bold text-slate-800">Orçamento</h2>
                        <div className="mt-1 flex flex-col items-end">
                            <div className="print-hidden flex items-center gap-2">
                                <label htmlFor="quoteDateDisplay" className="text-sm text-slate-500">Data:</label>
                                <input 
                                    type="date" 
                                    id="quoteDateDisplay"
                                    value={quoteDate}
                                    onChange={(e) => setQuoteDate(e.target.value)}
                                    className="text-right text-slate-600 border-b border-slate-300 focus:border-[--color-primary-500] focus:outline-none text-sm bg-transparent"
                                />
                            </div>
                            <span className="hidden print-date-display text-slate-500">Data: {formatDateDisplay(quoteDate)}</span>
                        </div>
                    </div>
                 </div>

                 {quoteSettings.text && (
                     <div className="mb-8 text-slate-600 whitespace-pre-wrap" style={{
                         fontFamily: quoteSettings.fontFamily,
                         textAlign: quoteSettings.textAlign,
                         fontSize: `${quoteSettings.fontSize}px`
                     }}>
                         {quoteSettings.text}
                     </div>
                 )}

                 <div className="bg-slate-50 p-4 rounded-lg mb-8 border border-slate-200">
                     <h3 className="font-bold text-slate-700 mb-2">Cliente</h3>
                     {selectedClient ? (
                         <div className="text-sm text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                             <p><span className="font-medium">Nome:</span> {selectedClient.name}</p>
                             {selectedClient.phone && <p><span className="font-medium">Tel:</span> {selectedClient.phone}</p>}
                             {selectedClient.type === 'physical' && selectedClient.cpf && <p><span className="font-medium">CPF:</span> {selectedClient.cpf}</p>}
                             {selectedClient.type === 'juridical' && selectedClient.cnpj && <p><span className="font-medium">CNPJ:</span> {selectedClient.cnpj}</p>}
                             {selectedClient.address && <p className="sm:col-span-2"><span className="font-medium">Endereço:</span> {selectedClient.address}, {selectedClient.city}</p>}
                         </div>
                     ) : (
                         <p className="text-slate-400 italic">Nenhum cliente selecionado</p>
                     )}
                 </div>

                 <table className="w-full mb-8">
                     <thead>
                         <tr className="bg-slate-50 border-y border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                             <th className="py-3 px-2 w-16">Qtd</th>
                             {quoteSettings.showProductImage && <th className="py-3 px-2 w-16">Imagem</th>}
                             {quoteSettings.showProductCode && <th className="py-3 px-2">Código</th>}
                             {quoteSettings.showProductSector && <th className="py-3 px-2">Setor</th>}
                             <th className="py-3 px-2">Item</th>
                             <th className="py-3 px-2 w-24 text-right">Unit.</th>
                             <th className="py-3 px-2 w-24 text-right">Total</th>
                             <th className="py-3 px-2 w-10 print-hidden"></th>
                         </tr>
                     </thead>
                     <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                         {productItems.map((item, idx) => (
                             <tr key={`prod-${idx}`}>
                                 <td className="py-3 px-2">
                                     <input 
                                        type="number" 
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateQuantity(item.product.id, parseInt(e.target.value))}
                                        className="w-12 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[--color-primary-500] focus:outline-none text-center print-hidden"
                                     />
                                     <span className="hidden print-visible-inline">{item.quantity}</span>
                                 </td>
                                 {quoteSettings.showProductImage && (
                                    <td className="py-3 px-2">
                                        {item.product.image ? (
                                            <img src={item.product.image} alt="" className="h-10 w-10 object-cover rounded bg-slate-100" />
                                        ) : (
                                            <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center text-[8px] text-slate-400">Sem foto</div>
                                        )}
                                    </td>
                                 )}
                                 {quoteSettings.showProductCode && <td className="py-3 px-2 text-slate-500">{item.product.code}</td>}
                                 {quoteSettings.showProductSector && <td className="py-3 px-2 text-slate-500">{item.product.sector}</td>}
                                 <td className="py-3 px-2">
                                    {item.product.name.charAt(0).toUpperCase() + item.product.name.slice(1).toLowerCase()}
                                 </td>
                                 <td className="py-3 px-2 text-right">R$ {item.product.sellPrice.toFixed(2)}</td>
                                 <td className="py-3 px-2 text-right font-medium">R$ {(item.product.sellPrice * item.quantity).toFixed(2)}</td>
                                 <td className="py-3 px-2 text-center print-hidden">
                                     <button onClick={() => handleRemoveItem(item.product.id)} className="text-slate-400 hover:text-[--color-destructive-500]">
                                         <TrashIcon className="h-4 w-4" />
                                     </button>
                                 </td>
                             </tr>
                         ))}
                         
                         {productItems.length > 0 && serviceItems.length > 0 && (
                             <tr className="bg-slate-50/50">
                                 <td colSpan={tableCols + 2} className="py-2 px-2 text-center text-xs font-medium text-slate-500">--- Serviços ---</td>
                             </tr>
                         )}

                         {serviceItems.map((item, idx) => (
                             <tr key={`serv-${idx}`}>
                                 <td className="py-3 px-2">
                                     <input 
                                        type="number" 
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateQuantity(item.product.id, parseInt(e.target.value))}
                                        className="w-12 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[--color-primary-500] focus:outline-none text-center print-hidden"
                                     />
                                     <span className="hidden print-visible-inline">{item.quantity}</span>
                                 </td>
                                 {quoteSettings.showProductImage && (
                                    <td className="py-3 px-2">
                                        {/* Empty cell for services unless they have images (currently products usually have images) */}
                                        {item.product.image ? (
                                             <img src={item.product.image} alt="" className="h-10 w-10 object-cover rounded bg-slate-100" />
                                        ) : (
                                            <div className="h-10 w-10 bg-transparent"></div>
                                        )}
                                    </td>
                                 )}
                                 {quoteSettings.showProductCode && <td className="py-3 px-2 text-slate-500">{item.product.code}</td>}
                                 {quoteSettings.showProductSector && <td className="py-3 px-2 text-slate-500">{item.product.sector}</td>}
                                 <td className="py-3 px-2">
                                     {item.product.name.charAt(0).toUpperCase() + item.product.name.slice(1).toLowerCase()}
                                     <span className="ml-2 text-[10px] uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full print:hidden">Serviço</span>
                                 </td>
                                 <td className="py-3 px-2 text-right">R$ {item.product.sellPrice.toFixed(2)}</td>
                                 <td className="py-3 px-2 text-right font-medium">R$ {(item.product.sellPrice * item.quantity).toFixed(2)}</td>
                                 <td className="py-3 px-2 text-center print-hidden">
                                     <button onClick={() => handleRemoveItem(item.product.id)} className="text-slate-400 hover:text-[--color-destructive-500]">
                                         <TrashIcon className="h-4 w-4" />
                                     </button>
                                 </td>
                             </tr>
                         ))}

                         {quoteItems.length === 0 && (
                             <tr>
                                 <td colSpan={tableCols + 2} className="py-8 text-center text-slate-400 italic">
                                     Adicione produtos ou serviços para começar o orçamento
                                 </td>
                             </tr>
                         )}
                     </tbody>
                     <tfoot className="border-t-2 border-slate-200">
                         {(productsSubtotal > 0 && servicesSubtotal > 0) && (
                             <>
                                <tr className="text-sm text-slate-600">
                                    <td colSpan={tableCols} className="py-2 px-2 text-right">Subtotal Produtos</td>
                                    <td className="py-2 px-2 text-right">R$ {productsSubtotal.toFixed(2)}</td>
                                    <td className="print-hidden"></td>
                                </tr>
                                <tr className="text-sm text-slate-600">
                                    <td colSpan={tableCols} className="py-2 px-2 text-right">Subtotal Serviços</td>
                                    <td className="py-2 px-2 text-right">R$ {servicesSubtotal.toFixed(2)}</td>
                                    <td className="print-hidden"></td>
                                </tr>
                             </>
                         )}
                         {quoteSettings.showDiscount && (
                             <tr className="text-sm text-slate-600">
                                 <td colSpan={tableCols} className="py-2 px-2 text-right">Subtotal</td>
                                 <td className="py-2 px-2 text-right">R$ {subtotal.toFixed(2)}</td>
                                 <td className="print-hidden"></td>
                             </tr>
                         )}
                         {quoteSettings.showDiscount && discountAmount > 0 && (
                             <tr className="text-sm text-[--color-destructive-600]">
                                 <td colSpan={tableCols} className="py-2 px-2 text-right">Desconto</td>
                                 <td className="py-2 px-2 text-right">- R$ {discountAmount.toFixed(2)}</td>
                                 <td className="print-hidden"></td>
                             </tr>
                         )}
                         <tr className="text-lg font-bold text-slate-800 bg-slate-50">
                             <td colSpan={tableCols} className="py-3 px-2 text-right">Total</td>
                             <td className="py-3 px-2 text-right">R$ {finalTotal.toFixed(2)}</td>
                             <td className="print-hidden"></td>
                         </tr>
                     </tfoot>
                 </table>

                 {notes && (
                     <div className="mt-6 pt-6 border-t border-slate-200">
                         <h3 className="font-bold text-slate-700 mb-2">Observações</h3>
                         <p className="text-sm text-slate-600 whitespace-pre-wrap">{notes}</p>
                     </div>
                 )}
             </div>
         </div>

         {/* Saved Quotes List */}
         <div className="mt-12">
             <h2 className="text-2xl font-bold text-slate-900 mb-6">Orçamentos Salvos</h2>
             
             <div className="bg-white p-4 rounded-lg shadow mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className="relative">
                     <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                     <input 
                        type="text" 
                        placeholder="Filtrar por cliente..." 
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
                     />
                 </div>
                  <div className="relative">
                     <input 
                        type="text" 
                        placeholder="Filtrar por data (DD/MM/AAAA)..." 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
                     />
                 </div>
                  <div className="relative">
                     <input 
                        type="text" 
                        placeholder="Filtrar por valor..." 
                        value={valueFilter}
                        onChange={(e) => setValueFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
                     />
                 </div>
             </div>

             <div className="bg-white rounded-lg shadow overflow-hidden">
                 <table className="min-w-full divide-y divide-slate-200">
                     <thead className="bg-slate-50">
                         <tr>
                             <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                             <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                         </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-slate-200">
                         {filteredSavedQuotes.length > 0 ? (
                             filteredSavedQuotes.map((quote) => (
                                 <tr key={quote.id} className="hover:bg-slate-50">
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                         {new Date(quote.createdAt).toLocaleDateString('pt-BR')}
                                     </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                         {quote.client.name}
                                     </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                         R$ {quote.finalTotal.toFixed(2)}
                                     </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleSendWhatsApp(quote)} className="text-slate-400 hover:text-green-600" title="Enviar via WhatsApp">
                                                <WhatsAppIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => handlePrintSavedQuote(quote)} className="text-slate-400 hover:text-slate-600" title="Imprimir">
                                                <PrinterIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => handleGeneratePdfFromSaved(quote)} className="text-slate-400 hover:text-slate-600" title="PDF">
                                                <FileDownIcon className="h-5 w-5" />
                                            </button>
                                             <button onClick={() => editQuote(quote.id)} className="text-[--color-accent-600] hover:text-[--color-accent-800]" title="Editar">
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => deleteQuote(quote.id)} className="text-[--color-destructive-600] hover:text-[--color-destructive-800]" title="Excluir">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                     </td>
                                 </tr>
                             ))
                         ) : (
                             <tr>
                                 <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">
                                     Nenhum orçamento salvo encontrado.
                                 </td>
                             </tr>
                         )}
                     </tbody>
                 </table>
             </div>
         </div>
      </div>

      {/* Hidden Div for Saved Quote PDF Generation */}
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <div ref={printRef}></div>
      </div>
    </div>
  );
};

export default Quotes;
