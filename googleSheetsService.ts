import type { Client, Product, SavedQuote } from './types';

const SPREADSHEET_ID_KEY = 'svo_google_spreadsheet_id';
const SPREADSHEET_URL_KEY = 'svo_google_spreadsheet_url';
const SPREADSHEET_MODE_KEY = 'svo_spreadsheet_mode'; // 'personal' | 'shared'
const SHARED_SPREADSHEET_ID_KEY = 'svo_shared_team_spreadsheet_id';
const SHARED_SPREADSHEET_URL_KEY = 'svo_shared_team_spreadsheet_url';

export const extractSpreadsheetId = (input: string): string => {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
};

export const getSpreadsheetMode = (): 'personal' | 'shared' => {
  return (localStorage.getItem(SPREADSHEET_MODE_KEY) as 'personal' | 'shared') || 'personal';
};

export const setSpreadsheetMode = (mode: 'personal' | 'shared') => {
  localStorage.setItem(SPREADSHEET_MODE_KEY, mode);
};

export const getSharedSpreadsheetId = (): string | null => {
  return localStorage.getItem(SHARED_SPREADSHEET_ID_KEY);
};

export const getSharedSpreadsheetUrl = (): string | null => {
  return localStorage.getItem(SHARED_SPREADSHEET_URL_KEY);
};

export const setSharedSpreadsheet = (urlOrId: string): { id: string; url: string } => {
  const id = extractSpreadsheetId(urlOrId);
  if (!id || id.length < 5) {
    throw new Error('ID ou link da planilha inválido. Cole a URL completa da planilha do Google.');
  }
  const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;
  localStorage.setItem(SHARED_SPREADSHEET_ID_KEY, id);
  localStorage.setItem(SHARED_SPREADSHEET_URL_KEY, url);
  setSpreadsheetMode('shared');
  return { id, url };
};

export const clearSharedSpreadsheet = () => {
  localStorage.removeItem(SHARED_SPREADSHEET_ID_KEY);
  localStorage.removeItem(SHARED_SPREADSHEET_URL_KEY);
  setSpreadsheetMode('personal');
};

export const getSavedSpreadsheetId = (userId?: string): string | null => {
  const mode = getSpreadsheetMode();
  if (mode === 'shared') {
    const sharedId = getSharedSpreadsheetId();
    if (sharedId) return sharedId;
  }
  if (userId) {
    const userSpecific = localStorage.getItem(`${SPREADSHEET_ID_KEY}_${userId}`);
    if (userSpecific) return userSpecific;
  }
  return localStorage.getItem(SPREADSHEET_ID_KEY);
};

export const getSavedSpreadsheetUrl = (userId?: string): string | null => {
  const mode = getSpreadsheetMode();
  if (mode === 'shared') {
    const sharedUrl = getSharedSpreadsheetUrl();
    if (sharedUrl) return sharedUrl;
  }
  if (userId) {
    const userSpecific = localStorage.getItem(`${SPREADSHEET_URL_KEY}_${userId}`);
    if (userSpecific) return userSpecific;
  }
  return localStorage.getItem(SPREADSHEET_URL_KEY);
};

export const saveSpreadsheetInfo = (id: string, url: string, userId?: string) => {
  localStorage.setItem(SPREADSHEET_ID_KEY, id);
  localStorage.setItem(SPREADSHEET_URL_KEY, url);
  if (userId) {
    localStorage.setItem(`${SPREADSHEET_ID_KEY}_${userId}`, id);
    localStorage.setItem(`${SPREADSHEET_URL_KEY}_${userId}`, url);
  }
};

export const clearSpreadsheetInfo = (userId?: string) => {
  localStorage.removeItem(SPREADSHEET_ID_KEY);
  localStorage.removeItem(SPREADSHEET_URL_KEY);
  if (userId) {
    localStorage.removeItem(`${SPREADSHEET_ID_KEY}_${userId}`);
    localStorage.removeItem(`${SPREADSHEET_URL_KEY}_${userId}`);
  }
};

/**
 * Formata um valor numérico para a moeda brasileira Real (R$) com 2 casas decimais.
 * Exemplo: 1250.5 -> "R$ 1.250,50"
 */
export const formatBRL = (value: number | string | undefined | null): string => {
  const num = typeof value === 'number' ? value : parseFloat(String(value || '0').replace(',', '.'));
  const safeNum = isNaN(num) ? 0 : num;
  return safeNum.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const checkGoogleApiResponse = async (response: Response, actionName: string) => {
  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 403 && (errText.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') || errText.includes('insufficient authentication scopes'))) {
      const scopeErr: any = new Error('Permissão insuficiente no Google Planilhas. Sua conta Google conectada precisa autorizar permissão para salvar e criar planilhas no seu Google Drive.');
      scopeErr.code = 'ACCESS_TOKEN_SCOPE_INSUFFICIENT';
      throw scopeErr;
    }
    throw new Error(`${actionName}: ${response.status} ${errText}`);
  }
};

/**
 * Searches in Google Drive for an existing spreadsheet created by the app.
 */
export const findExistingSpreadsheet = async (accessToken: string): Promise<{ id: string; webViewLink?: string } | null> => {
  try {
    const query = encodeURIComponent("name = 'SVO - Banco de Dados' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&pageSize=1`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  } catch (err) {
    console.warn('Erro ao buscar planilha existente no Google Drive:', err);
    return null;
  }
};

/**
 * Creates the Google Spreadsheet with 3 tabs:
 * 1. "Produtos & Serviços"
 * 2. "Clientes"
 * 3. "Orçamentos & Itens"
 */
export const createDatabaseSpreadsheet = async (accessToken: string, userId?: string): Promise<{ id: string; url: string; isShared: boolean }> => {
  const spreadsheetResource = {
    properties: {
      title: 'SVO - Banco de Dados',
    },
    sheets: [
      {
        properties: {
          title: 'Produtos & Serviços',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: 'Clientes',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: 'Orçamentos & Itens',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(spreadsheetResource),
  });

  await checkGoogleApiResponse(response, 'Falha ao criar planilha');

  const created = await response.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write headers to each tab
  await initializeSpreadsheetHeaders(spreadsheetId, accessToken);
  saveSpreadsheetInfo(spreadsheetId, spreadsheetUrl, userId);

  return { id: spreadsheetId, url: spreadsheetUrl, isShared: false };
};

/**
 * Writes the initial column headers to each sheet.
 */
export const initializeSpreadsheetHeaders = async (spreadsheetId: string, accessToken: string) => {
  const productsHeader = [
    'Código',
    'Código Interno',
    'Tipo',
    'Nome / Descrição',
    'Setor',
    'Preço de Custo (R$)',
    'Preço de Venda (R$)',
    'Desconto (%)',
    'Preço c/ Desconto (R$)',
    'Estoque',
    'Observação',
    'Data de Atualização'
  ];

  const clientsHeader = [
    'Código',
    'Tipo',
    'Nome / Razão Social',
    'CPF / CNPJ',
    'Telefone / WhatsApp',
    'E-mail',
    'Endereço',
    'Cidade',
    'CEP',
    'Inscrição Estadual',
    'Data de Atualização'
  ];

  const quotesHeader = [
    'Nº Orçamento',
    'Data / Hora',
    'Cliente',
    'Telefone Cliente',
    'Item / Produto',
    'Tipo Item',
    'Código Item',
    'Código Interno',
    'Quantidade',
    'Valor Unitário (R$)',
    'Total do Item (R$)',
    'Subtotal Orçamento (R$)',
    'Desconto (R$)',
    'Total Final Orçamento (R$)',
    'Observações'
  ];

  const data = [
    {
      range: "'Produtos & Serviços'!A1:L1",
      values: [productsHeader],
    },
    {
      range: "'Clientes'!A1:K1",
      values: [clientsHeader],
    },
    {
      range: "'Orçamentos & Itens'!A1:O1",
      values: [quotesHeader],
    },
  ];

  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data,
    }),
  });
  await checkGoogleApiResponse(updateRes, 'Falha ao gravar cabeçalhos na planilha');
};

/**
 * Ensures a valid spreadsheet exists or creates one.
 * Supports both shared company spreadsheets (multi-users) and personal Google Drive spreadsheets.
 */
export const ensureDatabaseSpreadsheet = async (
  accessToken: string,
  userId?: string
): Promise<{ id: string; url: string; isShared: boolean }> => {
  const mode = getSpreadsheetMode();
  const sharedId = getSharedSpreadsheetId();

  // 1. If configured in shared team spreadsheet mode
  if (mode === 'shared' && sharedId) {
    try {
      const verifyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${sharedId}?fields=id,name,webViewLink,trashed`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (verifyRes.ok) {
        const file = await verifyRes.json();
        if (!file.trashed) {
          const url = file.webViewLink || getSharedSpreadsheetUrl() || `https://docs.google.com/spreadsheets/d/${sharedId}/edit`;
          // Attempt initializing headers if needed
          try {
            await initializeSpreadsheetHeaders(sharedId, accessToken);
          } catch {
            // Sheet might already be structured
          }
          return { id: sharedId, url, isShared: true };
        }
      } else if (verifyRes.status === 403 || verifyRes.status === 404) {
        throw new Error('A planilha compartilhada não foi encontrada ou esta conta Google não possui permissão. Verifique se o proprietário compartilhou a planilha com seu e-mail como Editor.');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('permissão')) {
        throw err;
      }
      console.warn('Aviso ao verificar planilha compartilhada:', err);
    }
  }

  // 2. Personal spreadsheet mode: check user-scoped saved ID
  let savedId = getSavedSpreadsheetId(userId);
  let savedUrl = getSavedSpreadsheetUrl(userId);

  if (savedId && savedId !== sharedId) {
    try {
      const verifyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${savedId}?fields=id,name,webViewLink,trashed`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (verifyRes.ok) {
        const file = await verifyRes.json();
        if (!file.trashed) {
          const url = file.webViewLink || savedUrl || `https://docs.google.com/spreadsheets/d/${savedId}/edit`;
          saveSpreadsheetInfo(savedId, url, userId);
          return { id: savedId, url, isShared: false };
        }
      }
    } catch {
      // Continue to search or create
    }
  }

  // 3. Search this user's Google Drive for an existing "SVO - Banco de Dados"
  const existing = await findExistingSpreadsheet(accessToken);
  if (existing) {
    const url = existing.webViewLink || `https://docs.google.com/spreadsheets/d/${existing.id}/edit`;
    saveSpreadsheetInfo(existing.id, url, userId);
    return { id: existing.id, url, isShared: false };
  }

  // 4. Otherwise create a new spreadsheet in this user's Google Drive
  return await createDatabaseSpreadsheet(accessToken, userId);
};

/**
 * Appends a new product/service or multiple products to the Google Sheet.
 */
export const appendProductsToGoogleSheet = async (
  accessToken: string,
  products: Product[],
  userId?: string
): Promise<void> => {
  if (products.length === 0) return;
  const { id: spreadsheetId } = await ensureDatabaseSpreadsheet(accessToken, userId);
  const now = new Date().toLocaleString('pt-BR');

  const rows = products.map(p => {
    const hasDiscount = typeof p.discountPercent === 'number' && p.discountPercent > 0;
    const discountedPrice = hasDiscount ? p.sellPrice * (1 - p.discountPercent! / 100) : p.sellPrice;
    return [
      p.code || '',
      p.internalCode || '',
      p.type === 'service' ? 'Serviço' : 'Produto',
      p.name || '',
      p.sector || '',
      formatBRL(p.costPrice),
      formatBRL(p.sellPrice),
      hasDiscount ? `${p.discountPercent}%` : '-',
      hasDiscount ? formatBRL(discountedPrice) : formatBRL(p.sellPrice),
      p.type === 'service' ? '-' : (p.stock ?? 0),
      p.observation || '',
      now,
    ];
  });

  const range = encodeURIComponent("'Produtos & Serviços'!A:L");
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });
};

/**
 * Appends a new client to the Google Sheet.
 */
export const appendClientToGoogleSheet = async (
  accessToken: string,
  client: Client,
  userId?: string
): Promise<void> => {
  const { id: spreadsheetId } = await ensureDatabaseSpreadsheet(accessToken, userId);
  const now = new Date().toLocaleString('pt-BR');

  const row = [
    client.code || '',
    client.type === 'juridical' ? 'Pessoa Jurídica' : 'Pessoa Física',
    client.name || '',
    client.cnpj || client.cpf || '',
    client.phone || '',
    client.email || '',
    client.address || '',
    client.city || '',
    client.zipCode || '',
    client.stateRegistration || '',
    now,
  ];

  const range = encodeURIComponent("'Clientes'!A:K");
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [row],
    }),
  });
};

/**
 * Appends a new quote with client name and all its items to the Google Sheet.
 */
export const appendQuoteToGoogleSheet = async (
  accessToken: string,
  quote: SavedQuote,
  userId?: string
): Promise<void> => {
  const { id: spreadsheetId } = await ensureDatabaseSpreadsheet(accessToken, userId);
  const quoteDate = quote.createdAt ? new Date(quote.createdAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
  const quoteNumber = String(quote.number || 1).padStart(4, '0');
  const clientName = quote.client?.name || 'Cliente Avulso';
  const clientPhone = quote.client?.phone || '';

  const rows = quote.items.map(item => {
    const unitPrice = item.product.sellPrice || 0;
    const itemTotal = unitPrice * item.quantity;
    return [
      quoteNumber,
      quoteDate,
      clientName,
      clientPhone,
      item.product.name,
      item.product.type === 'service' ? 'Serviço' : 'Produto',
      item.product.code || '',
      item.product.internalCode || '',
      item.quantity,
      formatBRL(unitPrice),
      formatBRL(itemTotal),
      formatBRL(quote.subtotal),
      formatBRL(quote.discountAmount),
      formatBRL(quote.finalTotal),
      quote.notes || '',
    ];
  });

  const range = encodeURIComponent("'Orçamentos & Itens'!A:O");
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });
};

/**
 * Synchronizes the entire local dataset (all products, clients, and saved quotes)
 * into the Google Spreadsheet.
 */
export const fullSyncToGoogleSheet = async (
  accessToken: string,
  clients: Client[],
  products: Product[],
  savedQuotes: SavedQuote[],
  userId?: string
): Promise<{ id: string; url: string; isShared: boolean }> => {
  const { id: spreadsheetId, url, isShared } = await ensureDatabaseSpreadsheet(accessToken, userId);
  const now = new Date().toLocaleString('pt-BR');

  // Re-write headers
  await initializeSpreadsheetHeaders(spreadsheetId, accessToken);

  // Clear existing data after header
  const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ranges: ["'Produtos & Serviços'!A2:Z", "'Clientes'!A2:Z", "'Orçamentos & Itens'!A2:Z"],
    }),
  });
  await checkGoogleApiResponse(clearRes, 'Falha ao limpar dados antigos da planilha');

  // Prepare products rows
  const productRows = products.map(p => {
    const hasDiscount = typeof p.discountPercent === 'number' && p.discountPercent > 0;
    const discountedPrice = hasDiscount ? p.sellPrice * (1 - p.discountPercent! / 100) : p.sellPrice;
    return [
      p.code || '',
      p.internalCode || '',
      p.type === 'service' ? 'Serviço' : 'Produto',
      p.name || '',
      p.sector || '',
      formatBRL(p.costPrice),
      formatBRL(p.sellPrice),
      hasDiscount ? `${p.discountPercent}%` : '-',
      hasDiscount ? formatBRL(discountedPrice) : formatBRL(p.sellPrice),
      p.type === 'service' ? '-' : (p.stock ?? 0),
      p.observation || '',
      now,
    ];
  });

  // Prepare client rows
  const clientRows = clients.map(c => [
    c.code || '',
    c.type === 'juridical' ? 'Pessoa Jurídica' : 'Pessoa Física',
    c.name || '',
    c.cnpj || c.cpf || '',
    c.phone || '',
    c.email || '',
    c.address || '',
    c.city || '',
    c.zipCode || '',
    c.stateRegistration || '',
    now,
  ]);

  // Prepare quotes rows
  const quoteRows: any[][] = [];
  savedQuotes.forEach(quote => {
    const qDate = quote.createdAt ? new Date(quote.createdAt).toLocaleString('pt-BR') : now;
    const qNum = String(quote.number || 1).padStart(4, '0');
    const cName = quote.client?.name || 'Cliente Avulso';
    const cPhone = quote.client?.phone || '';

    quote.items.forEach(item => {
      const unitPrice = item.product.sellPrice || 0;
      const itemTotal = unitPrice * item.quantity;
      quoteRows.push([
        qNum,
        qDate,
        cName,
        cPhone,
        item.product.name,
        item.product.type === 'service' ? 'Serviço' : 'Produto',
        item.product.code || '',
        item.product.internalCode || '',
        item.quantity,
        formatBRL(unitPrice),
        formatBRL(itemTotal),
        formatBRL(quote.subtotal),
        formatBRL(quote.discountAmount),
        formatBRL(quote.finalTotal),
        quote.notes || '',
      ]);
    });
  });

  const batchData: any[] = [];
  if (productRows.length > 0) {
    batchData.push({
      range: "'Produtos & Serviços'!A2",
      values: productRows,
    });
  }
  if (clientRows.length > 0) {
    batchData.push({
      range: "'Clientes'!A2",
      values: clientRows,
    });
  }
  if (quoteRows.length > 0) {
    batchData.push({
      range: "'Orçamentos & Itens'!A2",
      values: quoteRows,
    });
  }

  if (batchData.length > 0) {
    const finalUpdateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    });
    await checkGoogleApiResponse(finalUpdateRes, 'Falha ao sincronizar registros com a planilha');
  }

  return { id: spreadsheetId, url, isShared };
};
