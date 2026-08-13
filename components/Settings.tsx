
import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, Smartphone, Laptop, Wifi, Camera, Link, Link2, Sparkles, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { QRScannerModal } from './QRScannerModal';
import { compressImage, safeSetItem, encodeUnicodeBase64, decodeUnicodeBase64 } from '../utils/storage';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FileDownIcon } from './icons/FileDownIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { PaletteIcon } from './icons/PaletteIcon';
import { LockIcon } from './icons/LockIcon';
import type { QuoteSettings, CompanyInfo } from '../types';

interface SettingsProps {
  logo: string | null;
  onSetLogo: (logoDataUrl: string) => void;
  onDeleteLogo: () => void;
  quoteSettings: QuoteSettings;
  onSetQuoteSettings: (settings: QuoteSettings) => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
  companyInfo: CompanyInfo | null;
  onSetCompanyInfo: (info: CompanyInfo) => void;
  onSyncImport?: (payload: any) => void;
}

class SafeQRCode extends React.Component<{ value: string; fallbackValue: string; size?: number }, { hasError: boolean }> {
  constructor(props: { value: string; fallbackValue: string; size?: number }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('QRCodeSVG error caught safely:', error);
  }

  componentDidUpdate(prevProps: { value: string }) {
    if (prevProps.value !== this.props.value && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    const size = this.props.size || 180;
    const valueToRender = this.state.hasError ? this.props.fallbackValue : this.props.value;

    return (
      <QRCodeSVG
        value={valueToRender || 'https://ais-pre-t47sjfsq7z5slmnbaj3ba5-2269761606.us-east5.run.app'}
        size={size}
        level="L"
        includeMargin={true}
      />
    );
  }
}

const Settings: React.FC<SettingsProps> = ({ 
  logo, onSetLogo, onDeleteLogo, 
  quoteSettings, onSetQuoteSettings,
  onBackup, onRestore,
  companyInfo, onSetCompanyInfo,
  onSyncImport
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const restoreInputRef = React.useRef<HTMLInputElement>(null);
  const [localCompanyInfo, setLocalCompanyInfo] = useState<CompanyInfo>({
    name: '',
    cnpj: '',
    address: '',
    city: '',
    zipCode: '',
    phone: '',
    email: '',
  });

  // State for Credentials Change
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');

  // Public URL for direct mobile/multi-device access
  const PUBLIC_APP_URL = 'https://ais-pre-t47sjfsq7z5slmnbaj3ba5-2269761606.us-east5.run.app';

  // State for QR & Link Sync
  const [copiedLink, setCopiedLink] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const getCleanAppUrl = () => {
    if (typeof window === 'undefined') return PUBLIC_APP_URL;
    const href = window.location.href;
    if (href.includes('aistudio.google.com') || href.includes('ais-dev-') || href.includes('localhost')) {
      return PUBLIC_APP_URL;
    }
    return href.split('#')[0].split('?')[0];
  };

  const getFullSyncUrl = () => {
    try {
      const clientsStr = localStorage.getItem('clients') || '[]';
      const productsStr = localStorage.getItem('products') || '[]';
      const quotesStr = localStorage.getItem('savedQuotes') || '[]';
      const compInfoStr = localStorage.getItem('companyInfo') || 'null';
      const settingsStr = localStorage.getItem('quoteSettings') || 'null';

      const parsedProducts = JSON.parse(productsStr);
      // Strip very large image base64 strings to keep QR code / URL compact
      const compactProducts = Array.isArray(parsedProducts)
        ? parsedProducts.map((p: any) => ({
            ...p,
            image: p.image && p.image.length > 500 ? undefined : p.image
          }))
        : [];

      const payload = {
        clients: JSON.parse(clientsStr),
        products: compactProducts,
        savedQuotes: JSON.parse(quotesStr),
        companyInfo: JSON.parse(compInfoStr),
        quoteSettings: JSON.parse(settingsStr),
      };

      const jsonStr = JSON.stringify(payload);
      const encodedPayload = encodeUnicodeBase64(jsonStr);
      return `${getCleanAppUrl()}#sync=${encodeURIComponent(encodedPayload)}`;
    } catch (e) {
      return getCleanAppUrl();
    }
  };

  const cleanAppUrl = getCleanAppUrl();
  const fullSyncUrl = getFullSyncUrl();
  // Ensure QR code value stays within safe length limits (< 1000 characters) to prevent RangeError: Data too long
  const qrCodeValue = (fullSyncUrl && fullSyncUrl.length <= 1000) ? fullSyncUrl : cleanAppUrl;
  const appSyncUrl = fullSyncUrl;

  const handleCopyLink = () => {
    if (appSyncUrl) {
      navigator.clipboard.writeText(appSyncUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // State for Pasted Link Sync
  const [pastedSyncInput, setPastedSyncInput] = useState('');
  const [isSyncingPasted, setIsSyncingPasted] = useState(false);
  const [copiedFullSyncLink, setCopiedFullSyncLink] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSyncFromPastedInput = () => {
    setSyncFeedback(null);
    const rawStr = pastedSyncInput.trim();
    if (!rawStr) {
      setSyncFeedback({ type: 'error', message: 'Por favor, cole um link ou código de sincronização no campo acima.' });
      return;
    }

    setIsSyncingPasted(true);

    setTimeout(() => {
      try {
        let cleanStr = rawStr;

        if (cleanStr.includes('#sync=')) {
          cleanStr = cleanStr.split('#sync=')[1];
        } else if (cleanStr.includes('?sync=')) {
          cleanStr = cleanStr.split('?sync=')[1]?.split('&')[0];
        } else if (cleanStr.includes('?data=')) {
          cleanStr = cleanStr.split('?data=')[1]?.split('&')[0];
        }

        try {
          cleanStr = decodeURIComponent(cleanStr);
        } catch (e) {
          // ignore
        }

        let payload: any = null;

        try {
          payload = JSON.parse(cleanStr);
        } catch (e1) {
          try {
            const decodedJson = decodeUnicodeBase64(cleanStr);
            payload = JSON.parse(decodedJson);
          } catch (e2) {
            if ((rawStr.startsWith('http://') || rawStr.startsWith('https://')) && !rawStr.includes('sync=')) {
              setSyncFeedback({
                type: 'error',
                message: 'O link colado não contém os dados de sincronização (#sync=...). No aparelho de origem, clique em "Gerar Link com Todos os Dados" e cole o link gerado aqui.'
              });
              setIsSyncingPasted(false);
              return;
            }
            throw new Error('Não foi possível identificar dados de sincronização válidos no link ou código colado.');
          }
        }

        if (payload && typeof payload === 'object') {
          const counts = { clients: 0, products: 0, quotes: 0 };

          if (Array.isArray(payload.clients)) counts.clients = payload.clients.length;
          if (Array.isArray(payload.products)) counts.products = payload.products.length;
          if (Array.isArray(payload.savedQuotes)) counts.quotes = payload.savedQuotes.length;

          if (onSyncImport) {
            onSyncImport(payload);
          } else {
            if (Array.isArray(payload.clients)) safeSetItem('clients', JSON.stringify(payload.clients));
            if (Array.isArray(payload.products)) safeSetItem('products', JSON.stringify(payload.products));
            if (Array.isArray(payload.savedQuotes)) safeSetItem('savedQuotes', JSON.stringify(payload.savedQuotes));
            if (payload.companyInfo) {
              safeSetItem('companyInfo', JSON.stringify(payload.companyInfo));
              onSetCompanyInfo(payload.companyInfo);
            }
            if (payload.quoteSettings) {
              safeSetItem('quoteSettings', JSON.stringify(payload.quoteSettings));
              onSetQuoteSettings(payload.quoteSettings);
            }
          }

          if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel('app_multi_device_sync');
            channel.postMessage({
              type: 'SYNC_DATA',
              payload: payload
            });
            channel.close();
          }
          window.dispatchEvent(new Event('storage'));

          setSyncFeedback({
            type: 'success',
            message: `✅ Sincronização concluída com sucesso! Importados e visíveis: ${counts.clients} clientes, ${counts.products} produtos e ${counts.quotes} orçamentos.`
          });
          setPastedSyncInput('');
        } else {
          throw new Error('O formato dos dados importados é inválido.');
        }
      } catch (err: any) {
        setSyncFeedback({
          type: 'error',
          message: err.message || 'Erro ao processar o link de sincronização.'
        });
      } finally {
        setIsSyncingPasted(false);
      }
    }, 200);
  };

  const handleGenerateAndCopyFullSyncLink = () => {
    try {
      const clientsStr = localStorage.getItem('clients') || '[]';
      const productsStr = localStorage.getItem('products') || '[]';
      const quotesStr = localStorage.getItem('savedQuotes') || '[]';
      const compInfoStr = localStorage.getItem('companyInfo') || 'null';
      const settingsStr = localStorage.getItem('quoteSettings') || 'null';

      const payload = {
        clients: JSON.parse(clientsStr),
        products: JSON.parse(productsStr),
        savedQuotes: JSON.parse(quotesStr),
        companyInfo: JSON.parse(compInfoStr),
        quoteSettings: JSON.parse(settingsStr),
      };

      const jsonStr = JSON.stringify(payload);
      const encodedPayload = encodeUnicodeBase64(jsonStr);
      const fullUrl = `${getCleanAppUrl()}#sync=${encodeURIComponent(encodedPayload)}`;

      navigator.clipboard.writeText(fullUrl);
      setCopiedFullSyncLink(true);
      setTimeout(() => setCopiedFullSyncLink(false), 3000);
    } catch (err) {
      console.error('Erro ao gerar link de sincronização completo:', err);
      alert('Não foi possível gerar o link com todos os dados.');
    }
  };

  React.useEffect(() => {
    if (companyInfo) {
      setLocalCompanyInfo(companyInfo);
    }
  }, [companyInfo]);

  const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalCompanyInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveCompanyInfo = () => {
    onSetCompanyInfo(localCompanyInfo);
    alert('Dados da empresa salvos com sucesso!');
  };

  const handleChangeCredentials = () => {
      if (!newUser || !newPass) {
          alert("Preencha o novo usuário e a nova senha.");
          return;
      }
      const authConfig = { username: newUser, password: newPass };
      localStorage.setItem('auth_config', JSON.stringify(authConfig));
      alert("Credenciais de acesso atualizadas com sucesso!");
      setNewUser('');
      setNewPass('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const raw = reader.result as string;
            const compressed = await compressImage(raw, 500, 300, 0.8);
            onSetLogo(compressed);
        };
        reader.onerror = () => {
            alert('Ocorreu um erro ao ler o arquivo.');
        };
        reader.readAsDataURL(file);
    } else if (file) {
        alert('Por favor, selecione um arquivo de imagem válido.');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleRestoreClick = () => {
    restoreInputRef.current?.click();
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        onRestore(file);
    }
    if(e.target) {
        e.target.value = '';
    }
  };

  const themes = [
    { name: 'Padrão (Céu)', value: 'sky', color: 'bg-sky-500' },
    { name: 'Esmeralda', value: 'emerald', color: 'bg-emerald-500' },
    { name: 'Âmbar', value: 'amber', color: 'bg-amber-500' },
    { name: 'Púrpura', value: 'purple', color: 'bg-purple-500' },
    { name: 'Grafite', value: 'slate', color: 'bg-slate-500' },
    { name: 'Azul Escuro', value: 'darkblue', color: 'bg-blue-900' },
    { name: 'Preto', value: 'black', color: 'bg-black' },
  ];

  const fonts = [
      { name: 'Padrão (Inter)', value: 'Inter' },
      { name: 'Roboto', value: 'Roboto' },
      { name: 'Lato', value: 'Lato' },
      { name: 'Merriweather (Serif)', value: 'Merriweather' },
      { name: 'Inconsolata (Mono)', value: 'Inconsolata' },
  ];


  return (
    <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Configurações</h2>
      
      <div className="space-y-8 divide-y divide-slate-200">
        
        <div className="pt-8 mt-0">
          <div className="flex items-center gap-3">
              <BuildingIcon className="h-6 w-6 text-slate-600"/>
              <h3 className="text-lg font-medium text-slate-700">Dados Gerais da Empresa</h3>
          </div>
          <p className="text-sm text-slate-500 mt-2 mb-4">
            Informações sobre sua empresa que podem ser usadas em documentos.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="companyName" className="block text-sm font-medium text-slate-700">Nome da Empresa / Razão Social</label>
              <input type="text" id="companyName" name="name" value={localCompanyInfo.name} onChange={handleCompanyInfoChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
            </div>
            <div>
              <label htmlFor="companyCnpj" className="block text-sm font-medium text-slate-700">CNPJ</label>
              <input type="text" id="companyCnpj" name="cnpj" value={localCompanyInfo.cnpj} onChange={handleCompanyInfoChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
            </div>
            <div>
              <label htmlFor="companyPhone" className="block text-sm font-medium text-slate-700">Fone/Celular</label>
              <input type="text" id="companyPhone" name="phone" value={localCompanyInfo.phone} onChange={handleCompanyInfoChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
            </div>
             <div className="sm:col-span-2">
                <label htmlFor="companyEmail" className="block text-sm font-medium text-slate-700">Email</label>
                <input type="email" id="companyEmail" name="email" value={localCompanyInfo.email} onChange={handleCompanyInfoChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="companyAddress" className="block text-sm font-medium text-slate-700">Endereço</label>
              <input type="text" id="companyAddress" name="address" value={localCompanyInfo.address} onChange={handleCompanyInfoChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
            </div>
            <div>
              <label htmlFor="companyCity" className="block text-sm font-medium text-slate-700">Cidade</label>
              <input type="text" id="companyCity" name="city" value={localCompanyInfo.city} onChange={handleCompanyInfoChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
            </div>
            <div>
              <label htmlFor="companyZipCode" className="block text-sm font-medium text-slate-700">CEP</label>
              <input type="text" id="companyZipCode" name="zipCode" value={localCompanyInfo.zipCode} onChange={handleCompanyInfoChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
                onClick={handleSaveCompanyInfo}
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[--color-primary-600] hover:bg-[--color-primary-700] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]"
              >
                Salvar Alterações
              </button>
          </div>
        </div>

        <div className="pt-8">
            <div className="flex items-center gap-3">
                <LockIcon className="h-6 w-6 text-slate-600"/>
                <h3 className="text-lg font-medium text-slate-700">Credenciais de Acesso</h3>
            </div>
            <p className="text-sm text-slate-500 mt-2 mb-4">
                Atualize seu usuário e senha de acesso ao sistema.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Novo Usuário</label>
                    <input 
                        type="text" 
                        value={newUser}
                        onChange={(e) => setNewUser(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Nova Senha</label>
                    <input 
                        type="text" 
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" 
                    />
                </div>
            </div>
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleChangeCredentials}
                    className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[--color-primary-600] hover:bg-[--color-primary-700] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]"
                >
                    Atualizar Credenciais
                </button>
            </div>
        </div>

        <div className="pt-8">
            <div className="flex items-center gap-3">
                <PaletteIcon className="h-6 w-6 text-slate-600"/>
                <h3 className="text-lg font-medium text-slate-700">Tema e Aparência</h3>
            </div>
            <p className="text-sm text-slate-500 mt-2 mb-4">
                Personalize o visual da aplicação, alterando cores e fontes.
            </p>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Tema de Cores</label>
                    <fieldset className="mt-2">
                        <legend className="sr-only">Escolha um tema de cor</legend>
                        <div className="flex flex-wrap items-center gap-4">
                        {themes.map((theme) => (
                            <label key={theme.value} className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="radio"
                                name="theme-option"
                                value={theme.value}
                                checked={quoteSettings.theme === theme.value}
                                onChange={() => onSetQuoteSettings({ ...quoteSettings, theme: theme.value })}
                                className="h-4 w-4 text-[--color-primary-600] focus:ring-[--color-primary-500] border-gray-300"
                            />
                            <span className="flex items-center gap-2 text-sm text-slate-600">
                                <span className={`h-5 w-5 rounded-full ${theme.color} block`}></span>
                                {theme.name}
                            </span>
                            </label>
                        ))}
                        </div>
                    </fieldset>
                </div>
                <div>
                    <label htmlFor="font" className="block text-sm font-medium text-slate-700">Fonte da Aplicação</label>
                    <select
                        id="font"
                        className="mt-1 block w-full max-w-xs pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] sm:text-sm rounded-md"
                        value={quoteSettings.font}
                        onChange={(e) => onSetQuoteSettings({ ...quoteSettings, font: e.target.value })}
                    >
                       {fonts.map(font => (
                           <option key={font.value} value={font.value}>{font.name}</option>
                       ))}
                    </select>
                </div>
            </div>
        </div>
        <div className="pt-8">
          <h3 className="text-lg font-medium text-slate-700 mb-2">Logotipo da Empresa</h3>
          <p className="text-sm text-slate-500 mb-4">O logotipo aparecerá no topo dos seus orçamentos. Medida recomendada: 150px de largura.</p>

          <div className="mt-2 flex items-center gap-6">
            <div className="w-40 h-20 flex items-center justify-center bg-slate-100 rounded-md border border-dashed">
              {logo ? (
                <img src={logo} alt="Logotipo atual" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-slate-400 text-sm">Sem logo</span>
              )}
            </div>
            
            <div className="flex-grow">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={handleUploadClick}
                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]"
              >
                <UploadIcon className="mr-2 h-5 w-5" />
                Carregar Logotipo
              </button>
              {logo && (
                <button
                  onClick={onDeleteLogo}
                  className="w-full sm:w-auto inline-flex justify-center items-center mt-2 sm:mt-0 sm:ml-3 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-[--color-destructive-700] bg-[--color-destructive-100] hover:bg-[--color-destructive-200] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-destructive-500]"
                >
                  <TrashIcon className="mr-2 h-5 w-5"/>
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="pt-8">
            <h3 className="text-lg font-medium text-slate-700 mb-2">Cabeçalho do Orçamento</h3>
            <p className="text-sm text-slate-500 mb-4">Adicione um texto, como o nome da sua empresa, endereço ou contato. Ele aparecerá no orçamento.</p>
            
            <div className="space-y-4">
                <div>
                    <label htmlFor="headerText" className="block text-sm font-medium text-slate-700">Texto do Cabeçalho</label>
                    <textarea
                        id="headerText"
                        rows={3}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]"
                        value={quoteSettings.text}
                        onChange={(e) => onSetQuoteSettings({ ...quoteSettings, text: e.target.value })}
                        placeholder="Ex: Nome da Empresa Ltda&#10;Rua Exemplo, 123 - Cidade/UF&#10;contato@empresa.com | (99) 99999-9999"
                    />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="fontFamily" className="block text-sm font-medium text-slate-700">Fonte</label>
                        <select
                            id="fontFamily"
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500] sm:text-sm rounded-md"
                            value={quoteSettings.fontFamily}
                            onChange={(e) => onSetQuoteSettings({ ...quoteSettings, fontFamily: e.target.value })}
                        >
                            <option value="sans-serif">Padrão (Sans-serif)</option>
                            <option value="serif">Serif</option>
                            <option value="monospace">Monoespaçada</option>
                            <option value="'Times New Roman', Times, serif">Times New Roman</option>
                            <option value="Arial, Helvetica, sans-serif">Arial</option>
                            <option value="'Courier New', Courier, monospace">Courier New</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="fontSize" className="block text-sm font-medium text-slate-700">Tamanho (px)</label>
                        <input
                            id="fontSize"
                            type="number"
                            min="8"
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]"
                            value={quoteSettings.fontSize}
                            onChange={(e) => onSetQuoteSettings({ ...quoteSettings, fontSize: parseInt(e.target.value, 10) || 14 })}
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Alinhamento</label>
                        <div className="mt-2 flex rounded-md shadow-sm">
                            <button
                                type="button"
                                onClick={() => onSetQuoteSettings({ ...quoteSettings, textAlign: 'left' })}
                                className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium ${quoteSettings.textAlign === 'left' ? 'text-[--color-primary-700] bg-[--color-primary-50] z-10' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                Esquerda
                            </button>
                            <button
                                type="button"
                                onClick={() => onSetQuoteSettings({ ...quoteSettings, textAlign: 'center' })}
                                className={`-ml-px relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium ${quoteSettings.textAlign === 'center' ? 'text-[--color-primary-700] bg-[--color-primary-50] z-10' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                Centro
                            </button>
                            <button
                                type="button"
                                onClick={() => onSetQuoteSettings({ ...quoteSettings, textAlign: 'right' })}
                                className={`-ml-px relative inline-flex items-center px-4 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium ${quoteSettings.textAlign === 'right' ? 'text-[--color-primary-700] bg-[--color-primary-50] z-10' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                Direita
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="pt-8">
            <h3 className="text-lg font-medium text-slate-700 mb-2">Opções do Orçamento</h3>
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <span className="flex-grow flex flex-col" id="sequential-number-label">
                        <span className="text-sm font-medium text-slate-900">Numeração sequencial dos orçamentos</span>
                        <span className="text-sm text-slate-500">Adiciona uma numeração sequencial automática a cada orçamento gerado (ex: Nº 0001, Nº 0002).</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onSetQuoteSettings({ ...quoteSettings, enableSequentialNumber: quoteSettings.enableSequentialNumber === false ? true : false })}
                        className={`${
                            quoteSettings.enableSequentialNumber !== false ? 'bg-[--color-primary-600]' : 'bg-slate-200'
                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]`}
                        role="switch"
                        aria-checked={quoteSettings.enableSequentialNumber !== false}
                        aria-labelledby="sequential-number-label"
                    >
                        <span
                        aria-hidden="true"
                        className={`${
                            quoteSettings.enableSequentialNumber !== false ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                        />
                    </button>
                </div>

                {quoteSettings.enableSequentialNumber !== false && (
                    <div className="flex items-center justify-between pl-4 border-l-2 border-[--color-primary-500] py-2 bg-slate-50/50 rounded-r-md">
                        <span className="flex flex-col">
                            <label htmlFor="nextQuoteNumber" className="text-sm font-medium text-slate-700">
                                Próximo número da sequência
                            </label>
                            <span className="text-xs text-slate-500">Defina o número inicial ou o próximo número a ser gerado.</span>
                        </span>
                        <input
                            id="nextQuoteNumber"
                            type="number"
                            min="1"
                            value={quoteSettings.nextQuoteNumber || 1}
                            onChange={(e) => onSetQuoteSettings({ ...quoteSettings, nextQuoteNumber: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            className="w-28 px-3 py-1.5 border border-slate-300 rounded-md text-sm font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
                        />
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <span className="flex-grow flex flex-col" id="discount-label">
                        <span className="text-sm font-medium text-slate-900">Exibir campo de desconto</span>
                        <span className="text-sm text-slate-500">Habilita/desabilita a seção de desconto.</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onSetQuoteSettings({ ...quoteSettings, showDiscount: !quoteSettings.showDiscount })}
                        className={`${
                            quoteSettings.showDiscount ? 'bg-[--color-primary-600]' : 'bg-slate-200'
                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]`}
                        role="switch"
                        aria-checked={quoteSettings.showDiscount}
                        aria-labelledby="discount-label"
                    >
                        <span
                        aria-hidden="true"
                        className={`${
                            quoteSettings.showDiscount ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                        />
                    </button>
                </div>
                <div className="flex items-center justify-between">
                    <span className="flex-grow flex flex-col" id="product-code-label">
                        <span className="text-sm font-medium text-slate-900">Exibir código do produto</span>
                        <span className="text-sm text-slate-500">Mostra o código do produto no orçamento.</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onSetQuoteSettings({ ...quoteSettings, showProductCode: !quoteSettings.showProductCode })}
                        className={`${
                            quoteSettings.showProductCode ? 'bg-[--color-primary-600]' : 'bg-slate-200'
                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]`}
                        role="switch"
                        aria-checked={quoteSettings.showProductCode}
                        aria-labelledby="product-code-label"
                    >
                        <span
                        aria-hidden="true"
                        className={`${
                            quoteSettings.showProductCode ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                        />
                    </button>
                </div>
                 <div className="flex items-center justify-between">
                    <span className="flex-grow flex flex-col" id="product-sector-label">
                        <span className="text-sm font-medium text-slate-900">Exibir setor do produto</span>
                        <span className="text-sm text-slate-500">Mostra o setor de cada produto no orçamento.</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onSetQuoteSettings({ ...quoteSettings, showProductSector: !quoteSettings.showProductSector })}
                        className={`${
                            quoteSettings.showProductSector ? 'bg-[--color-primary-600]' : 'bg-slate-200'
                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]`}
                        role="switch"
                        aria-checked={quoteSettings.showProductSector}
                        aria-labelledby="product-sector-label"
                    >
                        <span
                        aria-hidden="true"
                        className={`${
                            quoteSettings.showProductSector ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                        />
                    </button>
                </div>
                 <div className="flex items-center justify-between">
                    <span className="flex-grow flex flex-col" id="product-image-label">
                        <span className="text-sm font-medium text-slate-900">Exibir imagem do produto</span>
                        <span className="text-sm text-slate-500">Mostra a imagem do produto no orçamento.</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onSetQuoteSettings({ ...quoteSettings, showProductImage: !quoteSettings.showProductImage })}
                        className={`${
                            quoteSettings.showProductImage ? 'bg-[--color-primary-600]' : 'bg-slate-200'
                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]`}
                        role="switch"
                        aria-checked={quoteSettings.showProductImage}
                        aria-labelledby="product-image-label"
                    >
                        <span
                        aria-hidden="true"
                        className={`${
                            quoteSettings.showProductImage ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                        />
                    </button>
                </div>
                <div className="flex items-center justify-between">
                    <span className="flex-grow flex flex-col" id="autosave-label">
                        <span className="text-sm font-medium text-slate-900">Salvar rascunho automaticamente</span>
                        <span className="text-sm text-slate-500">Salva as alterações no orçamento em tempo real.</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onSetQuoteSettings({ ...quoteSettings, autoSave: !quoteSettings.autoSave })}
                        className={`${
                            quoteSettings.autoSave ? 'bg-[--color-primary-600]' : 'bg-slate-200'
                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]`}
                        role="switch"
                        aria-checked={quoteSettings.autoSave}
                        aria-labelledby="autosave-label"
                    >
                        <span
                        aria-hidden="true"
                        className={`${
                            quoteSettings.autoSave ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                        />
                    </button>
                </div>
                <div className="flex items-center justify-between">
                    <span className="flex-grow flex flex-col" id="allow-without-stock-label">
                        <span className="text-sm font-medium text-slate-900">Criar orçamento mesmo sem estoque</span>
                        <span className="text-sm text-slate-500">Permite salvar orçamentos com produtos fora de estoque. O estoque poderá ficar negativo.</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onSetQuoteSettings({ ...quoteSettings, allowQuoteWithoutStock: !quoteSettings.allowQuoteWithoutStock })}
                        className={`${
                            quoteSettings.allowQuoteWithoutStock ? 'bg-[--color-primary-600]' : 'bg-slate-200'
                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]`}
                        role="switch"
                        aria-checked={quoteSettings.allowQuoteWithoutStock}
                        aria-labelledby="allow-without-stock-label"
                    >
                        <span
                        aria-hidden="true"
                        className={`${
                            quoteSettings.allowQuoteWithoutStock ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                        />
                    </button>
                </div>
                 <div className="pt-2">
                    <label htmlFor="defaultNotes" className="text-sm font-medium text-slate-900">Observações Padrão</label>
                    <p className="text-sm text-slate-500 mb-2">Este texto será pré-preenchido no campo de observações de novos orçamentos.</p>
                    <textarea
                        id="defaultNotes"
                        rows={4}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]"
                        value={quoteSettings.defaultNotes}
                        onChange={(e) => onSetQuoteSettings({ ...quoteSettings, defaultNotes: e.target.value })}
                        placeholder="Ex: Orçamento válido por 15 dias.&#10;Condições de pagamento: 50% de entrada, 50% na entrega."
                    />
                </div>
            </div>
        </div>

        <div className="pt-8 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <QrCode className="h-6 w-6 text-[--color-primary-600]" />
            <h3 className="text-lg font-medium text-slate-800">Sincronização & QR Code Multi-Dispositivos</h3>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            Escaneie o QR Code abaixo com a câmera do seu celular, tablet ou outro computador para abrir o aplicativo e sincronizar o uso em múltiplos aparelhos em tempo real.
          </p>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center gap-8 shadow-sm">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-md flex flex-col items-center flex-shrink-0 w-full md:w-auto">
              <SafeQRCode
                value={qrCodeValue}
                fallbackValue={cleanAppUrl}
                size={180}
              />
              <span className="mt-2 text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" /> Escaneie com a câmera do celular
              </span>

              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
              >
                <Camera className="w-4 h-4" />
                Ler QR Code com a Câmera
              </button>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-emerald-600 animate-pulse" /> Sincronização em Tempo Real Ativa
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Ao abrir esta URL em seu smartphone ou em outra janela, os dados de produtos, clientes e orçamentos serão sincronizados entre os dispositivos instantaneamente.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Link Direto de Acesso Multi-Aparelho
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={appSyncUrl}
                    className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-600 font-mono focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[--color-primary-600] text-white rounded-lg text-xs font-semibold hover:bg-[--color-primary-700] transition-colors shadow-sm flex-shrink-0"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? 'Copiado!' : 'Copiar Link'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-2 border-t border-slate-200">
                <span className="inline-flex items-center gap-1 font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">
                  <Laptop className="w-3.5 h-3.5" /> Computador / Notebook
                </span>
                <span className="text-slate-300">↔</span>
                <span className="inline-flex items-center gap-1 font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200">
                  <Smartphone className="w-3.5 h-3.5" /> Celular / Tablet
                </span>
              </div>

              {/* Sincronização por Colar Link ou Código */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-[--color-primary-600]" />
                    Colar Link de Sincronização para Conectar
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAndCopyFullSyncLink}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[--color-primary-600] hover:text-[--color-primary-700] hover:underline"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {copiedFullSyncLink ? 'Link com Dados Copiado!' : 'Gerar Link com Todos os Dados'}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={pastedSyncInput}
                      onChange={(e) => setPastedSyncInput(e.target.value)}
                      placeholder="Cole aqui o link recebido do outro aparelho..."
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-[--color-primary-500] focus:border-transparent focus:outline-none"
                    />
                    <Link className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncFromPastedInput}
                    disabled={!pastedSyncInput.trim() || isSyncingPasted}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[--color-primary-600] hover:bg-[--color-primary-700] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex-shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingPasted ? 'animate-spin' : ''}`} />
                    Sincronizar Agora
                  </button>
                </div>

                {/* Status Feedback Banner */}
                {syncFeedback && (
                  <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    syncFeedback.type === 'success' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    {syncFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{syncFeedback.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8">
            <h3 className="text-lg font-medium text-slate-700 mb-2">Backup e Restauração</h3>
            <p className="text-sm text-slate-500 mb-4">
                Salve todos os seus dados (clientes, produtos, orçamentos e configurações) em um único arquivo localmente. 
                Você pode usar este arquivo para restaurar dados em caso de emergência ou em outro computador.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button 
                    onClick={onBackup}
                    className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[--color-primary-600] hover:bg-[--color-primary-700] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]"
                >
                    <FileDownIcon className="mr-2 h-5 w-5" />
                    Baixar Backup
                </button>
                 <input
                    type="file"
                    ref={restoreInputRef}
                    onChange={handleFileRestore}
                    accept=".json,application/json"
                    className="hidden"
                />
                <button
                    onClick={handleRestoreClick}
                    className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]"
                >
                    <UploadIcon className="mr-2 h-5 w-5" />
                    Restaurar Backup
                </button>
            </div>
        </div>

        <div className="pt-8">
            <h3 className="text-lg font-medium text-slate-700 mb-4 text-center">Sobre o Software</h3>
            <div className="max-w-xl mx-auto bg-[#0a0d14] rounded-2xl p-6 sm:p-8 border border-slate-800/80 shadow-2xl space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">DESENVOLVEDOR</span>
                    <span className="text-sm font-extrabold text-amber-400">Tuico Martins</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">EMPRESA</span>
                    <span className="text-sm font-extrabold text-sky-400">svosoftware</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">VERSÃO</span>
                    <span className="text-sm font-extrabold text-white">1.0</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">ANO DE LANÇAMENTO</span>
                    <span className="text-sm font-extrabold text-white">2026</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">SUPORTE</span>
                    <a href="mailto:svosoftware@gmail.com" className="text-sm font-extrabold text-sky-400 hover:underline">svosoftware@gmail.com</a>
                </div>
            </div>
        </div>
      </div>

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
};

export default Settings;
