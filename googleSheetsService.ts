import type { Client, Product, SavedQuote } from './types';

const SPREADSHEET_ID_KEY = 'svo_google_spreadsheet_id';
const SPREADSHEET_URL_KEY = 'svo_google_spreadsheet_url';

export const getSavedSpreadsheetId = (): string | null => {
  return localStorage.getItem(SPREADSHEET_ID_KEY);
};

export const getSavedSpreadsheetUrl = (): string | null => {
  return localStorage.getItem(SPREADSHEET_URL_KEY);
};

export const saveSpreadsheetInfo = (id: string, url: string) => {
  localStorage.setItem(SPREADSHEET_ID_KEY, id);
  localStorage.setItem(SPREADSHEET_URL_KEY, url);
};

export const clearSpreadsheetInfo = () => {
  localStorage.removeItem(SPREADSHEET_ID_KEY);
  localStorage.removeItem(SPREADSHEET_URL_KEY);
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
export const createDatabaseSpreadsheet = async (accessToken: string): Promise<{ id: string; url: string }> => {
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

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha ao criar planilha: ${response.status} ${errText}`);
  }

  const created = await response.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write headers to each tab
  await initializeSpreadsheetHeaders(spreadsheetId, accessToken);
  saveSpreadsheetInfo(spreadsheetId, spreadsheetUrl);

  return { id: spreadsheetId, url: spreadsheetUrl };
};

/**
 * Writes the initial column headers to each sheet.
 */
export const initializeSpreadsheetHeaders = async (spreadsheetId: string, accessToken: string) => {
  const productsHeader = [
    'Código',
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
      range: "'Produtos & Serviços'!A1:I1",
      values: [productsHeader],
    },
    {
      range: "'Clientes'!A1:K1",
      values: [clientsHeader],
    },
    {
      range: "'Orçamentos & Itens'!A1:N1",
      values: [quotesHeader],
    },
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
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
};

/**
 * Ensures a valid spreadsheet exists or creates one.
 */
export const ensureDatabaseSpreadsheet = async (accessToken: string): Promise<{ id: string; url: string }> => {
  let savedId = getSavedSpreadsheetId();
  let savedUrl = getSavedSpreadsheetUrl();

  if (savedId) {
    // Verify it still exists in Google Drive
    try {
      const verifyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${savedId}?fields=id,name,webViewLink,trashed`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (verifyRes.ok) {
        const file = await verifyRes.json();
        if (!file.trashed) {
          const url = file.webViewLink || savedUrl || `https://docs.google.com/spreadsheets/d/${savedId}/edit`;
          saveSpreadsheetInfo(savedId, url);
          return { id: savedId, url };
        }
      }
    } catch {
      // Ignored, proceed to search or create
    }
  }

  // Look for existing spreadsheet with matching name
  const existing = await findExistingSpreadsheet(accessToken);
  if (existing) {
    const url = existing.webViewLink || `https://docs.google.com/spreadsheets/d/${existing.id}/edit`;
    saveSpreadsheetInfo(existing.id, url);
    return { id: existing.id, url };
  }

  // Otherwise create new one
  return await createDatabaseSpreadsheet(accessToken);
};

/**
 * Appends a new product/service or multiple products to the Google Sheet.
 */
export const appendProductsToGoogleSheet = async (
  accessToken: string,
  products: Product[]
): Promise<void> => {
  if (products.length === 0) return;
  const { id: spreadsheetId } = await ensureDatabaseSpreadsheet(accessToken);
  const now = new Date().toLocaleString('pt-BR');

  const rows = products.map(p => {
    const hasDiscount = typeof p.discountPercent === 'number' && p.discountPercent > 0;
    const discountedPrice = hasDiscount ? p.sellPrice * (1 - p.discountPercent! / 100) : p.sellPrice;
    return [
      p.code || '',
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

  const range = encodeURIComponent("'Produtos & Serviços'!A:K");
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
  client: Client
): Promise<void> => {
  const { id: spreadsheetId } = await ensureDatabaseSpreadsheet(accessToken);
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
  quote: SavedQuote
): Promise<void> => {
  const { id: spreadsheetId } = await ensureDatabaseSpreadsheet(accessToken);
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
      item.quantity,
      formatBRL(unitPrice),
      formatBRL(itemTotal),
      formatBRL(quote.subtotal),
      formatBRL(quote.discountAmount),
      formatBRL(quote.finalTotal),
      quote.notes || '',
    ];
  });

  const range = encodeURIComponent("'Orçamentos & Itens'!A:N");
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
  savedQuotes: SavedQuote[]
): Promise<{ id: string; url: string }> => {
  const { id: spreadsheetId, url } = await ensureDatabaseSpreadsheet(accessToken);
  const now = new Date().toLocaleString('pt-BR');

  // Re-write headers
  await initializeSpreadsheetHeaders(spreadsheetId, accessToken);

  // Clear existing data after header
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ranges: ["'Produtos & Serviços'!A2:Z", "'Clientes'!A2:Z", "'Orçamentos & Itens'!A2:Z"],
    }),
  });

  // Prepare products rows
  const productRows = products.map(p => {
    const hasDiscount = typeof p.discountPercent === 'number' && p.discountPercent > 0;
    const discountedPrice = hasDiscount ? p.sellPrice * (1 - p.discountPercent! / 100) : p.sellPrice;
    return [
      p.code || '',
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
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
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
  }

  return { id: spreadsheetId, url };
};
