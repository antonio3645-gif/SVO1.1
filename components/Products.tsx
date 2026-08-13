
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
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [stock, setStock] = useState('');
  const [sector, setSector] = useState('');
  const [observation, setObservation] = useState('');
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
    setCostPrice('');
    setSellPrice('');
    setStock('');
    setSector('');
    setObservation('');
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
            name: finalName,
            costPrice: finalCostPrice,
            sellPrice: parseFloat(sellPrice),
            stock: finalStock,
            sector: sector || undefined,
            image: image || editingProduct.image,
            observation: observation.trim() || undefined,
        });
        alert('Item atualizado com sucesso!');
        resetForm(); // For edit, we usually just want to clear or go back to auto-gen based on list
    } else {
        addProduct({
          type,
          code: finalCode,
          name: finalName,
          costPrice: finalCostPrice,
          sellPrice: parseFloat(sellPrice),
          stock: finalStock,
          sector: sector || undefined,
          image: image || undefined,
          observation: observation.trim() || undefined,
        });
        // Pass the calculated next code to resetForm
        resetForm(nextCodeVal);
    }
  };
  
  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setType(product.type || 'product');
    setCode(product.code);
    setName(product.name);
    setCostPrice(String(product.costPrice));
    setSellPrice(String(product.sellPrice));
    setStock(String(product.stock));
    setSector(product.sector || '');
    setObservation(product.observation || '');
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

    const dataToExport = products.map(({ type, code, name, costPrice, sellPrice, stock, sector, observation }) => ({
        type: type || 'product',
        code,
        name,
        costPrice,
        sellPrice,
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
                const { type, code, name, costPrice, sellPrice, stock, sector, observation } = row;
                
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
                
                newProducts.push({
                    type: (type === 'service' ? 'service' : 'product'),
                    code: trimmedCode,
                    name: String(name).slice(0, 53),
                    costPrice: parseNumber(costPrice),
                    sellPrice: parseNumber(sellPrice),
                    stock: parseInt(stock, 10) || 0,
                    sector: sector || undefined,
                    observation: observation || undefined,
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
    products.forEach(product => {
        const sector = product.sector || 'Sem Setor';
        if (!grouped[sector]) {
            grouped[sector] = [];
        }
        grouped[sector].push(product);
    });
    for (const sector in grouped) {
        grouped[sector].sort((a, b) => a.name.localeCompare(b.name));
    }
    return grouped;
  }, [products]);

  const handlePrintPriceTable = () => {
    const printContent = priceTableRef.current;
    if (printContent) {
      const originalContents = document.body.innerHTML;
      const printHtml = printContent.innerHTML;
      const title = companyInfo?.name || 'Tabela de Preços';
      const companyHeaderHtml = companyInfo ? `
        <div class="company-header">
            ${logo ? `<img src="${logo}" alt="Logotipo" class="logo"/>` : ''}
            ${/* Company name moved to be the main title below */ ''}
            ${companyInfo.address ? `<p>${companyInfo.address}, ${companyInfo.city || ''} - ${companyInfo.zipCode || ''}</p>` : ''}
            ${companyInfo.cnpj ? `<p>CNPJ: ${companyInfo.cnpj}</p>` : ''}
            ${companyInfo.phone || companyInfo.email ? `<p>${companyInfo.phone ? `Tel: ${companyInfo.phone}` : ''}${companyInfo.phone && companyInfo.email ? ' | ' : ''}${companyInfo.email ? `Email: ${companyInfo.email}` : ''}</p>` : ''}
        </div>
      ` : '';
      
      document.body.innerHTML = `<style>
          body { font-family: sans-serif; color: #334155; }
          .price-table-print { padding: 1rem; padding-bottom: 3rem; }
          .company-header { text-align: center; margin-bottom: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; }
          .company-header .logo { max-height: 70px; margin: 0 auto 1rem; display: block; }
          .company-header p { font-size: 0.9rem; margin: 2px 0; color: #475569; }
          .price-table-print .main-title { font-size: 1.8rem; font-weight: 600; margin-bottom: 1.5rem; color: #1e293b; text-align: center; }
          .price-table-print h4 { font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid #e2e8f0; }
          .price-table-print table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1.5rem; page-break-inside: auto; }
          .price-table-print tr { page-break-inside: avoid; page-break-after: auto; }
          .price-table-print th, .price-table-print td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: middle; }
          .price-table-print th { background-color: #f8fafc; font-size: 0.75rem; text-transform: uppercase; }
          .price-table-print td img { max-width: 60px; max-height: 60px; object-fit: cover; border-radius: 0.25rem; }
       </style>
       <div class="price-table-print">
         ${companyHeaderHtml}
         <h2 class="main-title">${title}</h2>
         ${printHtml}
       </div>`;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const handleExportPdfPriceTable = async () => {
    const input = priceTableRef.current;
    // @ts-ignore
    if (!input || !window.html2canvas || !window.jspdf) {
      alert("Erro ao carregar recursos para gerar PDF. Tente novamente.");
      return;
    }
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0px';
    container.style.width = '210mm';
    container.style.height = 'auto';
    container.style.overflow = 'visible';
    container.style.padding = '20px';
    container.style.boxSizing = 'border-box';
    container.style.fontFamily = 'sans-serif';
    container.style.color = '#334155';
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '-9999';

    const title = companyInfo?.name || 'Tabela de Preços';

    if (companyInfo) {
        const companyHeaderDiv = document.createElement('div');
        companyHeaderDiv.style.textAlign = 'center';
        companyHeaderDiv.style.marginBottom = '1rem';
        companyHeaderDiv.style.paddingBottom = '1rem';
        companyHeaderDiv.style.borderBottom = '1px solid #e2e8f0';

        if (logo) {
            const logoImg = document.createElement('img');
            logoImg.src = logo;
            logoImg.style.maxHeight = '65px';
            logoImg.style.margin = '0 auto 0.75rem';
            logoImg.style.display = 'block';
            companyHeaderDiv.appendChild(logoImg);
        }
        
        if (companyInfo.address) {
          const address = document.createElement('p');
          address.textContent = `${companyInfo.address}, ${companyInfo.city || ''} - ${companyInfo.zipCode || ''}`;
          address.style.fontSize = '0.85rem'; address.style.margin = '2px 0'; address.style.color = '#475569';
          companyHeaderDiv.appendChild(address);
        }

        if (companyInfo.cnpj) {
          const cnpj = document.createElement('p');
          cnpj.textContent = `CNPJ: ${companyInfo.cnpj}`;
          cnpj.style.fontSize = '0.85rem'; cnpj.style.margin = '2px 0'; cnpj.style.color = '#475569';
          companyHeaderDiv.appendChild(cnpj);
        }

        if (companyInfo.phone || companyInfo.email) {
          const contact = document.createElement('p');
          contact.textContent = `${companyInfo.phone ? `Tel: ${companyInfo.phone}` : ''}${companyInfo.phone && companyInfo.email ? ' | ' : ''}${companyInfo.email ? `Email: ${companyInfo.email}` : ''}`;
          contact.style.fontSize = '0.85rem'; contact.style.margin = '2px 0'; contact.style.color = '#475569';
          companyHeaderDiv.appendChild(contact);
        }
        container.appendChild(companyHeaderDiv);
    }
    
    const header = document.createElement('h2');
    header.textContent = title;
    header.style.fontSize = '1.6rem';
    header.style.fontWeight = '600';
    header.style.marginBottom = '1rem';
    header.style.color = '#1e293b';
    header.style.textAlign = 'center';
    container.appendChild(header);
    
    const clonedInput = input.cloneNode(true) as HTMLElement;
    container.appendChild(clonedInput);
    document.body.appendChild(container);

    try {
      // Small pause to ensure image rendering inside DOM
      await new Promise(resolve => setTimeout(resolve, 100));

      const fullHeight = Math.max(container.scrollHeight, container.offsetHeight, 800);
      const fullWidth = Math.max(container.scrollWidth, container.offsetWidth, 794);

      // @ts-ignore
      const canvas = await window.html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: fullWidth,
          windowHeight: fullHeight,
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
          // Scale down proportionally to fit all items on 1 page cleanly without truncation
          const scale = printableHeight / imgHeightInPdf;
          const scaledWidth = printableWidth * scale;
          const xOffset = margin + (printableWidth - scaledWidth) / 2;
          pdf.addImage(imgData, 'PNG', xOffset, margin, scaledWidth, printableHeight);
      } else {
          // Multi-page document
          let heightLeft = imgHeightInPdf;
          let pageCount = 0;

          while (heightLeft > 0) {
              if (pageCount > 0) {
                  pdf.addPage();
              }
              const position = margin - (pageCount * printableHeight);
              pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeightInPdf);
              heightLeft -= printableHeight;
              pageCount++;
          }
      }

      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`Tabela-de-Precos-${date}.pdf`);

    } catch (error) {
        console.error("Erro ao gerar PDF da Tabela de Preços:", error);
        alert("Ocorreu um erro ao gerar o PDF.");
    } finally {
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
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
                ⚠️ Este código já está cadastrado para outro item. Não são permitidos códigos iguais.
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Código gerado automaticamente, mas pode ser editado (máx. 18 caracteres).</p>
            )}
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
          <div className={`grid ${type === 'product' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
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
          </div>
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
                                    <p className="text-slate-600 text-sm">Código: {product.code}</p>
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
                                    <p className="font-semibold text-slate-800">
                                        {product.type === 'product' ? 'Venda' : 'Valor'}: R$ {product.sellPrice.toFixed(2)}
                                    </p>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
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
                            <div>
                                <label htmlFor="priceTableSector" className="block text-sm font-medium text-slate-700 mb-1">Filtrar por Setor</label>
                                <select
                                    id="priceTableSector"
                                    value={selectedPriceTableSector}
                                    onChange={(e) => setSelectedPriceTableSector(e.target.value)}
                                    className="w-full mt-1 block pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] sm:text-sm rounded-md"
                                >
                                    <option value="all">Todos os Setores</option>
                                    {Object.keys(productsBySector).sort().map(sector => (
                                        <option key={sector} value={sector}>{sector}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2 md:justify-end">
                                <button onClick={handlePrintPriceTable} className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
                                    <PrinterIcon className="h-4 w-4 mr-2" />
                                    Imprimir
                                </button>
                                <button onClick={handleExportPdfPriceTable} className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
                                    <FileDownIcon className="h-4 w-4 mr-2" />
                                    Exportar PDF
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 border rounded-lg p-4 max-h-[50vh] overflow-auto">
                        <div ref={priceTableRef}>
                            {Object.keys(productsBySector).sort()
                            .filter(sector => selectedPriceTableSector === 'all' || sector === selectedPriceTableSector)
                            .map(sector => (
                            <div key={sector} className="mb-8 last:mb-0">
                                <h4 className="text-xl font-semibold text-slate-800 mb-3 pb-2 border-b">{sector}</h4>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                        {quoteSettings.showImageInPriceTable && <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-24">Imagem</th>}
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Preço de Venda</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {productsBySector[sector].map(product => (
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
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-slate-900">
                                                {product.name.charAt(0).toUpperCase() + product.name.slice(1).toLowerCase()}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600">R$ {product.sellPrice.toFixed(2)}</td>
                                        </tr>
                                        ))}
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
