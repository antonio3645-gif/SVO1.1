
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Product, QuoteSettings, CompanyInfo } from '../types';
import { compressImage } from '../utils/storage';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Layers, 
  Boxes, 
  X, 
  Printer, 
  PieChart, 
  Percent, 
  PackageCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { PackagePlusIcon } from './icons/PackagePlusIcon';
import { FileDownIcon } from './icons/FileDownIcon';
import { FileUpIcon } from './icons/FileUpIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { PriceTagIcon } from './icons/PriceTagIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { CameraIcon } from './icons/CameraIcon';
import { ProductImageZoom } from './ProductImageZoom';


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
  const [returnToProductAfterSectorAdd, setReturnToProductAfterSectorAdd] = useState(false);
  const newSectorInputRef = useRef<HTMLInputElement>(null);
  const [selectedPriceTableSector, setSelectedPriceTableSector] = useState('all');
  const [priceTableSortBy, setPriceTableSortBy] = useState<'name' | 'code' | 'internalCode'>('name');
  const [sectorModalAction, setSectorModalAction] = useState<'print' | 'pdf' | 'whatsapp' | null>(null);
  const [showTotalsModal, setShowTotalsModal] = useState(false);
  const [totalsScope, setTotalsScope] = useState<'all' | 'filtered'>('all');
  const [totalsTab, setTotalsTab] = useState<'overview' | 'sectors'>('overview');
  const [lastUpdatedInfo, setLastUpdatedInfo] = useState<{ name: string; date: string } | null>(null);
  const priceTableRef = useRef<HTMLDivElement>(null);

  const handleGoToSectorManager = () => {
    setReturnToProductAfterSectorAdd(true);
    setActiveView('tools');
    setTimeout(() => {
      if (newSectorInputRef.current) {
        newSectorInputRef.current.focus();
        newSectorInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  };

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

  // Estados para Câmera / Tirar Foto (Computador e Celular)
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    setIsCameraLoading(true);
    setCameraError(null);
    setCapturedPhoto(null);
    stopCameraStream();

    if (!navigator?.mediaDevices?.getUserMedia) {
      setIsCameraLoading(false);
      setCameraError('Seu navegador ou dispositivo não possui suporte para acesso direto à câmera. Utilize a opção "Câmera do Celular / Arquivo".');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback para dispositivos onde restrições ideais não são suportadas (ex: webcams convencionais de PC)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Reprodução automática do vídeo:", playErr);
        }
      }
      setIsCameraLoading(false);
    } catch (err: any) {
      console.error('Erro ao acessar a câmera:', err);
      setIsCameraLoading(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Permissão da câmera negada. Por favor, autorize o acesso à câmera nas configurações do seu navegador para tirar a foto.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Nenhuma câmera foi detectada neste computador ou celular.');
      } else {
        setCameraError(`Não foi possível iniciar a câmera: ${err.message || 'Erro desconhecido'}`);
      }
    }
  };

  const handleOpenInteractiveCamera = () => {
    setIsCameraOpen(true);
    // Timeout para garantir que o elemento <video> esteja montado no DOM antes de associar o stream
    setTimeout(() => {
      startCamera(cameraFacingMode);
    }, 50);
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedPhoto(null);
    setCameraError(null);
  };

  const handleToggleFacingMode = () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    if (videoRef.current && mediaStreamRef.current) {
      videoRef.current.play().catch(console.error);
    }
  };

  const handleConfirmCapturedPhoto = async () => {
    if (!capturedPhoto) return;
    try {
      const compressed = await compressImage(capturedPhoto, 400, 400, 0.7);
      setImage(compressed);
    } catch {
      setImage(capturedPhoto);
    }
    handleCloseCamera();
  };

  const handleOpenNativeCamera = () => {
    if (nativeCameraInputRef.current) {
      nativeCameraInputRef.current.click();
    }
  };

  // Encerrar stream ao desmontar o componente
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

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
    if (nativeCameraInputRef.current) {
        nativeCameraInputRef.current.value = '';
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de limite de caracteres
    const finalCode = code.slice(0, 28).trim();
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

    const nowIso = new Date().toISOString();
    const formattedNow = formatDateTime(nowIso);

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
            updatedAt: nowIso,
        });
        setLastUpdatedInfo({ name: finalName, date: formattedNow });
        alert(`Item "${finalName}" atualizado com sucesso em ${formattedNow}!`);
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
          updatedAt: nowIso,
        });
        setLastUpdatedInfo({ name: finalName, date: formattedNow });
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

  const targetTotalsProducts = totalsScope === 'filtered' ? filteredProducts : products;

  const totalsData = useMemo(() => {
    let totalCostUnitary = 0;
    let totalSellUnitary = 0;
    let totalCostStock = 0;
    let totalSellStock = 0;
    let totalStockUnits = 0;
    let productsCount = 0;
    let servicesCount = 0;
    let zeroStockCount = 0;

    const sectorMap: Record<string, {
      sectorName: string;
      count: number;
      stockUnits: number;
      costUnitary: number;
      sellUnitary: number;
      costStock: number;
      sellStock: number;
    }> = {};

    targetTotalsProducts.forEach(p => {
      const cost = Number(p.costPrice) || 0;
      const discount = Number(p.discountPercent) || 0;
      const actualSell = Number(p.sellPrice) * (1 - Math.min(100, Math.max(0, discount)) / 100) || 0;
      const stock = Number(p.stock) || 0;
      const isService = p.type === 'service';

      if (isService) {
        servicesCount++;
      } else {
        productsCount++;
        totalStockUnits += stock;
        if (stock <= 0) zeroStockCount++;
      }

      totalCostUnitary += cost;
      totalSellUnitary += actualSell;

      const stockMultiplier = isService ? (stock > 0 ? stock : 1) : stock;
      totalCostStock += cost * stockMultiplier;
      totalSellStock += actualSell * stockMultiplier;

      const sectorKey = p.sector?.trim() || 'Sem Setor';
      if (!sectorMap[sectorKey]) {
        sectorMap[sectorKey] = {
          sectorName: sectorKey,
          count: 0,
          stockUnits: 0,
          costUnitary: 0,
          sellUnitary: 0,
          costStock: 0,
          sellStock: 0,
        };
      }
      sectorMap[sectorKey].count++;
      sectorMap[sectorKey].stockUnits += stock;
      sectorMap[sectorKey].costUnitary += cost;
      sectorMap[sectorKey].sellUnitary += actualSell;
      sectorMap[sectorKey].costStock += cost * stockMultiplier;
      sectorMap[sectorKey].sellStock += actualSell * stockMultiplier;
    });

    const totalProfitStock = totalSellStock - totalCostStock;
    const marginStock = totalSellStock > 0 ? (totalProfitStock / totalSellStock) * 100 : 0;
    const markupStock = totalCostStock > 0 ? (totalProfitStock / totalCostStock) * 100 : 0;

    const totalProfitUnitary = totalSellUnitary - totalCostUnitary;
    const marginUnitary = totalSellUnitary > 0 ? (totalProfitUnitary / totalSellUnitary) * 100 : 0;
    const markupUnitary = totalCostUnitary > 0 ? (totalProfitUnitary / totalCostUnitary) * 100 : 0;

    const sectorsList = Object.values(sectorMap).sort((a, b) => b.sellStock - a.sellStock);

    return {
      totalCostUnitary,
      totalSellUnitary,
      totalProfitUnitary,
      marginUnitary,
      markupUnitary,
      totalCostStock,
      totalSellStock,
      totalProfitStock,
      marginStock,
      markupStock,
      totalStockUnits,
      productsCount,
      servicesCount,
      zeroStockCount,
      totalItems: targetTotalsProducts.length,
      sectorsList,
    };
  }, [targetTotalsProducts]);

  const handlePrintTotalsReport = () => {
    const scopeLabel = totalsScope === 'filtered' 
      ? `Itens Filtrados na Busca (${totalsData.totalItems} itens)` 
      : `Todos os Itens Cadastrados (${totalsData.totalItems} itens)`;

    const companyHeaderHtml = companyInfo ? `
      <div style="text-align: center; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
        ${logo ? `<img src="${logo}" style="max-height: 50px; margin: 0 auto 6px; display: block;" alt="Logo" />` : ''}
        <h3 style="margin: 0; font-size: 16px; color: #0f172a;">${companyInfo.name || ''}</h3>
        ${companyInfo.cnpj ? `<p style="margin: 2px 0; font-size: 11px; color: #64748b;">CNPJ: ${companyInfo.cnpj}</p>` : ''}
        ${companyInfo.phone ? `<p style="margin: 2px 0; font-size: 11px; color: #64748b;">Telefone: ${companyInfo.phone}</p>` : ''}
      </div>
    ` : '';

    const sectorsTableHtml = totalsData.sectorsList.map(s => {
      const profit = s.sellStock - s.costStock;
      const margin = s.sellStock > 0 ? ((profit / s.sellStock) * 100).toFixed(1) : '0.0';
      return `
        <tr>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600;">${s.sectorName}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${s.count}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${s.stockUnits}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; color: #475569;">R$ ${s.costStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600; color: #047857;">R$ ${s.sellStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600; color: #0284c7;">R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: 600; color: #059669;">${margin}%</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Valores de Produtos e Estoque</title>
          <style>
            @media print {
              @page { margin: 10mm; size: portrait; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 20px; font-size: 12px; }
            h1 { font-size: 20px; margin: 0 0 4px; color: #0f172a; text-align: center; }
            .subtitle { font-size: 12px; color: #64748b; text-align: center; margin-bottom: 16px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
            .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc; }
            .card-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #475569; margin-bottom: 6px; }
            .card-value { font-size: 18px; font-weight: 800; color: #0f172a; }
            .card-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { background-color: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; font-weight: 700; text-align: left; }
            .footer { margin-top: 25px; text-align: right; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          </style>
        </head>
        <body>
          ${companyHeaderHtml}
          <h1>Relatório Geral de Valores e Estoque</h1>
          <div class="subtitle">Escopo: <strong>${scopeLabel}</strong> • Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
          
          <div class="grid">
            <div class="card" style="border-left: 4px solid #64748b;">
              <div class="card-title">Custo Total em Estoque</div>
              <div class="card-value" style="color: #334155;">R$ ${totalsData.totalCostStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="card-sub">Custo Unitário Somado: R$ ${totalsData.totalCostUnitary.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

            <div class="card" style="border-left: 4px solid #10b981;">
              <div class="card-title">Venda Total em Estoque (Faturamento)</div>
              <div class="card-value" style="color: #047857;">R$ ${totalsData.totalSellStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="card-sub">Venda Unitária Somada: R$ ${totalsData.totalSellUnitary.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

            <div class="card" style="border-left: 4px solid #0284c7;">
              <div class="card-title">Lucro Bruto Projetado em Estoque</div>
              <div class="card-value" style="color: #0284c7;">R$ ${totalsData.totalProfitStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="card-sub">Margem Global: ${totalsData.marginStock.toFixed(1)}% • Markup: ${totalsData.markupStock.toFixed(1)}%</div>
            </div>

            <div class="card" style="border-left: 4px solid #f59e0b;">
              <div class="card-title">Volumes e Peças Cadastradas</div>
              <div class="card-value" style="color: #b45309;">${totalsData.totalStockUnits} Unidades em Estoque</div>
              <div class="card-sub">${totalsData.totalItems} Itens (${totalsData.productsCount} Produtos, ${totalsData.servicesCount} Serviços)</div>
            </div>
          </div>

          <h3 style="font-size: 13px; font-weight: 700; margin: 18px 0 6px; color: #1e293b;">Detalhamento por Setor</h3>
          <table>
            <thead>
              <tr>
                <th>Setor</th>
                <th style="text-align: center;">Itens</th>
                <th style="text-align: center;">Estoque</th>
                <th style="text-align: right;">Custo Total</th>
                <th style="text-align: right;">Venda Total</th>
                <th style="text-align: right;">Lucro Bruto</th>
                <th style="text-align: center;">Margem</th>
              </tr>
            </thead>
            <tbody>
              ${sectorsTableHtml}
            </tbody>
          </table>

          <div class="footer">
            Documento gerado pelo Sistema de Gerenciamento e Orçamentos
          </div>
        </body>
      </html>
    `;

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
      doc.write(htmlContent);
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
    }
  };
  
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

    const dataToExport = products.map(({ type, code, internalCode, name, costPrice, sellPrice, stock, sector, observation, discountPercent, updatedAt }) => ({
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
        updatedAt: updatedAt || '',
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
                const { type, code, internalCode, name, costPrice, sellPrice, stock, sector, observation, discountPercent, updatedAt } = row;
                
                // Basic validation
                // Use parseNumber to check sellPrice validity
                if (!code || !name || isNaN(parseNumber(sellPrice))) {
                    errors.push(`Linha ${index + 2}: Dados inválidos ou faltando.`);
                    return;
                }

                const trimmedCode = String(code).trim().slice(0, 28);
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
                    updatedAt: updatedAt ? String(updatedAt) : new Date().toISOString(),
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

      // Se veio da tela de cadastro de produto, retorna automaticamente com o novo setor selecionado
      if (returnToProductAfterSectorAdd) {
        setSector(trimmedSector);
        setActiveView('list');
        setReturnToProductAfterSectorAdd(false);
        setTimeout(() => {
          const sectorSelect = document.getElementById('sector');
          if (sectorSelect) {
            sectorSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
            sectorSelect.focus();
          }
        }, 150);
      }
    } else if (!trimmedSector) {
      alert("O nome do setor não pode estar vazio.");
    } else {
      // Se o setor já existe e o usuário estava querendo selecioná-lo no produto
      if (returnToProductAfterSectorAdd) {
        setSector(trimmedSector);
        setActiveView('list');
        setReturnToProductAfterSectorAdd(false);
        alert(`O setor "${trimmedSector}" já existe e foi selecionado no produto.`);
        return;
      }
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
      grouped[sector].sort((a, b) => {
        if (priceTableSortBy === 'code') {
          const codeCmp = (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' });
          if (codeCmp !== 0) return codeCmp;
          return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        }
        if (priceTableSortBy === 'internalCode') {
          const intCmp = (a.internalCode || '').localeCompare(b.internalCode || '', undefined, { numeric: true, sensitivity: 'base' });
          if (intCmp !== 0) return intCmp;
          return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        }
        // Padrão: por item (nome em ordem alfabética)
        const nameCmp = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        if (nameCmp !== 0) return nameCmp;
        return (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' });
      });
    }
    return grouped;
  }, [products, quoteSettings.sectors, priceTableSortBy]);

  const getSortedSectorProducts = (sectorName: string, sectorProducts: Product[]): Product[] => {
    const isAllSectors = sectorName === 'all' || sectorName === 'Todos os Setores' || sectorName.includes('Todos os Setores');
    const items = isAllSectors
      ? [...sectorProducts]
      : sectorProducts.filter(p => {
          const pSector = p.sector && p.sector.trim() !== '' ? p.sector : 'Sem Setor';
          return pSector === sectorName;
        });

    return items.sort((a, b) => {
      if (priceTableSortBy === 'code') {
        const codeCmp = (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' });
        if (codeCmp !== 0) return codeCmp;
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      }
      if (priceTableSortBy === 'internalCode') {
        const intCmp = (a.internalCode || '').localeCompare(b.internalCode || '', undefined, { numeric: true, sensitivity: 'base' });
        if (intCmp !== 0) return intCmp;
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      }
      const nameCmp = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      if (nameCmp !== 0) return nameCmp;
      return (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const renderPriceTableRowHTML = (product: Product): string => {
    const hasDiscount = Boolean(quoteSettings.showItemDiscountPercent && typeof product.discountPercent === 'number' && product.discountPercent > 0);
    const discountedPrice = hasDiscount 
      ? product.sellPrice * (1 - product.discountPercent! / 100) 
      : product.sellPrice;

    return `
      <tr style="break-inside: avoid; page-break-inside: avoid;">
        ${quoteSettings.showImageInPriceTable ? `
          <td style="padding: 5px 6px; width: 48px; text-align: center; vertical-align: middle; border: 1px solid #cbd5e1;">
            ${product.image ? `<img src="${product.image}" alt="${product.name}" style="max-width: 42px; max-height: 42px; object-fit: cover; border-radius: 4px; display: block; margin: 0 auto;"/>` : '<span style="font-size: 10px; color: #94a3b8;">Sem foto</span>'}
          </td>
        ` : ''}
        <td style="padding: 6px 8px; font-size: 12px; color: #64748b; white-space: nowrap; vertical-align: middle; border: 1px solid #cbd5e1;">${product.code || '-'}</td>
        ${quoteSettings.showInternalCodeInPriceTable ? `
          <td style="padding: 6px 8px; font-size: 12px; font-weight: 600; color: #3730a3; white-space: nowrap; vertical-align: middle; border: 1px solid #cbd5e1;">
            ${product.internalCode || '-'}
          </td>
        ` : ''}
        <td style="padding: 6px 8px; font-size: 12.5px; font-weight: 500; color: #0f172a; vertical-align: middle; border: 1px solid #cbd5e1; word-break: break-word;">${product.name.charAt(0).toUpperCase() + product.name.slice(1).toLowerCase()}</td>
        ${quoteSettings.showStockInPriceTable ? `
          <td style="padding: 6px 8px; font-size: 12px; text-align: center; vertical-align: middle; white-space: nowrap; border: 1px solid #cbd5e1;">
            ${product.type === 'service'
              ? '<span style="color: #94a3b8; font-size: 11px;">-</span>'
              : `<span style="font-weight: 600; color: ${product.stock > 0 ? '#1e293b' : '#dc2626'};">${product.stock}</span>`}
          </td>
        ` : ''}
        ${quoteSettings.showItemDiscountPercent ? `
          <td style="padding: 6px 8px; font-size: 12px; text-align: right; color: #334155; vertical-align: middle; white-space: nowrap; border: 1px solid #cbd5e1;">
            R$ ${product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td style="padding: 6px 8px; font-size: 12px; text-align: center; vertical-align: middle; white-space: nowrap; border: 1px solid #cbd5e1;">
            ${hasDiscount ? `
              <span style="display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: bold; background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 4px;">
                ${product.discountPercent}%
              </span>
            ` : '<span style="color: #94a3b8;">-</span>'}
          </td>
          <td style="padding: 6px 8px; font-size: 12.5px; text-align: right; vertical-align: middle; white-space: nowrap; border: 1px solid #cbd5e1; ${hasDiscount ? 'font-weight: bold; color: #059669;' : 'font-weight: 500; color: #334155;'}">
            R$ ${discountedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        ` : `
          <td style="padding: 6px 8px; font-size: 12.5px; font-weight: 500; text-align: right; color: #334155; vertical-align: middle; white-space: nowrap; border: 1px solid #cbd5e1;">
            R$ ${product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        `}
      </tr>
    `;
  };

  const renderPriceTableHeaderHTML = (): string => {
    return `
      <thead>
        <tr style="background-color: #f8fafc;">
          ${quoteSettings.showImageInPriceTable ? '<th style="padding: 7px 6px; text-align: center; width: 48px; font-size: 11px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1;">Imagem</th>' : ''}
          <th style="padding: 7px 8px; text-align: left; width: 80px; font-size: 11px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1;">Código</th>
          ${quoteSettings.showInternalCodeInPriceTable ? '<th style="padding: 7px 8px; text-align: left; width: 95px; font-size: 11px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1;">Cód. Interno</th>' : ''}
          <th style="padding: 7px 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1;">Item</th>
          ${quoteSettings.showStockInPriceTable ? '<th style="padding: 7px 8px; text-align: center; width: 75px; font-size: 11px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1;">Estoque</th>' : ''}
          ${quoteSettings.showItemDiscountPercent ? `
            <th style="padding: 7px 8px; text-align: right; width: 115px; font-size: 11px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1;">Preço Tabela</th>
            <th style="padding: 7px 6px; text-align: center; width: 80px; font-size: 11px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1;">Desconto</th>
            <th style="padding: 7px 8px; text-align: right; width: 115px; font-size: 11px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1;">Preço Final</th>
          ` : `
            <th style="padding: 7px 8px; text-align: right; width: 115px; font-size: 11px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1;">Preço Venda</th>
          `}
        </tr>
      </thead>
    `;
  };

  const measureRowHeights = (items: Product[]): number[] => {
    const testDiv = document.createElement('div');
    testDiv.style.cssText = 'position:absolute;left:-9999px;top:0;width:794px;visibility:hidden;box-sizing:border-box;padding:0 30px;';
    const testTable = document.createElement('table');
    testTable.style.cssText = 'width:100%;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
    const testTbody = document.createElement('tbody');
    testTable.appendChild(testTbody);
    testDiv.appendChild(testTable);
    document.body.appendChild(testDiv);

    const heights: number[] = [];
    try {
      items.forEach(product => {
        const tr = document.createElement('tr');
        tr.innerHTML = renderPriceTableRowHTML(product);
        testTbody.appendChild(tr);
      });
      const rows = testTbody.querySelectorAll('tr');
      rows.forEach(r => {
        const h = (r as HTMLElement).offsetHeight || 0;
        heights.push(Math.max(h, 34));
      });
    } catch (err) {
      console.warn("Aviso ao medir linhas da tabela de preços:", err);
    } finally {
      if (document.body.contains(testDiv)) {
        document.body.removeChild(testDiv);
      }
    }

    const defaultH = quoteSettings.showImageInPriceTable ? 52 : 36;
    return items.map((_, idx) => heights[idx] || defaultH);
  };

  const paginatePriceTableProducts = (productsToPaginate: Product[]): Product[][] => {
    if (productsToPaginate.length === 0) return [];

    const heights = measureRowHeights(productsToPaginate);
    const page1Limit = companyInfo ? (logo ? 750 : 790) : 830;
    const nextPageLimit = 890;

    const pages: Product[][] = [];
    let currentPage: Product[] = [];
    let currentH = 0;
    let isFirstPage = true;

    for (let i = 0; i < productsToPaginate.length; i++) {
      const rowH = heights[i];
      const limit = isFirstPage ? page1Limit : nextPageLimit;

      if (currentPage.length > 0 && (currentH + rowH > limit)) {
        pages.push(currentPage);
        currentPage = [productsToPaginate[i]];
        currentH = rowH;
        isFirstPage = false;
      } else {
        currentPage.push(productsToPaginate[i]);
        currentH += rowH;
      }
    }
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }
    return pages;
  };

  const renderPriceTablePageHTML = (
    pageProducts: Product[],
    pageNum: number,
    totalPages: number,
    sectorName: string,
    isAllSectors: boolean
  ): string => {
    const title = companyInfo?.name || 'Tabela de Preços';
    const now = new Date();
    const nowDateFormatted = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const sortDescription = priceTableSortBy === 'code' 
      ? 'Código' 
      : priceTableSortBy === 'internalCode' 
        ? 'Código Interno' 
        : 'Item / Ordem Alfabética';

    return `
      <div class="price-table-page" style="width: 794px; min-height: 1123px; max-height: 1123px; height: 1123px; box-sizing: border-box; padding: 24px 30px; display: flex; flex-direction: column; justify-content: space-between; background: #ffffff; page-break-after: ${pageNum < totalPages ? 'always' : 'avoid'}; break-after: ${pageNum < totalPages ? 'page' : 'avoid'}; overflow: hidden;">
        <div style="flex: 1 1 auto; display: flex; flex-direction: column;">
          ${pageNum === 1 ? `
            <!-- Cabeçalho Completo da Empresa (Página 1) -->
            <div class="company-header" style="text-align: center; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
              ${logo ? `<img src="${logo}" alt="Logotipo" style="max-height: 50px; margin: 0 auto 4px; display: block; object-fit: contain;"/>` : ''}
              ${companyInfo?.name ? `<div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">${companyInfo.name}</div>` : ''}
              ${companyInfo?.address ? `<p style="font-size: 11px; margin: 1px 0; color: #475569;">${companyInfo.address}${companyInfo.city ? `, ${companyInfo.city}` : ''}${companyInfo.zipCode ? ` - ${companyInfo.zipCode}` : ''}</p>` : ''}
              ${companyInfo?.cnpj ? `<p style="font-size: 11px; margin: 1px 0; color: #475569;">CNPJ: ${companyInfo.cnpj}</p>` : ''}
              ${companyInfo?.phone || companyInfo?.email ? `<p style="font-size: 11px; margin: 1px 0; color: #475569;">${companyInfo.phone ? `Tel: ${companyInfo.phone}` : ''}${companyInfo.phone && companyInfo.email ? ' | ' : ''}${companyInfo.email ? `Email: ${companyInfo.email}` : ''}</p>` : ''}
            </div>

            <!-- Título e Faixa do Setor com Número de Páginas -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 2px solid #2563eb;">
              <div>
                <h2 style="font-size: 17px; font-weight: 700; margin: 0; color: #1e293b;">${title}</h2>
                <div style="font-size: 12.5px; font-weight: 600; color: #2563eb; margin-top: 2px;">
                  Setor: ${sectorName}
                  <span style="font-size: 10px; font-weight: normal; color: #64748b; margin-left: 6px;">
                    (Ordenado por: ${sortDescription})
                  </span>
                </div>
              </div>
              <div style="font-size: 11px; font-weight: 700; color: #1e293b; background: #f1f5f9; padding: 4px 10px; border-radius: 4px; border: 1px solid #cbd5e1; white-space: nowrap;">
                Página ${pageNum} de ${totalPages}
              </div>
            </div>
          ` : `
            <!-- Cabeçalho Repetido Compacto (Páginas Seguintes: 2, 3...) -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #2563eb;">
              <div style="display: flex; align-items: center; gap: 8px;">
                ${logo ? `<img src="${logo}" alt="Logotipo" style="max-height: 28px; max-width: 65px; object-fit: contain; display: inline-block;"/>` : ''}
                <div>
                  <div style="font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.2;">
                    ${companyInfo?.name || 'Tabela de Preços'}
                  </div>
                  <div style="font-size: 11.5px; font-weight: 600; color: #2563eb;">
                    Setor: ${sectorName} <span style="font-size: 10px; font-weight: normal; color: #64748b;">(Continuação)</span>
                  </div>
                </div>
              </div>
              <div style="font-size: 11px; font-weight: 700; color: #1e293b; background: #f1f5f9; padding: 4px 10px; border-radius: 4px; border: 1px solid #cbd5e1; white-space: nowrap;">
                Página ${pageNum} de ${totalPages}
              </div>
            </div>
          `}

          <!-- Tabela com THEAD que repete em todas as páginas -->
          <table style="width: 100%; border-collapse: collapse; margin-top: 2px;">
            ${renderPriceTableHeaderHTML()}
            <tbody>
              ${pageProducts.map(renderPriceTableRowHTML).join('')}
            </tbody>
          </table>
        </div>

        <!-- Rodapé da Página -->
        <div style="margin-top: auto; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b;">
          <span>Tabela de Preços - ${sectorName}</span>
          <span>Gerado em: ${nowDateFormatted}</span>
          <span style="font-weight: 600; color: #334155;">Página ${pageNum} de ${totalPages}</span>
        </div>
      </div>
    `;
  };

  const handlePrintSector = (sectorName: string) => {
    const isAll = sectorName === 'all' || sectorName === 'Todos os Setores';
    const rawProducts = isAll ? products : (productsBySector[sectorName] || []);
    const sectorProducts = isAll ? products : rawProducts.filter(p => {
      const pSector = p.sector && p.sector.trim() !== '' ? p.sector : 'Sem Setor';
      return pSector === sectorName;
    });
    if (sectorProducts.length === 0) {
      alert(isAll ? "Nenhum item cadastrado no sistema." : `Nenhum item cadastrado no setor "${sectorName}".`);
      return;
    }
    const displayName = isAll ? 'Todos os Setores (Tabela Completa)' : sectorName;
    const sortedProducts = getSortedSectorProducts(displayName, sectorProducts);
    const pages = paginatePriceTableProducts(sortedProducts);
    const totalPages = pages.length;

    const pagesHtml = pages.map((pageItems, pIdx) => {
      return renderPriceTablePageHTML(
        pageItems,
        pIdx + 1,
        totalPages,
        displayName,
        isAll
      );
    }).join('');

    const fullPrintHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Tabela de Preços - ${displayName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #334155;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .price-table-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            padding: 12mm 14mm 10mm 14mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .price-table-page:not(:last-child) {
            page-break-after: always !important;
            break-after: page !important;
          }
          .price-table-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `;

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
      doc.write(fullPrintHtml);
      doc.close();
      setTimeout(() => {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(printIframe)) {
            document.body.removeChild(printIframe);
          }
        }, 1500);
      }, 350);
    } else {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = fullPrintHtml;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const handleExportPdfSector = async (sectorName: string) => {
    const isAll = sectorName === 'all' || sectorName === 'Todos os Setores';
    const rawProducts = isAll ? products : (productsBySector[sectorName] || []);
    const sectorProducts = isAll ? products : rawProducts.filter(p => {
      const pSector = p.sector && p.sector.trim() !== '' ? p.sector : 'Sem Setor';
      return pSector === sectorName;
    });
    if (sectorProducts.length === 0) {
      alert(isAll ? "Nenhum item cadastrado no sistema." : `Nenhum item cadastrado no setor "${sectorName}".`);
      return;
    }
    // @ts-ignore
    if (!window.html2canvas || !window.jspdf) {
      alert("Erro ao carregar recursos para gerar PDF. Tente novamente.");
      return;
    }

    const displayName = isAll ? 'Todos os Setores (Tabela Completa)' : sectorName;
    const sortedProducts = getSortedSectorProducts(displayName, sectorProducts);
    const pages = paginatePriceTableProducts(sortedProducts);
    const totalPages = pages.length;

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0px';
    container.style.width = '794px';
    container.style.backgroundColor = '#ffffff';
    document.body.appendChild(container);

    try {
      // @ts-ignore
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let pIdx = 0; pIdx < totalPages; pIdx++) {
        const pageHtml = renderPriceTablePageHTML(
          pages[pIdx],
          pIdx + 1,
          totalPages,
          displayName,
          isAll
        );
        container.innerHTML = pageHtml;

        // Breve espera para renderização estável das tags e fontes
        await new Promise(resolve => setTimeout(resolve, 80));

        const pageEl = container.firstElementChild as HTMLElement;

        // @ts-ignore
        const canvas = await window.html2canvas(pageEl || container, {
          scale: 2,
          useCORS: true,
          logging: false,
          width: 794,
          height: 1123,
          windowWidth: 794,
        });

        const imgData = canvas.toDataURL('image/png');
        if (pIdx > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      const date = new Date().toISOString().slice(0, 10);
      const safeSector = isAll ? 'Todos_os_Setores' : sectorName.replace(/[^a-zA-Z0-9_-]/g, '_');
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
    const isAll = sectorName === 'all' || sectorName === 'Todos os Setores';
    const sectorProducts = isAll ? products : (productsBySector[sectorName] || []).filter(p => {
      const pSector = p.sector && p.sector.trim() !== '' ? p.sector : 'Sem Setor';
      return pSector === sectorName;
    });

    if (sectorProducts.length === 0) {
      alert(isAll ? "Nenhum item encontrado no sistema." : `Nenhum item encontrado no setor "${sectorName}".`);
      return;
    }

    const titleSector = isAll ? 'TODOS OS SETORES' : sectorName.toUpperCase();
    const inputPhone = prompt(`Deseja enviar a Tabela de Preços (${titleSector}) para qual número de WhatsApp?\n(Deixe em branco para abrir o WhatsApp e escolher o contato):`);
    let phone = inputPhone ? inputPhone.replace(/\D/g, '') : '';
    if (phone && phone.length >= 10 && phone.length <= 11) {
      phone = '55' + phone;
    }

    const companyTitle = companyInfo?.name ? `*${companyInfo.name.toUpperCase()}*\n` : '';
    let message = `${companyTitle}📋 *TABELA DE PREÇOS - SETOR: ${titleSector}*\n\n`;

    sectorProducts.forEach(product => {
      const hasDiscount = Boolean(quoteSettings.showItemDiscountPercent && typeof product.discountPercent === 'number' && product.discountPercent > 0);
      const discountedPrice = hasDiscount ? product.sellPrice * (1 - (product.discountPercent || 0) / 100) : product.sellPrice;
      const internalCodeText = quoteSettings.showInternalCodeInPriceTable && product.internalCode ? ` [${product.internalCode}]` : '';
      const stockText = quoteSettings.showStockInPriceTable && product.type !== 'service' ? ` | Est: ${product.stock}` : '';

      if (hasDiscount) {
        message += `• *${product.name}*${internalCodeText}${stockText}\n  De: R$ ${product.sellPrice.toFixed(2)} | Desc: ${product.discountPercent}%\n  *Por: R$ ${discountedPrice.toFixed(2)}*\n`;
      } else {
        message += `• *${product.name}*${internalCodeText}${stockText}: *R$ ${product.sellPrice.toFixed(2)}*\n`;
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
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
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
                <span className={`text-xs ${code.length >= 28 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                  {code.length}/28
                </span>
              </div>
              <input 
                  type="text" 
                  id="code" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value.slice(0, 28))} 
                  maxLength={28}
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
                <p className="text-xs text-slate-500 mt-1">Código do item (máx. 28).</p>
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
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="sector" className="block text-sm font-medium text-slate-700">Setor</label>
              <button
                type="button"
                onClick={handleGoToSectorManager}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[--color-primary-600] hover:text-[--color-primary-800] hover:underline"
                title="Cadastrar um novo setor no Gerenciador de Setores"
              >
                <span>+ Novo Setor</span>
              </button>
            </div>
            <select
              id="sector"
              value={sector}
              onChange={(e) => {
                if (e.target.value === '__NEW_SECTOR__') {
                  handleGoToSectorManager();
                } else {
                  setSector(e.target.value);
                }
              }}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]"
            >
              <option value="">Nenhum</option>
              {quoteSettings.sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="__NEW_SECTOR__" className="font-semibold text-blue-600">+ Cadastrar Novo Setor...</option>
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="productImage" className="block text-sm font-medium text-slate-700">Imagem (Opcional)</label>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <CameraIcon className="w-3.5 h-3.5 text-blue-600" />
                Câmera / Arquivo
              </span>
            </div>

            <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-20 w-20 rounded-lg bg-white border border-slate-300 flex items-center justify-center overflow-hidden shadow-2xs relative group">
                  {image ? (
                    <ProductImageZoom src={image} alt="Pré-visualização do produto" className="h-full w-full object-cover" containerClassName="h-full w-full relative" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                      <CameraIcon className="w-6 h-6 mb-0.5 opacity-60" />
                      <span className="text-[10px] leading-tight font-medium">Sem foto</span>
                    </div>
                  )}
                </div>

                <div className="flex-grow space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenInteractiveCamera}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      title="Abrir câmera para tirar foto do produto (funciona no PC/Notebook e Celular)"
                    >
                      <CameraIcon className="w-4 h-4" />
                      <span>Tirar Foto (Câmera)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenNativeCamera}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-medium transition-colors sm:hidden"
                      title="Abrir aplicativo nativo de câmera do smartphone"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Câmera Celular</span>
                    </button>

                    {image && (
                      <button
                        type="button"
                        onClick={() => {
                          setImage(null);
                          const imageInput = document.getElementById('productImage') as HTMLInputElement;
                          if (imageInput) imageInput.value = '';
                          if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors border border-red-200 bg-white"
                        title="Remover foto do produto"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <input
                      type="file"
                      id="productImage"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-xs text-slate-600
                        file:mr-3 file:py-1.5 file:px-3
                        file:rounded-md file:border-0
                        file:text-xs file:font-semibold
                        file:bg-white file:text-slate-700 file:border file:border-slate-300
                        hover:file:bg-slate-100 cursor-pointer
                      "
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span>💡</span>
                <span>
                  No computador (webcam) ou no celular, clique em <strong>Tirar Foto (Câmera)</strong> para capturar a imagem do produto instantaneamente.
                </span>
              </p>

              {/* Input oculto com acionamento nativo de câmera mobile (capture="environment") */}
              <input
                type="file"
                ref={nativeCameraInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>
          <div className={`grid ${type === 'product' ? (quoteSettings.showItemDiscountPercent ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2') : (quoteSettings.showItemDiscountPercent ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')} gap-4`}>
            {type === 'product' && (
                <div>
                    <label htmlFor="costPrice" className="block text-sm font-medium text-slate-700">Custo (R$)</label>
                    <input type="number" step="0.01" id="costPrice" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" required />
                </div>
            )}
            <div>
              <label htmlFor="sellPrice" className="block text-sm font-medium text-slate-700">{type === 'product' ? 'Venda (R$)' : 'Valor Mão de Obra (R$)'}</label>
              <input type="number" step="0.01" id="sellPrice" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" required />
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
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="Ex: 10" 
                  className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
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
                <input type="number" id="stock" value={stock} onChange={(e) => setStock(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" required />
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

          {/* Espaço permanente com a Data da Última Atualização no formulário */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Data da Última Atualização
              </label>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                editingProduct?.updatedAt
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {editingProduct?.updatedAt ? 'Data Gravada' : 'Automática'}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-800">
              {editingProduct
                ? (editingProduct.updatedAt ? formatDateTime(editingProduct.updatedAt) : 'Sem data gravada anteriormente (será gravada ao salvar)')
                : (lastUpdatedInfo ? `Última gravação realizada: ${lastUpdatedInfo.date}` : 'A data e hora serão registradas automaticamente ao salvar')}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {editingProduct
                ? 'Ao clicar em "Salvar Alterações", esta data será atualizada para o momento exato do salvamento.'
                : 'Sempre que adicionar ou atualizar este item, a data da última alteração fica salva e visível aqui.'}
            </p>
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
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setShowTotalsModal(true)}
                            className="inline-flex items-center px-3.5 py-2 border border-emerald-300 rounded-md shadow-sm text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all cursor-pointer"
                            title="Ver valores totais de custo e venda de todos os produtos cadastrados"
                        >
                            <Calculator className="mr-2 h-4 w-4 text-emerald-600" />
                            <span>Valores Totais</span>
                            <span className="hidden md:inline ml-1 text-xs text-emerald-700 font-normal">(Custo & Venda)</span>
                        </button>

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
                        <input type="number" step="0.01" id="minCostPrice" value={minCostPrice} onChange={(e) => setMinCostPrice(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0.00" />
                    </div>
                    <div>
                        <label htmlFor="maxCostPrice" className="block text-sm font-medium text-slate-700">Custo Máx. (R$)</label>
                        <input type="number" step="0.01" id="maxCostPrice" value={maxCostPrice} onChange={(e) => setMaxCostPrice(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="100.00" />
                    </div>
                     <div>
                        <label htmlFor="minSellPrice" className="block text-sm font-medium text-slate-700">Venda Mín. (R$)</label>
                        <input type="number" step="0.01" id="minSellPrice" value={minSellPrice} onChange={(e) => setMinSellPrice(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0.00" />
                    </div>
                    <div>
                        <label htmlFor="maxSellPrice" className="block text-sm font-medium text-slate-700">Venda Máx. (R$)</label>
                        <input type="number" step="0.01" id="maxSellPrice" value={maxSellPrice} onChange={(e) => setMaxSellPrice(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="200.00" />
                    </div>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                    <div key={product.id} className={`bg-white p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-start space-x-4 border-l-4 ${product.type === 'service' ? 'border-l-blue-500' : 'border-l-transparent'}`}>
                        {product.image && (
                            <div className="flex-shrink-0 h-20 w-20">
                                <ProductImageZoom src={product.image} alt={product.name} className="h-full w-full object-cover rounded-md" containerClassName="h-full w-full relative" />
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
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className="text-lg font-medium text-slate-700">Gerenciamento de Setores</h3>
                        {returnToProductAfterSectorAdd && (
                            <button
                                type="button"
                                onClick={() => {
                                    setReturnToProductAfterSectorAdd(false);
                                    setActiveView('list');
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-md transition-colors shadow-2xs"
                            >
                                <span>← Voltar ao Cadastro de Produtos</span>
                            </button>
                        )}
                    </div>

                    {returnToProductAfterSectorAdd && (
                        <div className="mb-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-3 animate-in fade-in">
                            <div className="flex items-center gap-2.5">
                                <span className="text-lg">💡</span>
                                <div>
                                    <strong className="block font-semibold">Novo setor para o seu produto:</strong>
                                    <span>Digite o nome do setor e clique em <strong>Adicionar</strong>. O sistema retornará automaticamente para o cadastro do produto com o setor selecionado!</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setReturnToProductAfterSectorAdd(false);
                                    setActiveView('list');
                                }}
                                className="text-blue-700 hover:text-blue-900 underline font-medium shrink-0 text-xs"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}

                    <p className="text-sm text-slate-500 mb-4">Crie setores para categorizar seus itens.</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            ref={newSectorInputRef}
                            value={newSector}
                            onChange={(e) => setNewSector(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddSector();
                                }
                            }}
                            placeholder="Nome do novo setor (ex: Ferragens, Elétrica, Pintura...)"
                            className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]"
                        />
                        <button 
                            type="button"
                            onClick={handleAddSector} 
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[--color-primary-600] hover:bg-[--color-primary-700] transition-colors"
                        >
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
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            {/* Ordenação da Tabela - Escolher entre Código ou Item */}
                            <div>
                                <label htmlFor="priceTableSort" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                                    </svg>
                                    Ordenar Tabela por
                                </label>
                                <select
                                    id="priceTableSort"
                                    value={priceTableSortBy}
                                    onChange={(e) => setPriceTableSortBy(e.target.value as 'name' | 'code' | 'internalCode')}
                                    className="w-full mt-1 block pl-3 pr-8 py-2 text-sm border-slate-300 focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] rounded-md bg-white shadow-2xs font-medium text-slate-800"
                                >
                                    <option value="name">🔤 Ordem Alfabética por Item (Nome)</option>
                                    <option value="code">🔢 Ordem por Código</option>
                                    {quoteSettings.showInternalCodeInPriceTable && (
                                        <option value="internalCode">🏷️ Ordem por Código Interno</option>
                                    )}
                                </select>
                            </div>

                            {/* Filtro por Setor */}
                            <div>
                                <label htmlFor="priceTableSector" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Filtrar por Setor</label>
                                <select
                                    id="priceTableSector"
                                    value={selectedPriceTableSector}
                                    onChange={(e) => setSelectedPriceTableSector(e.target.value)}
                                    className="w-full mt-1 block pl-3 pr-8 py-2 text-sm border-slate-300 focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] rounded-md bg-white shadow-2xs font-medium text-slate-800"
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

                            {/* Toggles de Exibição */}
                            <div className="flex flex-wrap items-center gap-3 py-1">
                                <div className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => onSetQuoteSettings({ ...quoteSettings, showImageInPriceTable: !quoteSettings.showImageInPriceTable })}
                                        className={`${
                                            quoteSettings.showImageInPriceTable ? 'bg-[--color-primary-600]' : 'bg-slate-300'
                                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500] mr-2`}
                                        role="switch"
                                        aria-checked={quoteSettings.showImageInPriceTable}
                                    >
                                        <span className={`${
                                            quoteSettings.showImageInPriceTable ? 'translate-x-5' : 'translate-x-0'
                                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                                        />
                                    </button>
                                    <label className="text-xs font-medium text-slate-700">Fotos</label>
                                </div>
                                <div className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => onSetQuoteSettings({ ...quoteSettings, showInternalCodeInPriceTable: !quoteSettings.showInternalCodeInPriceTable })}
                                        className={`${
                                            quoteSettings.showInternalCodeInPriceTable ? 'bg-[--color-primary-600]' : 'bg-slate-300'
                                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500] mr-2`}
                                        role="switch"
                                        aria-checked={!!quoteSettings.showInternalCodeInPriceTable}
                                    >
                                        <span className={`${
                                            quoteSettings.showInternalCodeInPriceTable ? 'translate-x-5' : 'translate-x-0'
                                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                                        />
                                    </button>
                                    <label className="text-xs font-medium text-slate-700">Cód. Interno</label>
                                </div>
                                <div className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => onSetQuoteSettings({ ...quoteSettings, showStockInPriceTable: !quoteSettings.showStockInPriceTable })}
                                        className={`${
                                            quoteSettings.showStockInPriceTable ? 'bg-[--color-primary-600]' : 'bg-slate-300'
                                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500] mr-2`}
                                        role="switch"
                                        aria-checked={!!quoteSettings.showStockInPriceTable}
                                        title="Mostrar quantidade em estoque na tabela de preços"
                                    >
                                        <span className={`${
                                            quoteSettings.showStockInPriceTable ? 'translate-x-5' : 'translate-x-0'
                                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                                        />
                                    </button>
                                    <label 
                                        onClick={() => onSetQuoteSettings({ ...quoteSettings, showStockInPriceTable: !quoteSettings.showStockInPriceTable })}
                                        className="text-xs font-medium text-slate-700 cursor-pointer flex items-center gap-1 select-none"
                                        title="Ligar ou desligar exibição de estoque na tabela de preços"
                                    >
                                        <Boxes className="w-3.5 h-3.5 text-slate-500" />
                                        Estoque
                                    </label>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex flex-wrap gap-2 justify-end items-end">
                                <button 
                                    type="button"
                                    onClick={handleTopPrintClick} 
                                    className="inline-flex items-center px-3.5 py-2 border border-slate-300 rounded-md shadow-2xs text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                    title={selectedPriceTableSector !== 'all' ? `Imprimir somente o setor "${selectedPriceTableSector}"` : "Escolher setor para imprimir"}
                                >
                                    <PrinterIcon className="h-4 w-4 mr-1.5 text-slate-500" />
                                    {selectedPriceTableSector !== 'all' ? `Imprimir (${selectedPriceTableSector})` : 'Imprimir...'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleTopPdfClick} 
                                    className="inline-flex items-center px-3.5 py-2 border border-slate-300 rounded-md shadow-2xs text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                    title={selectedPriceTableSector !== 'all' ? `Exportar PDF somente do setor "${selectedPriceTableSector}"` : "Escolher setor para gerar PDF"}
                                >
                                    <FileDownIcon className="h-4 w-4 mr-1.5 text-slate-500" />
                                    {selectedPriceTableSector !== 'all' ? `PDF (${selectedPriceTableSector})` : 'PDF...'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleTopWhatsAppClick} 
                                    className="inline-flex items-center px-3.5 py-2 border border-emerald-300 rounded-md shadow-2xs text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                                    title={selectedPriceTableSector !== 'all' ? `Enviar por WhatsApp somente o setor "${selectedPriceTableSector}"` : "Escolher setor para enviar por WhatsApp"}
                                >
                                    <WhatsAppIcon className="h-4 w-4 mr-1.5 text-emerald-600" />
                                    {selectedPriceTableSector !== 'all' ? `WhatsApp (${selectedPriceTableSector})` : 'WhatsApp...'}
                                </button>
                            </div>
                        </div>

                        {/* Barra de alternância rápida de ordenação */}
                        <div className="pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                            <div className="flex items-center gap-1.5 font-medium">
                                <span>Classificação ativa:</span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                                    {priceTableSortBy === 'code' ? '🔢 Por Código' : priceTableSortBy === 'internalCode' ? '🏷️ Por Cód. Interno' : '🔤 Por Item (Ordem Alfabética)'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-slate-500 mr-1 font-medium">Escolha a ordenação:</span>
                                <button
                                    type="button"
                                    onClick={() => setPriceTableSortBy('name')}
                                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                        priceTableSortBy === 'name' 
                                            ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-700' 
                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                                    }`}
                                >
                                    🔤 Por Item (Alfabética)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPriceTableSortBy('code')}
                                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                        priceTableSortBy === 'code' 
                                            ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-700' 
                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                                    }`}
                                >
                                    🔢 Por Código
                                </button>
                                {quoteSettings.showInternalCodeInPriceTable && (
                                    <button
                                        type="button"
                                        onClick={() => setPriceTableSortBy('internalCode')}
                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                            priceTableSortBy === 'internalCode' 
                                                ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-700' 
                                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                                        }`}
                                    >
                                        🏷️ Por Cód. Interno
                                    </button>
                                )}
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
                                        <th 
                                            onClick={() => setPriceTableSortBy('code')}
                                            className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                                            title="Clique para ordenar por Código"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>Código</span>
                                                {priceTableSortBy === 'code' ? (
                                                    <span className="text-blue-600 font-bold text-xs">▲</span>
                                                ) : (
                                                    <span className="text-slate-300 hover:text-slate-500 text-xs">↕</span>
                                                )}
                                            </div>
                                        </th>
                                        {quoteSettings.showInternalCodeInPriceTable && (
                                            <th 
                                                onClick={() => setPriceTableSortBy('internalCode')}
                                                className="px-4 py-2 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider cursor-pointer hover:bg-indigo-50 transition-colors select-none"
                                                title="Clique para ordenar por Código Interno"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span>Cód. Interno</span>
                                                    {priceTableSortBy === 'internalCode' ? (
                                                        <span className="text-indigo-600 font-bold text-xs">▲</span>
                                                    ) : (
                                                        <span className="text-indigo-300 hover:text-indigo-500 text-xs">↕</span>
                                                    )}
                                                </div>
                                            </th>
                                        )}
                                        <th 
                                            onClick={() => setPriceTableSortBy('name')}
                                            className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                                            title="Clique para ordenar por Item (Ordem Alfabética)"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>Item</span>
                                                {priceTableSortBy === 'name' ? (
                                                    <span className="text-blue-600 font-bold text-xs">▲</span>
                                                ) : (
                                                    <span className="text-slate-300 hover:text-slate-500 text-xs">↕</span>
                                                )}
                                            </div>
                                        </th>
                                        {quoteSettings.showStockInPriceTable && (
                                            <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                                                Estoque
                                            </th>
                                        )}
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
                                                    <ProductImageZoom src={product.image} alt={product.name} className="h-12 w-12 object-cover rounded-md" containerClassName="h-12 w-12 relative inline-block" />
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
                                                {quoteSettings.showStockInPriceTable && (
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                                                        {product.type === 'service' ? (
                                                            <span className="text-slate-400 text-xs">-</span>
                                                        ) : (
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                                                product.stock > 0 
                                                                    ? 'bg-slate-100 text-slate-800 border border-slate-200' 
                                                                    : 'bg-red-50 text-red-700 border border-red-200'
                                                            }`}>
                                                                {product.stock}
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
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
              <button
                type="button"
                onClick={() => {
                  const action = sectorModalAction;
                  setSectorModalAction(null);
                  if (action === 'print') {
                    handlePrintSector('all');
                  } else if (action === 'pdf') {
                    handleExportPdfSector('all');
                  } else if (action === 'whatsapp') {
                    handleWhatsAppSector('all');
                  }
                }}
                className="w-full flex items-center justify-between p-3 border-2 border-blue-200 bg-blue-50/70 rounded-lg hover:border-blue-500 hover:bg-blue-100/70 transition-all text-left group"
              >
                <span className="font-bold text-sm text-blue-900 flex items-center gap-2">
                  <span>📑</span>
                  <span>Todos os Setores (Tabela Completa)</span>
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-200 text-blue-900 font-bold">
                  {products.length} {products.length === 1 ? 'item' : 'itens'}
                </span>
              </button>
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
      {/* Modal Interativo de Câmera (Compatível com PC Webcam e Celular) */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 text-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
            {/* Cabeçalho do Modal de Câmera */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                  <CameraIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Tirar Foto do Produto</h3>
                  <p className="text-[11px] text-slate-400">Use a câmera do computador ou celular para capturar o item</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCamera}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Fechar câmera"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Visor da Câmera / Preview */}
            <div className="relative bg-black flex items-center justify-center aspect-[4/3] sm:aspect-video w-full overflow-hidden select-none">
              {isCameraLoading && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-950 z-10">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-medium">Iniciando câmera...</span>
                </div>
              )}

              {cameraError ? (
                <div className="p-6 text-center max-w-sm">
                  <div className="w-12 h-12 mx-auto mb-3 text-red-400 bg-red-950/60 rounded-full flex items-center justify-center border border-red-800/50">
                    <CameraIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-red-300 mb-1">Acesso à Câmera</h4>
                  <p className="text-xs text-slate-300 mb-4 leading-relaxed">{cameraError}</p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => startCamera(cameraFacingMode)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Tentar Novamente
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseCamera();
                        handleOpenNativeCamera();
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700"
                    >
                      Abrir Câmera do Sistema / Arquivo
                    </button>
                  </div>
                </div>
              ) : capturedPhoto ? (
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                  <img
                    src={capturedPhoto}
                    alt="Foto capturada do produto"
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Foto Capturada
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain bg-black"
                  />
                  {/* Guias do visor */}
                  <div className="absolute inset-6 pointer-events-none border border-white/25 rounded-2xl flex items-center justify-center">
                    <span className="text-[11px] text-white/70 bg-black/50 backdrop-blur-xs px-3 py-1 rounded-full border border-white/10">
                      Enquadre o produto e clique em Capturar
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Barra de Ações do Rodapé */}
            <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 sm:gap-3">
              {capturedPhoto ? (
                <>
                  <button
                    type="button"
                    onClick={handleRetakePhoto}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Tirar Novamente</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmCapturedPhoto}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Usar Foto no Produto</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    disabled={Boolean(cameraError)}
                    className="p-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    title="Alternar entre câmera frontal e traseira"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="hidden sm:inline">Trocar Câmera</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    disabled={Boolean(cameraError) || isCameraLoading}
                    className="flex-1 max-w-xs mx-auto py-2.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                  >
                    <CameraIcon className="w-5 h-5 text-white" />
                    <span>Capturar Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseCamera}
                    className="px-3 py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Valores Totais de Produtos e Estoque (Custo e Venda) */}
      {showTotalsModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowTotalsModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Valores Totais dos Produtos</h3>
                  <p className="text-xs text-slate-600">
                    Soma e consolidado de custos, preços de venda, lucro projetado e estoque
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintTotalsReport}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-xs"
                  title="Imprimir relatório geral de valores"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Relatório</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTotalsModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-bar: Scope Filter & Tabs */}
            <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-slate-500 mr-1">Base de Cálculo:</span>
                <button
                  type="button"
                  onClick={() => setTotalsScope('all')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    totalsScope === 'all'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Todos os Produtos ({products.length})
                </button>
                {filteredProducts.length !== products.length && (
                  <button
                    type="button"
                    onClick={() => setTotalsScope('filtered')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      totalsScope === 'filtered'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Filtrados na Busca ({filteredProducts.length})
                  </button>
                )}
              </div>

              {/* View Tabs */}
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTotalsTab('overview')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    totalsTab === 'overview'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Visão Geral
                </button>
                <button
                  type="button"
                  onClick={() => setTotalsTab('sectors')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    totalsTab === 'sectors'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Por Setor ({totalsData.sectorsList.length})
                </button>
              </div>
            </div>

            {/* Modal Body with scroll */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {totalsTab === 'overview' ? (
                <>
                  {/* Grid de 4 Cards Principais */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Card 1: Custo Total */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-slate-600" />
                            Custo Total (Estoque)
                          </span>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-slate-900">
                          R$ {totalsData.totalCostStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Considerando o volume das {totalsData.totalStockUnits} peças em estoque
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-600 flex justify-between">
                        <span>Custo Unitário Total:</span>
                        <strong className="text-slate-800">R$ {totalsData.totalCostUnitary.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </div>
                    </div>

                    {/* Card 2: Venda Total */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50/80 p-4 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            Venda Total (Estoque)
                          </span>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-900">
                          R$ {totalsData.totalSellStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-[11px] text-emerald-700/80 mt-1 leading-snug">
                          Faturamento bruto projetado com o estoque atual
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-emerald-200 text-[11px] text-emerald-800 flex justify-between">
                        <span>Venda Unitária Total:</span>
                        <strong className="text-emerald-950">R$ {totalsData.totalSellUnitary.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </div>
                    </div>

                    {/* Card 3: Lucro Bruto Projetado */}
                    <div className="bg-gradient-to-br from-sky-50 to-blue-50 p-4 rounded-xl border border-sky-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-sky-600" />
                            Lucro Bruto Projetado
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                            {totalsData.marginStock.toFixed(1)}% Margem
                          </span>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-sky-950">
                          R$ {totalsData.totalProfitStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-[11px] text-sky-700/80 mt-1 leading-snug">
                          Diferença entre Venda Total e Custo Total
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-sky-200 text-[11px] text-sky-800 flex justify-between">
                        <span>Markup sobre o custo:</span>
                        <strong className="text-sky-950">{totalsData.markupStock.toFixed(1)}%</strong>
                      </div>
                    </div>

                    {/* Card 4: Quantidades e Estoque */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 p-4 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                            <Boxes className="w-3.5 h-3.5 text-amber-600" />
                            Itens e Unidades
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            {totalsData.totalItems} Cadastrados
                          </span>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-amber-950">
                          {totalsData.totalStockUnits} <span className="text-sm font-semibold text-amber-800">peças</span>
                        </div>
                        <p className="text-[11px] text-amber-700/80 mt-1 leading-snug">
                          {totalsData.productsCount} produtos físicos • {totalsData.servicesCount} serviços
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-amber-200 text-[11px] text-amber-800 flex justify-between">
                        <span>Estoque zerado/baixo:</span>
                        <strong className={totalsData.zeroStockCount > 0 ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>
                          {totalsData.zeroStockCount} {totalsData.zeroStockCount === 1 ? 'item' : 'itens'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Comparativo Detalhado: Unitário vs Volume em Estoque */}
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-emerald-600" />
                      Comparativo de Valores: Unitário (Tabela) vs. Volume Total em Estoque
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Lado A: Soma Unitária Simples (Preço de 1 unidade de cada item) */}
                      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Soma Unitária dos Itens (Catálogo)</span>
                          <span className="text-[10px] font-medium bg-slate-200 px-2 py-0.5 rounded-md text-slate-700">1 un. de cada</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Representa o valor somado caso comprasse ou vendesse exatamente 1 unidade de cada produto cadastrado:
                        </p>
                        <div className="space-y-1.5 pt-1 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-200/80">
                            <span className="text-slate-600">Soma dos Custos Unitários:</span>
                            <span className="font-semibold text-slate-800">R$ {totalsData.totalCostUnitary.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200/80">
                            <span className="text-slate-600">Soma das Vendas Unitárias:</span>
                            <span className="font-bold text-emerald-700">R$ {totalsData.totalSellUnitary.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200/80">
                            <span className="text-slate-600">Lucro Unitário Acumulado:</span>
                            <span className="font-bold text-sky-700">R$ {totalsData.totalProfitUnitary.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-slate-600">Margem Média de Venda:</span>
                            <span className="font-bold text-emerald-800">{totalsData.marginUnitary.toFixed(1)}% (Markup: {totalsData.markupUnitary.toFixed(1)}%)</span>
                          </div>
                        </div>
                      </div>

                      {/* Lado B: Total Multiplicado pelo Estoque */}
                      <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-950">Total Real em Estoque (Patrimônio)</span>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-md">{totalsData.totalStockUnits} peças totais</span>
                        </div>
                        <p className="text-[11px] text-emerald-900/80">
                          Multiplica o custo e preço de venda pela quantidade real em estoque de cada produto cadastrado:
                        </p>
                        <div className="space-y-1.5 pt-1 text-xs">
                          <div className="flex justify-between py-1 border-b border-emerald-200/80">
                            <span className="text-slate-700">Custo Total Imobilizado:</span>
                            <span className="font-semibold text-slate-900">R$ {totalsData.totalCostStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-emerald-200/80">
                            <span className="text-slate-700">Previsão Bruta de Faturamento:</span>
                            <span className="font-bold text-emerald-800">R$ {totalsData.totalSellStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-emerald-200/80">
                            <span className="text-slate-700">Lucro Bruto Total Projetado:</span>
                            <span className="font-bold text-sky-800">R$ {totalsData.totalProfitStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-slate-700">Margem Global sobre o Estoque:</span>
                            <span className="font-bold text-emerald-900">{totalsData.marginStock.toFixed(1)}% (Markup: {totalsData.markupStock.toFixed(1)}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resumo Rápido dos Principais Setores */}
                  {totalsData.sectorsList.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Destaque por Setores (Top Setores em Valor)
                        </h4>
                        <button
                          type="button"
                          onClick={() => setTotalsTab('sectors')}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                        >
                          Ver todos os {totalsData.sectorsList.length} setores &rarr;
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {totalsData.sectorsList.slice(0, 3).map((sec, idx) => (
                          <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-900 truncate" title={sec.sectorName}>
                                {sec.sectorName}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {sec.count} {sec.count === 1 ? 'item' : 'itens'}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px] mt-1 text-slate-600">
                              <span>Venda Estoque:</span>
                              <strong className="text-emerald-700">R$ {sec.sellStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-600">
                              <span>Custo Estoque:</span>
                              <span>R$ {sec.costStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Aba: Detalhamento por Setor */
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Detalhamento Completo por Setor</h4>
                      <p className="text-xs text-slate-500">
                        Valores consolidados de custo e venda agrupados por cada setor cadastrado
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      {totalsData.sectorsList.length} Setores Encontrados
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Setor</th>
                          <th className="py-2.5 px-2 text-center">Itens</th>
                          <th className="py-2.5 px-2 text-center">Peças</th>
                          <th className="py-2.5 px-3 text-right">Custo Total</th>
                          <th className="py-2.5 px-3 text-right">Venda Total</th>
                          <th className="py-2.5 px-3 text-right">Lucro Projetado</th>
                          <th className="py-2.5 px-2 text-center">Margem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {totalsData.sectorsList.map((sec, i) => {
                          const profit = sec.sellStock - sec.costStock;
                          const margin = sec.sellStock > 0 ? (profit / sec.sellStock) * 100 : 0;
                          return (
                            <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{sec.sectorName}</td>
                              <td className="py-2.5 px-2 text-center text-slate-600">{sec.count}</td>
                              <td className="py-2.5 px-2 text-center text-slate-600">{sec.stockUnits}</td>
                              <td className="py-2.5 px-3 text-right text-slate-700 font-medium">
                                R$ {sec.costStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                                R$ {sec.sellStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right text-sky-700 font-bold">
                                R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  margin >= 30 ? 'bg-emerald-100 text-emerald-800' : margin >= 15 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {margin.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100 font-bold border-t border-slate-200 text-slate-900 text-xs">
                        <tr>
                          <td className="py-2.5 px-3">Total Consolidado</td>
                          <td className="py-2.5 px-2 text-center">{totalsData.totalItems}</td>
                          <td className="py-2.5 px-2 text-center">{totalsData.totalStockUnits}</td>
                          <td className="py-2.5 px-3 text-right">
                            R$ {totalsData.totalCostStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-800">
                            R$ {totalsData.totalSellStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right text-sky-800">
                            R$ {totalsData.totalProfitStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-2 text-center text-emerald-800">
                            {totalsData.marginStock.toFixed(1)}%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 hidden sm:block">
                Valores calculados em tempo real com base no catálogo atual.
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handlePrintTotalsReport}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 transition shadow-2xs"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Imprimir Relatório</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTotalsModal(false)}
                  className="flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition shadow-xs"
                >
                  Concluir / Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

export default Products;
