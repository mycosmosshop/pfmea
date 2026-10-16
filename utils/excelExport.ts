// Ortak Excel çıktı yardımcıları: Sanifoam kurumsal antet + biçimlendirme.
// FmeaTable, AiagViewTable, ControlPlanTable ve FlowDiagramView aynı antet/stili paylaşır.
// xlsx-js-style (XLSX global) hücre stillerini (renk/dolgu/kenarlık) korur.

import { drawingEkle } from './flowDrawing';
import { fmeaPaketle, type FmeaPaketAyar } from './fmeaExcel';

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

// "Project History" sayfasını antetli ayrı sekme olarak wb'ye ekler (ekranla aynı: genel bilgiler + revizyon tablosu).
// 12 sütun: antet yardımcısı dar tabloda orta başlığı sıfırlıyor; geniş alanlar birleşik hücre.
export function projeGecmisiSayfasi(wb: any, sayfaAdi: string, fmea: any, history: any[] | undefined, antet: Omit<AntetOptions, 'title' | 'lastCol'>): void {
  const SON = 11;
  const ws: { [k: string]: any } = {};
  const merges: any[] = [];
  const kutu = (r: number, c0: number, c1: number, v: any, s: any) => {
    ws[encCell(r, c0)] = { v: v ?? '', t: 's', s };
    for (let c = c0 + 1; c <= c1; c++) ws[encCell(r, c)] = { v: '', t: 's', s };
    if (c1 > c0) merges.push({ s: { r, c: c0 }, e: { r, c: c1 } });
  };
  const tarih = (t?: string) => /^\d{4}-\d{2}-\d{2}$/.test(t || '') ? t!.split('-').reverse().join('.') : (t || '');
  const satirYuk = (r: number, ...metin: [string, number][]) => {
    const n = Math.max(1, ...metin.map(([m, gen]) => String(m || '').split('\n').reduce((t, s) => t + Math.max(1, Math.ceil(s.length / gen)), 0)));
    ws['!rows'][r] = { hpt: Math.max(18, n * 12 + 4) };
  };

  let r = writeSanifoamAntet(ws, merges, { ...antet, title: 'PFMEA DEĞİŞİKLİK GEÇMİŞİ\n(PFMEA HISTORY)', lastCol: SON });
  const anahtar = { ...infoLineStyle, alignment: { ...infoLineStyle.alignment, horizontal: 'right' } };
  kutu(r++, 0, SON, 'Genel Bilgiler', { ...infoLineStyle, fill: { fgColor: { rgb: 'DDEBF7' } } });
  const bilgi: [string, string, string, string][] = [
    ['Firma Adı', fmea.companyName, 'Müşteri', fmea.client],
    ['Parça Adı / No', fmea.productName, 'Proje / Referans', fmea.project],
    ['FMEA No / Versiyon', fmea.fmeaNumberVersion, 'Oluşturma Tarihi', tarih(fmea.firstFmeaDate)],
    ['Son Revizyon Tarihi', tarih(fmea.lastRevisionDate), 'Ekip', fmea.teamMembers],
  ];
  bilgi.forEach(([k1, v1, k2, v2]) => {
    kutu(r, 0, 1, k1 + ':', anahtar); kutu(r, 2, 4, v1, bodyStyle);
    kutu(r, 5, 6, k2 + ':', anahtar); kutu(r, 7, SON, v2, bodyStyle);
    satirYuk(r, [v1, 60], [v2, 50]); r++;
  });
  r++;
  kutu(r++, 0, SON, '1. PFMEA Geçmişi (PFMEA History)', { ...infoLineStyle, fill: { fgColor: { rgb: 'DDEBF7' } } });
  const SUT: [string, number, number][] = [['Revizyon', 0, 0], ['Tarih', 1, 1], ['Değişiklik Açıklaması', 2, 4], ['Değişiklik Nedeni', 5, 7], ['Hazırlayan', 8, 9], ['Onaylayan', 10, 11]];
  SUT.forEach(([t, c0, c1]) => kutu(r, c0, c1, t, headerBandStyle));
  ws['!rows'][r++] = { hpt: 22 };
  const kayit = history || [];
  if (!kayit.length) kutu(r++, 0, SON, 'Henüz revizyon kaydı yok.', bodyCenterStyle);
  kayit.forEach(h => {
    const deger = [h.revision, tarih(h.date), h.changeDescription, h.changeReason, h.preparedBy, h.approvedBy];
    SUT.forEach(([, c0, c1], i) => kutu(r, c0, c1, deger[i], i < 2 ? bodyCenterStyle : bodyStyle));
    satirYuk(r, [h.changeDescription, 62], [h.changeReason, 42]); r++;
  });

  ws['!merges'] = merges;
  ws['!cols'] = [10, 12, 22, 22, 22, 15, 15, 15, 9, 9, 9, 9].map(wch => ({ wch }));
  ws['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: SON, r: r - 1 } });
  XLSX.utils.book_append_sheet(wb, ws, sayfaAdi);
}

declare const JSZip: any;

// !merges, !cols, !ref ayarlar ve dosyayı indirir.
// drawingXml verilirse (akış şeması şekilleri) paket JSZip ile açılıp drawing eklenir;
// xlsx-js-style şekil yazamadığı için bu sonradan-ekleme tek yol.
export function finalizeAndDownload(ws: { [k: string]: any }, merges: any[], colWidths: number[], lastCol: number, lastRow: number, sheetName: string, fileName: string, drawingXml?: string): void {
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
  if (!drawingXml || typeof JSZip === 'undefined') {
    if (drawingXml) console.warn('JSZip yüklü değil — akış şeması şekilsiz indiriliyor');
    XLSX.writeFile(wb, fileName);
    return;
  }
  (async () => {
    const paket = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const zip = await JSZip.loadAsync(paket);
    await drawingEkle(zip, drawingXml);
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = fileName; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  })().catch(e => { console.error('Şekilli dışa aktarma başarısız, şekilsiz indiriliyor', e); XLSX.writeFile(wb, fileName); });
}

// PFMEA çalışma Excel'i: tablo / listeler / renkler paket XML'ine eklenip indirilir (ilk sayfa = FMEA).
// JSZip yoksa ya da ekleme başarısızsa düz (tablosuz) indirilir.
export async function fmeaIndir(wb: any, fileName: string, ayar: FmeaPaketAyar): Promise<void> {
  try {
    if (typeof JSZip === 'undefined') throw new Error('JSZip yüklü değil');
    const zip = await JSZip.loadAsync(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
    await fmeaPaketle(zip, ayar);
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = fileName; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  } catch (e) {
    console.error('Tablo/listeler eklenemedi, düz indiriliyor', e);
    XLSX.writeFile(wb, fileName);
  }
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
  return fillL; // düşük RPN → yeşil (3. renk)
};
