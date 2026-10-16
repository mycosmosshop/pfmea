// PFMEA "PDF (tüm sayfalar)": Excel'deki sekmeler (FMEA, Proje Geçmişi, Görevler, S-O-D, AP Matrisi) sırayla
// tek PDF. Excel ile aynı veri, aynı Sanifoam anteti, aynı renkler; Türkçe için Roboto gömülür.
// jsPDF + jspdf-autotable (index.html CDN). Saf fonksiyon: jsPDF ve font dışarıdan verilir (testte node'da çalışır).

import { SUTUNLAR, GOREV_SUTUN, FE_SUTUN, S_FE_SUTUN, feMax, mirasSutunlari } from './fmeaExcel';

export type PdfSayfa = 'fmea' | 'gecmis' | 'gorev' | 'sod' | 'ap';
export const PDF_SAYFALAR: { key: PdfSayfa; ad: string }[] = [
  { key: 'fmea', ad: 'FMEA' }, { key: 'gecmis', ad: 'Proje Geçmişi' }, { key: 'gorev', ad: 'Görevler' },
  { key: 'sod', ad: 'S-O-D Tabloları' }, { key: 'ap', ad: 'AP Matrisi' },
];

export interface PdfGirdi {
  secim: PdfSayfa[];
  fmea: any;                       // projectData.fmea
  history?: any[];
  satirlar: any[][];               // Excel'e giden 30 sütunluk satırlar (FmeaTable)
  zebra: boolean[];
  apMatrix: string[][][];
  kriter: any[][];                 // S-O-D Tabloları satırları (Excel'deki ile aynı)
  antet: { docNo: string; rev: string; date: string };
  font: { normal: string; bold: string };   // TTF base64
}

const FONT_URL = {
  normal: 'https://cdn.jsdelivr.net/npm/roboto-font@0.1.0/fonts/Roboto/roboto-regular-webfont.ttf',
  bold: 'https://cdn.jsdelivr.net/npm/roboto-font@0.1.0/fonts/Roboto/roboto-bold-webfont.ttf',
};
let fontSoz: Promise<{ normal: string; bold: string }> | null = null;
/** Roboto TTF'leri bir kez indirip base64 döndürür (tarayıcı). */
export function pdfFontYukle(): Promise<{ normal: string; bold: string }> {
  const b64 = (buf: ArrayBuffer) => {
    const a = new Uint8Array(buf); let s = '';
    for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const al = (u: string) => fetch(u).then(r => { if (!r.ok) throw new Error('Font indirilemedi: ' + r.status); return r.arrayBuffer(); }).then(b64);
  fontSoz = fontSoz || Promise.all([al(FONT_URL.normal), al(FONT_URL.bold)]).then(([normal, bold]) => ({ normal, bold }));
  fontSoz.catch(() => { fontSoz = null; });
  return fontSoz;
}

// Roboto'da olmayan işaretler
const temiz = (v: any): string => String(v ?? '').replace(/⚠️?/g, '(!)').replace(/[→⇒]/g, '->').replace(/✓/g, 'OK').replace(/✗/g, 'X')
  .replace(/[\u{1F300}-\u{1FAFF}☀-⛿✀-➿]/gu, '');
const tarih = (t?: string) => /^\d{4}-\d{2}-\d{2}$/.test(t || '') ? t!.split('-').reverse().join('.') : (t || '');

const LACI: [number, number, number] = [23, 54, 93], GRI: [number, number, number] = [242, 242, 242];
const AP_RENK: Record<string, { f: [number, number, number]; t: [number, number, number] }> = {
  H: { f: [255, 199, 206], t: [156, 0, 6] }, M: { f: [255, 235, 156], t: [156, 87, 0] }, L: { f: [198, 239, 206], t: [0, 97, 0] },
};
const KENAR = 8;          // mm
const ANTET_Y = 22;       // antet yüksekliği (mm)
const UST = KENAR + ANTET_Y + 4;

export function fmeaPdfOlustur(jsPDF: any, g: PdfGirdi): any {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true });
  doc.addFileToVFS('Roboto-Regular.ttf', g.font.normal); doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', g.font.bold); doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  const baslik: Record<number, string> = {};           // sayfa no → antet başlığı
  let ilkSayfa = true;
  const yeniBolum = (format: 'a3' | 'a4', yon: 'landscape' | 'portrait', ad: string) => {
    doc.addPage(format, yon);
    if (ilkSayfa) { doc.deletePage(1); ilkSayfa = false; }
    baslik[doc.getNumberOfPages()] = ad;
    return ad;
  };
  const ortak = (ad: string, ekstra: any = {}) => ({
    theme: 'grid', margin: { top: UST, left: KENAR, right: KENAR, bottom: KENAR },
    styles: { font: 'Roboto', fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], valign: 'top', overflow: 'linebreak' },
    headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: LACI, textColor: [255, 255, 255], halign: 'center', valign: 'middle' },
    didDrawPage: () => { baslik[doc.getCurrentPageInfo().pageNumber] = ad; },
    ...ekstra,
  });
  const genislik = () => doc.internal.pageSize.getWidth() - 2 * KENAR;
  const son = () => (doc as any).lastAutoTable.finalY as number;
  const bant = (y: number, metin: string, renk: [number, number, number] = [221, 235, 247]) => {
    doc.setFillColor(...renk); doc.setDrawColor(0); doc.setLineWidth(0.1);
    doc.rect(KENAR, y, genislik(), 6, 'FD');
    doc.setFont('Roboto', 'bold'); doc.setFontSize(9); doc.setTextColor(renk === LACI ? 255 : 0);
    doc.text(temiz(metin), KENAR + 1.5, y + 4.1); doc.setTextColor(0);
    return y + 6;
  };
  const ap = (s: any, o: any, d: any) => (s >= 1 && o >= 1 && d >= 1 && s <= 10 && o <= 10 && d <= 10) ? g.apMatrix[s - 1][o - 1][d - 1] : '';

  // ---------- FMEA (A3 yatay) ----------
  if (g.secim.includes('fmea')) {
    const ad = yeniBolum('a3', 'landscape', 'PROCESS FAILURE MODES & EFFECTS ANALYSIS\n(PROSES FMEA)');
    let y = bant(UST, 'Process Failure Mode and Effects Analysis (Process FMEA)');
    const f = g.fmea;
    const bilgi = [
      ['Project:', f.project, 'Engineering Location:', f.engineeringLocation, 'Last revision date:', tarih(f.lastRevisionDate)],
      ['Client:', f.client, 'Date of first FMEA:', tarih(f.firstFmeaDate), 'FMEA Number /Version:', f.fmeaNumberVersion],
      ['Number/Name of product:', f.productName, 'Person responsible:', f.personResponsible, 'FMEA Approver:', f.fmeaApprover],
      ['Project ID:', f.projectId, 'FMEA Creator:', f.fmeaCreator, 'Company name:', f.companyName],
    ].map(r => r.map(v => temiz(v || '-')));
    const uzun: any[] = [];
    if (f.teamMembers) uzun.push([{ content: 'Team members:', styles: { fontStyle: 'bold', fillColor: [231, 230, 230], halign: 'right' } }, { content: temiz(f.teamMembers), colSpan: 5 }]);
    if (f.notes) uzun.push([{ content: 'Notes/comments:', styles: { fontStyle: 'bold', fillColor: [231, 230, 230], halign: 'right' } }, { content: temiz(f.notes), colSpan: 5 }]);
    const W = genislik(), anahtarS = { fontStyle: 'bold', fillColor: [231, 230, 230], halign: 'right' };
    doc.autoTable(ortak(ad, {
      startY: y, body: [...bilgi, ...uzun], styles: { ...ortak(ad).styles, fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: W * 0.11, ...anahtarS }, 1: { cellWidth: W * 0.26 }, 2: { cellWidth: W * 0.11, ...anahtarS }, 3: { cellWidth: W * 0.18 }, 4: { cellWidth: W * 0.11, ...anahtarS }, 5: { cellWidth: W * 0.23 } },
    }));
    y = son() + 3;

    const grup: [string, number, number][] = [['Structure analysis (Step 2)', 0, 2], ['Function analysis (Step 3)', 3, 5],
      ['Failure analysis (Step 4)', 6, 9], ['Risk analysis (Step 5)', 10, 16], ['Optimization (Step 6)', 17, 29]];
    const KISA: Record<string, string> = { S: 'S', O: 'O', D: 'D', AP: 'AP', APR: 'AP' };   // dar sütunda uzun ad harf harf kırılıyor
    const head = [grup.map(([t, a, b]) => ({ content: t, colSpan: b - a + 1 })), SUTUNLAR.map(s => temiz(KISA[s.tur || ''] || s.ad))];
    const dar = (i: number) => ['S', 'O', 'D', 'AP', 'APR'].includes(SUTUNLAR[i].tur || '');
    const genler = SUTUNLAR.map((s, i) => dar(i) ? 6 : s.gen);
    const toplam = genler.reduce((a, b) => a + b, 0);
    const miras = mirasSutunlari(g.satirlar);
    const body = g.satirlar.map((r, i) => {
      const v = [...r];
      const sMax = feMax(v[FE_SUTUN]); if (sMax !== '') v[S_FE_SUTUN] = sMax;        // Excel formülüyle aynı
      v[14] = ap(v[7], v[11], v[13]);
      const rap = ap(v[24], v[25], v[26]); v[28] = rap ? `(${rap})` : '';
      return v.map((x, c) => {
        const st: any = {};
        if (g.zebra[i]) st.fillColor = GRI;
        if (miras[i].has(c)) st.textColor = [166, 166, 166];
        const apH = c === 14 ? x : c === 28 ? String(x).replace(/[()]/g, '') : '';
        if (apH && AP_RENK[apH]) { st.fillColor = AP_RENK[apH].f; st.textColor = AP_RENK[apH].t; st.fontStyle = 'bold'; }
        if (dar(c)) st.halign = 'center';
        return { content: temiz(x), styles: st };
      });
    });
    doc.autoTable(ortak(ad, {
      startY: y, head, body, showHead: 'everyPage', rowPageBreak: 'avoid',
      styles: { ...ortak(ad).styles, fontSize: 5.6, cellPadding: 0.7 },
      headStyles: { ...ortak(ad).headStyles, fontSize: 5.6 },
      columnStyles: Object.fromEntries(genler.map((x, i) => [i, { cellWidth: W * x / toplam }])),
    }));
  }

  // ---------- Proje Geçmişi (A4 yatay) ----------
  if (g.secim.includes('gecmis')) {
    const ad = yeniBolum('a4', 'landscape', 'PFMEA DEĞİŞİKLİK GEÇMİŞİ\n(PFMEA HISTORY)');
    const f = g.fmea, W = genislik(), anahtarS = { fontStyle: 'bold', fillColor: [231, 230, 230], halign: 'right' };
    let y = bant(UST, 'Genel Bilgiler');
    doc.autoTable(ortak(ad, {
      startY: y,
      body: [['Firma Adı:', f.companyName, 'Müşteri:', f.client], ['Parça Adı / No:', f.productName, 'Proje / Referans:', f.project],
        ['FMEA No / Versiyon:', f.fmeaNumberVersion, 'Oluşturma Tarihi:', tarih(f.firstFmeaDate)],
        ['Son Revizyon Tarihi:', tarih(f.lastRevisionDate), 'Ekip:', f.teamMembers]].map(r => r.map(temiz)),
      columnStyles: { 0: { cellWidth: W * 0.14, ...anahtarS }, 1: { cellWidth: W * 0.36 }, 2: { cellWidth: W * 0.14, ...anahtarS }, 3: { cellWidth: W * 0.36 } },
    }));
    y = bant(son() + 4, '1. PFMEA Geçmişi (PFMEA History)');
    const h = g.history || [];
    doc.autoTable(ortak(ad, {
      startY: y, head: [['Revizyon', 'Tarih', 'Değişiklik Açıklaması', 'Değişiklik Nedeni', 'Hazırlayan', 'Onaylayan']],
      body: h.length ? h.map(x => [x.revision, tarih(x.date), x.changeDescription, x.changeReason, x.preparedBy, x.approvedBy].map(temiz))
        : [[{ content: 'Henüz revizyon kaydı yok.', colSpan: 6, styles: { halign: 'center' } }]],
      columnStyles: { 0: { cellWidth: W * 0.07, halign: 'center' }, 1: { cellWidth: W * 0.08, halign: 'center' }, 2: { cellWidth: W * 0.37 },
        3: { cellWidth: W * 0.24 }, 4: { cellWidth: W * 0.12 }, 5: { cellWidth: W * 0.12 } },
    }));
  }

  // ---------- Görevler (A4 yatay) ----------
  if (g.secim.includes('gorev')) {
    const ad = yeniBolum('a4', 'landscape', 'PFMEA GÖREVLER\n(ACTION LIST)');
    const aksiyonlu = g.satirlar.filter(r => r[17] || r[18]);
    const gen = [5, ...GOREV_SUTUN.map(i => Math.max(10, SUTUNLAR[i].tur === 'AP' ? 6 : SUTUNLAR[i].gen))];
    const top = gen.reduce((a, b) => a + b, 0), W = genislik();
    doc.autoTable(ortak(ad, {
      startY: UST, head: [['No', ...GOREV_SUTUN.map(i => temiz(SUTUNLAR[i].ad))]],
      body: aksiyonlu.length ? aksiyonlu.map((r, k) => [String(k + 1), ...GOREV_SUTUN.map(i => {
        const x = i === 14 ? ap(r[7], r[11], r[13]) : r[i];
        const st: any = i === 14 && AP_RENK[x] ? { fillColor: AP_RENK[x].f, textColor: AP_RENK[x].t, fontStyle: 'bold', halign: 'center' } : {};
        return { content: temiz(x), styles: st };
      })]) : [[{ content: 'Aksiyon yok.', colSpan: gen.length, styles: { halign: 'center' } }]],
      styles: { ...ortak(ad).styles, fontSize: 6.5 },
      columnStyles: Object.fromEntries(gen.map((x, i) => [i, { cellWidth: W * x / top, ...(i === 0 ? { halign: 'center' } : {}) }])),
    }));
  }

  // ---------- S-O-D Tabloları (A4 yatay) ----------
  if (g.secim.includes('sod')) {
    const ad = yeniBolum('a4', 'landscape', 'S-O-D DEĞERLENDİRME TABLOLARI\n(AIAG-VDA PFMEA)');
    const bloklar: any[][][] = [[]];
    g.kriter.forEach(s => { if (!s || !s.length) bloklar.push([]); else bloklar[bloklar.length - 1].push(s); });
    let y = UST;
    bloklar.filter(b => b.length).forEach(b => {
      const [bas, kolon, ...satir] = b;
      if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = UST; baslik[doc.getNumberOfPages()] = ad; }
      y = bant(y, bas[0], LACI);
      const n = kolon.length, W = genislik();
      const gen = n === 5 ? [0.05, 0.13, 0.27, 0.27, 0.28] : n === 4 ? [0.05, 0.13, 0.41, 0.41] : [0.05, 0.2, 0.75];
      doc.autoTable(ortak(ad, {
        startY: y, head: [kolon.map(temiz)], body: satir.map(r => r.map(temiz)), styles: { ...ortak(ad).styles, fontSize: 6.8 },
        columnStyles: Object.fromEntries(gen.map((x, i) => [i, { cellWidth: W * x, ...(i === 0 ? { halign: 'center', fontStyle: 'bold' } : {}) }])),
      }));
      y = son() + 5;
    });
  }

  // ---------- AP Matrisi (A4 dikey) ----------
  if (g.secim.includes('ap')) {
    const ad = yeniBolum('a4', 'portrait', 'AP MATRİSİ\n(ACTION PRIORITY — AIAG-VDA)');
    const body: any[] = [];
    for (let s = 10; s >= 1; s--) for (let o = 10; o >= 1; o--) {
      body.push([String(s), String(o), ...Array.from({ length: 10 }, (_, d) => {
        const x = g.apMatrix[s - 1][o - 1][d];
        return { content: x, styles: { fillColor: AP_RENK[x]?.f, textColor: AP_RENK[x]?.t, halign: 'center', fontStyle: 'bold' } };
      })]);
    }
    const W = genislik();
    doc.autoTable(ortak(ad, {
      startY: UST, head: [['S', 'O', ...Array.from({ length: 10 }, (_, d) => `D=${d + 1}`)]], body, showHead: 'everyPage',
      styles: { ...ortak(ad).styles, fontSize: 6.5, cellPadding: 0.6, halign: 'center' },
      columnStyles: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i, { cellWidth: W / 12 }])),
    }));
  }

  // ---------- her sayfaya antet + sayfa no ----------
  const N = doc.getNumberOfPages();
  let sonBaslik = '';
  for (let p = 1; p <= N; p++) {
    doc.setPage(p);
    sonBaslik = baslik[p] || sonBaslik;
    antetCiz(doc, sonBaslik, { ...g.antet, sayfa: `${p}/${N}` });
  }
  return doc;
}

function antetCiz(doc: any, baslik: string, a: { docNo: string; rev: string; date: string; sayfa: string }) {
  const W = doc.internal.pageSize.getWidth() - 2 * KENAR, x0 = KENAR, y0 = KENAR, h = ANTET_Y / 4;
  const logoW = W * 0.16, anahW = W * 0.08, degW = W * 0.09, ortaW = W - logoW - anahW - degW;
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.setTextColor(0);
  doc.rect(x0, y0, logoW, ANTET_Y);
  doc.setFont('times', 'bold'); doc.setFontSize(20);
  doc.setFontSize(Math.min(20, 20 * (logoW - 4) / doc.getTextWidth('Sanifoam')));
  doc.text('Sanifoam', x0 + logoW / 2, y0 + ANTET_Y / 2, { align: 'center', baseline: 'middle' });
  const ox = x0 + logoW;
  doc.rect(ox, y0, ortaW, h); doc.rect(ox, y0 + h, ortaW, ANTET_Y - h);
  doc.setFont('Roboto', 'normal'); doc.setFontSize(8);
  doc.text('QUALITY SYSTEM DOCUMENTATION', ox + ortaW / 2, y0 + h / 2, { align: 'center', baseline: 'middle' });
  doc.setFont('Roboto', 'bold'); doc.setFontSize(11);
  const satirlar = temiz(baslik).split('\n');
  satirlar.forEach((t, i) => doc.text(t, ox + ortaW / 2, y0 + h + (ANTET_Y - h) / 2 + (i - (satirlar.length - 1) / 2) * 4.6, { align: 'center', baseline: 'middle' }));
  const kx = ox + ortaW, vx = kx + anahW;
  [['DOK.NO', a.docNo], ['Y. TRH.', a.date], ['REV.NO', a.rev], ['SAYFA', a.sayfa]].forEach(([k, v], i) => {
    const y = y0 + i * h;
    doc.setFillColor(...GRI); doc.rect(kx, y, anahW, h, 'FD'); doc.rect(vx, y, degW, h);
    doc.setFont('Roboto', 'normal'); doc.setFontSize(7); doc.text(k, kx + anahW / 2, y + h / 2, { align: 'center', baseline: 'middle' });
    doc.setFont('Roboto', 'bold'); doc.setFontSize(9); doc.text(v, vx + degW / 2, y + h / 2, { align: 'center', baseline: 'middle' });
  });
  doc.setLineWidth(0.1);
}
