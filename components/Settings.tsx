
import React, { useState, useRef } from 'react';
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
}

const Settings: React.FC<SettingsProps> = ({ 
  logo, onSetLogo, onDeleteLogo, 
  quoteSettings, onSetQuoteSettings,
  onBackup, onRestore,
  companyInfo, onSetCompanyInfo
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
        reader.onloadend = () => {
            onSetLogo(reader.result as string);
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
                        <div className="flex items-center space-x-4">
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

        <div className="pt-8 text-center">
            <h3 className="text-lg font-medium text-slate-700 mb-4">Sobre o Software</h3>
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 inline-block w-full">
                <p className="text-slate-700 font-semibold text-base mb-2">Desenvolvido por: Antonio Ap. Martins ( Tuico Martins)</p>
                <p className="text-slate-600 text-sm mb-1">Versão: 2.0</p>
                <p className="text-slate-600 text-sm mb-3">Ano de Lançamento: 2025</p>
                <p className="text-slate-600 text-sm mb-1">
                    Link canal do YouTube: <a href="https://www.youtube.com/channel/UCmD-hqnSegs7xCSdHjKsWUw" target="_blank" rel="noopener noreferrer" className="text-[--color-primary-600] hover:underline break-all">https://www.youtube.com/channel/UCmD-hqnSegs7xCSdHjKsWUw</a>
                </p>
                <p className="text-slate-600 text-sm">Contato: 18 996239945</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
