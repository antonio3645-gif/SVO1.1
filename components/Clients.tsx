
import React, { useState, useMemo } from 'react';
import type { Client, SavedQuote, QuoteSettings, CompanyInfo } from '../types';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { FileDownIcon } from './icons/FileDownIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SearchIcon } from './icons/SearchIcon';
import { 
  FileText, Plus, X, Printer, ExternalLink, Calendar, 
  DollarSign, Package, Phone, Mail, MapPin, Tag, Share2, 
  Sparkles, Layers, CheckCircle2 
} from 'lucide-react';
import { 
  generateQuoteHTML, 
  printQuoteHtml, 
  exportQuotePdfDirect, 
  sendQuoteWhatsAppDirect, 
  formatDateTime 
} from '../utils/quoteExportService';

interface ClientsProps {
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  savedQuotes?: SavedQuote[];
  quoteSettings?: QuoteSettings;
  companyInfo?: CompanyInfo | null;
  logo?: string | null;
  onOpenQuote?: (quote: SavedQuote) => void;
  onNewQuoteForClient?: (client: Client) => void;
}

const Clients: React.FC<ClientsProps> = ({ 
  clients, 
  addClient, 
  updateClient, 
  deleteClient,
  savedQuotes = [],
  quoteSettings,
  companyInfo = null,
  logo = null,
  onOpenQuote,
  onNewQuoteForClient
}) => {
  // Helper to generate the next available code
  const getNextCode = () => {
    if (clients.length === 0) return '0001';
    const maxCode = clients.reduce((max, c) => {
      const num = parseInt(c.code || '0', 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    return String(maxCode + 1).padStart(4, '0');
  };

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [code, setCode] = useState(() => getNextCode());
  const [clientType, setClientType] = useState<'physical' | 'juridical'>('physical');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [stateRegistration, setStateRegistration] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const resetForm = () => {
    setEditingClient(null);
    setCode(getNextCode());
    setName('');
    setAddress('');
    setCity('');
    setZipCode('');
    setPhone('');
    setEmail('');
    setCpf('');
    setCnpj('');
    setStateRegistration('');
    setClientType('physical');
  };
  
  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setCode(client.code || getNextCode());
    setClientType(client.type);
    setName(client.name);
    setAddress(client.address);
    setCity(client.city);
    setZipCode(client.zipCode);
    setPhone(client.phone);
    setEmail(client.email || '');
    setCpf(client.cpf || '');
    setCnpj(client.cnpj || '');
    setStateRegistration(client.stateRegistration || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
        alert("O nome do cliente é obrigatório.");
        return;
    }
    
    const clientData = {
        code: code.trim() || getNextCode(),
        type: clientType,
        name,
        address,
        city,
        zipCode,
        phone,
        email,
        cpf: clientType === 'physical' ? cpf : undefined,
        cnpj: clientType === 'juridical' ? cnpj : undefined,
        stateRegistration: clientType === 'juridical' ? stateRegistration : undefined,
    };
    
    if (editingClient) {
      updateClient({ ...editingClient, ...clientData });
      alert('Cliente atualizado com sucesso!');
    } else {
      addClient(clientData);
    }

    resetForm();
  };

  const handleExportClients = () => {
    if (clients.length === 0) {
      alert("Não há clientes para exportar.");
      return;
    }
    // @ts-ignore
    if (!window.Papa) {
      alert("Erro: A biblioteca de exportação não foi carregada. Verifique sua conexão com a internet.");
      return;
    }

    const dataToExport = clients.map(client => ({
      id: client.id,
      codigo: client.code || '',
      tipo: client.type === 'physical' ? 'Pessoa Física' : 'Pessoa Jurídica',
      nome_razao_social: client.name,
      cpf: client.cpf || '',
      cnpj: client.cnpj || '',
      inscricao_estadual: client.stateRegistration || '',
      endereco: client.address,
      cidade: client.city,
      cep: client.zipCode,
      fone_celular: client.phone,
      email: client.email || '',
    }));
    
    // @ts-ignore
    const csvString = window.Papa.unparse(dataToExport, {
        header: true,
        quotes: true,
    });

    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const date = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `clientes-backup-${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGeneratePdf = async (client: Client) => {
    // @ts-ignore
    if (!window.html2canvas || !window.jspdf) {
        alert("Erro ao carregar recursos para gerar PDF. Tente novamente.");
        return;
    }

    const pdfContainer = document.createElement('div');
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    pdfContainer.style.width = '210mm';
    pdfContainer.style.padding = '20px';
    pdfContainer.style.fontFamily = 'sans-serif';
    pdfContainer.style.color = '#334155';
    pdfContainer.innerHTML = `
      <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 2rem;">
        <h2 style="font-size: 1.8rem; font-weight: 600; color: #1e293b; margin:0;">Ficha Cadastral do Cliente</h2>
        <p style="font-size: 0.9rem; color: #64748b;">Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>
      <div style="font-size: 1rem;">
        <p style="margin-bottom: 0.5rem;"><strong>Código do Cliente:</strong> ${client.code || 'N/A'}</p>
        <p style="margin-bottom: 0.5rem;"><strong>Nome/Razão Social:</strong> ${client.name}</p>
        <p style="margin-bottom: 0.5rem;"><strong>Tipo:</strong> ${client.type === 'physical' ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>
        ${client.cpf ? `<p style="margin-bottom: 0.5rem;"><strong>CPF:</strong> ${client.cpf}</p>` : ''}
        ${client.cnpj ? `<p style="margin-bottom: 0.5rem;"><strong>CNPJ:</strong> ${client.cnpj}</p>` : ''}
        ${client.stateRegistration ? `<p style="margin-bottom: 0.5rem;"><strong>Inscrição Estadual:</strong> ${client.stateRegistration}</p>` : ''}
        <p style="margin-bottom: 0.5rem;"><strong>Endereço:</strong> ${client.address || 'N/A'}</p>
        <p style="margin-bottom: 0.5rem;"><strong>Cidade:</strong> ${client.city || 'N/A'}</p>
        <p style="margin-bottom: 0.5rem;"><strong>CEP:</strong> ${client.zipCode || 'N/A'}</p>
        <p style="margin-bottom: 0.5rem;"><strong>Telefone:</strong> ${client.phone || 'N/A'}</p>
        <p style="margin-bottom: 0.5rem;"><strong>Email:</strong> ${client.email || 'N/A'}</p>
      </div>
    `;
    document.body.appendChild(pdfContainer);

    try {
        // @ts-ignore
        const canvas = await window.html2canvas(pdfContainer, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        // @ts-ignore
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps= pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`cadastro-${client.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
        console.error("Erro ao gerar PDF do cliente:", error);
        alert("Ocorreu um erro ao gerar o PDF.");
    } finally {
        document.body.removeChild(pdfContainer);
    }
  };

  const filteredClients = clients.filter(client => {
    const term = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(term) ||
      (client.code && client.code.toLowerCase().includes(term)) ||
      (client.cpf && client.cpf.includes(term)) ||
      (client.cnpj && client.cnpj.includes(term))
    );
  });

  const [selectedClientForQuotes, setSelectedClientForQuotes] = useState<Client | null>(null);
  const [quoteSearchTerm, setQuoteSearchTerm] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState<string | null>(null);

  const activeQuoteSettings: QuoteSettings = useMemo(() => {
    return quoteSettings || {
      text: '',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      fontSize: 12,
      showDiscount: true,
      autoSave: true,
      showProductCode: true,
      showProductInternalCode: true,
      showProductSector: true,
      showProductImage: true,
      showImageInPriceTable: true,
      defaultNotes: '',
      allowQuoteWithoutStock: false,
      sectors: [],
      theme: 'default',
      font: 'sans',
      enableSequentialNumber: true,
      nextQuoteNumber: 1,
    };
  }, [quoteSettings]);

  const selectedClientQuotes = useMemo(() => {
    if (!selectedClientForQuotes) return [];
    return savedQuotes.filter(q => {
      const matchId = Boolean(q.client?.id && q.client.id === selectedClientForQuotes.id);
      const matchName = Boolean(
        q.client?.name && 
        selectedClientForQuotes.name && 
        q.client.name.trim().toLowerCase() === selectedClientForQuotes.name.trim().toLowerCase()
      );
      const matchCode = Boolean(
        q.client?.code && 
        selectedClientForQuotes.code && 
        q.client.code.trim().toLowerCase() === selectedClientForQuotes.code.trim().toLowerCase()
      );
      return matchId || matchName || matchCode;
    });
  }, [savedQuotes, selectedClientForQuotes]);

  const filteredClientQuotes = useMemo(() => {
    if (!quoteSearchTerm.trim()) return selectedClientQuotes;
    const term = quoteSearchTerm.toLowerCase();
    return selectedClientQuotes.filter(q => {
      const numStr = q.number ? String(q.number) : '';
      const notes = q.notes || '';
      const hasItem = q.items.some(i => 
        i.product?.name?.toLowerCase().includes(term) || 
        i.product?.code?.toLowerCase().includes(term) ||
        (i.product?.internalCode && i.product.internalCode.toLowerCase().includes(term))
      );
      return numStr.includes(term) || notes.toLowerCase().includes(term) || hasItem;
    });
  }, [selectedClientQuotes, quoteSearchTerm]);

  const selectedClientTotalSpent = useMemo(() => {
    return selectedClientQuotes.reduce((acc, q) => acc + (q.finalTotal || 0), 0);
  }, [selectedClientQuotes]);

  const handlePrintQuote = (quote: SavedQuote) => {
    const html = generateQuoteHTML(quote, activeQuoteSettings, companyInfo, logo);
    printQuoteHtml(html);
  };

  const handleDownloadQuotePdf = async (quote: SavedQuote) => {
    try {
      setIsExportingPdf(quote.id);
      await exportQuotePdfDirect(quote, activeQuoteSettings, companyInfo, logo);
    } catch (e: any) {
      alert('Erro ao gerar PDF: ' + (e?.message || e));
    } finally {
      setIsExportingPdf(null);
    }
  };

  const handleSendWhatsAppQuote = (quote: SavedQuote) => {
    sendQuoteWhatsAppDirect(quote);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 md:p-8">
      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          {editingClient ? <PencilIcon className="mr-3 text-[--color-accent-500]" /> : <UserPlusIcon className="mr-3 text-[--color-primary-500]" />}
          {editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-slate-700">
              Código do Cliente <span className="text-xs text-[--color-primary-600] font-normal">(Automático)</span>
            </label>
            <input 
              type="text" 
              id="code" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              className="mt-1 block w-full px-3 py-2 bg-slate-50 font-mono font-semibold text-slate-800 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" 
              placeholder="0001"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Tipo de Cliente</label>
            <div className="mt-2 flex space-x-4">
                 <label className="inline-flex items-center cursor-pointer">
                    <input type="radio" className="form-radio text-[--color-primary-600]" name="clientType" value="physical" checked={clientType === 'physical'} onChange={() => setClientType('physical')} />
                    <span className="ml-2 text-slate-700">Pessoa Física</span>
                </label>
                <label className="inline-flex items-center cursor-pointer">
                    <input type="radio" className="form-radio text-[--color-primary-600]" name="clientType" value="juridical" checked={clientType === 'juridical'} onChange={() => setClientType('juridical')} />
                    <span className="ml-2 text-slate-700">Pessoa Jurídica</span>
                </label>
            </div>
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">Nome Completo / Razão Social</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" required />
          </div>
          {clientType === 'physical' && (
            <div>
              <label htmlFor="cpf" className="block text-sm font-medium text-slate-700">CPF</label>
              <input type="text" id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
            </div>
          )}
          {clientType === 'juridical' && (
            <>
              <div>
                <label htmlFor="cnpj" className="block text-sm font-medium text-slate-700">CNPJ</label>
                <input type="text" id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
              </div>
              <div>
                <label htmlFor="stateRegistration" className="block text-sm font-medium text-slate-700">Inscrição Estadual</label>
                <input type="text" id="stateRegistration" value={stateRegistration} onChange={(e) => setStateRegistration(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
              </div>
            </>
          )}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-slate-700">Endereço</label>
            <input type="text" id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-slate-700">Cidade</label>
            <input type="text" id="city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
          </div>
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-slate-700">CEP</label>
            <input type="text" id="zipCode" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Fone/Celular</label>
            <input type="text" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]" />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button type="submit" className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${editingClient ? 'bg-[--color-accent-600] hover:bg-[--color-accent-700] focus:ring-[--color-accent-500]' : 'bg-[--color-primary-600] hover:bg-[--color-primary-700] focus:ring-[--color-primary-500]'} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}>
              {editingClient ? 'Salvar Alterações' : 'Adicionar Cliente'}
            </button>
            {editingClient && (
              <button type="button" onClick={resetForm} className="w-full flex justify-center py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors">
                Cancelar Edição
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="lg:col-span-2">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Clientes Cadastrados</h2>
              <p className="text-xs text-slate-500">Consulte clientes e veja os orçamentos realizados para cada um.</p>
            </div>
            <button
                onClick={handleExportClients}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[--color-primary-600] hover:bg-[--color-primary-700] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500] transition-colors"
            >
                <FileDownIcon className="mr-2 h-5 w-5" />
                Exportar CSV
            </button>
        </div>

        <div className="mb-4 space-y-2">
            <div className="relative">
                <input
                    type="text"
                    placeholder="Buscar cliente por código, nome, CPF/CNPJ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-[--color-primary-500] focus:border-[--color-primary-500] text-sm"
                />
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-slate-400" />
                </div>
                {searchTerm && (
                  <button 
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
            </div>
            {searchTerm.trim() && (
              <div className="flex items-center justify-between text-xs text-slate-600 bg-sky-50/80 border border-sky-200 px-3 py-2 rounded-md">
                <span>
                  Resultado: <strong>{filteredClients.length}</strong> cliente(s) encontrado(s).
                </span>
                <span className="text-sky-800 font-medium">
                  Clique em <strong>"Ver Orçamentos"</strong> para consultar o histórico de vendas.
                </span>
              </div>
            )}
        </div>

        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => {
              const clientQuotes = savedQuotes.filter(q => {
                const matchId = Boolean(q.client?.id && q.client.id === client.id);
                const matchName = Boolean(
                  q.client?.name && 
                  client.name && 
                  q.client.name.trim().toLowerCase() === client.name.trim().toLowerCase()
                );
                const matchCode = Boolean(
                  q.client?.code && 
                  client.code && 
                  q.client.code.trim().toLowerCase() === client.code.trim().toLowerCase()
                );
                return matchId || matchName || matchCode;
              });

              const totalQuotesVal = clientQuotes.reduce((acc, q) => acc + (q.finalTotal || 0), 0);

              return (
                <div key={client.id} className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start gap-4">
                      <div className="flex-grow">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="bg-slate-100 text-slate-800 border border-slate-300 font-mono text-xs font-bold px-2 py-0.5 rounded">
                                  Cód: {client.code || 'N/A'}
                              </span>
                              <h3 className="font-bold text-lg text-[--color-primary-600]">{client.name}</h3>
                              <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${client.type === 'physical' ? 'bg-[--color-primary-100] text-[--color-primary-800]' : 'bg-purple-100 text-purple-800'}`}>
                                  {client.type === 'physical' ? 'P. Física' : 'P. Jurídica'}
                              </span>
                          </div>

                          <div className="text-slate-600 text-sm space-y-0.5 mt-2">
                            {client.cpf && <p className="font-medium"><span className="text-slate-500 font-normal">CPF:</span> {client.cpf}</p>}
                            {client.cnpj && <p className="font-medium"><span className="text-slate-500 font-normal">CNPJ:</span> {client.cnpj}</p>}
                            {client.stateRegistration && <p><span className="text-slate-500">IE:</span> {client.stateRegistration}</p>}
                            <p className="text-slate-700">{client.address}{client.city ? `, ${client.city}` : ''}{client.zipCode ? ` - ${client.zipCode}` : ''}</p>
                            <p><span className="text-slate-500">Tel:</span> <strong className="text-slate-800">{client.phone}</strong></p>
                            {client.email && <p><span className="text-slate-500">Email:</span> {client.email}</p>}
                          </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center space-x-1 flex-shrink-0">
                          {/* Option to show quote records */}
                          <button 
                            type="button"
                            onClick={() => setSelectedClientForQuotes(client)}
                            className="p-2 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-full transition-colors relative cursor-pointer" 
                            title="Ver Histórico de Orçamentos deste Cliente"
                          >
                              <FileText className="h-5 w-5" />
                              {clientQuotes.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-sky-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                  {clientQuotes.length}
                                </span>
                              )}
                          </button>
                          <button onClick={() => handleGeneratePdf(client)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors" title="Gerar PDF da Ficha Cadastral">
                              <FileDownIcon className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleEditClick(client)} className="p-2 text-[--color-accent-600] hover:text-[--color-accent-800] hover:bg-[--color-accent-100] rounded-full transition-colors" title="Editar Cliente">
                              <PencilIcon className="h-5 w-5" />
                          </button>
                          <button onClick={() => deleteClient(client.id)} className="p-2 text-[--color-destructive-600] hover:text-[--color-destructive-800] hover:bg-[--color-destructive-100] rounded-full transition-colors" title="Excluir Cliente">
                              <TrashIcon className="h-5 w-5" />
                          </button>
                      </div>
                  </div>

                  {/* Quote Record Action Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedClientForQuotes(client)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                          clientQuotes.length > 0 
                            ? 'bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300' 
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                        title="Ver histórico completo de orçamentos deste cliente"
                      >
                        <FileText className={`w-3.5 h-3.5 ${clientQuotes.length > 0 ? 'text-sky-700' : 'text-slate-500'}`} />
                        <span>
                          {clientQuotes.length === 0 ? 'Nenhum orçamento' : `${clientQuotes.length} orçamento(s) emitido(s)`}
                        </span>
                      </button>

                      {clientQuotes.length > 0 && (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                          Total: R$ {totalQuotesVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedClientForQuotes(client)}
                        className="text-xs font-semibold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>Ver Registros de Orçamentos</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>

                      {onNewQuoteForClient && (
                        <button
                          type="button"
                          onClick={() => onNewQuoteForClient(client)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                          title="Iniciar novo orçamento para este cliente"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Novo Orçamento
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 bg-white rounded-lg shadow-md">
                <p className="text-slate-500">
                    {clients.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado com este nome ou termo de busca."}
                </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE HISTÓRICO DE ORÇAMENTOS DO CLIENTE */}
      {selectedClientForQuotes && (
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
                      Cód: {selectedClientForQuotes.code || 'N/A'}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900">{selectedClientForQuotes.name}</h2>
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
                      selectedClientForQuotes.type === 'physical' ? 'bg-[--color-primary-100] text-[--color-primary-800]' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {selectedClientForQuotes.type === 'physical' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedClientForQuotes.phone && <span>Tel: {selectedClientForQuotes.phone} • </span>}
                    {selectedClientForQuotes.cpf && <span>CPF: {selectedClientForQuotes.cpf} • </span>}
                    {selectedClientForQuotes.cnpj && <span>CNPJ: {selectedClientForQuotes.cnpj} • </span>}
                    {selectedClientForQuotes.city && <span>{selectedClientForQuotes.city} • </span>}
                    <span>Histórico de Propostas e Vendas</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedClientForQuotes(null);
                  setQuoteSearchTerm('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client Summary KPI Bar */}
            <div className="px-5 py-3 bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold block">Total de Orçamentos</span>
                  <span className="text-lg font-bold text-slate-900">{selectedClientQuotes.length}</span>
                </div>
                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                <div>
                  <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold block">Valor Total Acumulado</span>
                  <span className="text-lg font-bold text-emerald-700">
                    R$ {selectedClientTotalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {selectedClientQuotes.length > 0 && (
                  <>
                    <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold block">Ticket Médio</span>
                      <span className="text-base font-bold text-indigo-700">
                        R$ {(selectedClientTotalSpent / selectedClientQuotes.length).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {onNewQuoteForClient && (
                  <button
                    type="button"
                    onClick={() => {
                      const c = selectedClientForQuotes;
                      setSelectedClientForQuotes(null);
                      onNewQuoteForClient(c);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Orçamento</span>
                  </button>
                )}
              </div>
            </div>

            {/* Search within Client's Quotes */}
            {selectedClientQuotes.length > 1 && (
              <div className="px-5 py-2.5 border-b border-slate-100 bg-white shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filtrar orçamentos por número, produto ou observação..."
                    value={quoteSearchTerm}
                    onChange={(e) => setQuoteSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <SearchIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  {quoteSearchTerm && (
                    <button 
                      type="button"
                      onClick={() => setQuoteSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quotes Content Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-grow bg-slate-50/50">
              {filteredClientQuotes.length > 0 ? (
                filteredClientQuotes.map((quote) => {
                  const quoteNumberFormatted = quote.number 
                    ? `Nº ${String(quote.number).padStart(4, '0')}` 
                    : 'Sem número';
                  const isExporting = isExportingPdf === quote.id;

                  return (
                    <div 
                      key={quote.id} 
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-sky-300 transition-all space-y-3"
                    >
                      {/* Quote Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="bg-sky-100 text-sky-800 font-mono font-bold text-xs px-2.5 py-1 rounded-md border border-sky-200">
                            Orçamento {quoteNumberFormatted}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDateTime(quote.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-xs text-slate-500 mr-1.5">Total:</span>
                            <span className="text-base font-extrabold text-emerald-700">
                              R$ {quote.finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Items Summary Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-100 bg-slate-50/50">
                              <th className="py-1 px-2 font-medium w-16 text-center">Quant.</th>
                              <th className="py-1 px-2 font-medium">Item / Descrição</th>
                              <th className="py-1 px-2 font-medium w-24 text-center">Tipo</th>
                              <th className="py-1 px-2 font-medium w-24 text-right">Unitário</th>
                              <th className="py-1 px-2 font-medium w-24 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {quote.items.map((item, idx) => {
                              const subtotalItem = item.product.sellPrice * item.quantity;
                              return (
                                <tr key={`modal-item-${idx}`} className="hover:bg-slate-50/70">
                                  <td className="py-1.5 px-2 text-center font-bold text-slate-700">{item.quantity}</td>
                                  <td className="py-1.5 px-2 font-medium text-slate-800">
                                    {item.product.name}
                                    {item.product.code && <span className="text-[10px] text-slate-400 font-mono ml-1.5">({item.product.code})</span>}
                                    {item.product.internalCode && <span className="text-[10px] text-indigo-600 font-mono ml-1">[{item.product.internalCode}]</span>}
                                  </td>
                                  <td className="py-1.5 px-2 text-center">
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                      item.product.type === 'service' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                      {item.product.type === 'service' ? 'Serviço' : 'Produto'}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2 text-right text-slate-600">
                                    R$ {item.product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-semibold text-slate-900">
                                    R$ {subtotalItem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Totals & Notes breakdown */}
                      {(quote.discountAmount > 0 || quote.notes) && (
                        <div className="bg-slate-50 p-2.5 rounded-lg text-xs flex flex-col sm:flex-row justify-between gap-2 border border-slate-100">
                          {quote.notes ? (
                            <div className="text-slate-600 text-[11px] max-w-md">
                              <span className="font-semibold text-slate-700">Obs:</span> {quote.notes}
                            </div>
                          ) : <div></div>}

                          {quote.discountAmount > 0 && (
                            <div className="text-right space-y-0.5 shrink-0">
                              <div className="text-slate-500">
                                Subtotal: R$ {quote.subtotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                              </div>
                              <div className="text-red-600 font-medium">
                                Desconto: - R$ {quote.discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons for this specific quote */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {quote.id.slice(0, 8)}...
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {onOpenQuote && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenQuote(quote);
                                setSelectedClientForQuotes(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-700 text-white transition-colors cursor-pointer"
                              title="Abrir no Gerador de Orçamentos para editar ou visualizar"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Abrir Orçamento</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePrintQuote(quote)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                            title="Imprimir proposta"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>Imprimir</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadQuotePdf(quote)}
                            disabled={isExporting}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800 transition-colors cursor-pointer disabled:opacity-50"
                            title="Baixar em formato PDF"
                          >
                            <FileDownIcon className="w-3.5 h-3.5 text-orange-700" />
                            <span>{isExporting ? 'Gerando...' : 'PDF'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppQuote(quote)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                            title="Enviar orçamento no WhatsApp do cliente"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-6 space-y-3">
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {selectedClientQuotes.length === 0 
                      ? 'Nenhum orçamento emitido para este cliente ainda' 
                      : 'Nenhum orçamento encontrado com o filtro atual'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {selectedClientQuotes.length === 0 
                      ? `Você ainda não criou nenhum orçamento ou proposta para ${selectedClientForQuotes.name}. Crie o primeiro orçamento agora mesmo.` 
                      : 'Tente alterar o termo digitado na barra de busca acima.'}
                  </p>
                  {onNewQuoteForClient && selectedClientQuotes.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const c = selectedClientForQuotes;
                        setSelectedClientForQuotes(null);
                        onNewQuoteForClient(c);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[--color-primary-600] text-white hover:bg-[--color-primary-700] transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Criar Primeiro Orçamento para {selectedClientForQuotes.name}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Mostrando {filteredClientQuotes.length} de {selectedClientQuotes.length} orçamento(s)
              </span>

              <button
                type="button"
                onClick={() => {
                  setSelectedClientForQuotes(null);
                  setQuoteSearchTerm('');
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
