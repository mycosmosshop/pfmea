// Ortak Excel çıktı yardımcıları: Sanifoam kurumsal antet + biçimlendirme.
// FmeaTable, AiagViewTable, ControlPlanTable ve FlowDiagramView aynı antet/stili paylaşır.
// xlsx-js-style (XLSX global) hücre stillerini (renk/dolgu/kenarlık) korur.

declare const XLSX: any;

export const encCell = (r: number, c: number): string => XLSX.utils.encode_cell({ r, c });

const edge = { style: 'thin' };
export const thinBorder = { top: edge, bottom: edge, left: edge, right: edge };

// --- Ortak hücre stilleri ---
export const headerBandStyle = { font: { sz: 8, color: { rgb: 'FFFFFF' }, bold: true }, fill: { fgColor: { rgb: '17365D' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: thinBorder };
export const bodyStyle = { font: { sz: 9 }, border: thinBorder, alignment: { vertical: 'top', wrapText: true } };
export const bodyCenterStyle = { font: { sz: 9 }, border: thinBorder, alignment: { vertical: 'top', horizontal: 'center', wrapText: true } };
export const zebraFill = { fill: { fgColor: { rgb: 'F2F2F2' } } };
export const infoLineStyle = { font: { sz: 9, bold: true }, fill: { fgColor: { rgb: 'E7E6E6' } }, border: thinBorder, alignment: { vertical: 'center', horizontal: 'left', wrapText: true } };

// RPN / AP renkleri (Excel'de hücre dolgusu)
export const fillH = { fgColor: { rgb: 'FFC7CE' } }; // kırmızı
export const fillM = { fgColor: { rgb: 'FFEB9C' } }; // sarı
export const fillL = { fgColor: { rgb: 'C6EFCE' } }; // yeşil

export interface AntetOptions {
  docName?: string;   // üst satır, örn. "QUALITY SYSTEM DOCUMENTATION"
  title: string;      // form adı (çok satır için \n)
  docNo: string;      // örn. "FR 34"
  rev: string;        // örn. "7"
  date: string;       // örn. "02.01.2025"
  sayfa?: string;     // örn. "1/1"
  lastCol: number;    // son kolon indeksi (0 tabanlı)
}

// Sanifoam antetini satır 0-3'e yazar, merges'e ekler. Sonraki boş satır indeksini döndürür (5).
// Tablo genişliğine göre uyarlanır (dar tablolarda logo/grid daralır).
export function writeSanifoamAntet(ws: { [k: string]: any }, merges: any[], opts: AntetOptions): number {
  const last = opts.lastCol;

  // Antet için belirgin (medium) kenarlık — büyük birleşik hücrelerde çizgilerin net görünmesi için
  const me = { style: 'medium' };
  const box = { top: me, bottom: me, left: me, right: me };

  const logoStyle  = { font: { name: 'Times New Roman', sz: 22, bold: true }, alignment: { horizontal: 'center', vertical: 'center' }, border: box };
  const topStyle   = { font: { sz: 10 }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: box };
  const titleStyle = { font: { sz: 14, bold: true }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: box };
  const keyStyle   = { font: { sz: 9 }, fill: { fgColor: { rgb: 'F2F2F2' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: box };
  const valStyle   = { font: { sz: 11, bold: true }, alignment: { horizontal: 'center', vertical: 'center' }, border: box };

  // Genişliğe göre blok payları
  const logoC1 = last >= 16 ? 2 : 1;          // sol logo: 0..logoC1
  const rightW = last >= 18 ? 3 : 2;          // sağ etiket/değer kolon adedi
  const valC1 = last,           valC0 = last - rightW + 1;
  const keyC1 = valC0 - 1,      keyC0 = keyC1 - rightW + 1;
  const midC0 = logoC1 + 1,     midC1 = keyC0 - 1;

  const fill = (r0: number, r1: number, c0: number, c1: number, style: any) => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (!ws[encCell(r, c)]) ws[encCell(r, c)] = { v: '', t: 's', s: style };
    }
  };

  // Logo (satır 0-3)
  ws[encCell(0, 0)] = { v: 'Sanifoam', t: 's', s: logoStyle };
  merges.push({ s: { r: 0, c: 0 }, e: { r: 3, c: logoC1 } });
  fill(0, 3, 0, logoC1, logoStyle);

  // Orta üst (satır 0): doküman adı
  ws[encCell(0, midC0)] = { v: opts.docName || 'QUALITY SYSTEM DOCUMENTATION', t: 's', s: topStyle };
  merges.push({ s: { r: 0, c: midC0 }, e: { r: 0, c: midC1 } });
  fill(0, 0, midC0, midC1, topStyle);

  // Orta başlık (satır 1-3): form adı
  ws[encCell(1, midC0)] = { v: opts.title, t: 's', s: titleStyle };
  merges.push({ s: { r: 1, c: midC0 }, e: { r: 3, c: midC1 } });
  fill(1, 3, midC0, midC1, titleStyle);

  // Sağ etiket/değer grid'i (satır 0-3)
  const grid: [string, string][] = [['DOK.NO', opts.docNo], ['Y. TRH.', opts.date], ['REV.NO', opts.rev], ['SAYFA', opts.sayfa || '1/1']];
  grid.forEach((kv, i) => {
    ws[encCell(i, keyC0)] = { v: kv[0], t: 's', s: keyStyle };
    merges.push({ s: { r: i, c: keyC0 }, e: { r: i, c: keyC1 } });
    fill(i, i, keyC0, keyC1, keyStyle);
    ws[encCell(i, valC0)] = { v: kv[1], t: 's', s: valStyle };
    merges.push({ s: { r: i, c: valC0 }, e: { r: i, c: valC1 } });
    fill(i, i, valC0, valC1, valStyle);
  });

  ws['!rows'] = [{ hpt: 18 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }];
  return 5; // antet (0-3) + 1 boş satır
}

// Antetin altına tek satır proje bilgisi yazar (genişlikten bağımsız). Sonraki boş satır indeksini döndürür.
export function writeProjectInfoLine(ws: { [k: string]: any }, merges: any[], row: number, lastCol: number, parts: (string | undefined)[]): number {
  const text = parts.filter(Boolean).join('     |     ');
  ws[encCell(row, 0)] = { v: text, t: 's', s: infoLineStyle };
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: lastCol } });
  for (let c = 1; c <= lastCol; c++) ws[encCell(row, c)] = { v: '', t: 's', s: infoLineStyle };
  ws['!rows']![row] = { hpt: 22 };
  return row + 2; // bilgi satırı + 1 boş satır
}

// !merges, !cols, !ref ayarlar ve dosyayı indirir.
export function finalizeAndDownload(ws: { [k: string]: any }, merges: any[], colWidths: number[], lastCol: number, lastRow: number, sheetName: string, fileName: string): void {
  // Boş kalan tüm hücreleri ince kenarlıkla doldur — tabloda hiçbir yerde çizgi eksiği kalmasın.
  for (let r = 0; r <= lastRow; r++) {
    for (let c = 0; c <= lastCol; c++) {
      const a = encCell(r, c);
      if (!ws[a]) ws[a] = { v: '', t: 's', s: { border: thinBorder } };
    }
  }
  ws['!merges'] = merges;
  ws['!cols'] = colWidths.map(wch => ({ wch }));
  ws['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: lastCol, r: lastRow } });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

export const apFillFor = (ap?: any) => {
  const s = String(ap || '').replace(/[()]/g, '').trim().toUpperCase();
  if (s === 'H') return fillH;
  if (s === 'M') return fillM;
  if (s === 'L') return fillL;
  return undefined;
};

export const rpnFillFor = (rpn: number | undefined, high = 100, medium = 40) => {
  if (rpn === undefined || rpn === null || isNaN(rpn)) return undefined;
  if (rpn > high) return fillH;
  if (rpn > medium) return fillM;
  return undefined;
};
