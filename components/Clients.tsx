
import React, { useState } from 'react';
import type { Client } from '../types';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { FileDownIcon } from './icons/FileDownIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SearchIcon } from './icons/SearchIcon';

interface ClientsProps {
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
}

const Clients: React.FC<ClientsProps> = ({ clients, addClient, updateClient, deleteClient }) => {
  const [editingClient, setEditingClient] = useState<Client | null>(null);
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

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 md:p-8">
      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          {editingClient ? <PencilIcon className="mr-3 text-[--color-accent-500]" /> : <UserPlusIcon className="mr-3 text-[--color-primary-500]" />}
          {editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <h2 className="text-2xl font-bold text-slate-900">Clientes Cadastrados</h2>
            <button
                onClick={handleExportClients}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[--color-primary-600] hover:bg-[--color-primary-700] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary-500] transition-colors"
            >
                <FileDownIcon className="mr-2 h-5 w-5" />
                Exportar CSV
            </button>
        </div>

        <div className="mb-4">
            <div className="relative">
                <input
                    type="text"
                    placeholder="Buscar cliente por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-[--color-primary-500] focus:border-[--color-primary-500]"
                />
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-slate-400" />
                </div>
            </div>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <div key={client.id} className="bg-white p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                    <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-lg text-[--color-primary-800]">{client.name}</h3>
                            <span className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${client.type === 'physical' ? 'bg-[--color-primary-100] text-[--color-primary-800]' : 'bg-purple-100 text-purple-800'}`}>
                                {client.type === 'physical' ? 'P. Física' : 'P. Jurídica'}
                            </span>
                        </div>
                    </div>
                     <div className="flex items-center space-x-1 flex-shrink-0 ml-4">
                        <button onClick={() => handleGeneratePdf(client)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors" title="Gerar PDF do Cliente">
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
                {client.cpf && <p className="text-slate-600 font-medium text-sm mt-2">CPF: {client.cpf}</p>}
                {client.cnpj && <p className="text-slate-600 font-medium text-sm mt-2">CNPJ: {client.cnpj}</p>}
                {client.stateRegistration && <p className="text-slate-600 font-medium text-sm">IE: {client.stateRegistration}</p>}
                <p className="text-slate-600 text-sm mt-1">{client.address}, {client.city} - {client.zipCode}</p>
                <p className="text-slate-600 text-sm">Tel: {client.phone}</p>
                {client.email && <p className="text-slate-600 text-sm">Email: {client.email}</p>}
                <p className="text-slate-400 text-xs mt-2 break-all">ID: {client.id}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-10 bg-white rounded-lg shadow-md">
                <p className="text-slate-500">
                    {clients.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado com este nome."}
                </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Clients;
