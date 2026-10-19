
import React, { useState, useRef, Component } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, Copy, Check, Smartphone, Laptop, Wifi, Camera, Link, Link2, 
  Sparkles, RefreshCw, AlertCircle, CheckCircle2, RotateCcw, FileSpreadsheet, 
  ExternalLink, CloudUpload, LogIn, LogOut, Loader2, ArrowLeftRight, Users, 
  Share2, HelpCircle, Info, ShieldCheck, UserCheck, Briefcase, Wrench, Zap,
  Droplets, Paintbrush, Hammer, Cpu, Database, Layers, ChevronRight, CheckCircle
} from 'lucide-react';
import { QRScannerModal } from './QRScannerModal';
import { compressImage, safeSetItem, encodeUnicodeBase64, decodeUnicodeBase64 } from '../utils/storage';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FileDownIcon } from './icons/FileDownIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { PaletteIcon } from './icons/PaletteIcon';
import { LockIcon } from './icons/LockIcon';
import { PackagePlusIcon } from './icons/PackagePlusIcon';
import type { QuoteSettings, CompanyInfo } from '../types';
import { db, doc, getDoc, ensureAuth } from '../firebase';
import { signInWithGoogle, logoutGoogle, getGoogleAccessToken } from '../googleAuth';
import { 
  fullSyncToGoogleSheet, 
  getSavedSpreadsheetUrl, 
  ensureDatabaseSpreadsheet,
  getSpreadsheetMode,
  setSpreadsheetMode,
  setSharedSpreadsheet,
  getSharedSpreadsheetUrl,
  clearSharedSpreadsheet,
  getSavedSpreadsheetId
} from '../googleSheetsService';
import { PROFESSIONAL_SEGMENTS, getSegmentById } from '../utils/professionalSegments';

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
  syncRoomId?: string;
  onSetSyncRoomId?: (roomId: string) => void;
  onForceReloadData?: () => Promise<{ success: boolean; message: string }>;
  googleUser?: any;
  googleAccessToken?: string | null;
  spreadsheetUrl?: string | null;
  onConnectGoogle?: () => Promise<void>;
  onSwitchGoogleAccount?: () => Promise<void>;
  onDisconnectGoogle?: () => Promise<void>;
  onSyncAllToGoogleSheets?: () => Promise<{ success: boolean; message: string; url?: string }>;
  onUpdateSpreadsheetUrl?: (url: string | null) => void;
  professionalSegment?: string;
  customSegmentName?: string;
  onSelectSegment?: (segmentId: string, applyPresets?: boolean, customName?: string) => void;
  onSyncLocalToCloud?: () => Promise<{ success: boolean; message: string }>;
  onReloadUserCloud?: () => Promise<{ success: boolean; message: string }>;
  clientsCount?: number;
  productsCount?: number;
  quotesCount?: number;
}

interface SafeQRCodeProps {
  value: string;
  fallbackValue: string;
  size?: number;
}

const SafeQRCode: React.FC<SafeQRCodeProps> = ({ value, fallbackValue, size = 180 }) => {
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [value]);

  const valueToRender = hasError || !value ? (fallbackValue || 'https://ais-pre-t47sjfsq7z5slmnbaj3ba5-2269761606.us-east5.run.app') : value;

  try {
    return (
      <QRCodeSVG
        value={valueToRender}
        size={size}
        level="L"
        includeMargin={true}
      />
    );
  } catch (err) {
    return (
      <QRCodeSVG
        value={fallbackValue || 'https://ais-pre-t47sjfsq7z5slmnbaj3ba5-2269761606.us-east5.run.app'}
        size={size}
        level="L"
        includeMargin={true}
      />
    );
  }
};

const Settings: React.FC<SettingsProps> = ({ 
  logo, onSetLogo, onDeleteLogo, 
  quoteSettings, onSetQuoteSettings,
  onBackup, onRestore,
  companyInfo, onSetCompanyInfo,
  onSyncImport,
  syncRoomId,
  onSetSyncRoomId,
  onForceReloadData,
  googleUser,
  googleAccessToken,
  spreadsheetUrl,
  onConnectGoogle,
  onSwitchGoogleAccount,
  onDisconnectGoogle,
  onSyncAllToGoogleSheets,
  onUpdateSpreadsheetUrl,
  professionalSegment = 'personalizado',
  customSegmentName = '',
  onSelectSegment,
  onSyncLocalToCloud,
  onReloadUserCloud,
  clientsCount = 0,
  productsCount = 0,
  quotesCount = 0,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const restoreInputRef = React.useRef<HTMLInputElement>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isSwitchingGoogle, setIsSwitchingGoogle] = useState(false);
  const [isSyncingGoogleSheets, setIsSyncingGoogleSheets] = useState(false);
  const [isSyncingLocalToCloud, setIsSyncingLocalToCloud] = useState(false);
  const [isReloadingFromCloud, setIsReloadingFromCloud] = useState(false);
  const [cloudDbFeedback, setCloudDbFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [googleFeedback, setGoogleFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [spreadsheetMode, setSpreadsheetModeState] = useState<'personal' | 'shared'>(() => getSpreadsheetMode());
  const [sharedUrlInput, setSharedUrlInput] = useState<string>(() => getSharedSpreadsheetUrl() || '');
  const [isSavingSharedSheet, setIsSavingSharedSheet] = useState(false);
  const [showMultiUserHelp, setShowMultiUserHelp] = useState(false);
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
      const compactProducts = Array.isArray(parsedProducts)
        ? parsedProducts.map((p: any) => ({
            ...p,
            image: p.image && p.image.length > 500 ? undefined : p.image
          }))
        : [];

      const payload = {
        roomId: syncRoomId,
        clients: JSON.parse(clientsStr),
        products: compactProducts,
        savedQuotes: JSON.parse(quotesStr),
        companyInfo: JSON.parse(compInfoStr),
        quoteSettings: JSON.parse(settingsStr),
      };

      const jsonStr = JSON.stringify(payload);
      const encodedPayload = encodeUnicodeBase64(jsonStr);
      const currentRoom = syncRoomId || 'sala_default';
      return `${getCleanAppUrl()}#room=${currentRoom}&sync=${encodeURIComponent(encodedPayload)}`;
    } catch (e) {
      return `${getCleanAppUrl()}#room=${syncRoomId || 'sala_default'}`;
    }
  };

  const cleanAppUrl = getCleanAppUrl();
  const currentRoom = syncRoomId || 'empresa_principal';
  const directRoomUrl = `${cleanAppUrl}#room=${currentRoom}`;
  const fullSyncUrl = getFullSyncUrl();
  // Use direct room URL for QR Code and direct link (ultra-clean, instant Firestore sync across mobile & desktop)
  const qrCodeValue = directRoomUrl;
  const appSyncUrl = directRoomUrl;

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
  const [isForcingReload, setIsForcingReload] = useState(false);
  const [copiedFullSyncLink, setCopiedFullSyncLink] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleForceReloadClick = async () => {
    setIsForcingReload(true);
    setSyncFeedback(null);
    try {
      if (onForceReloadData) {
        const result = await onForceReloadData();
        setSyncFeedback({
          type: result.success ? 'success' : 'error',
          message: result.message
        });
      } else {
        setSyncFeedback({
          type: 'success',
          message: '✅ Recarregamento de dados do servidor concluído!'
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: 'Erro ao recarregar dados do servidor: ' + (err.message || 'Erro desconhecido')
      });
    } finally {
      setIsForcingReload(false);
    }
  };

  const handleSyncFromPastedInput = async () => {
    setSyncFeedback(null);
    const rawStr = pastedSyncInput.trim();
    if (!rawStr) {
      setSyncFeedback({ type: 'error', message: 'Por favor, cole um link ou código de sincronização no campo acima.' });
      return;
    }

    setIsSyncingPasted(true);

    try {
      let extractedRoom = '';
      if (rawStr.includes('room=')) {
        extractedRoom = rawStr.split('room=')[1]?.split('&')[0]?.split('#')[0] || '';
      }

      let cleanStr = rawStr;
      if (cleanStr.includes('#sync=')) {
        cleanStr = cleanStr.split('#sync=')[1]?.split('&')[0] || '';
      } else if (cleanStr.includes('?sync=')) {
        cleanStr = cleanStr.split('?sync=')[1]?.split('&')[0] || '';
      } else if (cleanStr.includes('?data=')) {
        cleanStr = cleanStr.split('?data=')[1]?.split('&')[0] || '';
      }

      try {
        cleanStr = decodeURIComponent(cleanStr);
      } catch (e) {
        // ignore
      }

      let payload: any = null;

      if (cleanStr && (cleanStr.startsWith('{') || cleanStr.length > 20)) {
        try {
          payload = JSON.parse(cleanStr);
        } catch (e1) {
          try {
            const decodedJson = decodeUnicodeBase64(cleanStr);
            payload = JSON.parse(decodedJson);
          } catch (e2) {
            // Not a base64 json
          }
        }
      }

      if (extractedRoom && onSetSyncRoomId) {
        onSetSyncRoomId(extractedRoom);
      }

      // Try fetching from Firestore first, then fallback to server
      if (extractedRoom && (!payload || typeof payload !== 'object')) {
        try {
          await ensureAuth();
          if (db) {
            const snap = await getDoc(doc(db, 'sync_rooms', extractedRoom));
            if (snap.exists()) {
              payload = snap.data();
            }
          }
        } catch (e) {
          console.warn('Firestore fetch in settings warning:', e);
        }

        if (!payload || typeof payload !== 'object') {
          try {
            const res = await fetch(`/api/sync/${encodeURIComponent(extractedRoom)}`);
            if (res.ok) {
              const serverData = await res.json();
              if (serverData && (serverData.clients || serverData.products)) {
                payload = serverData;
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }

      if (payload && typeof payload === 'object') {
        const counts = { clients: 0, products: 0, quotes: 0 };

        if (Array.isArray(payload.clients)) counts.clients = payload.clients.length;
        if (Array.isArray(payload.products)) counts.products = payload.products.length;
        if (Array.isArray(payload.savedQuotes)) counts.quotes = payload.savedQuotes.length;

        if (payload.roomId && onSetSyncRoomId) {
          onSetSyncRoomId(payload.roomId);
        }

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

        setSyncFeedback({
          type: 'success',
          message: `✅ Sincronização em tempo real ativada! Dados atualizados: ${counts.clients} clientes, ${counts.products} produtos e ${counts.quotes} orçamentos.`
        });
        setPastedSyncInput('');
      } else if (extractedRoom) {
        setSyncFeedback({
          type: 'success',
          message: `✅ Conectado à sala de sincronização "${extractedRoom}". O dispositivo receberá novos produtos e clientes automaticamente.`
        });
        setPastedSyncInput('');
      } else {
        setSyncFeedback({
          type: 'error',
          message: 'Não foi possível reconhecer o código ou link de sincronização. Cole o link gerado no outro dispositivo.'
        });
      }
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        message: 'Erro ao processar código de sincronização. Verifique o texto colado.'
      });
    } finally {
      setIsSyncingPasted(false);
    }
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
            <div className="flex items-center gap-3">
                <PackagePlusIcon className="h-6 w-6 text-slate-600"/>
                <h3 className="text-lg font-medium text-slate-700">Produtos</h3>
            </div>
            <p className="text-sm text-slate-500 mt-2 mb-4">
                Configurações específicas para o cadastro e exibição de itens.
            </p>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <span className="flex-grow flex flex-col" id="product-internal-code-label">
                        <span className="text-sm font-medium text-slate-900">Código Interno</span>
                        <span className="text-sm text-slate-500">Habilita e mantém o campo de Código Interno sempre visível ao adicionar novos produtos ou fazer alterações.</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onSetQuoteSettings({ ...quoteSettings, enableProductInternalCode: quoteSettings.enableProductInternalCode === false ? true : false })}
                        className={`${
                            quoteSettings.enableProductInternalCode !== false ? 'bg-[--color-primary-600]' : 'bg-slate-200'
                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]`}
                        role="switch"
                        aria-checked={quoteSettings.enableProductInternalCode !== false}
                        aria-labelledby="product-internal-code-label"
                    >
                        <span
                        aria-hidden="true"
                        className={`${
                            quoteSettings.enableProductInternalCode !== false ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                        />
                    </button>
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
                    <span className="flex-grow flex flex-col" id="item-discount-label">
                        <span className="text-sm font-medium text-slate-900">Desconto em porcentagem nos itens</span>
                        <span className="text-sm text-slate-500">Habilita o campo de desconto (%) no cadastro de itens e exibe na tabela de preços e na impressão por setor.</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onSetQuoteSettings({ ...quoteSettings, showItemDiscountPercent: !quoteSettings.showItemDiscountPercent })}
                        className={`${
                            quoteSettings.showItemDiscountPercent ? 'bg-[--color-primary-600]' : 'bg-slate-200'
                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]`}
                        role="switch"
                        aria-checked={!!quoteSettings.showItemDiscountPercent}
                        aria-labelledby="item-discount-label"
                    >
                        <span
                        aria-hidden="true"
                        className={`${
                            quoteSettings.showItemDiscountPercent ? 'translate-x-5' : 'translate-x-0'
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
                    <span className="flex-grow flex flex-col" id="product-internal-code-table-label">
                        <span className="text-sm font-medium text-slate-900">Exibir código interno na tabela de produtos</span>
                        <span className="text-sm text-slate-500">Ao clicar neste botão, adiciona a opção de Código Interno na lista de produtos para ser impressa ou gerada em PDF.</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onSetQuoteSettings({ ...quoteSettings, showInternalCodeInPriceTable: !quoteSettings.showInternalCodeInPriceTable })}
                        className={`${
                            quoteSettings.showInternalCodeInPriceTable ? 'bg-[--color-primary-600]' : 'bg-slate-200'
                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]`}
                        role="switch"
                        aria-checked={!!quoteSettings.showInternalCodeInPriceTable}
                        aria-labelledby="product-internal-code-table-label"
                    >
                        <span
                        aria-hidden="true"
                        className={`${
                            quoteSettings.showInternalCodeInPriceTable ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                        />
                    </button>
                </div>
                <div className="flex items-center justify-between">
                    <span className="flex-grow flex flex-col" id="product-internal-code-quote-label">
                        <span className="text-sm font-medium text-slate-900">Exibir código interno no orçamento</span>
                        <span className="text-sm text-slate-500">Mostra a coluna de Código Interno no corpo do orçamento impresso/PDF.</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onSetQuoteSettings({ ...quoteSettings, showProductInternalCode: !quoteSettings.showProductInternalCode })}
                        className={`${
                            quoteSettings.showProductInternalCode ? 'bg-[--color-primary-600]' : 'bg-slate-200'
                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500]`}
                        role="switch"
                        aria-checked={!!quoteSettings.showProductInternalCode}
                        aria-labelledby="product-internal-code-quote-label"
                    >
                        <span
                        aria-hidden="true"
                        className={`${
                            quoteSettings.showProductInternalCode ? 'translate-x-5' : 'translate-x-0'
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
                  Ao cadastrar, editar ou excluir produtos, clientes e orçamentos em qualquer dispositivo conectado a esta sala, as alterações são atualizadas automaticamente nos outros aparelhos.
                </p>
              </div>

              <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">ID da Sala em Nuvem:</span>
                  <span className="text-xs text-slate-500">Dispositivos conectados ao mesmo ID compartilham novos clientes e produtos.</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={syncRoomId || ''}
                    onChange={(e) => onSetSyncRoomId && onSetSyncRoomId(e.target.value)}
                    placeholder="Ex: minha_empresa"
                    className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-slate-800 font-bold w-36 text-center focus:ring-2 focus:ring-[--color-primary-500] focus:outline-none"
                  />
                </div>
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

                {/* Botão de Forçar Recarregamento */}
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/70 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                      Solução Rápida de Dessincronização
                    </span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      Limpa o cache de sincronização local e busca os dados mais recentes do servidor.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleForceReloadClick}
                    disabled={isForcingReload}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex-shrink-0"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isForcingReload ? 'animate-spin' : ''}`} />
                    {isForcingReload ? 'Recarregando...' : 'Forçar Recarregamento de Dados'}
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

        {/* Seção Banco de Dados Google Drive e Planilha Google Sheets (Multi-Usuários e Equipe) */}
        <div className="pt-8 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-slate-800">Banco de Dados em Planilha Google (Google Drive)</h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Users className="w-3.5 h-3.5" />
                    Multi-Contas & Equipe
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Salva produtos, clientes e orçamentos automaticamente na nuvem do Google Sheets
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMultiUserHelp(!showMultiUserHelp)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl transition self-start sm:self-auto"
            >
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              {showMultiUserHelp ? 'Ocultar Dicas de Equipe' : 'Como Usar com Outras Pessoas?'}
            </button>
          </div>

          <p className="text-sm text-slate-600 mb-5">
            Cada colaborador pode entrar com sua própria conta Google ou alternar entre contas. O sistema salva automaticamente cada novo produto, cliente e orçamento detalhado na planilha pessoal ou na planilha compartilhada da empresa.
          </p>

          {/* Dicas e Instruções para Multi-Usuários e Outras Pessoas */}
          {showMultiUserHelp && (
            <div className="mb-5 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl text-xs text-slate-700 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-emerald-900 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Guia Rápido: Como liberar para outras pessoas da equipe usarem
              </div>
              <ul className="space-y-2 list-disc list-inside text-slate-700 leading-relaxed">
                <li>
                  <strong className="text-slate-900">Entrar com contas diferentes:</strong> Qualquer pessoa pode clicar no botão <em>"Conectar Conta Google"</em> ou <em>"Trocar de Conta Google"</em>. A tela oficial do Google sempre abrirá permitindo selecionar ou cadastrar qualquer outro e-mail (Gmail ou Google Workspace).
                </li>
                <li>
                  <strong className="text-slate-900">Salvar na MESMA planilha da empresa:</strong> Se você quer que todos os colaboradores enviem vendas e produtos para a mesma planilha, selecione a opção <em>"Planilha Compartilhada da Empresa"</em> abaixo, cole o link da planilha principal e compartilhe-a no Google Drive com o e-mail dos seus colaboradores como <strong>Editor</strong>.
                </li>
                <li>
                  <strong className="text-slate-900">Salvar em planilhas individuais:</strong> Se cada pessoa preferir ter seu próprio banco no seu Google Drive, basta deixar em <em>"Minha Planilha Própria"</em>. Cada conta terá sua planilha independente criada na hora.
                </li>
                <li>
                  <strong className="text-slate-900">Aviso do Google (Tela de Consentimento em Teste):</strong> Caso outra pessoa veja uma mensagem como <em>"Acesso bloqueado / App em teste (403)"</em>, certifique-se de adicionar o e-mail dela na lista de <em>Usuários de teste (Test Users)</em> no painel do Google Cloud Console da sua aplicação, ou aprove o acesso em <em>"Avançado &gt; Continuar"</em> na primeira autorização.
                </li>
              </ul>
            </div>
          )}

          <div className="bg-emerald-50/50 p-5 sm:p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-6">
            {/* Bloco 1: Sistema Multiusuário e Banco de Dados Isolado no Firestore */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  {googleUser?.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={googleUser.displayName || 'Usuário'}
                      className="w-13 h-13 rounded-full border-2 border-emerald-500 object-cover shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="w-13 h-13 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center flex-shrink-0 text-emerald-800 font-bold text-xl shadow-xs">
                      {googleUser?.displayName ? googleUser.displayName.charAt(0).toUpperCase() : (googleUser?.email ? googleUser.email.charAt(0).toUpperCase() : <Users className="w-7 h-7 text-emerald-700" />)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-slate-900">
                        {googleUser ? (googleUser.displayName || googleUser.email) : 'Sistema Multiusuário Desconectado'}
                      </h4>
                      {googleUser ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          Profissional Conectado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                          Modo Offline / Local
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {googleUser 
                        ? `${googleUser.email} • ID de Isolamento: ${googleUser.uid.slice(0, 10)}...`
                        : 'Entre com sua conta Google para ativar seu banco de dados isolado na nuvem.'}
                    </p>
                  </div>
                </div>

                {/* Botões de Ação de Conta */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {googleUser ? (
                    <>
                      <button
                        type="button"
                        disabled={isSwitchingGoogle}
                        onClick={async () => {
                          if (onSwitchGoogleAccount) {
                            setIsSwitchingGoogle(true);
                            setGoogleFeedback(null);
                            setCloudDbFeedback(null);
                            try {
                              await onSwitchGoogleAccount();
                            } catch (err: any) {
                              if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
                                setCloudDbFeedback({ type: 'error', message: err.message || 'Erro ao trocar conta Google.' });
                              }
                            } finally {
                              setIsSwitchingGoogle(false);
                            }
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 active:scale-95 rounded-xl transition shadow-xs disabled:opacity-50"
                        title="Permite que outro profissional entre com sua própria conta Google no mesmo dispositivo"
                      >
                        {isSwitchingGoogle ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        ) : (
                          <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
                        )}
                        <span>Trocar de Profissional</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (onDisconnectGoogle) {
                            await onDisconnectGoogle();
                            setCloudDbFeedback({ type: 'success', message: 'Conta desconectada com sucesso.' });
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 active:scale-95 rounded-xl transition shadow-xs"
                        title="Desconectar a conta atual"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600" />
                        <span>Desconectar</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isConnectingGoogle}
                      onClick={async () => {
                        if (onConnectGoogle) {
                          setIsConnectingGoogle(true);
                          setCloudDbFeedback(null);
                          try {
                            await onConnectGoogle();
                          } catch (err: any) {
                            if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
                              setCloudDbFeedback({ type: 'error', message: err.message || 'Erro ao conectar conta Google.' });
                            }
                          } finally {
                            setIsConnectingGoogle(false);
                          }
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition shadow-md disabled:opacity-50"
                    >
                      {isConnectingGoogle ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Conectando...
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" /> Entrar com Conta Google (Multiusuário)
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Informações de Isolamento e Segurança ABAC */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Isolamento Seguro (Firestore)</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Regras criptografadas garantem que ninguém acesse clientes, preços ou orçamentos alheios.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Celular & Computador</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Acesse com a mesma conta Google no smartphone ou PC e encontre seus dados atualizados.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-start gap-3">
                  <Database className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Dados Protegidos na Nuvem</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Gravados com segurança no banco de dados, protegidos mesmo se você limpar o navegador.
                    </p>
                  </div>
                </div>
              </div>

              {/* Resumo de Dados e Ações de Sincronização */}
              {googleUser && (
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <strong>{clientsCount}</strong> Clientes
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200">
                      <strong>{productsCount}</strong> Produtos / Serviços
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200">
                      <strong>{quotesCount}</strong> Orçamentos
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={isSyncingLocalToCloud}
                      onClick={async () => {
                        if (onSyncLocalToCloud) {
                          setIsSyncingLocalToCloud(true);
                          setCloudDbFeedback(null);
                          try {
                            const res = await onSyncLocalToCloud();
                            setCloudDbFeedback({ type: 'success', message: res.message });
                          } catch (err: any) {
                            setCloudDbFeedback({ type: 'error', message: err.message || 'Erro ao salvar na nuvem.' });
                          } finally {
                            setIsSyncingLocalToCloud(false);
                          }
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition shadow-xs disabled:opacity-50"
                      title="Garante que todos os dados locais sejam enviados para seu banco na nuvem"
                    >
                      {isSyncingLocalToCloud ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      ) : (
                        <CloudUpload className="w-4 h-4 text-emerald-600" />
                      )}
                      <span>Salvar Dados na Nuvem Agora</span>
                    </button>

                    <button
                      type="button"
                      disabled={isReloadingFromCloud}
                      onClick={async () => {
                        if (onReloadUserCloud) {
                          setIsReloadingFromCloud(true);
                          setCloudDbFeedback(null);
                          try {
                            const res = await onReloadUserCloud();
                            setCloudDbFeedback({ type: 'success', message: res.message });
                          } catch (err: any) {
                            setCloudDbFeedback({ type: 'error', message: err.message || 'Erro ao recarregar da nuvem.' });
                          } finally {
                            setIsReloadingFromCloud(false);
                          }
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition shadow-xs disabled:opacity-50"
                      title="Recarrega os dados mais recentes salvos na nuvem desta conta"
                    >
                      {isReloadingFromCloud ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                      ) : (
                        <RotateCcw className="w-4 h-4 text-slate-600" />
                      )}
                      <span>Recarregar da Nuvem</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback de Nuvem */}
              {cloudDbFeedback && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                  cloudDbFeedback.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}>
                  {cloudDbFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{cloudDbFeedback.message}</p>
                  </div>
                </div>
              )}
            </div>



            {/* Bloco 3: Ações e Acesso Direto à Planilha Ativa */}
            {googleUser && (
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Salvamento Automático Ativo
                  </span>

                  {spreadsheetUrl && (
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-900 px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-xl shadow-xs transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                      Abrir Planilha no Google Drive
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSyncingGoogleSheets}
                  onClick={async () => {
                    if (onSyncAllToGoogleSheets) {
                      setIsSyncingGoogleSheets(true);
                      setGoogleFeedback(null);
                      try {
                        const result = await onSyncAllToGoogleSheets();
                        setGoogleFeedback({
                          type: result.success ? 'success' : 'error',
                          message: result.message
                        });
                      } catch (err: any) {
                        setGoogleFeedback({
                          type: 'error',
                          message: 'Falha na sincronização completa: ' + (err.message || 'Erro desconhecido')
                        });
                      } finally {
                        setIsSyncingGoogleSheets(false);
                      }
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-100/70 border border-emerald-300 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {isSyncingGoogleSheets ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Sincronizando com a Planilha...
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4 text-emerald-600" /> Sincronizar Tudo para a Planilha Agora
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Mensagem de Feedback Google */}
            {googleFeedback && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                googleFeedback.type === 'success' 
                  ? 'bg-emerald-100/90 border-emerald-300 text-emerald-950' 
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}>
                {googleFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold leading-relaxed">{googleFeedback.message}</p>
                </div>
              </div>
            )}
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
