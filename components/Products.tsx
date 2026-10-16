
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Product, QuoteSettings, CompanyInfo } from '../types';
import { compressImage } from '../utils/storage';
import { PackagePlusIcon } from './icons/PackagePlusIcon';
import { FileDownIcon } from './icons/FileDownIcon';
import { FileUpIcon } from './icons/FileUpIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { PriceTagIcon } from './icons/PriceTagIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { WhatsAppIcon } from './icons/WhatsAppIcon';


interface ProductsProps {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  addMultipleProducts: (products: Omit<Product, 'id'>[]) => void;
  quoteSettings: QuoteSettings;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  onSetQuoteSettings: (settings: QuoteSettings) => void;
  companyInfo: CompanyInfo | null;
  logo: string | null;
}

const Products: React.FC<ProductsProps> = ({ 
    products, 
    addProduct, 
    addMultipleProducts, 
    quoteSettings, 
    updateProduct, 
    deleteProduct,
    onSetQuoteSettings,
    companyInfo,
    logo 
}) => {
  // Helper to generate the next available sequential code starting from the lowest available number (0001)
  const getNextCode = (list: Product[] = products, excludeId?: string) => {
    const existingCodes = new Set(
      list
        .filter(p => !excludeId || p.id !== excludeId)
        .map(p => p.code.trim().toLowerCase())
    );
    let candidate = 1;
    while (true) {
      const codeStr = String(candidate).padStart(4, '0');
      if (!existingCodes.has(codeStr.toLowerCase())) {
        return codeStr;
      }
      candidate++;
    }
  };

  const [type, setType] = useState<'product' | 'service'>('product');
  // Initialize code with the next available code
  const [code, setCode] = useState(() => getNextCode());
  const [internalCode, setInternalCode] = useState('');
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [stock, setStock] = useState('');
  const [sector, setSector] = useState('');
  const [observation, setObservation] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingObservationProduct, setViewingObservationProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [minCostPrice, setMinCostPrice] = useState('');
  const [maxCostPrice, setMaxCostPrice] = useState('');
  const [minSellPrice, setMinSellPrice] = useState('');
  const [maxSellPrice, setMaxSellPrice] = useState('');

  const [activeView, setActiveView] = useState('list');
  const [newSector, setNewSector] = useState('');
  const [selectedPriceTableSector, setSelectedPriceTableSector] = useState('all');
  const [sectorModalAction, setSectorModalAction] = useState<'print' | 'pdf' | 'whatsapp' | null>(null);
  const priceTableRef = useRef<HTMLDivElement>(null);

  // Verificação em tempo real de código duplicado
  const isCodeDuplicate = useMemo(() => {
    const trimmed = code.trim().toLowerCase();
    if (!trimmed) return false;
    return products.some(p => 
      p.code.trim().toLowerCase() === trimmed &&
      (!editingProduct || p.id !== editingProduct.id)
    );
  }, [code, products, editingProduct]);

  // Atualizar o código automaticamente para o menor número disponível quando a lista de produtos mudar (ex: ao excluir ou cadastrar)
  useEffect(() => {
    if (!editingProduct) {
      setCode(getNextCode(products));
    }
  }, [products, editingProduct]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const raw = reader.result as string;
            const compressed = await compressImage(raw, 400, 400, 0.7);
            setImage(compressed);
        };
        reader.readAsDataURL(file);
    } else {
        setImage(null);
    }
  };

  const resetForm = (nextCodeOverride?: string) => {
    setEditingProduct(null);
    setType('product');
    // If an override is provided (from handleSubmit), use it. 
    // Otherwise calculate based on current products (used when cancelling edit).
    if (nextCodeOverride) {
        setCode(nextCodeOverride);
    } else {
        setCode(getNextCode());
    }
    
    setName('');
    setInternalCode('');
    setCostPrice('');
    setSellPrice('');
    setStock('');
    setSector('');
    setObservation('');
    setDiscountPercent('');
    setImage(null);
    const imageInput = document.getElementById('productImage') as HTMLInputElement;
    if (imageInput) {
        imageInput.value = '';
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de limite de caracteres
    const finalCode = code.slice(0, 18).trim();
    const finalInternalCode = internalCode.slice(0, 30).trim();
    const finalName = name.slice(0, 53).trim();

    if (!finalCode) {
        alert("Por favor, informe um código válido.");
        return;
    }

    // Impedir códigos duplicados
    if (isCodeDuplicate) {
        alert(`O código "${finalCode}" já está cadastrado para outro produto ou serviço. Cada item deve ter um código único.`);
        return;
    }

    // Validação específica dependendo do tipo
    if (type === 'product') {
        if(!finalCode || !finalName || !costPrice || !sellPrice || !stock) {
            alert("Por favor, preencha todos os campos obrigatórios para o produto.");
            return;
        }
    } else {
        // Para serviços, custo e estoque não são obrigatórios visualmente
        if(!finalCode || !finalName || !sellPrice) {
             alert("Por favor, preencha o código, descrição e valor da mão de obra.");
             return;
        }
    }

    // Definir valores padrão para campos ocultos em serviços
    const finalCostPrice = type === 'service' ? 0 : parseFloat(costPrice);
    const finalStock = type === 'service' ? 0 : (parseInt(stock, 10) || 0);

    // Desconto percentual opcional no item
    const parsedDiscount = parseFloat(discountPercent);
    const finalDiscountPercent = quoteSettings.showItemDiscountPercent && !isNaN(parsedDiscount) && parsedDiscount > 0
        ? Math.min(100, Math.max(0, parsedDiscount))
        : undefined;

    // Calcular o próximo código para o formulário (menor número disponível a partir de 0001)
    const futureList = editingProduct 
        ? products.map(p => p.id === editingProduct.id ? { ...p, code: finalCode } : p)
        : [...products, { id: 'temp', code: finalCode } as Product];
    const nextCodeVal = getNextCode(futureList);

    if (editingProduct) {
        updateProduct({
            ...editingProduct,
            type,
            code: finalCode,
            internalCode: finalInternalCode || undefined,
            name: finalName,
            costPrice: finalCostPrice,
            sellPrice: parseFloat(sellPrice),
            stock: finalStock,
            sector: sector || undefined,
            image: image || editingProduct.image,
            observation: observation.trim() || undefined,
            discountPercent: finalDiscountPercent,
        });
        alert('Item atualizado com sucesso!');
        resetForm(); // For edit, we usually just want to clear or go back to auto-gen based on list
    } else {
        addProduct({
          type,
          code: finalCode,
          internalCode: finalInternalCode || undefined,
          name: finalName,
          costPrice: finalCostPrice,
          sellPrice: parseFloat(sellPrice),
          stock: finalStock,
          sector: sector || undefined,
          image: image || undefined,
          observation: observation.trim() || undefined,
          discountPercent: finalDiscountPercent,
        });
        // Pass the calculated next code to resetForm
        resetForm(nextCodeVal);
    }
  };
  
  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setType(product.type || 'product');
    setCode(product.code);
    setInternalCode(product.internalCode || '');
    setName(product.name);
    setCostPrice(String(product.costPrice));
    setSellPrice(String(product.sellPrice));
    setStock(String(product.stock));
    setSector(product.sector || '');
    setObservation(product.observation || '');
    setDiscountPercent(product.discountPercent !== undefined && product.discountPercent !== null ? String(product.discountPercent) : '');
    setImage(product.image || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const filteredProducts = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const minCost = parseFloat(minCostPrice);
    const maxCost = parseFloat(maxCostPrice);
    const minSell = parseFloat(minSellPrice);
    const maxSell = parseFloat(maxSellPrice);

    return products.filter((product) => {
      // Search term filter
      const searchTermMatch = !lowercasedFilter ||
        product.name.toLowerCase().includes(lowercasedFilter) ||
        product.code.toLowerCase().includes(lowercasedFilter) ||
        (product.internalCode && product.internalCode.toLowerCase().includes(lowercasedFilter)) ||
        (product.sector && product.sector.toLowerCase().includes(lowercasedFilter));

      // Price filters
      const minCostMatch = isNaN(minCost) || product.costPrice >= minCost;
      const maxCostMatch = isNaN(maxCost) || product.costPrice <= maxCost;
      const minSellMatch = isNaN(minSell) || product.sellPrice >= minSell;
      const maxSellMatch = isNaN(maxSell) || product.sellPrice <= maxSell;

      return searchTermMatch && minCostMatch && maxCostMatch && minSellMatch && maxSellMatch;
    });
  }, [searchTerm, products, minCostPrice, maxCostPrice, minSellPrice, maxSellPrice]);
  
  const handleExport = () => {
    if (products.length === 0) {
      alert("Não há itens para exportar.");
      return;
    }
    // @ts-ignore
    if (!window.Papa) {
      alert("Erro: A biblioteca de exportação não foi carregada. Verifique sua conexão com a internet.");
      return;
    }

    const dataToExport = products.map(({ type, code, internalCode, name, costPrice, sellPrice, stock, sector, observation, discountPercent }) => ({
        type: type || 'product',
        code,
        internalCode: internalCode || '',
        name,
        costPrice,
        sellPrice,
        discountPercent: discountPercent !== undefined ? discountPercent : '',
        stock,
        sector: sector || '',
        observation: observation || '',
    }));
    
    // @ts-ignore
    const csvString = window.Papa.unparse(dataToExport, {
        header: true,
        quotes: true,
        delimiter: ";", // Force semicolon for better Excel compatibility in Brazil
    });

    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const date = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `produtos-servicos-backup-${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // @ts-ignore
    if (!window.Papa) {
        alert("Erro: A biblioteca de importação não foi carregada. Verifique sua conexão com a internet.");
        return;
    }

    // Helper to robustly parse numbers with comma or dot decimal separators
    const parseNumber = (val: any) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        // Replace comma with dot for international format if string
        const stringVal = String(val).replace(',', '.');
        return parseFloat(stringVal) || 0;
    };

    // @ts-ignore
    window.Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
            const newProducts: Omit<Product, 'id'>[] = [];
            let errors: string[] = [];
            
            const requiredFields = ['code', 'name', 'sellPrice'];
            const fileFields = results.meta.fields.map((f: string) => f.trim());
            
            const missingFields = requiredFields.filter(f => !fileFields.includes(f));
            if (missingFields.length > 0) {
                 alert(`Arquivo CSV inválido. As seguintes colunas estão faltando: ${missingFields.join(', ')}`);
                 if(e.target) e.target.value = '';
                 return;
            }

            const existingCodesSet = new Set(products.map(p => p.code.trim().toLowerCase()));

            results.data.forEach((row: any, index: number) => {
                const { type, code, internalCode, name, costPrice, sellPrice, stock, sector, observation, discountPercent } = row;
                
                // Basic validation
                // Use parseNumber to check sellPrice validity
                if (!code || !name || isNaN(parseNumber(sellPrice))) {
                    errors.push(`Linha ${index + 2}: Dados inválidos ou faltando.`);
                    return;
                }

                const trimmedCode = String(code).trim().slice(0, 18);
                if (existingCodesSet.has(trimmedCode.toLowerCase())) {
                    errors.push(`Linha ${index + 2}: Código "${trimmedCode}" já está cadastrado no sistema.`);
                    return;
                }
                existingCodesSet.add(trimmedCode.toLowerCase());
                
                const parsedDiscount = parseNumber(discountPercent);
                const finalDiscountPercent = !isNaN(parsedDiscount) && parsedDiscount > 0
                    ? Math.min(100, Math.max(0, parsedDiscount))
                    : undefined;

                newProducts.push({
                    type: (type === 'service' ? 'service' : 'product'),
                    code: trimmedCode,
                    internalCode: internalCode ? String(internalCode).trim().slice(0, 30) : undefined,
                    name: String(name).slice(0, 53),
                    costPrice: parseNumber(costPrice),
                    sellPrice: parseNumber(sellPrice),
                    stock: parseInt(stock, 10) || 0,
                    sector: sector || undefined,
                    observation: observation || undefined,
                    discountPercent: finalDiscountPercent,
                    image: undefined,
                });
            });

            if (errors.length > 0) {
                alert(`Erros encontrados durante a importação:\n${errors.join('\n')}`);
            } else if (newProducts.length > 0) {
                addMultipleProducts(newProducts);
                alert(`${newProducts.length} itens importados com sucesso!`);
            } else {
                alert('Nenhum item válido encontrado no arquivo para importar.');
            }
        },
        error: (error: any) => {
            alert(`Ocorreu um erro ao processar o arquivo: ${error.message}`);
        }
    });

    if(e.target) e.target.value = '';
  };

  const handleAddSector = () => {
    const trimmedSector = newSector.trim();
    if (trimmedSector && !quoteSettings.sectors.includes(trimmedSector)) {
      onSetQuoteSettings({
        ...quoteSettings,
        sectors: [...quoteSettings.sectors, trimmedSector].sort(),
      });
      setNewSector('');
    } else if (!trimmedSector) {
        alert("O nome do setor não pode estar vazio.");
    } else {
        alert("Este setor já existe.");
    }
  };

  const handleRemoveSector = (sectorToRemove: string) => {
    onSetQuoteSettings({
      ...quoteSettings,
      sectors: quoteSettings.sectors.filter(s => s !== sectorToRemove),
    });
  };

  const productsBySector = useMemo(() => {
    const grouped: { [key: string]: Product[] } = {};

    // Inicializa todos os setores cadastrados
    if (quoteSettings.sectors && quoteSettings.sectors.length > 0) {
      quoteSettings.sectors.forEach(sec => {
        if (!grouped[sec]) {
          grouped[sec] = [];
        }
      });
    }

    products.forEach(product => {
      const sector = product.sector && product.sector.trim() !== '' ? product.sector : 'Sem Setor';
      if (!grouped[sector]) {
        grouped[sector] = [];
      }
      if (!grouped[sector].some(p => p.id === product.id)) {
        grouped[sector].push(product);
      }
    });

    for (const sector in grouped) {
      grouped[sector].sort((a, b) => a.name.localeCompare(b.name));
    }
    return grouped;
  }, [products, quoteSettings.sectors]);

  const generateSectorPriceTablePrintHTML = (sectorName: string, sectorProducts: Product[]) => {
    const title = companyInfo?.name || 'Tabela de Preços';
    const companyHeaderHtml = companyInfo ? `
      <div class="company-header">
          ${logo ? `<img src="${logo}" alt="Logotipo" class="logo"/>` : ''}
          ${companyInfo.address ? `<p>${companyInfo.address}, ${companyInfo.city || ''} - ${companyInfo.zipCode || ''}</p>` : ''}
          ${companyInfo.cnpj ? `<p>CNPJ: ${companyInfo.cnpj}</p>` : ''}
          ${companyInfo.phone || companyInfo.email ? `<p>${companyInfo.phone ? `Tel: ${companyInfo.phone}` : ''}${companyInfo.phone && companyInfo.email ? ' | ' : ''}${companyInfo.email ? `Email: ${companyInfo.email}` : ''}</p>` : ''}
      </div>
    ` : '';

    // Garante que somente os itens que pertencem estritamente a este setor sejam incluídos
    const onlySectorProducts = sectorProducts.filter(p => {
      const pSector = p.sector && p.sector.trim() !== '' ? p.sector : 'Sem Setor';
      return pSector === sectorName;
    });

    const rowsHtml = onlySectorProducts.map(product => {
      const hasDiscount = Boolean(quoteSettings.showItemDiscountPercent && typeof product.discountPercent === 'number' && product.discountPercent > 0);
      const discountedPrice = hasDiscount 
        ? product.sellPrice * (1 - product.discountPercent! / 100) 
        : product.sellPrice;

      return `
        <tr>
          ${quoteSettings.showImageInPriceTable ? `
            <td style="padding: 6px 8px; width: 50px; text-align: center; vertical-align: middle;">
              ${product.image ? `<img src="${product.image}" alt="${product.name}" style="max-width: 44px; max-height: 44px; object-fit: cover; border-radius: 4px; display: block; margin: 0 auto;"/>` : '<span style="font-size: 10px; color: #94a3b8;">Sem foto</span>'}
            </td>
          ` : ''}
          <td style="padding: 6px 8px; font-size: 12px; color: #64748b; white-space: nowrap; vertical-align: middle;">${product.code || '-'}</td>
          ${quoteSettings.showInternalCodeInPriceTable ? `
            <td style="padding: 6px 8px; font-size: 12px; font-weight: 600; color: #3730a3; white-space: nowrap; vertical-align: middle;">
              ${product.internalCode || '-'}
            </td>
          ` : ''}
          <td style="padding: 6px 8px; font-size: 13px; font-weight: 500; color: #0f172a; vertical-align: middle;">${product.name.charAt(0).toUpperCase() + product.name.slice(1).toLowerCase()}</td>
          ${quoteSettings.showItemDiscountPercent ? `
            <td style="padding: 6px 8px; font-size: 12px; text-align: right; color: #334155; vertical-align: middle;">
              R$ ${product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td style="padding: 6px 8px; font-size: 12px; text-align: center; vertical-align: middle;">
              ${hasDiscount ? `
                <span style="display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: bold; background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 4px;">
                  ${product.discountPercent}%
                </span>
              ` : '<span style="color: #94a3b8;">-</span>'}
            </td>
            <td style="padding: 6px 8px; font-size: 13px; text-align: right; vertical-align: middle; ${hasDiscount ? 'font-weight: bold; color: #059669;' : 'font-weight: 500; color: #334155;'}">
              R$ ${discountedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          ` : `
            <td style="padding: 6px 8px; font-size: 13px; font-weight: 500; text-align: right; color: #334155; vertical-align: middle;">
              R$ ${product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          `}
        </tr>
      `;
    }).join('');

    return `
      <style>
        body { font-family: sans-serif; color: #334155; margin: 0; padding: 0; }
        .price-table-print { padding: 1.5rem; max-width: 900px; margin: 0 auto; }
        .company-header { text-align: center; margin-bottom: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.75rem; }
        .company-header .logo { max-height: 65px; margin: 0 auto 0.5rem; display: block; }
        .company-header p { font-size: 0.85rem; margin: 2px 0; color: #475569; }
        .main-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; color: #1e293b; text-align: center; }
        .sector-badge-title { text-align: center; font-size: 1.15rem; font-weight: 600; color: #2563eb; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0; }
        table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; margin-bottom: 1rem; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        th, td { border: 1px solid #e2e8f0; vertical-align: middle; }
        th { background-color: #f8fafc; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; padding: 8px; }
      </style>
      <div class="price-table-print">
        ${companyHeaderHtml}
        <h2 class="main-title">${title}</h2>
        <div class="sector-badge-title">Setor: ${sectorName}</div>
        <table>
          <thead>
            <tr>
              ${quoteSettings.showImageInPriceTable ? '<th style="text-align: center; width: 50px;">Imagem</th>' : ''}
              <th style="text-align: left; width: 80px;">Código</th>
              ${quoteSettings.showInternalCodeInPriceTable ? '<th style="text-align: left; width: 95px;">Cód. Interno</th>' : ''}
              <th style="text-align: left;">Item</th>
              ${quoteSettings.showItemDiscountPercent ? `
                <th style="text-align: right; width: 125px;">Preço de Tabela</th>
                <th style="text-align: center; width: 90px;">Desconto</th>
                <th style="text-align: right; width: 125px;">Preço Final</th>
              ` : `
                <th style="text-align: right; width: 125px;">Preço de Venda</th>
              `}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div style="text-align: right; font-size: 11px; color: #94a3b8; margin-top: 8px;">
          Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    `;
  };

  const handlePrintSector = (sectorName: string) => {
    const rawProducts = productsBySector[sectorName] || [];
    const sectorProducts = rawProducts.filter(p => {
      const pSector = p.sector && p.sector.trim() !== '' ? p.sector : 'Sem Setor';
      return pSector === sectorName;
    });
    if (sectorProducts.length === 0) {
      alert(`Nenhum item cadastrado no setor "${sectorName}".`);
      return;
    }
    const printHtml = generateSectorPriceTablePrintHTML(sectorName, sectorProducts);
    
    // Impressão via iframe para evitar reload da página e perda de estado
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printHtml);
      doc.close();
      setTimeout(() => {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(printIframe)) {
            document.body.removeChild(printIframe);
          }
        }, 1500);
      }, 300);
    } else {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printHtml;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const handleExportPdfSector = async (sectorName: string) => {
    const rawProducts = productsBySector[sectorName] || [];
    const sectorProducts = rawProducts.filter(p => {
      const pSector = p.sector && p.sector.trim() !== '' ? p.sector : 'Sem Setor';
      return pSector === sectorName;
    });
    if (sectorProducts.length === 0) {
      alert(`Nenhum item cadastrado no setor "${sectorName}".`);
      return;
    }
    // @ts-ignore
    if (!window.html2canvas || !window.jspdf) {
      alert("Erro ao carregar recursos para gerar PDF. Tente novamente.");
      return;
    }

    const htmlContent = generateSectorPriceTablePrintHTML(sectorName, sectorProducts);
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0px';
    container.style.width = '210mm';
    container.style.backgroundColor = '#ffffff';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    try {
      await new Promise(resolve => setTimeout(resolve, 150));
      const fullHeight = Math.max(container.scrollHeight, container.offsetHeight, 800);
      const fullWidth = Math.max(container.scrollWidth, container.offsetWidth, 794);

      // @ts-ignore
      const canvas = await window.html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: fullWidth,
        height: fullHeight,
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
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);

      const margin = 10;
      const printableWidth = pdfWidth - (margin * 2);
      const printableHeight = pdfHeight - (margin * 2);
      const imgHeightInPdf = (imgProps.height * printableWidth) / imgProps.width;

      if (imgHeightInPdf <= printableHeight) {
        pdf.addImage(imgData, 'PNG', margin, margin, printableWidth, imgHeightInPdf);
      } else if (imgHeightInPdf <= printableHeight * 1.25) {
        const scale = printableHeight / imgHeightInPdf;
        const scaledWidth = printableWidth * scale;
        const xOffset = margin + (printableWidth - scaledWidth) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, margin, scaledWidth, printableHeight);
      } else {
        let heightLeft = imgHeightInPdf;
        let pageCount = 0;
        while (heightLeft > 0) {
          if (pageCount > 0) pdf.addPage();
          const position = margin - (pageCount * printableHeight);
          pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeightInPdf);
          heightLeft -= printableHeight;
          pageCount++;
        }
      }

      const date = new Date().toISOString().slice(0, 10);
      const safeSector = sectorName.replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`Tabela-de-Precos-${safeSector}-${date}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Ocorreu um erro ao gerar o PDF.");
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  };

  const handleTopPrintClick = () => {
    if (selectedPriceTableSector !== 'all') {
      handlePrintSector(selectedPriceTableSector);
    } else {
      setSectorModalAction('print');
    }
  };

  const handleTopPdfClick = () => {
    if (selectedPriceTableSector !== 'all') {
      handleExportPdfSector(selectedPriceTableSector);
    } else {
      setSectorModalAction('pdf');
    }
  };

  const handleWhatsAppSector = (sectorName: string) => {
    const sectorProducts = (productsBySector[sectorName] || []).filter(p => {
      const pSector = p.sector && p.sector.trim() !== '' ? p.sector : 'Sem Setor';
      return pSector === sectorName;
    });

    if (sectorProducts.length === 0) {
      alert(`Nenhum item encontrado no setor "${sectorName}".`);
      return;
    }

    const inputPhone = prompt(`Deseja enviar a Tabela de Preços do setor "${sectorName}" para qual número de WhatsApp?\n(Deixe em branco para abrir o WhatsApp e escolher o contato):`);
    let phone = inputPhone ? inputPhone.replace(/\D/g, '') : '';
    if (phone && phone.length >= 10 && phone.length <= 11) {
      phone = '55' + phone;
    }

    const companyTitle = companyInfo?.name ? `*${companyInfo.name.toUpperCase()}*\n` : '';
    let message = `${companyTitle}📋 *TABELA DE PREÇOS - SETOR: ${sectorName.toUpperCase()}*\n`;
    message += `Data: ${new Date().toLocaleDateString('pt-BR')}\n\n`;

    sectorProducts.forEach(product => {
      const hasDiscount = Boolean(quoteSettings.showItemDiscountPercent && typeof product.discountPercent === 'number' && product.discountPercent > 0);
      const discountedPrice = hasDiscount ? product.sellPrice * (1 - (product.discountPercent || 0) / 100) : product.sellPrice;
      const internalCodeText = quoteSettings.showInternalCodeInPriceTable && product.internalCode ? ` [${product.internalCode}]` : '';

      if (hasDiscount) {
        message += `• *${product.name}*${internalCodeText}\n  De: R$ ${product.sellPrice.toFixed(2)} | Desc: ${product.discountPercent}%\n  *Por: R$ ${discountedPrice.toFixed(2)}*\n`;
      } else {
        message += `• *${product.name}*${internalCodeText}: *R$ ${product.sellPrice.toFixed(2)}*\n`;
      }
    });

    if (companyInfo?.phone || companyInfo?.address) {
      message += `\n${companyInfo.phone ? `Tel: ${companyInfo.phone}\n` : ''}${companyInfo.address ? `End: ${companyInfo.address}\n` : ''}`;
    }

    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
    }, 100);
  };

  const handleTopWhatsAppClick = () => {
    if (selectedPriceTableSector !== 'all') {
      handleWhatsAppSector(selectedPriceTableSector);
    } else {
      setSectorModalAction('whatsapp');
    }
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 md:p-8">
      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          {editingProduct ? <PencilIcon className="mr-3 text-[--color-accent-500]"/> : <PackagePlusIcon className="mr-3 text-[--color-primary-500]"/>}
          {editingProduct ? 'Editar Item' : 'Cadastrar Novo Item'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Item</label>
            <div className="flex space-x-4">
                 <label className="inline-flex items-center cursor-pointer">
                    <input 
                        type="radio" 
                        className="form-radio text-[--color-primary-600]" 
                        name="productType" 
                        value="product" 
                        checked={type === 'product'} 
                        onChange={() => setType('product')} 
                    />
                    <span className="ml-2 text-slate-700">Produto</span>
                </label>
                <label className="inline-flex items-center cursor-pointer">
                    <input 
                        type="radio" 
                        className="form-radio text-[--color-primary-600]" 
                        name="productType" 
                        value="service" 
                        checked={type === 'service'} 
                        onChange={() => setType('service')} 
                    />
                    <span className="ml-2 text-slate-700">Mão de Obra / Serviço</span>
                </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="code" className="block text-sm font-medium text-slate-700">Código</label>
                <span className={`text-xs ${code.length >= 18 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                  {code.length}/18
                </span>
              </div>
              <input 
                  type="text" 
                  id="code" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value.slice(0, 18))} 
                  maxLength={18}
                  className={`mt-1 block w-full px-3 py-2 bg-white border ${
                    isCodeDuplicate 
                      ? 'border-red-500 text-red-900 focus:ring-red-500 focus:border-red-500 bg-red-50/20' 
                      : 'border-slate-300 focus:ring-[--color-primary-500] focus:border-[--color-primary-500]'
                  } rounded-md shadow-sm focus:outline-none`} 
                  required 
                  placeholder="Ex: 0001"
              />
              {isCodeDuplicate ? (
                <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                  ⚠️ Código já cadastrado.
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">Código do item (máx. 18).</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="internalCode" className="block text-sm font-medium text-slate-700">Código Interno</label>
                <span className={`text-xs ${internalCode.length >= 30 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                  {internalCode.length}/30
                </span>
              </div>
              <input 
                  type="text" 
                  id="internalCode" 
                  value={internalCode} 
                  onChange={(e) => setInternalCode(e.target.value.slice(0, 30))} 
                  maxLength={30}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" 
                  placeholder="Ex: REF-1020"
              />
              <p className="text-xs text-slate-500 mt-1">Código interno de referência (opcional).</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center">
              <label htmlFor="productName" className="block text-sm font-medium text-slate-700">{type === 'product' ? 'Nome do Produto' : 'Descrição da Mão de Obra'}</label>
              <span className={`text-xs ${name.length >= 53 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                {name.length}/53
              </span>
            </div>
            <input 
                type="text" 
                id="productName" 
                value={name} 
                onChange={(e) => setName(e.target.value.slice(0, 53))} 
                maxLength={53}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" 
                required 
            />
          </div>
           {quoteSettings.sectors.length > 0 && (
            <div>
              <label htmlFor="sector" className="block text-sm font-medium text-slate-700">Setor</label>
              <select
                id="sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]"
              >
                <option value="">Nenhum</option>
                {quoteSettings.sectors.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="productImage" className="block text-sm font-medium text-slate-700">Imagem (Opcional)</label>
            <div className="mt-1 flex items-center space-x-4">
                <div className="flex-shrink-0 h-20 w-20 rounded-md bg-slate-100 border border-slate-300 flex items-center justify-center">
                    {image ? (
                        <img src={image} alt="Pré-visualização" className="h-full w-full object-cover rounded-md" />
                    ) : (
                        <span className="text-xs text-slate-500 text-center">Sem imagem</span>
                    )}
                </div>
                <div className="flex-grow">
                     <input type="file" id="productImage" accept="image/*" onChange={handleImageChange} className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-[--color-primary-50] file:text-[--color-primary-700]
                        hover:file:bg-[--color-primary-100]
                      "/>
                </div>
            </div>
          </div>
          <div className={`grid ${type === 'product' ? (quoteSettings.showItemDiscountPercent ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2') : (quoteSettings.showItemDiscountPercent ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')} gap-4`}>
            {type === 'product' && (
                <div>
                    <label htmlFor="costPrice" className="block text-sm font-medium text-slate-700">Custo (R$)</label>
                    <input type="number" step="0.01" id="costPrice" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" required />
                </div>
            )}
            <div>
              <label htmlFor="sellPrice" className="block text-sm font-medium text-slate-700">{type === 'product' ? 'Venda (R$)' : 'Valor Mão de Obra (R$)'}</label>
              <input type="number" step="0.01" id="sellPrice" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" required />
            </div>
            {quoteSettings.showItemDiscountPercent && (
              <div>
                <label htmlFor="discountPercent" className="block text-sm font-medium text-slate-700">Desconto (%)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="100" 
                  id="discountPercent" 
                  value={discountPercent} 
                  onChange={(e) => setDiscountPercent(e.target.value)} 
                  placeholder="Ex: 10" 
                  className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" 
                />
              </div>
            )}
          </div>
          {quoteSettings.showItemDiscountPercent && parseFloat(discountPercent) > 0 && !isNaN(parseFloat(sellPrice)) && parseFloat(sellPrice) > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-md text-emerald-800 text-sm flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                Preço c/ {parseFloat(discountPercent)}% de desconto:
              </span>
              <strong className="text-base font-bold text-emerald-700">
                R$ {(parseFloat(sellPrice) * (1 - Math.min(100, Math.max(0, parseFloat(discountPercent))) / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          )}
          {type === 'product' && !isNaN(parseFloat(costPrice)) && !isNaN(parseFloat(sellPrice)) && parseFloat(costPrice) > parseFloat(sellPrice) && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-md text-red-700 text-sm font-medium flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                <strong>Atenção:</strong> O valor do custo (R$ {parseFloat(costPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) é maior do que o valor da venda (R$ {parseFloat(sellPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).
              </span>
            </div>
          )}
          {type === 'product' && (
            <div>
                <label htmlFor="stock" className="block text-sm font-medium text-slate-700">Quantidade em Estoque</label>
                <input type="number" id="stock" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" required />
            </div>
          )}
          <div>
            <label htmlFor="observation" className="block text-sm font-medium text-slate-700">Observação (Opcional)</label>
            <textarea
              id="observation"
              rows={2}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Anotações ou detalhes sobre o produto/serviço..."
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] text-sm"
            />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button type="submit" className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${editingProduct ? 'bg-[--color-accent-600] hover:bg-[--color-accent-700] focus:ring-[--color-accent-500]' : 'bg-[--color-primary-600] hover:bg-[--color-primary-700] focus:ring-[--color-primary-500]'} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}>
              {editingProduct ? 'Salvar Alterações' : (type === 'product' ? 'Adicionar Produto' : 'Adicionar Mão de Obra')}
            </button>
            {editingProduct && (
              <button type="button" onClick={() => resetForm()} className="w-full flex justify-center py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors">
                Cancelar Edição
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="lg:col-span-2">
        <div className="mb-4 border-b border-slate-200">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button
                    onClick={() => setActiveView('list')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                        activeView === 'list'
                        ? 'border-[--color-primary-500] text-[--color-primary-600]'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    Lista de Itens
                </button>
                <button
                    onClick={() => setActiveView('tools')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                        activeView === 'tools'
                        ? 'border-[--color-primary-500] text-[--color-primary-600]'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    Setores e Tabela de Preços
                </button>
            </nav>
        </div>
        
        {activeView === 'list' && (
            <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-slate-900">Itens Cadastrados</h2>
                    <div className="flex gap-2">
                        <input
                            type="file"
                            ref={importInputRef}
                            onChange={handleImportFile}
                            accept=".csv,text/csv"
                            className="hidden"
                        />
                        <button
                            onClick={handleImportClick}
                            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500] transition-colors"
                        >
                            <FileUpIcon className="mr-2 h-5 w-5" />
                            Importar
                        </button>
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[--color-primary-600] hover:bg-[--color-primary-700] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500] transition-colors"
                        >
                            <FileDownIcon className="mr-2 h-5 w-5" />
                            Exportar
                        </button>
                    </div>
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Buscar por nome, código ou setor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]"
                    />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label htmlFor="minCostPrice" className="block text-sm font-medium text-slate-700">Custo Mín. (R$)</label>
                        <input type="number" step="0.01" id="minCostPrice" value={minCostPrice} onChange={(e) => setMinCostPrice(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" placeholder="0.00" />
                    </div>
                    <div>
                        <label htmlFor="maxCostPrice" className="block text-sm font-medium text-slate-700">Custo Máx. (R$)</label>
                        <input type="number" step="0.01" id="maxCostPrice" value={maxCostPrice} onChange={(e) => setMaxCostPrice(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" placeholder="100.00" />
                    </div>
                     <div>
                        <label htmlFor="minSellPrice" className="block text-sm font-medium text-slate-700">Venda Mín. (R$)</label>
                        <input type="number" step="0.01" id="minSellPrice" value={minSellPrice} onChange={(e) => setMinSellPrice(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" placeholder="0.00" />
                    </div>
                    <div>
                        <label htmlFor="maxSellPrice" className="block text-sm font-medium text-slate-700">Venda Máx. (R$)</label>
                        <input type="number" step="0.01" id="maxSellPrice" value={maxSellPrice} onChange={(e) => setMaxSellPrice(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" placeholder="200.00" />
                    </div>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                    <div key={product.id} className={`bg-white p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-start space-x-4 border-l-4 ${product.type === 'service' ? 'border-l-blue-500' : 'border-l-transparent'}`}>
                        {product.image && (
                            <div className="flex-shrink-0 h-20 w-20">
                                <img src={product.image} alt={product.name} className="h-full w-full object-cover rounded-md" />
                            </div>
                        )}
                        <div className="flex-grow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg text-[--color-primary-600]">{product.name}</h3>
                                        {product.type === 'service' && (
                                             <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                                Serviço
                                            </span>
                                        )}
                                        {product.sector && <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{product.sector}</span>}
                                    </div>
                                    <p className="text-slate-600 text-sm flex flex-wrap items-center gap-x-2">
                                        <span>Código: <strong className="font-semibold text-slate-800">{product.code}</strong></span>
                                        {product.internalCode && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                Cód. Interno: {product.internalCode}
                                            </span>
                                        )}
                                    </p>
                                    {product.type === 'product' && (
                                        <p className={`text-sm font-medium ${product.stock <= 5 ? 'text-[--color-destructive-600]' : 'text-slate-600'}`}>
                                            Estoque: {product.stock}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    {product.type === 'product' && (
                                        <p className="text-slate-500 text-sm">Custo: R$ {product.costPrice.toFixed(2)}</p>
                                    )}
                                    {quoteSettings.showItemDiscountPercent && typeof product.discountPercent === 'number' && product.discountPercent > 0 ? (
                                        <div>
                                            <p className="text-xs text-slate-400 line-through">
                                                De: R$ {product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    -{product.discountPercent}%
                                                </span>
                                                <p className="font-bold text-emerald-600 text-base">
                                                    R$ {(product.sellPrice * (1 - product.discountPercent / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="font-semibold text-slate-800">
                                            {product.type === 'product' ? 'Venda' : 'Valor'}: R$ {product.sellPrice.toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                            <button onClick={() => handleEditClick(product)} className="inline-flex items-center justify-center p-2 border border-transparent text-sm font-medium rounded-md text-[--color-accent-700] bg-[--color-accent-100] hover:bg-[--color-accent-200] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-accent-500]" title="Editar">
                                <PencilIcon className="h-4 w-4"/>
                            </button>
                            <button 
                                onClick={() => setViewingObservationProduct(product)} 
                                className={`inline-flex items-center justify-center p-2 border border-transparent text-sm font-medium rounded-md ${
                                  product.observation ? 'text-amber-800 bg-amber-100 hover:bg-amber-200' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400`} 
                                title="Ver Observação"
                            >
                                <FileTextIcon className="h-4 w-4"/>
                            </button>
                            <button onClick={() => setProductToDelete(product)} className="inline-flex items-center justify-center p-2 border border-transparent text-sm font-medium rounded-md text-[--color-destructive-700] bg-[--color-destructive-100] hover:bg-[--color-destructive-200] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-destructive-500]" title="Excluir">
                                <TrashIcon className="h-4 w-4"/>
                            </button>
                        </div>
                    </div>
                    ))
                ) : (
                    <div className="text-center py-10 bg-white rounded-lg shadow-md">
                        <p className="text-slate-500">
                            {products.length === 0 
                                ? "Nenhum item cadastrado ainda." 
                                : "Nenhum item encontrado com o termo buscado."}
                        </p>
                    </div>
                )}
                </div>
            </div>
        )}

        {activeView === 'tools' && (
            <div className="space-y-8 bg-white p-6 rounded-lg shadow">
                 <div>
                    <h3 className="text-lg font-medium text-slate-700 mb-2">Gerenciamento de Setores</h3>
                    <p className="text-sm text-slate-500 mb-4">Crie setores para categorizar seus itens.</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newSector}
                            onChange={(e) => setNewSector(e.target.value)}
                            placeholder="Nome do novo setor"
                            className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]"
                        />
                        <button onClick={handleAddSector} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[--color-primary-600] hover:bg-[--color-primary-700]">
                            Adicionar
                        </button>
                    </div>
                    <div className="mt-4 space-y-2">
                        {quoteSettings.sectors.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {quoteSettings.sectors.map(sector => (
                                    <span key={sector} className="flex items-center gap-2 bg-slate-100 text-slate-800 text-sm font-medium px-3 py-1 rounded-full">
                                        {sector}
                                        <button onClick={() => handleRemoveSector(sector)} className="text-slate-500 hover:text-slate-700">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">Nenhum setor cadastrado.</p>
                        )}
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-3">
                        <PriceTagIcon className="h-6 w-6 text-slate-600"/>
                        <h3 className="text-lg font-medium text-slate-700">Tabela de Preço</h3>
                    </div>
                    <p className="text-sm text-slate-500 mt-2 mb-4">Visualize uma tabela com todos os seus itens, organizada por setor.</p>
                    
                    <div className="bg-slate-50 p-4 rounded-md border">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => onSetQuoteSettings({ ...quoteSettings, showImageInPriceTable: !quoteSettings.showImageInPriceTable })}
                                    className={`${
                                        quoteSettings.showImageInPriceTable ? 'bg-[--color-primary-600]' : 'bg-slate-300'
                                    } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500] mr-3`}
                                    role="switch"
                                    aria-checked={quoteSettings.showImageInPriceTable}
                                >
                                    <span className={`${
                                        quoteSettings.showImageInPriceTable ? 'translate-x-5' : 'translate-x-0'
                                    } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                                    />
                                </button>
                                <label className="text-sm font-medium text-slate-700">Exibir imagem</label>
                            </div>
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => onSetQuoteSettings({ ...quoteSettings, showInternalCodeInPriceTable: !quoteSettings.showInternalCodeInPriceTable })}
                                    className={`${
                                        quoteSettings.showInternalCodeInPriceTable ? 'bg-[--color-primary-600]' : 'bg-slate-300'
                                    } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500] mr-3`}
                                    role="switch"
                                    aria-checked={!!quoteSettings.showInternalCodeInPriceTable}
                                >
                                    <span className={`${
                                        quoteSettings.showInternalCodeInPriceTable ? 'translate-x-5' : 'translate-x-0'
                                    } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                                    />
                                </button>
                                <label className="text-sm font-medium text-slate-700">Exibir Cód. Interno</label>
                            </div>
                            <div>
                                <label htmlFor="priceTableSector" className="block text-sm font-medium text-slate-700 mb-1">Filtrar por Setor</label>
                                <select
                                    id="priceTableSector"
                                    value={selectedPriceTableSector}
                                    onChange={(e) => setSelectedPriceTableSector(e.target.value)}
                                    className="w-full mt-1 block pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] sm:text-sm rounded-md"
                                >
                                    <option value="all">Todos os Setores</option>
                                    {Object.keys(productsBySector)
                                        .filter(sector => productsBySector[sector] && productsBySector[sector].length > 0)
                                        .sort()
                                        .map(sector => (
                                            <option key={sector} value={sector}>{sector}</option>
                                        ))}
                                </select>
                            </div>
                            <div className="flex flex-wrap gap-2 md:justify-end items-end">
                                <button 
                                    type="button"
                                    onClick={handleTopPrintClick} 
                                    className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                    title={selectedPriceTableSector !== 'all' ? `Imprimir somente o setor "${selectedPriceTableSector}"` : "Escolher setor para imprimir"}
                                >
                                    <PrinterIcon className="h-4 w-4 mr-2 text-slate-500" />
                                    {selectedPriceTableSector !== 'all' ? `Imprimir (${selectedPriceTableSector})` : 'Imprimir Setor...'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleTopPdfClick} 
                                    className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                    title={selectedPriceTableSector !== 'all' ? `Exportar PDF somente do setor "${selectedPriceTableSector}"` : "Escolher setor para gerar PDF"}
                                >
                                    <FileDownIcon className="h-4 w-4 mr-2 text-slate-500" />
                                    {selectedPriceTableSector !== 'all' ? `PDF (${selectedPriceTableSector})` : 'Exportar PDF...'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleTopWhatsAppClick} 
                                    className="inline-flex items-center px-4 py-2 border border-emerald-300 rounded-md shadow-sm text-sm font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                                    title={selectedPriceTableSector !== 'all' ? `Enviar por WhatsApp somente o setor "${selectedPriceTableSector}"` : "Escolher setor para enviar por WhatsApp"}
                                >
                                    <WhatsAppIcon className="h-4 w-4 mr-2 text-emerald-600" />
                                    {selectedPriceTableSector !== 'all' ? `WhatsApp (${selectedPriceTableSector})` : 'WhatsApp...'}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 border rounded-lg p-4 max-h-[50vh] overflow-auto">
                        <div ref={priceTableRef}>
                            {Object.keys(productsBySector).sort()
                            .filter(sector => {
                                if (selectedPriceTableSector !== 'all') {
                                    return sector === selectedPriceTableSector;
                                }
                                return productsBySector[sector] && productsBySector[sector].length > 0;
                            })
                            .map(sector => (
                            <div key={sector} className="mb-8 last:mb-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b">
                                  <h4 className="text-xl font-semibold text-slate-800">{sector}</h4>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handlePrintSector(sector)}
                                      className="inline-flex items-center px-2.5 py-1 border border-slate-300 rounded-md shadow-xs text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                      title={`Imprimir somente o setor ${sector}`}
                                    >
                                      <PrinterIcon className="h-3.5 w-3.5 mr-1 text-slate-500" />
                                      Imprimir
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleExportPdfSector(sector)}
                                      className="inline-flex items-center px-2.5 py-1 border border-slate-300 rounded-md shadow-xs text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                      title={`Exportar PDF somente do setor ${sector}`}
                                    >
                                      <FileDownIcon className="h-3.5 w-3.5 mr-1 text-slate-500" />
                                      PDF
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleWhatsAppSector(sector)}
                                      className="inline-flex items-center px-2.5 py-1 border border-emerald-300 rounded-md shadow-xs text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                                      title={`Enviar WhatsApp somente do setor ${sector}`}
                                    >
                                      <WhatsAppIcon className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                      WhatsApp
                                    </button>
                                  </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                        {quoteSettings.showImageInPriceTable && <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-24">Imagem</th>}
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                                        {quoteSettings.showInternalCodeInPriceTable && (
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Cód. Interno</th>
                                        )}
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item</th>
                                        {quoteSettings.showItemDiscountPercent ? (
                                            <>
                                                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Preço de Tabela</th>
                                                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Desconto</th>
                                                <th className="px-4 py-2 text-right text-xs font-semibold text-emerald-700 uppercase tracking-wider">Preço Final</th>
                                            </>
                                        ) : (
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Preço de Venda</th>
                                        )}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {productsBySector[sector].map(product => {
                                          const hasDiscount = Boolean(quoteSettings.showItemDiscountPercent && typeof product.discountPercent === 'number' && product.discountPercent > 0);
                                          const discountedPrice = hasDiscount 
                                            ? product.sellPrice * (1 - product.discountPercent! / 100) 
                                            : product.sellPrice;

                                          return (
                                            <tr key={product.id}>
                                                {quoteSettings.showImageInPriceTable && (
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    {product.image ? (
                                                    <img src={product.image} alt={product.name} className="h-12 w-12 object-cover rounded-md" />
                                                    ) : (
                                                    <div className="h-12 w-12 bg-slate-100 rounded-md flex items-center justify-center text-xs text-slate-400">Sem foto</div>
                                                    )}
                                                </td>
                                                )}
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">{product.code}</td>
                                                {quoteSettings.showInternalCodeInPriceTable && (
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-indigo-800 bg-indigo-50/40 font-mono">
                                                        {product.internalCode || <span className="text-slate-300 font-normal font-sans">-</span>}
                                                    </td>
                                                )}
                                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-slate-900">
                                                    {product.name.charAt(0).toUpperCase() + product.name.slice(1).toLowerCase()}
                                                </td>
                                                {quoteSettings.showItemDiscountPercent ? (
                                                    <>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-slate-700 font-medium">
                                                            R$ {product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                                                            {hasDiscount ? (
                                                                <span className="discount-badge inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                    {product.discountPercent}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400 text-xs">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                                                            {hasDiscount ? (
                                                                <span className="price-final font-bold text-emerald-600">
                                                                    R$ {discountedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                            ) : (
                                                                <span className="price-final font-medium text-slate-700">
                                                                    R$ {product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-left text-slate-700 font-medium">
                                                        R$ {product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                )}
                                            </tr>
                                          );
                                        })}
                                    </tbody>
                                    </table>
                                </div>
                            </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>

      {viewingObservationProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4 border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileTextIcon className="w-5 h-5 text-amber-500" />
                  Observação do Item
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  {viewingObservationProduct.name} <span className="text-slate-400">(Cód: {viewingObservationProduct.code})</span>
                </p>
              </div>
              <button
                onClick={() => setViewingObservationProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 my-4 text-slate-800 text-sm whitespace-pre-wrap min-h-[100px] max-h-[300px] overflow-y-auto">
              {viewingObservationProduct.observation ? (
                viewingObservationProduct.observation
              ) : (
                <span className="text-slate-400 italic flex items-center justify-center h-20">
                  Nenhuma observação cadastrada para este item.
                </span>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const p = viewingObservationProduct;
                  setViewingObservationProduct(null);
                  handleEditClick(p);
                }}
                className="px-4 py-2 text-sm font-medium text-[--color-accent-700] bg-[--color-accent-100] hover:bg-[--color-accent-200] rounded-md transition-colors"
              >
                Editar Item / Observação
              </button>
              <button
                onClick={() => setViewingObservationProduct(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 rounded-md transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {sectorModalAction && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4 border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[--color-primary-100] text-[--color-primary-700] rounded-lg">
                  {sectorModalAction === 'print' ? (
                    <PrinterIcon className="w-5 h-5" />
                  ) : sectorModalAction === 'pdf' ? (
                    <FileDownIcon className="w-5 h-5" />
                  ) : (
                    <WhatsAppIcon className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {sectorModalAction === 'print' ? 'Imprimir Setor' : sectorModalAction === 'pdf' ? 'Exportar PDF do Setor' : 'Enviar Setor por WhatsApp'}
                  </h3>
                  <p className="text-xs text-slate-500">Selecione o setor desejado para a tabela</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSectorModalAction(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-md border border-slate-200">
              A tabela de preços será gerada ou enviada <strong>exclusivamente para o setor selecionado</strong>, contendo seus itens, preços de tabela, descontos e preços finais.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 my-3">
              {Object.keys(productsBySector)
                .filter(sector => productsBySector[sector] && productsBySector[sector].length > 0)
                .sort()
                .map(sector => (
                  <button
                    key={sector}
                    type="button"
                    onClick={() => {
                      const action = sectorModalAction;
                      setSectorModalAction(null);
                      if (action === 'print') {
                        handlePrintSector(sector);
                      } else if (action === 'pdf') {
                        handleExportPdfSector(sector);
                      } else if (action === 'whatsapp') {
                        handleWhatsAppSector(sector);
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-[--color-primary-500] hover:bg-[--color-primary-50]/40 transition-all text-left group"
                  >
                    <span className="font-semibold text-sm text-slate-800 group-hover:text-[--color-primary-700]">
                      {sector}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-[--color-primary-100] group-hover:text-[--color-primary-700] font-medium">
                      {productsBySector[sector].length} {productsBySector[sector].length === 1 ? 'item' : 'itens'}
                    </span>
                  </button>
                ))}
            </div>

            <div className="flex justify-end pt-3 border-t mt-4">
              <button
                type="button"
                onClick={() => setSectorModalAction(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {productToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-[--color-destructive-600]">
              <div className="p-2.5 bg-[--color-destructive-100] rounded-full">
                <TrashIcon className="w-6 h-6 text-[--color-destructive-600]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 font-medium">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <p className="text-slate-700 text-sm mb-6 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              Tem certeza que deseja excluir o item <strong className="text-slate-900">{productToDelete.name}</strong> <span className="text-slate-500">(Cód: {productToDelete.code})</span>?
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-[--color-destructive-600] hover:bg-[--color-destructive-700] rounded-md transition-colors shadow-sm"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
