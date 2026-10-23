import type { SavedQuote, QuoteSettings, CompanyInfo } from '../types';

export const formatDateTime = (isoString?: string): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} às ${hours}:${minutes}`;
};

export const generateQuoteHTML = (
  quote: SavedQuote,
  quoteSettings: QuoteSettings,
  companyInfo: CompanyInfo | null,
  logo: string | null
): string => {
  const quoteNumText = quote.number 
    ? `Nº ${String(quote.number).padStart(4, '0')}` 
    : (quoteSettings.enableSequentialNumber !== false ? `Nº ${String(quoteSettings.nextQuoteNumber || 1).padStart(4, '0')}` : '');

  const formattedDate = formatDateTime(quote.createdAt);

  const itemsRows = quote.items.map(item => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 6px 8px; text-align: center; font-size: 14px; font-weight: 600; vertical-align: middle;">${item.quantity}</td>
      ${quoteSettings.showProductImage ? `<td style="padding: 6px 8px; text-align: center; vertical-align: middle; width: 50px;">${item.product.image ? `<img src="${item.product.image}" alt="${item.product.name}" style="max-height: 40px; max-width: 40px; object-fit: contain; display: block; margin: 0 auto; border-radius: 4px;" />` : '-'}</td>` : ''}
      ${quoteSettings.showProductCode ? `<td style="padding: 6px 8px; font-size: 13px; color: #475569; vertical-align: middle;">${item.product.code || '-'}</td>` : ''}
      ${quoteSettings.showProductInternalCode ? `<td style="padding: 6px 8px; font-size: 14px; font-weight: 600; color: #4338ca; vertical-align: middle;">${item.product.internalCode || '-'}</td>` : ''}
      ${quoteSettings.showProductSector ? `<td style="padding: 6px 8px; font-size: 13px; color: #475569; vertical-align: middle;">${item.product.sector || '-'}</td>` : ''}
      <td style="padding: 6px 8px; font-size: 14px; font-weight: 500; vertical-align: middle;">
        ${item.product.name}
        ${item.product.discountPercent && item.product.discountPercent > 0 ? `<div style="font-size: 11px; color: #059669; font-weight: 600; margin-top: 2px;">(Desconto de ${item.product.discountPercent}% já aplicado)</div>` : ''}
      </td>
      <td style="padding: 6px 8px; text-align: right; font-size: 14px; font-weight: 600; vertical-align: middle;">${item.product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="padding: 6px 8px; text-align: right; font-size: 14px; font-weight: 600; vertical-align: middle;">${(item.product.sellPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const subtotalVal = quote.subtotal || (quote.finalTotal + (quote.discountAmount || 0));
  const discountVal = quote.discountAmount || 0;
  const formattedSubtotal = subtotalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formattedDiscount = discountVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formattedTotal = quote.finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const discountLabel = quote.discountType === 'percent' && parseFloat(quote.discount || '0') > 0
    ? `Desconto (${quote.discount}%)`
    : 'Desconto';

  let headerHtml = '';
  if (quoteSettings.text) {
    headerHtml = `
      <div style="white-space: pre-wrap; line-height: 1.25; color: #0f172a; font-family: ${quoteSettings.fontFamily || 'sans-serif'}; text-align: ${quoteSettings.textAlign || 'center'}; font-size: ${quoteSettings.fontSize ? quoteSettings.fontSize + 'px' : '12px'};">
        ${quoteSettings.text}
      </div>
    `;
  } else if (companyInfo?.name) {
    headerHtml = `
      <div style="text-align: center; font-size: 11px; line-height: 1.25; color: #0f172a; font-family: sans-serif;">
        <div style="font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 0.025em; margin-bottom: 2px;">-- ${companyInfo.name.toUpperCase()} --</div>
        ${companyInfo.address ? `<div>${companyInfo.address}</div>` : ''}
        ${companyInfo.phone ? `<div>${companyInfo.phone}</div>` : ''}
        ${companyInfo.email ? `<div>${companyInfo.email}</div>` : ''}
        ${(companyInfo.zipCode || companyInfo.city) ? `<div>CEP ${companyInfo.zipCode || ''} ${companyInfo.city ? '- ' + companyInfo.city : ''}</div>` : ''}
        ${companyInfo.cnpj ? `<div>CNPJ: ${companyInfo.cnpj}</div>` : ''}
      </div>
    `;
  }

  return `
    <div style="padding: 24px; font-family: sans-serif; font-size: 12px; color: #0f172a; background: #ffffff; width: 800px; box-sizing: border-box;">
      <!-- Header -->
      <div style="position: relative; margin-bottom: 8px; min-height: 60px;">
        ${logo ? `<div style="position: absolute; left: 0; top: 0;"><img src="${logo}" alt="Logo" style="max-height: 56px; max-width: 120px; object-fit: contain;"/></div>` : ''}
        ${headerHtml}
      </div>

      <!-- Document Title -->
      <div style="text-align: center; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 12px; margin-bottom: 12px; color: #0f172a;">
        ORÇAMENTO
      </div>

      <!-- Client Data (Enlarged font size for generated quote) -->
      <div style="font-size: 15px; line-height: 1.6; margin-bottom: 12px; color: #0f172a;">
        <div><strong style="font-weight: 700;">Para :</strong> ${quote.client.name}</div>
        ${quote.client.address ? `<div><strong style="font-weight: 700;">End. :</strong> ${quote.client.address}${quote.client.city ? ' - ' + quote.client.city : ''}${quote.client.zipCode ? ' - CEP ' + quote.client.zipCode : ''}</div>` : ''}
        ${quote.client.phone ? `<div><strong style="font-weight: 700;">Tel. :</strong> ${quote.client.phone}</div>` : ''}
        ${quote.client.type === 'juridical' && quote.client.cnpj ? `<div><strong style="font-weight: 700;">CNPJ :</strong> ${quote.client.cnpj}</div>` : (quote.client.cpf ? `<div><strong style="font-weight: 700;">CPF :</strong> ${quote.client.cpf}</div>` : '')}
      </div>

      <!-- Quote Info & Page/Via (Enlarged font size for generated quote) -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; font-size: 15px; line-height: 1.5; margin-bottom: 14px; color: #0f172a;">
        <div>
          <div style="font-size: 16px; font-weight: 700;"><strong>Orçamento</strong> ${quoteNumText}</div>
          <div style="font-size: 14px; color: #334155;">${formattedDate}</div>
        </div>
        <div style="text-align: right; font-size: 14px; color: #334155;">
          <div>Página 1</div>
          <div>Via 1</div>
        </div>
      </div>

      <!-- Table (Enlarged font size for generated quote) -->
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 10px;">
        <thead>
          <tr style="border-top: 1.5px solid #334155; border-bottom: 1.5px solid #334155; text-align: left;">
            <th style="padding: 6px 8px; width: 64px; font-weight: 600; color: #0f172a; text-align: center;">Quantidade</th>
            ${quoteSettings.showProductImage ? '<th style="padding: 6px 8px; width: 50px; font-weight: 600; color: #0f172a; text-align: center;">Imagem</th>' : ''}
            ${quoteSettings.showProductCode ? '<th style="padding: 6px 8px; width: 112px; font-weight: 600; color: #0f172a;">Código</th>' : ''}
            ${quoteSettings.showProductInternalCode ? '<th style="padding: 6px 8px; width: 100px; font-weight: 600; color: #0f172a;">Cód. Interno</th>' : ''}
            ${quoteSettings.showProductSector ? '<th style="padding: 6px 8px; width: 80px; font-weight: 600; color: #0f172a;">Setor</th>' : ''}
            <th style="padding: 6px 8px; font-weight: 600; color: #0f172a;">Descrição</th>
            <th style="padding: 6px 8px; width: 104px; text-align: right; font-weight: 600; color: #0f172a;">Valor Unitário</th>
            <th style="padding: 6px 8px; width: 104px; text-align: right; font-weight: 600; color: #0f172a;">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Total & Notes Footer (Enlarged Totals) -->
      <div style="border-top: 1.5px solid #334155; padding-top: 10px; color: #0f172a;">
        ${discountVal > 0 ? `
          <div style="text-align: right; font-size: 15px; margin-bottom: 3px; color: #475569;">
            Subtotal &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; R$ ${formattedSubtotal}
          </div>
          <div style="text-align: right; font-size: 15px; margin-bottom: 6px; color: #dc2626; font-weight: 600;">
            ${discountLabel} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - R$ ${formattedDiscount}
          </div>
          <div style="text-align: right; font-weight: 800; font-size: 17px; margin-bottom: 12px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            Total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; R$ ${formattedTotal}
          </div>
        ` : `
          <div style="text-align: right; font-weight: 800; font-size: 17px; margin-bottom: 12px;">
            Total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; R$ ${formattedTotal}
          </div>
        `}
        ${quote.notes ? `
          <div style="margin-top: 6px;">
            <div style="white-space: pre-wrap; font-size: 12px; color: #334155; line-height: 1.4;">${quote.notes}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
};

export const printQuoteHtml = (htmlContent: string) => {
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';
  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document;
  if (!doc) {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
      win.focus();
      win.print();
    }
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    printIframe.contentWindow?.focus();
    printIframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(printIframe)) {
        document.body.removeChild(printIframe);
      }
    }, 1500);
  }, 350);
};

export const exportQuotePdfDirect = async (
  quote: SavedQuote,
  quoteSettings: QuoteSettings,
  companyInfo: CompanyInfo | null,
  logo: string | null
) => {
  // @ts-ignore
  if (!window.html2canvas || !window.jspdf) {
    throw new Error('Recursos para gerar PDF não carregados.');
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.innerHTML = generateQuoteHTML(quote, quoteSettings, companyInfo, logo);
  document.body.appendChild(container);

  try {
    // @ts-ignore
    const canvas = await window.html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
    });
    const imgData = canvas.toDataURL('image/png');
    // @ts-ignore
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const imgProps = pdf.getImageProperties(imgData);
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const clientName = (quote.client?.name || 'Cliente').replace(/\s+/g, '_');
    const date = new Date(quote.createdAt || Date.now()).toISOString().slice(0, 10);
    const fileName = `Orcamento-${clientName}-${date}.pdf`;
    pdf.save(fileName);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

export const sendQuoteWhatsAppDirect = (quote: SavedQuote) => {
  let phone = quote.client.phone ? quote.client.phone.replace(/\D/g, '') : '';
  if (!phone) {
    const inputPhone = prompt("O cliente não possui um telefone cadastrado.\nInforme o número com DDD para enviar via WhatsApp (ex: 11999998888):");
    if (!inputPhone) return;
    phone = inputPhone.replace(/\D/g, '');
    if (!phone) {
      alert("Número de telefone inválido.");
      return;
    }
  }
  if (phone.length >= 10 && phone.length <= 11) {
    phone = '55' + phone;
  }

  const quoteNumText = quote.number ? `Nº ${String(quote.number).padStart(4, '0')}` : '';
  const formattedDate = formatDateTime(quote.createdAt);

  let message = `━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📄 *ORÇAMENTO / PROPOSTA COMERCIAL ${quoteNumText}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `👤 *Cliente:* ${quote.client.name}\n`;
  message += `📅 *Data:* ${formattedDate}\n\n`;

  message += `📦 *ITENS DA PROPOSTA:*\n`;
  quote.items.forEach((item, index) => {
    const subtotalItem = item.product.sellPrice * item.quantity;
    message += `${index + 1}. *${item.product.name}*\n`;
    message += `   Quant: ${item.quantity} x R$ ${item.product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = *R$ ${subtotalItem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*\n`;
  });

  message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  if (quote.discountAmount > 0) {
    message += `💵 Subtotal: R$ ${quote.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    message += `🏷️ Desconto: - R$ ${quote.discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
  }
  message += `💰 *TOTAL FINAL: R$ ${quote.finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (quote.notes) {
    message += `\n📝 *Observações:*\n${quote.notes}\n`;
  }

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
};
