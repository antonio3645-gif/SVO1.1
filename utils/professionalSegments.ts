import type { Product } from '../types';

export interface ProfessionalSegment {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  defaultSectors: string[];
  presetServices: Array<{
    code: string;
    type: 'service' | 'product';
    name: string;
    costPrice: number;
    sellPrice: number;
    stock: number;
    sector: string;
    observation?: string;
  }>;
}

export const PROFESSIONAL_SEGMENTS: ProfessionalSegment[] = [
  {
    id: 'eletricista',
    name: 'Eletricista / Instalações Elétricas',
    icon: '⚡',
    category: 'Elétrica',
    description: 'Instalações, manutenção de quadros elétricos, cabeamento, iluminação e reparos.',
    defaultSectors: ['Residencial', 'Comercial', 'Industrial', 'Iluminação', 'Padrão / Entrada', 'Materiais'],
    presetServices: [
      { code: '0001', type: 'service', name: 'Instalação de Tomada / Interruptor', costPrice: 15, sellPrice: 45, stock: 999, sector: 'Residencial', observation: 'Substituição ou nova instalação de ponto simples' },
      { code: '0002', type: 'service', name: 'Troca de Disjuntor no Quadro de Distribuição', costPrice: 20, sellPrice: 80, stock: 999, sector: 'Residencial', observation: 'Substituição com teste de carga e isolamento' },
      { code: '0003', type: 'service', name: 'Instalação de Chuveiro Elétrico', costPrice: 15, sellPrice: 70, stock: 999, sector: 'Residencial', observation: 'Inclui fita isolante/conector cerâmico ou wago' },
      { code: '0004', type: 'service', name: 'Instalação de Ventilador de Teto', costPrice: 30, sellPrice: 130, stock: 999, sector: 'Residencial', observation: 'Montagem mecânica e conexão do controle de parede' },
      { code: '0005', type: 'service', name: 'Padrão de Entrada Bifásico / Trifásico', costPrice: 200, sellPrice: 650, stock: 999, sector: 'Padrão / Entrada', observation: 'Montagem completa conforme norma da concessionária' },
      { code: '0006', type: 'service', name: 'Passagem de Fiação por Circuito (metro)', costPrice: 5, sellPrice: 18, stock: 999, sector: 'Residencial', observation: 'Guia e puxamento de cabos através de conduítes' },
      { code: '0007', type: 'service', name: 'Instalação de Luminária / Plafon LED', costPrice: 15, sellPrice: 55, stock: 999, sector: 'Iluminação', observation: 'Fixação em laje ou gesso com furação' },
      { code: '0008', type: 'service', name: 'Revisão Elétrica Geral e Teste de Fuga de Corrente', costPrice: 60, sellPrice: 220, stock: 999, sector: 'Residencial', observation: 'Diagnóstico com multímetro/alicate amperímetro' },
    ]
  },
  {
    id: 'mecanico',
    name: 'Mecânico / Oficina Automotiva',
    icon: '🔧',
    category: 'Automotivo',
    description: 'Manutenção mecânica, freios, suspensão, motor, troca de fluidos e revisão.',
    defaultSectors: ['Motor', 'Freios', 'Suspensão & Direção', 'Revisão Preventiva', 'Injeção Eletrônica', 'Peças'],
    presetServices: [
      { code: '0001', type: 'service', name: 'Troca de Óleo do Motor e Filtros', costPrice: 40, sellPrice: 120, stock: 999, sector: 'Revisão Preventiva', observation: 'Mão de obra para troca de óleo, filtro de óleo e combustível' },
      { code: '0002', type: 'service', name: 'Substituição de Pastilhas de Freio Dianteiras', costPrice: 50, sellPrice: 140, stock: 999, sector: 'Freios', observation: 'Limpeza do cavalete e sangria se necessário' },
      { code: '0003', type: 'service', name: 'Alinhamento e Balanceamento das 4 Rodas', costPrice: 30, sellPrice: 110, stock: 999, sector: 'Suspensão & Direção', observation: 'Ajuste de convergência/divergência e chumbo nas rodas' },
      { code: '0004', type: 'service', name: 'Troca de Correia Dentada e Tensor', costPrice: 90, sellPrice: 280, stock: 999, sector: 'Motor', observation: 'Sincronismo do motor e troca do rolamento tensor' },
      { code: '0005', type: 'service', name: 'Limpeza de Bicos Injetores e Corpo de Borboleta (TBI)', costPrice: 60, sellPrice: 180, stock: 999, sector: 'Injeção Eletrônica', observation: 'Ultrassom e equalização em bancada de teste' },
      { code: '0006', type: 'service', name: 'Substituição de Amortecedores Dianteiros (Par)', costPrice: 80, sellPrice: 250, stock: 999, sector: 'Suspensão & Direção', observation: 'Desmontagem da torre, troca de batentes e coxins' },
      { code: '0007', type: 'service', name: 'Diagnóstico Completo com Scanner Automotivo', costPrice: 20, sellPrice: 90, stock: 999, sector: 'Injeção Eletrônica', observation: 'Leitura de códigos de falha e parâmetros em tempo real' },
      { code: '0008', type: 'service', name: 'Troca do Kit de Embreagem (Disco, Platô e Rolamento)', costPrice: 150, sellPrice: 450, stock: 999, sector: 'Motor', observation: 'Descida de câmbio e regulagem do acionamento' },
    ]
  },
  {
    id: 'encanador',
    name: 'Encanador / Bombeiro Hidráulico',
    icon: '🚰',
    category: 'Hidráulica',
    description: 'Consertos de vazamentos, desentupimentos, instalação de louças e tubulações.',
    defaultSectors: ['Água Limpa', 'Esgoto', 'Desentupimento', 'Louças e Metais', 'Caixa d\'Água', 'Tubulações'],
    presetServices: [
      { code: '0001', type: 'service', name: 'Caça-Vazamento e Reparo Hidráulico Pontual', costPrice: 50, sellPrice: 180, stock: 999, sector: 'Água Limpa', observation: 'Localização de ponto de umidade e solda em PVC/PPR/cobre' },
      { code: '0002', type: 'service', name: 'Desentupimento de Pia ou Vaso Sanitário', costPrice: 40, sellPrice: 150, stock: 999, sector: 'Desentupimento', observation: 'Desobstrução manual ou com sonda rotativa' },
      { code: '0003', type: 'service', name: 'Troca de Reparo de Válvula Hydra', costPrice: 35, sellPrice: 120, stock: 999, sector: 'Louças e Metais', observation: 'Regulagem de fluxo e troca do êmbolo interno' },
      { code: '0004', type: 'service', name: 'Instalação de Torneira Monocomando / Misturador', costPrice: 20, sellPrice: 85, stock: 999, sector: 'Louças e Metais', observation: 'Fixação em bancada e engates flexíveis' },
      { code: '0005', type: 'service', name: 'Limpeza e Desinfecção de Caixa d\'Água (até 1.000L)', costPrice: 45, sellPrice: 180, stock: 999, sector: 'Caixa d\'Água', observation: 'Esvaziamento, escovação e cloração conforme padrão sanitário' },
      { code: '0006', type: 'service', name: 'Instalação de Bacia Sanitária com Caixa Acoplada', costPrice: 30, sellPrice: 130, stock: 999, sector: 'Louças e Metais', observation: 'Fixação com anel de vedação, parafusos e ligação flexível' },
      { code: '0007', type: 'service', name: 'Troca de Registro de Gaveta / Pressão', costPrice: 35, sellPrice: 140, stock: 999, sector: 'Água Limpa', observation: 'Corte e emenda de tubulação com luva de correr' },
    ]
  },
  {
    id: 'pintor',
    name: 'Pintor / Pintura e Acabamento',
    icon: '🎨',
    category: 'Pintura',
    description: 'Pintura residencial e predial, aplicação de massa corrida, textura e verniz.',
    defaultSectors: ['Paredes & Tetos', 'Massa Corrida / Gesso', 'Portas & Janelas', 'Esmalte & Ferragens', 'Texturas', 'Materiais'],
    presetServices: [
      { code: '0001', type: 'service', name: 'Pintura de Paredes com Tinta Acrílica (por m²)', costPrice: 4, sellPrice: 16, stock: 999, sector: 'Paredes & Tetos', observation: 'Aplicação de 2 a 3 demãos de tinta lavável' },
      { code: '0002', type: 'service', name: 'Aplicação de Massa Corrida ou Acrílica com Lixamento (m²)', costPrice: 6, sellPrice: 22, stock: 999, sector: 'Massa Corrida / Gesso', observation: '2 demãos de massa para acabamento liso e nivelado' },
      { code: '0003', type: 'service', name: 'Aplicação de Textura Projetada / Grafiato (m²)', costPrice: 8, sellPrice: 28, stock: 999, sector: 'Texturas', observation: 'Aplicação com desempenadeira plástica e efeito ranhurado' },
      { code: '0004', type: 'service', name: 'Pintura de Porta de Madeira com Esmalte Sintético (unidade)', costPrice: 25, sellPrice: 95, stock: 999, sector: 'Portas & Janelas', observation: 'Lixamento, fundo preparador e esmalte acetinado ou brilhante' },
      { code: '0005', type: 'service', name: 'Pintura de Portão ou Grade Metálica (por m²)', costPrice: 8, sellPrice: 32, stock: 999, sector: 'Esmalte & Ferragens', observation: 'Tratamento de ferrugem, zarcão e acabamento em esmalte' },
      { code: '0006', type: 'service', name: 'Aplicação de Verniz em Deck ou Madeira Externa (m²)', costPrice: 7, sellPrice: 26, stock: 999, sector: 'Portas & Janelas', observation: 'Verniz marítimo ou filtro solar com lixamento prévio' },
    ]
  },
  {
    id: 'marceneiro',
    name: 'Marceneiro / Móveis Planejados',
    icon: '🔨',
    category: 'Marcenaria',
    description: 'Fabricação de móveis sob medida, montagem, ajustes e restauração de madeira.',
    defaultSectors: ['Cozinhas', 'Quartos & Closets', 'Banheiros', 'Manutenção & Montagem', 'Ferragens', 'MDF / Madeira'],
    presetServices: [
      { code: '0001', type: 'service', name: 'Fabricação de Armário de Cozinha Sob Medida (metro linear)', costPrice: 350, sellPrice: 980, stock: 999, sector: 'Cozinhas', observation: 'Em MDF 18mm com fitamento de borda e corrediças telescópicas' },
      { code: '0002', type: 'service', name: 'Montagem de Guarda-Roupa / Roupeiro Grande', costPrice: 50, sellPrice: 190, stock: 999, sector: 'Manutenção & Montagem', observation: 'Montagem completa com prumo, nível e fixação na parede' },
      { code: '0003', type: 'service', name: 'Troca de Dobradiças com Amortecedor (unidade)', costPrice: 8, sellPrice: 35, stock: 999, sector: 'Ferragens', observation: 'Substituição com furação e regulagem de folga das portas' },
      { code: '0004', type: 'service', name: 'Fabricação e Instalação de Painel de TV (m²)', costPrice: 120, sellPrice: 380, stock: 999, sector: 'Quartos & Closets', observation: 'Estruturado para passagem oculta de fiação e suporte de TV' },
      { code: '0005', type: 'service', name: 'Ajuste e Alinhamento de Portas de Armários (por porta)', costPrice: 5, sellPrice: 25, stock: 999, sector: 'Manutenção & Montagem', observation: 'Regulagem fina de dobradiças e troca de calços' },
      { code: '0006', type: 'service', name: 'Instalação de Corrediças Ocultas / Telescópicas (por gaveta)', costPrice: 20, sellPrice: 65, stock: 999, sector: 'Ferragens', observation: 'Ajuste de caixa e fixação com abertura suave' },
    ]
  },
  {
    id: 'construcao',
    name: 'Construção Civil / Pedreiro e Reformas',
    icon: '🏗️',
    category: 'Construção',
    description: 'Alvenaria, assentamento de pisos e porcelanatos, reboco, contrapiso e reformas.',
    defaultSectors: ['Pisos & Revestimentos', 'Alvenaria', 'Reboco & Contrapiso', 'Demolição', 'Telhados', 'Fundação'],
    presetServices: [
      { code: '0001', type: 'service', name: 'Assentamento de Porcelanato / Piso Cerâmico (por m²)', costPrice: 12, sellPrice: 48, stock: 999, sector: 'Pisos & Revestimentos', observation: 'Nivelamento com niveladores plásticos e dupla colagem' },
      { code: '0002', type: 'service', name: 'Levantamento de Alvenaria com Bloco de Concreto/Cerâmico (m²)', costPrice: 10, sellPrice: 38, stock: 999, sector: 'Alvenaria', observation: 'Com amarração, prumo e alinhamento a laser' },
      { code: '0003', type: 'service', name: 'Aplicação de Reboco / Emboço Sarrafeado e Desempenado (m²)', costPrice: 8, sellPrice: 28, stock: 999, sector: 'Reboco & Contrapiso', observation: 'Chapisco prévio e massa nivelada para pintura' },
      { code: '0004', type: 'service', name: 'Execução de Contrapiso Farofa Nivelado (por m²)', costPrice: 6, sellPrice: 24, stock: 999, sector: 'Reboco & Contrapiso', observation: 'Taliscas, nivelamento e caimento adequado para ralos' },
      { code: '0005', type: 'service', name: 'Instalação de Bancada / Pia de Granito ou Mármore', costPrice: 30, sellPrice: 140, stock: 999, sector: 'Pisos & Revestimentos', observation: 'Chumbamento em parede com cantoneiras de apoio' },
      { code: '0006', type: 'service', name: 'Demolição de Parede e Remoção de Entulho (m²)', costPrice: 10, sellPrice: 35, stock: 999, sector: 'Demolição', observation: 'Quebra controlada e ensacamento de resíduos' },
    ]
  },
  {
    id: 'refrigeracao',
    name: 'Refrigeração / Ar Condicionado (HVAC)',
    icon: '❄️',
    category: 'Climatização',
    description: 'Instalação de ar condicionado Split, higienização, recarga de gás e manutenção.',
    defaultSectors: ['Instalação Split', 'Higienização & Limpeza', 'Recarga de Gás', 'Manutenção Elétrica', 'Peças & Tubos'],
    presetServices: [
      { code: '0001', type: 'service', name: 'Instalação Completa de Split até 12.000 BTUs', costPrice: 120, sellPrice: 420, stock: 999, sector: 'Instalação Split', observation: 'Inclui furação, suporte, até 3m de tubulação de cobre e vácuo' },
      { code: '0002', type: 'service', name: 'Higienização e Limpeza Química Completa (Split)', costPrice: 35, sellPrice: 160, stock: 999, sector: 'Higienização & Limpeza', observation: 'Lavagem da serpentina, turbina, bandeja de dreno e bactericida' },
      { code: '0003', type: 'service', name: 'Carga / Complemento de Gás Refrigerante R410A / R32', costPrice: 60, sellPrice: 210, stock: 999, sector: 'Recarga de Gás', observation: 'Teste de estanqueidade e recarga conforme peso na balança' },
      { code: '0004', type: 'service', name: 'Troca de Capacitor da Condensadora', costPrice: 25, sellPrice: 110, stock: 999, sector: 'Manutenção Elétrica', observation: 'Substituição com teste de partida do compressor' },
      { code: '0005', type: 'service', name: 'Desinstalação de Ar Condicionado com Recolhimento de Gás', costPrice: 30, sellPrice: 130, stock: 999, sector: 'Instalação Split', observation: 'Travamento do refrigerante na condensadora e tampões' },
    ]
  },
  {
    id: 'informatica',
    name: 'Informática / TI e Suporte Técnico',
    icon: '💻',
    category: 'Tecnologia',
    description: 'Formatação, montagem de computadores, redes Wi-Fi e cabeamento estruturado.',
    defaultSectors: ['Computadores & Notebooks', 'Redes & Wi-Fi', 'Servidores & Backup', 'Segurança & Câmeras', 'Peças'],
    presetServices: [
      { code: '0001', type: 'service', name: 'Formatação com Backup e Instalação de Sistema Operacional', costPrice: 20, sellPrice: 120, stock: 999, sector: 'Computadores & Notebooks', observation: 'Windows/Linux limpo, drivers atualizados e programas essenciais' },
      { code: '0002', type: 'service', name: 'Limpeza Interna e Troca de Pasta Térmica (PC / Notebook)', costPrice: 15, sellPrice: 90, stock: 999, sector: 'Computadores & Notebooks', observation: 'Desobstrução do cooler e pasta térmica de prata de alta condutividade' },
      { code: '0003', type: 'service', name: 'Instalação de SSD e Clonagem de Disco', costPrice: 25, sellPrice: 110, stock: 999, sector: 'Computadores & Notebooks', observation: 'Migração integral de dados sem perda de programas' },
      { code: '0004', type: 'service', name: 'Configuração de Ponto de Rede Cabeada Cat6 (por ponto)', costPrice: 25, sellPrice: 85, stock: 999, sector: 'Redes & Wi-Fi', observation: 'Passagem, conectorização RJ45 e teste de continuidade' },
      { code: '0005', type: 'service', name: 'Configuração de Roteador Wi-Fi Mesh ou Repetidor', costPrice: 15, sellPrice: 75, stock: 999, sector: 'Redes & Wi-Fi', observation: 'Otimização de canais e cobertura sem pontos cegos' },
    ]
  },
  {
    id: 'marido_de_aluguel',
    name: 'Marido de Aluguel / Reparos e Manutenção Geral',
    icon: '🏠',
    category: 'Geral',
    description: 'Pequenos reparos, instalações diversas, furações e manutenção residencial rápida.',
    defaultSectors: ['Instalações Diversas', 'Reparos Elétricos', 'Reparos Hidráulicos', 'Fixação em Paredes', 'Geral'],
    presetServices: [
      { code: '0001', type: 'service', name: 'Instalação de Suporte de TV em Parede / Painel', costPrice: 15, sellPrice: 75, stock: 999, sector: 'Fixação em Paredes', observation: 'Furação com buchas adequadas e nivelamento' },
      { code: '0002', type: 'service', name: 'Instalação de Varão de Cortina / Persiana', costPrice: 10, sellPrice: 60, stock: 999, sector: 'Instalações Diversas', observation: 'Furação, instalação de suportes e colocação da cortina' },
      { code: '0003', type: 'service', name: 'Kit Acessórios de Banheiro (Papeleira, Toalheiro, Saboneteira)', costPrice: 15, sellPrice: 65, stock: 999, sector: 'Instalações Diversas', observation: 'Furação precisa em revestimento cerâmico/porcelanato' },
      { code: '0004', type: 'service', name: 'Instalação / Troca de Fechadura de Porta', costPrice: 20, sellPrice: 80, stock: 999, sector: 'Geral', observation: 'Ajuste de espelho e teste de chaveamento' },
      { code: '0005', type: 'service', name: 'Troca de Sifão e Flexível de Pia', costPrice: 15, sellPrice: 55, stock: 999, sector: 'Reparos Hidráulicos', observation: 'Eliminação de vazamentos e regulagem de caimento' },
    ]
  },
  {
    id: 'personalizado',
    name: 'Personalizado / Outro Segmento',
    icon: '⚙️',
    category: 'Geral',
    description: 'Configure seus próprios setores, serviços e preços do zero para seu nicho de atuação.',
    defaultSectors: ['Serviços Gerais', 'Produtos / Peças', 'Mão de Obra', 'Outros'],
    presetServices: [
      { code: '0001', type: 'service', name: 'Serviço Padrão Especializado (Hora)', costPrice: 30, sellPrice: 90, stock: 999, sector: 'Mão de Obra', observation: 'Hora técnica padrão de atendimento' },
      { code: '0002', type: 'service', name: 'Visita Técnica e Orçamento no Local', costPrice: 20, sellPrice: 60, stock: 999, sector: 'Serviços Gerais', observation: 'Avaliação técnica presencial' },
    ]
  }
];

export const getSegmentById = (id: string): ProfessionalSegment => {
  const found = PROFESSIONAL_SEGMENTS.find(s => s.id === id);
  return found || PROFESSIONAL_SEGMENTS[PROFESSIONAL_SEGMENTS.length - 1];
};
