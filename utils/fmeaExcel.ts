// PFMEA "Export to Excel": Excel'i yazılım gibi kullanılır kılar (makrosuz, Excel 2016+).
//
// - Gövde bir Excel TABLOSU (FMEA_Tablo): sağ tık → Ekle/Sil ile satır eklenir/silinir; formüller,
//   açılır listeler ve renkler yeni satıra kendiliğinden geçer. Başlıkta süzgeç var.
// - Kademe sütunları (adım, fonksiyon, etki, hata türü, kontroller, sorumlu): açılır liste ÜSTTE
//   kullanılmış değerlerden dolar (yeni yazılan değer de listeye girer), elle yeni değer de yazılır.
//   Üstteki satırla aynı kademe değeri (aynı üst kademe altında) formüldür, üsttekini İZLER ve soluk
//   gri görünür: üsttekini değiştirince alttakiler de değişir. Eklenen satır üstteki değerlerle gelir.
// - Function of the Process Item (yazılımda aynı ad) satırındaki Process Item'ı izler. Process Item
//   başlıktaki "Number/Name of product" ile BİREBİR aynıysa o hücreyi izler; farklıysa yazılımdaki
//   metin olduğu gibi kalır (metin asla başlıktakiyle değiştirilmez).
// - Severity (S) of FE: Failure Effect metnindeki "(7)" gibi puanların en yükseği (formül); listeden
//   seçilen değer formülün yerine geçer.
// - S/O/D açıklamalı listeden seçilir, AP (H/M/L) formülle hesaplanır ve renklenir.
// - Her sütunda "buraya ne yazılır" ipucu (hücre seçilince çıkar).
// - "Görevler" sekmesi önleyici/tespit aksiyonu yazılan satırlardan otomatik dolar; aksiyon
//   silinince listeden çıkar.
// xlsx-js-style tablo / liste / koşullu biçim yazamaz: bunlar paket XML'ine sonradan eklenir.

import { apFormulu, apMatrisSatirlari, sodBicim, AP_SAYFA, SOD_SAYFA, LISTE_SAYFA } from './sodAp';

export const FMEA_SAYFA = 'FMEA';
export const GOREV_SAYFA = 'Görevler';
export const GECMIS_SAYFA = 'Proje Geçmişi';
export const TABLO_ADI = 'FMEA_Tablo';
const LISTE_SATIR = 300;          // dinamik liste uzunluğu (Listeler sayfası)
const GOREV_BOS = 30;             // Görevler sekmesinde mevcut görevlerin altına hazır boş formül satırı

type Tur = 'S' | 'O' | 'D' | 'AP' | 'APR' | 'durum';
interface Sutun { ad: string; gen: number; tur?: Tur; liste?: boolean; tekrar?: boolean; ipucu?: string }

// Sütun adları tablo başlığıdır: BENZERSİZ olmalı (Excel tablosu kuralı).
export const SUTUNLAR: Sutun[] = [
  { ad: '1. Process Item', gen: 20, liste: true, tekrar: true, ipucu: 'Süreç kalemi. Satır ekle: sağ tık → Ekle → Tablo Satırları Üste (üstteki değerlerle gelir). Sil: sağ tık → Sil → Tablo Satırları.' },
  { ad: '2. Process Step', gen: 22, liste: true, tekrar: true, ipucu: '[Op. No] Adım adı. Listeden seçin ya da yeni adım yazın, ör. [30] Kesim.' },
  { ad: '3. Process Work Element (4M)', gen: 14, liste: true, ipucu: 'Nedenin kaynağı: İnsan / Makine / Malzeme / Metot / Ölçüm / Çevre.' },
  { ad: '1. Function of the Process Item', gen: 20, liste: true, tekrar: true, ipucu: 'Süreç kaleminin fonksiyonu.' },
  { ad: '2. Function of the Process Step and Product Characteristic', gen: 25, liste: true, tekrar: true, ipucu: 'Adımın fonksiyonu ve ürün karakteristiği, ör. En 1270 ± 5 mm.' },
  { ad: '3. Function of the Work Element and Process Characteristic', gen: 20, ipucu: '4M öğesinin fonksiyonu ve proses karakteristiği (sıcaklık, hız, basınç…).' },
  { ad: '1. Failure Effect (FE)', gen: 25, liste: true, tekrar: true, ipucu: 'Hatanın etkisi: [P] tesis içi / [C] müşteri / [E] son kullanıcı. Listeden seçin ya da yazın.' },
  { ad: 'Severity (S) of FE', gen: 24, tur: 'S' },
  { ad: '2. Failure Mode (FM)', gen: 25, liste: true, tekrar: true, ipucu: 'Ürün karakteristiğinin bozulma şekli, ör. En ölçüsü tolerans dışı.' },
  { ad: '3. Failure Cause (FC)', gen: 25, ipucu: '4M öğesinde hatayı doğuran neden, ör. Kesim bıçağı aşınması.' },
  { ad: 'Current Prevention Control (PC)', gen: 20, liste: true, ipucu: 'Nedeni önleyen mevcut kontrol: talimat, bakım, eğitim, poka-yoke… Listeden seçin ya da yazın.' },
  { ad: 'Occurrence (O) of FC', gen: 24, tur: 'O' },
  { ad: 'Current Detection Control (DC)', gen: 20, liste: true, ipucu: 'Hatayı ya da nedeni yakalayan mevcut kontrol: giriş, proses içi, final kontrol… Listeden seçin ya da yazın.' },
  { ad: 'Detection (D) of FC/FM', gen: 24, tur: 'D' },
  { ad: 'PFMEA AP', gen: 6, tur: 'AP', ipucu: 'Otomatik: S, O ve D seçilince hesaplanır. Elle yazmayın.' },
  { ad: 'Spec. Characteristic', gen: 10, liste: true, ipucu: 'Özel karakteristik (CC / SC…). Listeden seçin ya da yazın.' },
  { ad: 'Filter Code (Optional)', gen: 10 },
  { ad: 'Prevention Action', gen: 20, ipucu: 'Önleyici aksiyon. Yazınca Görevler sekmesine eklenir, silince çıkar.' },
  { ad: 'Detection Action', gen: 20, ipucu: 'Tespit aksiyonu. Yazınca Görevler sekmesine eklenir, silince çıkar.' },
  { ad: "Responsible Person's Name", gen: 15, liste: true, ipucu: 'Sorumlu kişi. Listeden seçin ya da yazın.' },
  { ad: 'Target Completion Date', gen: 13, ipucu: 'Hedef tarih, ör. 30.11.2026.' },
  { ad: 'Status', gen: 12, tur: 'durum' },
  { ad: 'Action Taken with Pointer to Evidence', gen: 25, ipucu: 'Yapılan iş ve kanıtı (doküman / kayıt no).' },
  { ad: 'Completion Date', gen: 13, ipucu: 'Tamamlanma tarihi.' },
  { ad: 'Severity (S)', gen: 24, tur: 'S' },
  { ad: 'Occurrence (O)', gen: 24, tur: 'O' },
  { ad: 'Detection (D)', gen: 24, tur: 'D' },
  { ad: 'Spec. Characteristic (Revize)', gen: 10 },
  { ad: 'PFMEA AP (Revize)', gen: 7, tur: 'APR', ipucu: 'Otomatik: revize S, O ve D seçilince hesaplanır.' },
  { ad: 'Remarks', gen: 20 },
];
export const DURUMLAR = ['Open', 'Pending implementation', 'Completed', 'Cancelled'];
// Görevler sekmesinde gösterilen FMEA sütunları (indeks)
export const GOREV_SUTUN = [1, 8, 9, 14, 17, 18, 19, 20, 21, 22, 23];

export const harf = (c: number): string => { let s = ''; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
const sutunNo = (ad: string) => SUTUNLAR.findIndex(s => s.ad === ad);
const TEKRAR = SUTUNLAR.map((s, i) => s.tekrar ? i : -1).filter(i => i >= 0);
const FE = sutunNo('1. Failure Effect (FE)'), S_FE = sutunNo('Severity (S) of FE'), F_ITEM = sutunNo('1. Function of the Process Item');
/** Üstteki satırın aynı sütunundaki değer (satır ekle/sil'de kaymaz; tablonun ilk satırında boş). */
const MIRAS = `IF(ROW()-1=ROW(${TABLO_ADI}[#Headers]),"",INDIRECT("R[-1]C",FALSE)&"")`;
/** Her satırda üsttekini izleyen (gri) kademe sütunları: aynı değer + üst kademeleri de aynı. Excel ve PDF ortak. */
export function mirasSutunlari(veri: any[][]): Set<number>[] {
  return veri.map((satir, i) => {
    const miras = new Set<number>(), ust = veri[i - 1];
    for (const c of TEKRAR) { if (!ust || String(satir[c] ?? '') !== String(ust[c] ?? '')) break; miras.add(c); }
    return miras;
  });
}
export const FE_SUTUN = FE, S_FE_SUTUN = S_FE;

/** Failure Effect metnindeki "(n)" puanlarının en yükseği (1–10), yoksa ''. Excel formülüyle aynı kural. */
export const feMax = (t: unknown): number | '' => {
  const n = [...String(t ?? '').matchAll(/\((\d{1,2})\)/g)].map(m => +m[1]).filter(x => x >= 1 && x <= 10);
  return n.length ? Math.max(...n) : '';
};
const S_ = (t: Tur) => SUTUNLAR.map((s, i) => s.tur === t ? i : -1).filter(i => i >= 0);
const LISTE_SUTUN = SUTUNLAR.map((s, i) => s.liste ? i : -1).filter(i => i >= 0);
const GOREV_NO = SUTUNLAR.length;                                   // AE: görev sırası (gizli)
const YARDIMCI = (i: number) => GOREV_NO + 1 + LISTE_SUTUN.indexOf(i); // liste ilk-görülme sırası (gizli)
const SON_SUTUN = GOREV_NO + LISTE_SUTUN.length;
export const FMEA_SON_SUTUN = SON_SUTUN;
const LISTE_KOLON = (i: number) => harf(5 + LISTE_SUTUN.indexOf(i));   // Listeler!F, G, …
export const listeAdi = (i: number) => 'Liste_' + harf(i);

/** Satırdaki formüller (r: Excel satırı, f: ilk veri satırı). Tablo bunları yeni satıra da yazar. */
export function satirFormulu(c: number, r: number, f: number): string | undefined {
  const k = (i: number) => harf(i);
  const s = SUTUNLAR[c];
  if (s && s.tur === 'AP') return apFormulu(`H${r}`, `L${r}`, `N${r}`);
  if (s && s.tur === 'APR') return apFormulu(`Y${r}`, `Z${r}`, `AA${r}`, true);
  if (s && s.tekrar) return MIRAS;
  // LOOKUP(2,1/koşul,…) koşulun doğru olduğu SON (= en büyük) puanı verir; dizi formülü gerekmez
  if (c === S_FE) return `IFERROR(LOOKUP(2,1/ISNUMBER(SEARCH("("&{1,2,3,4,5,6,7,8,9,10}&")",${k(FE)}${r})),{1,2,3,4,5,6,7,8,9,10}),"")`;
  const R = k(sutunNo('Prevention Action')), D = k(sutunNo('Detection Action'));
  if (c === GOREV_NO)
    return `IF(AND(${R}${r}="",${D}${r}=""),"",SUMPRODUCT(--(((${R}$${f}:${R}${r}<>"")+(${D}$${f}:${D}${r}<>""))>0)))`;
  const kaynak = LISTE_SUTUN.find(i => YARDIMCI(i) === c);
  if (kaynak !== undefined) {
    const X = k(kaynak), H = k(c);
    // ilk kez görülen değer → sıra no (uzun / joker karakterli metin hata verirse listeye girmez, liste bozulmaz)
    return `IFERROR(IF(${X}${r}="","",IF(COUNTIF(${X}$${f}:${X}${r},${X}${r})=1,MAX(${H}$${f - 1}:${H}${r - 1})+1,"")),"")`;
  }
  return undefined;
}

export interface FmeaPaketAyar { baslik: number; ilk: number; son: number }   // Excel satır no

/**
 * Grup başlığı + tablo başlığı + gövdeyi ws'ye yazar (ws'de anteti üstte olan sayfa).
 * satirlar: her satırda 30 değer (S/O/D puanı, AP değeri). zebra: satırın gölgesi.
 * urunHucre: başlıktaki ürün adı hücresi ("$B$10"); Process Item onunla birebir aynıysa onu izler.
 */
export function fmeaGovdeYaz(XLSX: any, ws: any, merges: any[], rowIndex: number, satirlar: any[][], zebra: boolean[], urunHucre?: string): FmeaPaketAyar {
  const kenar = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  const bas = { font: { sz: 8, color: { rgb: 'FFFFFF' }, bold: true }, fill: { fgColor: { rgb: '17365D' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: kenar };
  const govde = { font: { sz: 9 }, border: kenar, alignment: { vertical: 'top', wrapText: true } };
  const orta = { ...govde, alignment: { ...govde.alignment, horizontal: 'center' } };
  const enc = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });

  const grup: [string, number, number][] = [['Structure analysis (Step 2)', 0, 2], ['Function analysis (Step 3)', 3, 5],
    ['Failure analysis (Step 4)', 6, 9], ['Risk analysis (Step 5)', 10, 16], ['Optimization (Step 6)', 17, 29]];
  grup.forEach(([t, c0, c1]) => { for (let c = c0; c <= c1; c++) ws[enc(rowIndex, c)] = { v: c === c0 ? t : '', t: 's', s: bas }; merges.push({ s: { r: rowIndex, c: c0 }, e: { r: rowIndex, c: c1 } }); });
  const baslikR = rowIndex + 1;
  for (let c = 0; c <= SON_SUTUN; c++)
    ws[enc(baslikR, c)] = { v: c < GOREV_NO ? SUTUNLAR[c].ad : c === GOREV_NO ? 'Görev No' : '_liste_' + harf(LISTE_SUTUN[c - GOREV_NO - 1]), t: 's', s: bas };
  ws['!rows'] = ws['!rows'] || [];
  ws['!rows'][baslikR] = { hpt: 48 };

  const ilk = baslikR + 2;                                     // Excel satır no
  const veri = satirlar.length ? satirlar : [SUTUNLAR.map(() => '')];   // tablo en az bir satır ister
  const ad = String(veri[0][0] ?? '');
  const tekItem = !!urunHucre && ad !== '' && String(ws[urunHucre.replace(/\$/g, '')]?.v ?? '') === ad
    && veri.every(s => String(s[0] ?? '') === ad);
  const mirasHarita = mirasSutunlari(veri);
  veri.forEach((satir, i) => {
    const r0 = baslikR + 1 + i, R = r0 + 1;
    // üstteki satırla aynı kademe değeri, üst kademeleri de aynıysa üsttekini izler (formül)
    const miras = mirasHarita[i];
    const sMax = feMax(satir[FE]);
    for (let c = 0; c <= SON_SUTUN; c++) {
      const tur = SUTUNLAR[c]?.tur;
      let st: any = tur ? orta : govde;
      if (zebra[i]) st = { ...st, fill: { fgColor: { rgb: 'F2F2F2' } } };
      let f = satirFormulu(c, R, ilk);
      if (TEKRAR.includes(c) && !miras.has(c)) f = undefined;
      if (c === 0 && tekItem && !miras.has(0)) f = `${urunHucre}&""`;
      if (c === F_ITEM && !miras.has(c) && satir[c] !== '' && String(satir[c]) === String(satir[0])) f = `A${R}&""`;
      if (c === S_FE && sMax === '') f = undefined;
      const v = c === S_FE && f ? sMax : c < GOREV_NO ? (satir[c] ?? '') : '';
      ws[enc(r0, c)] = f ? { f, v, t: typeof v === 'number' ? 'n' : 's', s: st } : { v, t: typeof v === 'number' ? 'n' : 's', s: st };
    }
  });
  const son = ilk + veri.length - 1;
  ws['!cols'] = [...SUTUNLAR.map(s => ({ wch: s.gen })), ...Array(SON_SUTUN - GOREV_NO + 1).fill({ wch: 6, hidden: true })];
  return { baslik: baslikR + 1, ilk, son };
}

/** Görevler, S-O-D Tabloları, AP Matrisi, Listeler (gizli) sayfaları + liste adları. */
export function ekSayfalar(XLSX: any, wb: any, satirlar: any[][], apMatrix: any, kriterSatirlari: any[][]) {
  const kenar = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  const bas = { font: { sz: 9, color: { rgb: 'FFFFFF' }, bold: true }, fill: { fgColor: { rgb: '17365D' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: kenar };
  const govde = { font: { sz: 9 }, border: kenar, alignment: { vertical: 'top', wrapText: true } };

  // Görevler: aksiyonu olan satırlar (önbellek değeri JS'te, sonra formül)
  const R = sutunNo('Prevention Action'), D = sutunNo('Detection Action');
  const gorevler = satirlar.filter(s => String(s[R] ?? '').trim() || String(s[D] ?? '').trim());
  const g: any = {};
  const enc = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
  g[enc(0, 0)] = { v: 'GÖREVLER — FMEA sayfasında önleyici/tespit aksiyonu yazılan satırlardan otomatik dolar. Düzenlemeyi FMEA sayfasında yapın.', t: 's', s: { font: { sz: 10, bold: true } } };
  const basliklar = ['No', ...GOREV_SUTUN.map(i => SUTUNLAR[i].ad)];
  basliklar.forEach((t, c) => { g[enc(1, c)] = { v: t, t: 's', s: bas }; });
  const GN = harf(GOREV_NO);
  const GOREV_SATIR = gorevler.length + GOREV_BOS;   // baskıda boş sayfa çıkmasın diye sınırlı
  for (let k = 1; k <= GOREV_SATIR; k++) {
    const r0 = k + 1, var_ = k <= gorevler.length;
    g[enc(r0, 0)] = { f: `IF(COUNTIF(${FMEA_SAYFA}!$${GN}:$${GN},${k}),${k},"")`, v: var_ ? k : '', t: var_ ? 'n' : 's', s: govde };
    GOREV_SUTUN.forEach((i, j) => {
      const X = harf(i);
      g[enc(r0, j + 1)] = { f: `IFERROR(INDEX(${FMEA_SAYFA}!$${X}:$${X},MATCH(${k},${FMEA_SAYFA}!$${GN}:$${GN},0)),"")`, v: var_ ? (gorevler[k - 1][i] ?? '') : '', t: 's', s: govde };
    });
  }
  g['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: GOREV_SATIR + 1, c: basliklar.length - 1 } });
  g['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: basliklar.length - 1 } }];
  g['!cols'] = [{ wch: 5 }, ...GOREV_SUTUN.map(i => ({ wch: Math.max(12, SUTUNLAR[i].gen) }))];
  XLSX.utils.book_append_sheet(wb, g, GOREV_SAYFA);

  // S-O-D kriter tabloları
  // bölüm başlığı (tek hücre) tüm genişlikte; 3–4 sütunlu tablolarda son sütun E'ye kadar birleşir; puan ortada
  const KG = [6, 18, 48, 48, 48], KS = KG.length - 1;
  const wsK: any = {}, kMerge: any[] = [], kSatir: any[] = [];
  const bolum = { ...bas, font: { ...bas.font, sz: 11 }, alignment: { ...bas.alignment, horizontal: 'left' } };
  const puan = { ...govde, alignment: { ...govde.alignment, horizontal: 'center' } };
  kriterSatirlari.forEach((s, r) => {
    if (!s || !s.length) return;
    const baslik = typeof s[0] === 'string';
    if (s.length === 1) {
      for (let c = 0; c <= KS; c++) wsK[enc(r, c)] = { v: c ? '' : s[0], t: 's', s: bolum };
      kMerge.push({ s: { r, c: 0 }, e: { r, c: KS } }); kSatir[r] = { hpt: 20 }; return;
    }
    for (let c = 0; c <= KS; c++) {
      const i = Math.min(c, s.length - 1), v = c < s.length ? (s[c] ?? '') : '';
      wsK[enc(r, c)] = { v, t: typeof v === 'number' ? 'n' : 's', s: baslik ? bas : i === 0 ? puan : govde };
    }
    if (s.length - 1 < KS) kMerge.push({ s: { r, c: s.length - 1 }, e: { r, c: KS } });
    // satır yüksekliği: en uzun hücre / sütun genişliği (birleşik son sütun geniş sayılır)
    const gen = (c: number) => c === s.length - 1 ? KG.slice(c).reduce((a, b) => a + b, 0) : KG[c];
    const n = Math.max(1, ...s.map((v: any, c: number) => String(v ?? '').split('\n').reduce((t: number, p: string) => t + Math.max(1, Math.ceil(p.length / (gen(c) * 1.2))), 0)));
    kSatir[r] = { hpt: baslik ? 24 : Math.max(15, n * 11.5 + 3) };
  });
  wsK['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: kriterSatirlari.length - 1, c: KS } });
  wsK['!merges'] = kMerge; wsK['!rows'] = kSatir;
  wsK['!cols'] = KG.map(wch => ({ wch }));
  XLSX.utils.book_append_sheet(wb, wsK, SOD_SAYFA);

  // AP matrisi (AP formülü buradan okur)
  const wsAp = XLSX.utils.aoa_to_sheet(apMatrisSatirlari(apMatrix));
  wsAp['!cols'] = [{ wch: 4 }, { wch: 4 }, ...Array(10).fill({ wch: 6 })];
  XLSX.utils.book_append_sheet(wb, wsAp, AP_SAYFA);

  // Listeler (gizli): A–C S/O/D, D durum, F… kademe listeleri (FMEA'daki ilk-görülme sırasından).
  // S/O/D hücresi SAYI, açıklama sayı biçiminde: listede "4 – …" görünür, seçilince hücreye 4 yazılır.
  const L: any = {};
  (['S', 'O', 'D'] as const).forEach((t, c) => {
    for (let n = 1; n <= 10; n++) { const z = sodBicim(t, n); L[enc(n - 1, c)] = { v: n, t: 'n', z, s: { numFmt: z } }; }
  });
  DURUMLAR.forEach((d, i) => { L[enc(i, 3)] = { v: d, t: 's' }; });
  LISTE_SUTUN.forEach(i => {
    const c = 5 + LISTE_SUTUN.indexOf(i), X = harf(i), H = harf(YARDIMCI(i));
    const tekil: string[] = [];
    satirlar.forEach(s => { const v = String(s[i] ?? ''); if (v && v.length <= 255 && !tekil.includes(v)) tekil.push(v); });
    for (let k = 1; k <= LISTE_SATIR; k++)
      L[enc(k - 1, c)] = { f: `IFERROR(INDEX(${FMEA_SAYFA}!$${X}:$${X},MATCH(${k},${FMEA_SAYFA}!$${H}:$${H},0)),"")`, v: tekil[k - 1] ?? '', t: 's' };
  });
  L['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: LISTE_SATIR - 1, c: 5 + LISTE_SUTUN.length - 1 } });
  L['!cols'] = [{ wch: 70 }, { wch: 70 }, { wch: 70 }];   // dar sütunda biçimli sayı "####" olur
  XLSX.utils.book_append_sheet(wb, L, LISTE_SAYFA);

  // Listeler sayfası gizli; açılır listeler boşluksuz uzunlukta (OFFSET + COUNTIF "?*")
  wb.Workbook = {
    Sheets: wb.SheetNames.map((ad: string) => (ad === LISTE_SAYFA ? { Hidden: 1 } : {})),
    Names: LISTE_SUTUN.map(i => {
      const K = LISTE_KOLON(i);
      return { Name: listeAdi(i), Ref: `OFFSET(${LISTE_SAYFA}!$${K}$1,0,0,MAX(1,COUNTIF(${LISTE_SAYFA}!$${K}$1:$${K}$${LISTE_SATIR},"?*")),1)` };
    }),
  };
}

const xe = (t: string) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const DXF = [['FFFFC7CE', 'FF9C0006'], ['FFFFEB9C', 'FF9C5700'], ['FFC6EFCE', 'FF006100']];   // H, M, L

/** FMEA sayfası XML'ine: koşullu biçim (AP rengi, tekrar gri), açılır listeler/ipuçları, tablo bağı. Saf dönüşüm. */
export function fmeaSayfaXml(sayfa: string, stil: string, a: FmeaPaketAyar): { sayfa: string; stil: string } {
  const ar = (c: number) => `${harf(c)}${a.ilk}:${harf(c)}${a.son}`;
  let p = 0;
  const kural = (cs: number[], deger: (ap: string) => string) => cs.length ? `<conditionalFormatting sqref="${cs.map(ar).join(' ')}">`
    + ['H', 'M', 'L'].map((ap, i) => `<cfRule type="cellIs" dxfId="${i}" priority="${++p}" operator="equal"><formula>${xe(`"${deger(ap)}"`)}</formula></cfRule>`).join('')
    + '</conditionalFormatting>' : '';
  let cf = kural(S_('AP'), ap => ap) + kural(S_('APR'), ap => `(${ap})`);
  SUTUNLAR.forEach((s, c) => {
    if (!s.tekrar) return;
    const X = harf(c);
    cf += `<conditionalFormatting sqref="${ar(c)}"><cfRule type="expression" dxfId="3" priority="${++p}"><formula>${xe(`_xlfn.ISFORMULA(${X}${a.ilk})`)}</formula></cfRule></conditionalFormatting>`;
  });

  const dv: string[] = [];
  const ipucu = (baslik: string, metin: string) => ` showInputMessage="1" promptTitle="${xe(baslik.slice(0, 32))}" prompt="${xe(metin.slice(0, 255))}"`;
  const sod = { S: ['Şiddet (S)', 'A'], O: ['Oluşma (O)', 'B'], D: ['Tespit (D)', 'C'] } as const;
  (['S', 'O', 'D'] as const).forEach(t => S_(t).forEach(c => {
    const [ad, K] = sod[t];
    const metin = c === S_FE ? `Otomatik: Failure Effect'teki (n) puanlarının en yükseği. Listeden seçerseniz o değer kalır. Kriterler: '${SOD_SAYFA}'.`
      : `Listeden seçin. Ayrıntılı kriterler: '${SOD_SAYFA}' sayfası.`;
    dv.push(`<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Geçersiz değer" error="Listeden 1–10 arası bir değer seçin."${ipucu(ad, metin)} sqref="${ar(c)}"><formula1>${LISTE_SAYFA}!$${K}$1:$${K}$10</formula1></dataValidation>`);
  }));
  dv.push(`<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Geçersiz durum" error="Listeden seçin."${ipucu('Status', 'Aksiyonun durumu.')} sqref="${S_('durum').map(ar).join(' ')}"><formula1>${LISTE_SAYFA}!$D$1:$D$${DURUMLAR.length}</formula1></dataValidation>`);
  SUTUNLAR.forEach((s, c) => {
    const tip = (s.ipucu || '') + (s.tekrar && c > 0 ? ' Gri = üstteki satırı izler; üsttekini değiştirince alttakiler de değişir.' : '');
    if (s.liste) dv.push(`<dataValidation type="list" allowBlank="1" showErrorMessage="0"${ipucu(s.ad, tip)} sqref="${ar(c)}"><formula1>${listeAdi(c)}</formula1></dataValidation>`);
    else if (!s.tur || s.tur === 'AP' || s.tur === 'APR') { if (s.ipucu) dv.push(`<dataValidation allowBlank="1"${ipucu(s.ad, s.ipucu)} sqref="${ar(c)}"/>`); }
  });
  const ek = cf + `<dataValidations count="${dv.length}">${dv.join('')}</dataValidations>`;

  let y = sayfa;
  if (y.includes('</mergeCells>')) y = y.replace('</mergeCells>', '</mergeCells>' + ek);
  else if (y.includes('</sheetData>')) y = y.replace('</sheetData>', '</sheetData>' + ek);
  else throw new Error('sheetData bulunamadı');
  if (!y.includes('xmlns:r=')) y = y.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
  const ie = `<ignoredError sqref="A${a.ilk}:${harf(SON_SUTUN)}${a.son + 2000}" calculatedColumn="1"/>`;
  y = y.includes('</ignoredErrors>') ? y.replace('</ignoredErrors>', ie + '</ignoredErrors>')
    : y.replace(/(<drawing|<legacyDrawing|<\/worksheet>)/, `<ignoredErrors>${ie}</ignoredErrors>$1`);
  y = y.replace('</worksheet>', '<tableParts count="1"><tablePart r:id="rIdFmeaTablo"/></tableParts></worksheet>');

  const dxfs = `<dxfs count="${DXF.length + 1}">` + DXF.map(([bg, yazi]) =>
    `<dxf><font><color rgb="${yazi}"/></font><fill><patternFill patternType="solid"><bgColor rgb="${bg}"/></patternFill></fill></dxf>`).join('')
    + '<dxf><font><color rgb="FFA6A6A6"/></font></dxf></dxfs>';
  let st: string;
  if (/<dxfs count="0"\s*\/>/.test(stil)) st = stil.replace(/<dxfs count="0"\s*\/>/, dxfs);
  else if (!/<dxfs/.test(stil)) st = stil.replace(/(<tableStyles|<\/styleSheet>)/, dxfs + '$1');
  else throw new Error('styles.xml zaten dxf içeriyor — dxfId kayar');
  return { sayfa: y, stil: st };
}

/** AP Matrisi sayfası: H/M/L hücreleri FMEA'daki AP rengiyle (dxf 0–2); harf değişirse renk de değişir. */
/**
 * Yazdırma / PDF: kâğıt, yön, 1 sayfa genişliğe sığdır, altbilgide doküman + sayfa no.
 * Excel'in kendi "PDF olarak dışa aktar"ı (sekmeler Ctrl ile seçilerek) ERP'deki PDF düzenini verir.
 */
export function sayfaDuzeniXml(sayfa: string, kagit: 'a3' | 'a4' = 'a4', yon: 'landscape' | 'portrait' = 'landscape'): string {
  const ayar = '<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.5" header="0.2" footer="0.25"/>'
    + `<pageSetup paperSize="${kagit === 'a3' ? 8 : 9}" orientation="${yon}" fitToWidth="1" fitToHeight="0"/>`
    + '<headerFooter><oddFooter>&amp;L&amp;8Sanifoam  FR 34 / Rev 4&amp;C&amp;8&amp;A&amp;R&amp;8Sayfa &amp;P / &amp;N</oddFooter></headerFooter>';
  let y = sayfa.replace(/<pageMargins[^>]*\/>/, '').replace(/<pageSetup[^>]*\/>/, '').replace(/<headerFooter[\s\S]*?<\/headerFooter>/, '');
  y = /<sheetPr\b/.test(y) ? y : y.replace('<dimension', '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension');
  return y.replace(/(<headerFooter|<ignoredErrors|<drawing|<legacyDrawing|<tableParts|<\/worksheet>)/, ayar + '$1');
}

export function apMatrisXml(sayfa: string): string {
  const cf = '<conditionalFormatting sqref="C2:L101">'
    + ['H', 'M', 'L'].map((ap, i) => `<cfRule type="cellIs" dxfId="${i}" priority="${i + 1}" operator="equal"><formula>${xe(`"${ap}"`)}</formula></cfRule>`).join('')
    + '</conditionalFormatting>';
  if (!sayfa.includes('</sheetData>')) throw new Error('AP Matrisi: sheetData bulunamadı');
  return sayfa.replace('</sheetData>', '</sheetData>' + cf);
}

/** Tablo tanımı (xl/tables/table1.xml). Formüllü sütunlar "calculated column": yeni satıra kendiliğinden yazılır. */
export function tabloXml(a: FmeaPaketAyar): string {
  const ref = `A${a.baslik}:${harf(SON_SUTUN)}${a.son}`;
  const adlar = Array.from({ length: SON_SUTUN + 1 }, (_, c) => c < GOREV_NO ? SUTUNLAR[c].ad : c === GOREV_NO ? 'Görev No' : '_liste_' + harf(LISTE_SUTUN[c - GOREV_NO - 1]));
  const kol = adlar.map((ad, c) => {
    const f = satirFormulu(c, a.ilk, a.ilk);
    return `<tableColumn id="${c + 1}" name="${xe(ad)}"${f ? `><calculatedColumnFormula>${xe(f)}</calculatedColumnFormula></tableColumn>` : '/>'}`;
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + `<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="${TABLO_ADI}" displayName="${TABLO_ADI}" ref="${ref}" headerRowCount="1" totalsRowShown="0">`
    + `<autoFilter ref="${ref}"/><tableColumns count="${adlar.length}">${kol}</tableColumns>`
    + '<tableStyleInfo name="TableStyleLight1" showFirstColumn="0" showLastColumn="0" showRowStripes="0" showColumnStripes="0"/></table>';
}

/** xlsx paketini (JSZip) yerinde günceller: FMEA sayfası (sheet1) + tablo + açılışta yeniden hesap. */
export async function fmeaPaketle(zip: any, a: FmeaPaketAyar): Promise<void> {
  const { sayfa, stil } = fmeaSayfaXml(await zip.file('xl/worksheets/sheet1.xml').async('string'), await zip.file('xl/styles.xml').async('string'), a);
  zip.file('xl/worksheets/sheet1.xml', sayfa);
  zip.file('xl/styles.xml', stil);
  zip.file('xl/tables/table1.xml', tabloXml(a));
  const relYol = 'xl/worksheets/_rels/sheet1.xml.rels';
  const bag = '<Relationship Id="rIdFmeaTablo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/>';
  const rels = zip.file(relYol) ? await zip.file(relYol).async('string') : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  zip.file(relYol, rels.replace('</Relationships>', bag + '</Relationships>'));
  const ct = await zip.file('[Content_Types].xml').async('string');
  zip.file('[Content_Types].xml', ct.replace('</Types>', '<Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/></Types>'));
  const wbx = await zip.file('xl/workbook.xml').async('string');
  const adlar = [...wbx.matchAll(/<sheet [^>]*name="([^"]*)"/g)].map(m => m[1]);
  const isle = async (ad: string, f: (x: string) => string) => {
    const yol = `xl/worksheets/sheet${adlar.indexOf(ad) + 1}.xml`;
    if (adlar.includes(ad) && zip.file(yol)) zip.file(yol, f(await zip.file(yol).async('string')));
  };
  await isle(AP_SAYFA, x => sayfaDuzeniXml(apMatrisXml(x), 'a4', 'portrait'));
  await isle(FMEA_SAYFA, x => sayfaDuzeniXml(x, 'a3', 'landscape'));
  await isle(GECMIS_SAYFA, x => sayfaDuzeniXml(x));
  await isle(GOREV_SAYFA, x => sayfaDuzeniXml(x));
  await isle(SOD_SAYFA, x => sayfaDuzeniXml(x));
  // Not: tekrar eden başlık / baskı alanı (_xlnm.Print_Titles / Print_Area) Türkçe Excel 2019'da dosyadan
  // okunmuyor (openpyxl çıktısı da öyle); düz ad olarak kalıp dosyayı kirletiyordu → eklenmiyor.
  const wbx2 = wbx;
  // Listeler / Görevler formülleri açılışta hesaplansın
  zip.file('xl/workbook.xml', /<calcPr[^>]*\/>/.test(wbx2)
    ? wbx2.replace(/<calcPr([^>]*)\/>/, (m: string, i: string) => `<calcPr${i.replace(/\s*fullCalcOnLoad="[^"]*"/, '')} fullCalcOnLoad="1"/>`)
    : wbx2.replace('</workbook>', '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>'));
}
