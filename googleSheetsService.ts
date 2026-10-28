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

const FOLDER_ID_KEY = 'svo_drive_images_folder_id';

/**
 * Gets or creates a dedicated "SVO - Imagens" folder in Google Drive to keep product photos organized.
 */
export const getOrCreateImagesFolder = async (accessToken: string): Promise<string | null> => {
  const cachedFolderId = localStorage.getItem(FOLDER_ID_KEY);
  if (cachedFolderId) {
    return cachedFolderId;
  }

  try {
    const query = encodeURIComponent("name = 'SVO - Imagens' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const folderId = searchData.files[0].id;
        localStorage.setItem(FOLDER_ID_KEY, folderId);
        return folderId;
      }
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'SVO - Imagens',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    if (createRes.ok) {
      const folderData = await createRes.json();
      const folderId = folderData.id;
      localStorage.setItem(FOLDER_ID_KEY, folderId);
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: 'reader', type: 'anyone' }),
        });
      } catch {}
      return folderId;
    }
  } catch (err) {
    console.warn('Aviso ao obter/criar pasta de imagens no Google Drive:', err);
  }
  return null;
};

/**
 * Uploads a product image (base64) to Google Drive and makes it viewable in Google Sheets.
 */
export const uploadProductImageToDrive = async (
  accessToken: string,
  base64OrUrl: string,
  productCodeOrName: string
): Promise<{ fileId?: string; viewUrl?: string; imageUrl: string } | null> => {
  if (!base64OrUrl || !base64OrUrl.trim()) return null;

  if (base64OrUrl.startsWith('http://') || base64OrUrl.startsWith('https://')) {
    return { imageUrl: base64OrUrl, viewUrl: base64OrUrl };
  }

  if (!base64OrUrl.startsWith('data:')) {
    return null;
  }

  try {
    const mimeMatch = base64OrUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!mimeMatch) return null;
    const mimeType = mimeMatch[1] || 'image/jpeg';
    const base64Data = mimeMatch[2];

    const safeName = (productCodeOrName || 'produto').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const fileName = `foto_${safeName}_${Date.now()}.${ext}`;

    const folderId = await getOrCreateImagesFolder(accessToken);

    const metadata: any = {
      name: fileName,
      mimeType,
      description: `Foto do item ${productCodeOrName} (SVO)`,
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const boundary = '-------svo_drive_upload_boundary_314159';
    const body = 
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${base64Data}\r\n` +
      `--${boundary}--`;

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.warn('Falha no upload da foto para o Google Drive:', errText);
      return null;
    }

    const fileData = await uploadRes.json();
    const fileId = fileData.id;

    // Permitir leitura pública para que a fórmula =IMAGE() do Google Planilhas renderize a miniatura
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });
    } catch (permErr) {
      console.warn('Aviso ao ajustar permissão da foto no Drive:', permErr);
    }

    const directImageUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    const viewUrl = fileData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    return { fileId, viewUrl, imageUrl: directImageUrl };
  } catch (err) {
    console.warn('Erro ao processar imagem para o Google Drive:', err);
    return null;
  }
};

/**
 * Formats a product's image for Google Sheets:
 * - If base64: uploads to Google Drive and sets =IMAGE("https://drive.google.com/thumbnail?id=...")
 * - If already a URL: sets =IMAGE("https://...")
 */
export const formatImageCell = async (accessToken: string, product: Product): Promise<string> => {
  if (!product.image || !product.image.trim()) return '';

  const imgStr = product.image.trim();
  if (imgStr.startsWith('http://') || imgStr.startsWith('https://')) {
    return `=IMAGE("${imgStr}")`;
  }

  if (imgStr.startsWith('data:')) {
    try {
      const uploadRes = await uploadProductImageToDrive(accessToken, imgStr, product.code || product.name);
      if (uploadRes?.imageUrl) {
        // Upgrade product.image in memory to the permanent Drive thumbnail URL
        product.image = uploadRes.imageUrl;
        return `=IMAGE("${uploadRes.imageUrl}")`;
      }
    } catch (e) {
      console.warn('Aviso ao enviar imagem para o Google Drive:', e);
    }

    // Fallback: se estiver abaixo de 45.000 caracteres, salva o data URL diretamente
    if (imgStr.length < 45000) {
      return imgStr;
    }
  }

  return '';
};

/**
 * Uploads a product's base64 image to Google Drive and returns the permanent direct thumbnail URL.
 * If the image is already a web URL, returns it immediately.
 */
export const syncProductImageToDrive = async (
  accessToken: string,
  product: Product
): Promise<string | null> => {
  if (!product.image || !product.image.trim()) return null;
  const imgStr = product.image.trim();
  if (imgStr.startsWith('http://') || imgStr.startsWith('https://')) {
    return imgStr;
  }
  if (imgStr.startsWith('data:')) {
    try {
      const res = await uploadProductImageToDrive(accessToken, imgStr, product.code || product.name);
      if (res?.imageUrl) {
        return res.imageUrl;
      }
    } catch (err) {
      console.warn('Erro ao sincronizar foto com Google Drive:', err);
    }
  }
  return null;
};

/**
 * Writes the initial column headers to each sheet, including the "Foto / Imagem" column.
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
    'Foto / Imagem',
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
      range: "'Produtos & Serviços'!A1:M1",
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
 * Checks if the existing spreadsheet's "Produtos & Serviços" tab has the "Foto / Imagem" column,
 * and updates the header row if it is missing.
 */
export const ensureProductsHeaderHasImageColumn = async (spreadsheetId: string, accessToken: string) => {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Produtos %26 Serviços'!A1:Z1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const headers: string[] = data.values?.[0] || [];
    if (headers.length === 0) {
      await initializeSpreadsheetHeaders(spreadsheetId, accessToken);
      return;
    }
    const hasImageCol = headers.some(h => {
      const lower = String(h || '').toLowerCase();
      return lower.includes('imagem') || lower.includes('foto');
    });
    if (!hasImageCol) {
      await initializeSpreadsheetHeaders(spreadsheetId, accessToken);
    }
  } catch (err) {
    console.warn('Aviso ao verificar coluna de foto na planilha:', err);
  }
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
          try {
            await ensureProductsHeaderHasImageColumn(sharedId, accessToken);
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
          try {
            await ensureProductsHeaderHasImageColumn(savedId, accessToken);
          } catch {}
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
    try {
      await ensureProductsHeaderHasImageColumn(existing.id, accessToken);
    } catch {}
    return { id: existing.id, url, isShared: false };
  }

  // 4. Otherwise create a new spreadsheet in this user's Google Drive
  return await createDatabaseSpreadsheet(accessToken, userId);
};

/**
 * Appends a new product/service or multiple products to the Google Sheet.
 * If products have images, uploads them to Google Drive and inserts the =IMAGE() formula into the sheet.
 */
export const appendProductsToGoogleSheet = async (
  accessToken: string,
  products: Product[],
  userId?: string
): Promise<void> => {
  if (products.length === 0) return;
  const { id: spreadsheetId } = await ensureDatabaseSpreadsheet(accessToken, userId);
  const now = new Date().toLocaleString('pt-BR');

  // Process all product images (Drive upload / formula)
  const imageCells = await Promise.all(products.map(p => formatImageCell(accessToken, p)));

  const rows = products.map((p, idx) => {
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
      imageCells[idx] || '',
      p.observation || '',
      now,
    ];
  });

  const range = encodeURIComponent("'Produtos & Serviços'!A:M");
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
 * Updates the 'Produtos & Serviços' tab in Google Sheets with fresh product stocks and images.
 */
export const updateProductsTabInGoogleSheet = async (
  accessToken: string,
  products: Product[],
  userId?: string
): Promise<void> => {
  if (products.length === 0) return;
  const { id: spreadsheetId } = await ensureDatabaseSpreadsheet(accessToken, userId);
  const now = new Date().toLocaleString('pt-BR');

  // Process all product images (Drive upload / formula)
  const imageCells = await Promise.all(products.map(p => formatImageCell(accessToken, p)));

  const productRows = products.map((p, idx) => {
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
      imageCells[idx] || '',
      p.observation || '',
      now,
    ];
  });

  // Clear existing product rows below headers (columns A through M)
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Produtos %26 Serviços'!A2:M:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  // Write updated product rows
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Produtos %26 Serviços'!A2?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: productRows,
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

  // Prepare products rows (including Foto / Imagem)
  const imageCells = await Promise.all(products.map(p => formatImageCell(accessToken, p)));
  const productRows = products.map((p, idx) => {
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
      imageCells[idx] || '',
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

export const parseCurrencyOrNumber = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).trim();
  str = str.replace(/R\$\s*/gi, '').replace(/\s+/g, '');
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

export interface GoogleSheetsImportResult {
  success: boolean;
  hasChanges: boolean;
  addedProductsCount: number;
  updatedProductsCount: number;
  addedClientsCount: number;
  updatedClientsCount: number;
  updatedProducts: Product[];
  updatedClients: Client[];
  message: string;
}

/**
 * Reads products and clients from the connected Google Sheet
 * and merges them into the current state (adding new items and updating modified items).
 */
export const importFromGoogleSheet = async (
  accessToken: string,
  currentProducts: Product[],
  currentClients: Client[],
  userId?: string
): Promise<GoogleSheetsImportResult> => {
  const { id: spreadsheetId } = await ensureDatabaseSpreadsheet(accessToken, userId);

  // Fetch both tabs with FORMATTED_VALUE, and also fetch Products with FORMULA to capture =IMAGE formulas
  const rangeProducts = encodeURIComponent("'Produtos & Serviços'!A1:M");
  const rangeClients = encodeURIComponent("'Clientes'!A1:K");
  const urlFormatted = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${rangeProducts}&ranges=${rangeClients}&valueRenderOption=FORMATTED_VALUE`;
  const urlFormulas = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Produtos %26 Serviços'!A1:M?valueRenderOption=FORMULA`;

  const [responseFormatted, responseFormulas] = await Promise.all([
    fetch(urlFormatted, { headers: { Authorization: `Bearer ${accessToken}` } }),
    fetch(urlFormulas, { headers: { Authorization: `Bearer ${accessToken}` } }),
  ]);

  await checkGoogleApiResponse(responseFormatted, 'Falha ao ler dados da planilha do Google');

  const dataFormatted = await responseFormatted.json();
  const dataFormulas = responseFormulas.ok ? await responseFormulas.json() : null;

  const valueRanges = dataFormatted.valueRanges || [];
  const productsValueRange: any[][] = valueRanges[0]?.values || [];
  const clientsValueRange: any[][] = valueRanges[1]?.values || [];
  const formulasValueRange: any[][] = dataFormulas?.values || [];

  // Helper to map header columns dynamically
  const getColIdx = (headers: string[], ...keywords: string[]): number => {
    return headers.findIndex(h => {
      const lower = String(h || '').toLowerCase().trim();
      return keywords.some(k => lower.includes(k.toLowerCase().trim()));
    });
  };

  // 1. Process Products
  const updatedProducts: Product[] = [...currentProducts];
  const productMap = new Map<string, { product: Product; index: number }>();
  updatedProducts.forEach((p, idx) => {
    productMap.set(p.code.toLowerCase().trim(), { product: p, index: idx });
  });

  let addedProductsCount = 0;
  let updatedProductsCount = 0;

  if (productsValueRange.length > 1) {
    const rawHeaders: string[] = productsValueRange[0] || [];
    const codeIdx = rawHeaders.findIndex(h => {
      const lower = String(h || '').toLowerCase().trim();
      return lower.includes('código') && !lower.includes('interno');
    });
    const internalCodeIdx = getColIdx(rawHeaders, 'código interno', 'codigo interno', 'interno');
    const typeIdx = getColIdx(rawHeaders, 'tipo');
    const nameIdx = getColIdx(rawHeaders, 'nome', 'descrição', 'descricao');
    const sectorIdx = getColIdx(rawHeaders, 'setor', 'categoria');
    const costIdx = getColIdx(rawHeaders, 'custo');
    const sellIdx = getColIdx(rawHeaders, 'venda');
    const discountIdx = getColIdx(rawHeaders, 'desconto (%)', 'desconto');
    const stockIdx = getColIdx(rawHeaders, 'estoque', 'quant');
    const imageIdx = getColIdx(rawHeaders, 'foto', 'imagem', 'image', 'picture');
    const obsIdx = getColIdx(rawHeaders, 'observação', 'observacao', 'obs');

    for (let i = 1; i < productsValueRange.length; i++) {
      const row = productsValueRange[i] || [];
      const codeVal = (codeIdx !== -1 ? row[codeIdx] : row[0])?.trim();
      const nameVal = (nameIdx !== -1 ? row[nameIdx] : row[3])?.trim();

      // Skip empty rows
      if (!codeVal && !nameVal) continue;

      const effectiveCode = codeVal || `ITEM-${String(i).padStart(4, '0')}`;
      const internalCodeVal = internalCodeIdx !== -1 ? row[internalCodeIdx]?.trim() || undefined : undefined;
      const typeRaw = (typeIdx !== -1 ? row[typeIdx] : row[2])?.toLowerCase() || '';
      const isService = typeRaw.includes('serviço') || typeRaw.includes('servico');
      const sectorVal = sectorIdx !== -1 ? row[sectorIdx]?.trim() || undefined : undefined;
      const costPriceVal = costIdx !== -1 ? parseCurrencyOrNumber(row[costIdx]) : 0;
      const sellPriceVal = sellIdx !== -1 ? parseCurrencyOrNumber(row[sellIdx]) : 0;
      const discountVal = discountIdx !== -1 && row[discountIdx] 
        ? parseCurrencyOrNumber(String(row[discountIdx]).replace('%', '')) 
        : undefined;
      const stockVal = isService ? 0 : (stockIdx !== -1 ? (parseInt(String(row[stockIdx]).replace(/\D/g, ''), 10) || 0) : 0);
      const obsVal = obsIdx !== -1 ? row[obsIdx]?.trim() || undefined : undefined;

      // Image extraction from formula or direct value
      let rawImage = (imageIdx !== -1 ? row[imageIdx]?.trim() : '') || '';
      if (!rawImage && imageIdx !== -1 && formulasValueRange[i] && formulasValueRange[i][imageIdx]) {
        rawImage = String(formulasValueRange[i][imageIdx]).trim();
      }

      let effectiveImage: string | undefined = undefined;
      if (rawImage && rawImage !== '-') {
        const formulaMatch = rawImage.match(/IMAGE\s*\(\s*["']([^"']+)["']/i);
        if (formulaMatch && formulaMatch[1]) {
          effectiveImage = formulaMatch[1];
        } else if (rawImage.startsWith('http://') || rawImage.startsWith('https://') || rawImage.startsWith('data:image/')) {
          effectiveImage = rawImage;
        }
      }

      const existingEntry = productMap.get(effectiveCode.toLowerCase().trim());
      if (existingEntry) {
        const { product: existing, index: pIdx } = existingEntry;
        const changed = 
          (nameVal && existing.name !== nameVal) ||
          (internalCodeVal !== undefined && existing.internalCode !== internalCodeVal) ||
          existing.sellPrice !== sellPriceVal ||
          existing.costPrice !== costPriceVal ||
          (!isService && existing.stock !== stockVal) ||
          (sectorVal && existing.sector !== sectorVal) ||
          (obsVal && existing.observation !== obsVal) ||
          (effectiveImage && existing.image !== effectiveImage);

        if (changed) {
          const updated: Product = {
            ...existing,
            name: nameVal || existing.name,
            internalCode: internalCodeVal !== undefined ? internalCodeVal : existing.internalCode,
            type: isService ? 'service' : 'product',
            sector: sectorVal || existing.sector,
            costPrice: costPriceVal || existing.costPrice,
            sellPrice: sellPriceVal || existing.sellPrice,
            stock: isService ? 0 : stockVal,
            image: effectiveImage || existing.image,
            observation: obsVal || existing.observation,
            discountPercent: discountVal !== undefined ? discountVal : existing.discountPercent,
            updatedAt: new Date().toISOString(),
          };
          updatedProducts[pIdx] = updated;
          productMap.set(effectiveCode.toLowerCase().trim(), { product: updated, index: pIdx });
          updatedProductsCount++;
        }
      } else {
        // New product added directly in the spreadsheet!
        const newProduct: Product = {
          id: crypto.randomUUID(),
          code: effectiveCode,
          internalCode: internalCodeVal,
          type: isService ? 'service' : 'product',
          name: nameVal || 'Item da Planilha',
          sector: sectorVal,
          costPrice: costPriceVal,
          sellPrice: sellPriceVal,
          stock: isService ? 0 : stockVal,
          image: effectiveImage,
          observation: obsVal,
          discountPercent: discountVal,
          updatedAt: new Date().toISOString(),
        };
        updatedProducts.push(newProduct);
        productMap.set(effectiveCode.toLowerCase().trim(), { product: newProduct, index: updatedProducts.length - 1 });
        addedProductsCount++;
      }
    }
  }

  // 2. Process Clients
  const updatedClients: Client[] = [...currentClients];
  const clientMapByDoc = new Map<string, number>();
  const clientMapByName = new Map<string, number>();
  const clientMapByCode = new Map<string, number>();

  updatedClients.forEach((c, idx) => {
    if (c.code) clientMapByCode.set(c.code.toLowerCase().trim(), idx);
    const docClean = (c.cnpj || c.cpf || '').replace(/\D/g, '');
    if (docClean) clientMapByDoc.set(docClean, idx);
    if (c.name) clientMapByName.set(c.name.toLowerCase().trim(), idx);
  });

  let addedClientsCount = 0;
  let updatedClientsCount = 0;

  if (clientsValueRange.length > 1) {
    const rawHeaders: string[] = clientsValueRange[0] || [];
    const codeIdx = getColIdx(rawHeaders, 'código', 'codigo');
    const typeIdx = getColIdx(rawHeaders, 'tipo');
    const nameIdx = getColIdx(rawHeaders, 'nome', 'razão', 'razao');
    const docIdx = getColIdx(rawHeaders, 'cpf', 'cnpj', 'documento');
    const phoneIdx = getColIdx(rawHeaders, 'telefone', 'whatsapp', 'celular', 'fone');
    const emailIdx = getColIdx(rawHeaders, 'e-mail', 'email');
    const addressIdx = getColIdx(rawHeaders, 'endereço', 'endereco', 'rua');
    const cityIdx = getColIdx(rawHeaders, 'cidade');
    const zipIdx = getColIdx(rawHeaders, 'cep');
    const ieIdx = getColIdx(rawHeaders, 'inscrição', 'inscricao', 'ie');

    for (let i = 1; i < clientsValueRange.length; i++) {
      const row = clientsValueRange[i] || [];
      const nameVal = (nameIdx !== -1 ? row[nameIdx] : row[2])?.trim();
      const codeVal = (codeIdx !== -1 ? row[codeIdx] : row[0])?.trim();
      const docVal = (docIdx !== -1 ? row[docIdx] : row[3])?.trim() || '';

      if (!nameVal && !codeVal && !docVal) continue;

      const typeRaw = (typeIdx !== -1 ? row[typeIdx] : row[1])?.toLowerCase() || '';
      const isJuridical = typeRaw.includes('jurídica') || typeRaw.includes('juridica') || docVal.replace(/\D/g, '').length > 11;
      const phoneVal = (phoneIdx !== -1 ? row[phoneIdx] : row[4])?.trim() || '';
      const emailVal = (emailIdx !== -1 ? row[emailIdx] : row[5])?.trim() || undefined;
      const addressVal = (addressIdx !== -1 ? row[addressIdx] : row[6])?.trim() || '';
      const cityVal = (cityIdx !== -1 ? row[cityIdx] : row[7])?.trim() || '';
      const zipVal = (zipIdx !== -1 ? row[zipIdx] : row[8])?.trim() || '';
      const ieVal = ieIdx !== -1 ? row[ieIdx]?.trim() || undefined : undefined;

      const docClean = docVal.replace(/\D/g, '');
      const existingIdx = 
        (codeVal && clientMapByCode.get(codeVal.toLowerCase().trim())) ??
        (docClean && clientMapByDoc.get(docClean)) ??
        (nameVal && clientMapByName.get(nameVal.toLowerCase().trim()));

      if (existingIdx !== undefined && updatedClients[existingIdx]) {
        const existing = updatedClients[existingIdx];
        const changed = 
          (nameVal && existing.name !== nameVal) ||
          (phoneVal && existing.phone !== phoneVal) ||
          (emailVal && existing.email !== emailVal) ||
          (addressVal && existing.address !== addressVal) ||
          (cityVal && existing.city !== cityVal) ||
          (zipVal && existing.zipCode !== zipVal);

        if (changed) {
          const updated: Client = {
            ...existing,
            name: nameVal || existing.name,
            phone: phoneVal || existing.phone,
            email: emailVal || existing.email,
            address: addressVal || existing.address,
            city: cityVal || existing.city,
            zipCode: zipVal || existing.zipCode,
            stateRegistration: ieVal || existing.stateRegistration,
          };
          updatedClients[existingIdx] = updated;
          updatedClientsCount++;
        }
      } else {
        // New client added directly in the spreadsheet!
        const newClient: Client = {
          id: crypto.randomUUID(),
          code: codeVal,
          type: isJuridical ? 'juridical' : 'physical',
          name: nameVal || 'Cliente da Planilha',
          cpf: isJuridical ? undefined : docVal,
          cnpj: isJuridical ? docVal : undefined,
          phone: phoneVal,
          email: emailVal,
          address: addressVal,
          city: cityVal,
          zipCode: zipVal,
          stateRegistration: ieVal,
        };
        const newIdx = updatedClients.length;
        updatedClients.push(newClient);
        if (codeVal) clientMapByCode.set(codeVal.toLowerCase().trim(), newIdx);
        if (docClean) clientMapByDoc.set(docClean, newIdx);
        if (nameVal) clientMapByName.set(nameVal.toLowerCase().trim(), newIdx);
        addedClientsCount++;
      }
    }
  }

  const hasChanges = (addedProductsCount + updatedProductsCount + addedClientsCount + updatedClientsCount) > 0;

  const parts: string[] = [];
  if (addedProductsCount > 0) parts.push(`${addedProductsCount} novo(s) produto(s)`);
  if (updatedProductsCount > 0) parts.push(`${updatedProductsCount} produto(s) atualizado(s)`);
  if (addedClientsCount > 0) parts.push(`${addedClientsCount} novo(s) cliente(s)`);
  if (updatedClientsCount > 0) parts.push(`${updatedClientsCount} cliente(s) atualizado(s)`);

  const message = hasChanges
    ? `Sincronização concluída: ${parts.join(', ')} importado(s) da planilha do Google.`
    : 'A planilha do Google já está sincronizada com o sistema (nenhuma alteração pendente).';

  return {
    success: true,
    hasChanges,
    addedProductsCount,
    updatedProductsCount,
    addedClientsCount,
    updatedClientsCount,
    updatedProducts,
    updatedClients,
    message,
  };
};
