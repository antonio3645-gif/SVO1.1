
import React, { useState, useEffect } from 'react';
import Clients from './components/Clients';
import Products from './components/Products';
import Quotes from './components/Quotes';
import Settings from './components/Settings';
import type { Client, Product, QuoteSettings, SavedQuote, CompanyInfo } from './types';
import { LogOutIcon } from './components/icons/LogOutIcon';
import { LockIcon } from './components/icons/LockIcon';
import { UserPlusIcon } from './components/icons/UserPlusIcon';
import { PackagePlusIcon } from './components/icons/PackagePlusIcon';
import { PriceTagIcon } from './components/icons/PriceTagIcon';
import { SettingsIcon } from './components/icons/SettingsIcon';
import { safeSetItem, compressImage, decodeUnicodeBase64 } from './utils/storage';
import { saveToIndexedDB, loadFromIndexedDB } from './utils/indexedDB';

type Tab = 'clients' | 'products' | 'quotes' | 'settings';

const App: React.FC = () => {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetup, setIsSetup] = useState(false); // False if no user is registered yet
  
  // Login Inputs
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  
  // Setup Inputs
  const [setupUser, setSetupUser] = useState('');
  const [setupPass, setSetupPass] = useState('');
  const [setupCompany, setSetupCompany] = useState('');

  // --- App Data State ---
  const [activeTab, setActiveTab] = useState<Tab>('quotes');
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [quoteSettings, setQuoteSettings] = useState<QuoteSettings>({
    text: '',
    fontFamily: 'sans-serif',
    textAlign: 'left',
    fontSize: 14,
    showDiscount: true,
    autoSave: false,
    showProductCode: false,
    showProductSector: false,
    showProductImage: false,
    showImageInPriceTable: false,
    defaultNotes: '',
    allowQuoteWithoutStock: true,
    sectors: [],
    theme: 'sky',
    font: 'Inter',
    enableSequentialNumber: true,
    nextQuoteNumber: 1,
  });
  const [quoteToEdit, setQuoteToEdit] = useState<SavedQuote | null>(null);

  // --- Initialization Effect ---
  useEffect(() => {
    // 1. Check Auth Setup
    const storedAuth = localStorage.getItem('auth_config');
    if (storedAuth) {
      setIsSetup(true);
    } else {
      setIsSetup(false);
    }

    // 2. Load Data from LocalStorage
    const storedClients = localStorage.getItem('clients');
    if (storedClients) {
      const parsedClients: Client[] = JSON.parse(storedClients);
      let maxNum = 0;
      parsedClients.forEach(c => {
        if (c.code) {
          const num = parseInt(c.code, 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const migratedClients = parsedClients.map((c) => {
        if (!c.code) {
          maxNum += 1;
          return { ...c, code: String(maxNum).padStart(4, '0') };
        }
        return c;
      });
      setClients(migratedClients);
      safeSetItem('clients', JSON.stringify(migratedClients));
    }

    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
       const parsedProducts = JSON.parse(storedProducts);
       // Migration: ensure type exists
       const migratedProducts = parsedProducts.map((p: any) => ({
           ...p,
           type: p.type || 'product'
       }));
       setProducts(migratedProducts);
    }

    const storedQuotes = localStorage.getItem('savedQuotes');
    if (storedQuotes) setSavedQuotes(JSON.parse(storedQuotes));

    const storedSettings = localStorage.getItem('quoteSettings');
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      setQuoteSettings({
        enableSequentialNumber: true,
        nextQuoteNumber: 1,
        ...parsed,
      });
    }

    const storedLogo = localStorage.getItem('logo');
    if (storedLogo) setLogo(storedLogo);

    const storedCompanyInfo = localStorage.getItem('companyInfo');
    if (storedCompanyInfo) setCompanyInfo(JSON.parse(storedCompanyInfo));
    
    // Secondary fallback load from IndexedDB if localStorage was empty
    (async () => {
      try {
        if (!storedClients) {
          const idbClients = await loadFromIndexedDB<Client>('clients');
          if (idbClients.length > 0) setClients(idbClients);
        }
        if (!storedProducts) {
          const idbProducts = await loadFromIndexedDB<Product>('products');
          if (idbProducts.length > 0) setProducts(idbProducts);
        }
        if (!storedQuotes) {
          const idbQuotes = await loadFromIndexedDB<SavedQuote>('savedQuotes');
          if (idbQuotes.length > 0) setSavedQuotes(idbQuotes);
        }
      } catch (err) {
        console.warn('Erro ao carregar dados do IndexedDB:', err);
      }
    })();
    
    // Check if page was loaded with a #sync= or ?sync= link
    try {
      const hash = window.location.hash;
      const search = window.location.search;
      let encodedData = '';

      if (hash.includes('sync=')) {
        encodedData = hash.split('sync=')[1];
      } else if (search.includes('sync=')) {
        encodedData = search.split('sync=')[1]?.split('&')[0];
      }

      if (encodedData) {
        const decodedUri = decodeURIComponent(encodedData);
        const rawJson = decodeUnicodeBase64(decodedUri);
        const payload = JSON.parse(rawJson);

        if (payload && typeof payload === 'object') {
          if (Array.isArray(payload.clients)) {
            setClients(payload.clients);
            safeSetItem('clients', JSON.stringify(payload.clients));
          }
          if (Array.isArray(payload.products)) {
            setProducts(payload.products);
            safeSetItem('products', JSON.stringify(payload.products));
          }
          if (Array.isArray(payload.savedQuotes)) {
            setSavedQuotes(payload.savedQuotes);
            safeSetItem('savedQuotes', JSON.stringify(payload.savedQuotes));
          }
          if (payload.companyInfo) {
            setCompanyInfo(payload.companyInfo);
            safeSetItem('companyInfo', JSON.stringify(payload.companyInfo));
          }
          if (payload.quoteSettings) {
            setQuoteSettings(payload.quoteSettings);
            safeSetItem('quoteSettings', JSON.stringify(payload.quoteSettings));
          }

          window.history.replaceState(null, '', window.location.pathname);
          setTimeout(() => {
            alert('✅ Dispositivo sincronizado com sucesso a partir do link!');
          }, 300);
        }
      }
    } catch (e) {
      console.warn('Erro ao ler link de sincronização na inicialização:', e);
    }

    // Tab persistence
    const savedTab = localStorage.getItem('activeTab') as Tab;
    if (savedTab) setActiveTab(savedTab);

  }, []);

  // Sync state changes with IndexedDB (Local Database)
  useEffect(() => {
    if (clients.length > 0) {
      saveToIndexedDB('clients', clients);
    }
  }, [clients]);

  useEffect(() => {
    if (products.length > 0) {
      saveToIndexedDB('products', products);
    }
  }, [products]);

  useEffect(() => {
    if (savedQuotes.length > 0) {
      saveToIndexedDB('savedQuotes', savedQuotes);
    }
  }, [savedQuotes]);

  // BroadcastChannel & Storage Event Real-Time Cross-Window Sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'clients' && e.newValue) setClients(JSON.parse(e.newValue));
      if (e.key === 'products' && e.newValue) setProducts(JSON.parse(e.newValue));
      if (e.key === 'savedQuotes' && e.newValue) setSavedQuotes(JSON.parse(e.newValue));
      if (e.key === 'companyInfo' && e.newValue) setCompanyInfo(JSON.parse(e.newValue));
      if (e.key === 'quoteSettings' && e.newValue) setQuoteSettings(JSON.parse(e.newValue));
    };

    window.addEventListener('storage', handleStorageChange);

    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('app_multi_device_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'SYNC_DATA') {
          const { clients, products, savedQuotes, companyInfo, quoteSettings } = event.data.payload || {};
          if (clients) setClients(clients);
          if (products) setProducts(products);
          if (savedQuotes) setSavedQuotes(savedQuotes);
          if (companyInfo) setCompanyInfo(companyInfo);
          if (quoteSettings) setQuoteSettings(quoteSettings);
        }
      };
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (channel) channel.close();
    };
  }, []);

  // Apply Theme
  useEffect(() => {
    document.documentElement.className = `theme-${quoteSettings.theme} font-${quoteSettings.font}`;
  }, [quoteSettings.theme, quoteSettings.font]);

  // Persist Tab
  useEffect(() => {
      if (isAuthenticated) {
        safeSetItem('activeTab', activeTab);
      }
  }, [activeTab, isAuthenticated]);

  // --- Auth Handlers ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedAuth = JSON.parse(localStorage.getItem('auth_config') || '{}');
    
    // Backdoor for admin/admin if needed, or normal check
    if ((loginUser === storedAuth.username && loginPass === storedAuth.password) || (loginUser === 'admin' && loginPass === 'admin')) {
      setIsAuthenticated(true);
    } else {
      alert("Usuário ou senha incorretos.");
    }
  };

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupUser || !setupPass || !setupCompany) {
      alert("Preencha todos os campos.");
      return;
    }
    
    // Save Auth
    const authConfig = { username: setupUser, password: setupPass };
    safeSetItem('auth_config', JSON.stringify(authConfig));
    
    // Save Company Name
    const newCompanyInfo: CompanyInfo = {
        name: setupCompany,
        cnpj: '',
        address: '',
        city: '',
        zipCode: '',
        phone: '',
        email: ''
    };
    safeSetItem('companyInfo', JSON.stringify(newCompanyInfo));
    setCompanyInfo(newCompanyInfo);

    setIsSetup(true);
    setIsAuthenticated(true);
    alert("Configuração inicial concluída!");
  };

  const handleLogout = () => {
    if (window.confirm("Deseja realmente sair?")) {
        setIsAuthenticated(false);
        setLoginUser('');
        setLoginPass('');
    }
  };

  // --- Data Handlers ---

  const addClient = (client: Omit<Client, 'id'>) => {
    let clientCode = client.code;
    if (!clientCode) {
      const maxCode = clients.reduce((max, c) => {
        const num = parseInt(c.code || '0', 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      clientCode = String(maxCode + 1).padStart(4, '0');
    }
    const newClient = { ...client, code: clientCode, id: crypto.randomUUID() };
    const updatedClients = [...clients, newClient];
    setClients(updatedClients);
    safeSetItem('clients', JSON.stringify(updatedClients));
  };

  const updateClient = (updatedClient: Client) => {
    const updatedClients = clients.map((c) => (c.id === updatedClient.id ? updatedClient : c));
    setClients(updatedClients);
    safeSetItem('clients', JSON.stringify(updatedClients));
  };

  const deleteClient = (id: string) => {
    const clientToDelete = clients.find(c => c.id === id);
    if (clientToDelete && window.confirm(`Tem certeza que deseja excluir o cliente "${clientToDelete.name}"?`)) {
      const updatedClients = clients.filter((c) => c.id !== id);
      setClients(updatedClients);
      safeSetItem('clients', JSON.stringify(updatedClients));
    }
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: crypto.randomUUID() };
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    safeSetItem('products', JSON.stringify(updatedProducts));
  };

  const addMultipleProducts = (newProducts: Omit<Product, 'id'>[]) => {
      const productsWithIds = newProducts.map(p => ({ ...p, id: crypto.randomUUID() }));
      const updatedProducts = [...products, ...productsWithIds];
      setProducts(updatedProducts);
      safeSetItem('products', JSON.stringify(updatedProducts));
  };

  const updateProduct = (updatedProduct: Product) => {
    const updatedProducts = products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
    setProducts(updatedProducts);
    safeSetItem('products', JSON.stringify(updatedProducts));
  };

  const deleteProduct = (id: string) => {
    const updatedProducts = products.filter((p) => p.id !== id);
    setProducts(updatedProducts);
    safeSetItem('products', JSON.stringify(updatedProducts));
  };

  const saveQuote = (quoteData: Omit<SavedQuote, 'id'>) => {
    // Stock Check
    if (!quoteSettings.allowQuoteWithoutStock) {
        for (const item of quoteData.items) {
             if (item.product.type === 'service') continue;
             const product = products.find(p => p.id === item.product.id);
             if (!product || item.quantity > product.stock) {
                 alert(`Estoque insuficiente para "${item.product.name}". Apenas ${product?.stock || 0} disponível(is).`);
                 return;
             }
        }
    }

    // Deduct Stock
    const updatedProducts = products.map(p => {
        const itemInQuote = quoteData.items.find(i => i.product.id === p.id);
        if (itemInQuote && p.type !== 'service') {
            return { ...p, stock: p.stock - itemInQuote.quantity };
        }
        return p;
    });
    setProducts(updatedProducts);
    safeSetItem('products', JSON.stringify(updatedProducts));

    // Determine quote number
    let assignedNumber = quoteData.number;
    let currentSettings = { ...quoteSettings };
    if (currentSettings.enableSequentialNumber !== false && !assignedNumber) {
        assignedNumber = currentSettings.nextQuoteNumber || 1;
        const newNextNumber = assignedNumber + 1;
        currentSettings = { ...currentSettings, nextQuoteNumber: newNextNumber };
        setQuoteSettings(currentSettings);
        safeSetItem('quoteSettings', JSON.stringify(currentSettings));
    }

    // Save Quote - Sanitize product images in quote items to prevent quota issues
    const sanitizedItems = quoteData.items.map(i => ({
      ...i,
      product: {
        ...i.product,
        image: i.product.image && i.product.image.length > 50000 ? undefined : i.product.image
      }
    }));

    const newQuote: SavedQuote = { 
        ...quoteData, 
        items: sanitizedItems,
        number: assignedNumber,
        id: crypto.randomUUID(),
        createdAt: quoteData.createdAt || new Date().toISOString() 
    };
    const updatedQuotes = [...savedQuotes, newQuote];
    setSavedQuotes(updatedQuotes);
    safeSetItem('savedQuotes', JSON.stringify(updatedQuotes));
    alert('Orçamento salvo com sucesso!');
  };

  const deleteQuote = (id: string) => {
    if(window.confirm('Tem certeza que deseja excluir este orçamento?')) {
        const updatedQuotes = savedQuotes.filter((q) => q.id !== id);
        setSavedQuotes(updatedQuotes);
        safeSetItem('savedQuotes', JSON.stringify(updatedQuotes));
    }
  };

  const handleEditQuote = (quoteId: string) => {
      if (window.confirm("Editar este orçamento irá removê-lo da lista e carregar seus dados. O estoque NÃO é devolvido automaticamente. Continuar?")) {
        const quote = savedQuotes.find(q => q.id === quoteId);
        if (quote) {
            setQuoteToEdit(quote);
            const updatedQuotes = savedQuotes.filter(q => q.id !== quoteId);
            setSavedQuotes(updatedQuotes);
            safeSetItem('savedQuotes', JSON.stringify(updatedQuotes));
        }
      }
  };

  const handleSetLogo = async (logoDataUrl: string) => {
    const compressed = await compressImage(logoDataUrl, 500, 300, 0.8);
    setLogo(compressed);
    safeSetItem('logo', compressed);
  };

  const handleDeleteLogo = () => {
    setLogo(null);
    localStorage.removeItem('logo');
  };

  const handleSetQuoteSettings = (settings: QuoteSettings) => {
    setQuoteSettings(settings);
    safeSetItem('quoteSettings', JSON.stringify(settings));
  };

  const handleSetCompanyInfo = (info: CompanyInfo) => {
    setCompanyInfo(info);
    safeSetItem('companyInfo', JSON.stringify(info));
  };

  const handleBackup = () => {
    const backupData = {
      clients,
      products,
      savedQuotes,
      logo,
      quoteSettings,
      companyInfo,
      auth: localStorage.getItem('auth_config') ? JSON.parse(localStorage.getItem('auth_config')!) : null
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `backup-local-${date}.json`;
    link.click();
  };
  
  const handleExitAndBackup = () => {
      if (!window.confirm("Deseja baixar um backup e sair?")) return;
      handleBackup();
      setTimeout(() => {
          setIsAuthenticated(false);
          setLoginUser('');
          setLoginPass('');
          window.close();
      }, 1000);
  }

  const handleRestore = (file: File) => {
    if (!window.confirm("Isso irá substituir TODOS os dados atuais pelos do backup. Continuar?")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        try {
          const data = JSON.parse(text);
          if (data.clients) {
            setClients(data.clients);
            safeSetItem('clients', JSON.stringify(data.clients));
          }
          if (data.products) {
            setProducts(data.products);
            safeSetItem('products', JSON.stringify(data.products));
          }
          if (data.savedQuotes) {
            setSavedQuotes(data.savedQuotes);
            safeSetItem('savedQuotes', JSON.stringify(data.savedQuotes));
          }
          if (data.logo) {
            setLogo(data.logo);
            safeSetItem('logo', data.logo);
          }
          if (data.quoteSettings) {
            setQuoteSettings(data.quoteSettings);
            safeSetItem('quoteSettings', JSON.stringify(data.quoteSettings));
          }
          if (data.companyInfo) {
            setCompanyInfo(data.companyInfo);
            safeSetItem('companyInfo', JSON.stringify(data.companyInfo));
          }
          if (data.auth) {
              safeSetItem('auth_config', JSON.stringify(data.auth));
          }
          alert("Dados restaurados com sucesso!");
          window.location.reload();
        } catch (err) {
          alert("Erro ao ler arquivo de backup.");
        }
      }
    };
    reader.readAsText(file);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'clients':
        return <Clients clients={clients} addClient={addClient} updateClient={updateClient} deleteClient={deleteClient} />;
      case 'products':
        return <Products 
                    products={products} 
                    addProduct={addProduct} 
                    addMultipleProducts={addMultipleProducts} 
                    quoteSettings={quoteSettings} 
                    updateProduct={updateProduct}
                    deleteProduct={deleteProduct}
                    onSetQuoteSettings={handleSetQuoteSettings}
                    companyInfo={companyInfo}
                    logo={logo}
                />;
      case 'quotes':
        return <Quotes 
                    clients={clients} 
                    products={products} 
                    logo={logo} 
                    quoteSettings={quoteSettings} 
                    saveQuote={saveQuote} 
                    quoteToEdit={quoteToEdit}
                    clearQuoteToEdit={() => setQuoteToEdit(null)}
                    savedQuotes={savedQuotes}
                    deleteQuote={deleteQuote}
                    editQuote={handleEditQuote}
                    companyInfo={companyInfo}
                />;
      case 'settings':
        return <Settings 
                    logo={logo} 
                    onSetLogo={handleSetLogo} 
                    onDeleteLogo={handleDeleteLogo} 
                    quoteSettings={quoteSettings} 
                    onSetQuoteSettings={handleSetQuoteSettings}
                    onBackup={handleBackup}
                    onRestore={handleRestore}
                    companyInfo={companyInfo}
                    onSetCompanyInfo={handleSetCompanyInfo}
                />;
      default:
        return null;
    }
  };

  const TabButton: React.FC<{tabName: Tab, label: string, Icon: React.ElementType}> = ({ tabName, label, Icon }) => {
      const isActive = activeTab === tabName;
      return (
          <button
              onClick={() => setActiveTab(tabName)}
              className={`flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center px-1 sm:px-3 py-2 rounded-lg transition-all duration-200 gap-1
                  ${isActive 
                      ? 'bg-white text-[--color-primary-600] shadow-sm' 
                      : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                  }`}
          >
              <Icon className={`h-6 w-6 sm:h-5 sm:w-5 ${isActive ? 'stroke-2' : 'stroke-[1.5]'}`} />
              <span className="text-[10px] sm:text-sm font-medium leading-none">{label}</span>
          </button>
      )
  }

  if (!isAuthenticated) {
    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-Inter">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div className="flex justify-center mb-6">
                    <div className="bg-[--color-primary-100] p-3 rounded-full">
                        <LockIcon className="h-8 w-8 text-[--color-primary-600]" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
                    {isSetup ? 'Acessar Sistema' : 'Configuração Inicial'}
                </h2>
                <p className="text-center text-slate-500 mb-8">
                    {isSetup ? 'Entre com seu usuário e senha.' : 'Crie um usuário e senha para começar.'}
                </p>
                
                {isSetup ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Usuário</label>
                            <input 
                                type="text" 
                                required
                                value={loginUser}
                                onChange={(e) => setLoginUser(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                            <input 
                                type="password" 
                                required
                                value={loginPass}
                                onChange={(e) => setLoginPass(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
                            />
                        </div>
                        <button type="submit" className="w-full py-2 px-4 bg-[--color-primary-600] text-white rounded-md hover:bg-[--color-primary-700] font-medium transition-colors">
                            Entrar
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSetup} className="space-y-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa</label>
                            <input 
                                type="text" 
                                required
                                value={setupCompany}
                                onChange={(e) => setSetupCompany(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
                                placeholder="Sua Empresa Ltda"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Criar Usuário</label>
                            <input 
                                type="text" 
                                required
                                value={setupUser}
                                onChange={(e) => setSetupUser(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Criar Senha</label>
                            <input 
                                type="password" 
                                required
                                value={setupPass}
                                onChange={(e) => setSetupPass(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]"
                            />
                        </div>
                        <button type="submit" className="w-full py-2 px-4 bg-[--color-primary-600] text-white rounded-md hover:bg-[--color-primary-700] font-medium transition-colors">
                            Configurar e Entrar
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
        <style>{`
          @keyframes fadeInSlideUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .tab-content-enter {
            animation: fadeInSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>

        <header className="bg-white shadow-sm sticky top-0 z-20">
            <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                    {/* Título e Badge de Banco de Dados Local Offline */}
                    <div className="hidden sm:flex items-center gap-3">
                      <h1 className="text-2xl font-bold text-slate-900">
                          Gerenciador
                      </h1>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200" title="Todos os dados são salvos localmente no seu dispositivo e funcionam offline sem internet.">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Banco Local (Offline)
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <nav className="flex-grow sm:flex-grow-0 flex items-center justify-between sm:justify-end gap-1 sm:gap-2 bg-slate-100 p-1 rounded-xl">
                            <TabButton tabName="quotes" label="Orçamentos" Icon={PriceTagIcon} />
                            <TabButton tabName="products" label="Produtos" Icon={PackagePlusIcon} />
                            <TabButton tabName="clients" label="Clientes" Icon={UserPlusIcon} />
                            <TabButton tabName="settings" label="Config" Icon={SettingsIcon} />
                            
                            <div className="w-px h-8 bg-slate-300 mx-1 hidden sm:block"></div>
                            
                            <button
                                onClick={handleExitAndBackup}
                                title="Sair"
                                className="flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center px-1 sm:px-3 py-2 rounded-lg text-[--color-destructive-600] hover:bg-white/60 transition-colors gap-1"
                            >
                                <LogOutIcon className="h-6 w-6 sm:h-5 sm:w-5" />
                                <span className="text-[10px] sm:text-sm font-medium leading-none">Sair</span>
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </header>
        <main className="max-w-7xl mx-auto py-4 sm:py-6 lg:px-8">
            <div key={activeTab} className="tab-content-enter">
                {renderContent()}
            </div>
        </main>
    </div>
  );
};

export default App;
