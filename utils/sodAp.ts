// PFMEA Excel'i: S/O/D hücreleri açılır listeden (1–10) seçilir, AP (H/M/L) formülle hesaplanır.
//
// AP, pakete eklenen "AP Matrisi" sayfasındaki 100×10 tablodan okunur: satır = (S-1)*10+O, sütun = D.
// Tablo uygulamanın AP matrisiyle birebir yazılır (kullanıcı matrisi değiştirdiyse o).
// xlsx-js-style açılır liste / koşullu biçim yazamadığı için bunlar paket XML'ine sonradan eklenir.

export const AP_SAYFA = 'AP Matrisi';
export const SOD_SAYFA = 'S-O-D Tabloları';
export const LISTE_SAYFA = 'Listeler';     // açılır liste kaynağı (gizli sayfa)

// Açılır listedeki kısa Türkçe anlamlar (AIAG-VDA PFMEA; ERP'deki S/O/D pencereleriyle aynı tablolar).
// Dizi sırası 1 → 10.
export const SOD_ETIKET: Record<'S' | 'O' | 'D', string[]> = {
  S: [
    'Fark edilebilir etki yok',
    'Hafif rahatsızlık; süreçte küçük aksama',
    'Orta rahatsızlık; kısmi istasyon içi tamir',
    'Belirgin görünüm/ses kusuru; %100 istasyonda tamir',
    'İkincil fonksiyonda bozulma; kısmi hat dışı tamir',
    'İkincil fonksiyon kaybı; %100 hat dışı tamir',
    'Ana fonksiyonda bozulma; kısmi hurda, ayıklama',
    'Ana fonksiyon kaybı; %100 hurda, sevkiyat durur',
    'Yasal mevzuata aykırılık',
    'Çalışan / son kullanıcı güvenliği riski',
  ],
  O: [
    'Önleyici kontrolle hata ortadan kalkmış',
    'Çok düşük: binde <0,001 (1/1.000.000)',
    'Düşük: binde 0,01 (1/100.000)',
    'Orta: binde 0,1 (1/10.000)',
    'Orta: binde 0,5 (1/2.000)',
    'Orta: binde 2 (1/500)',
    'Yüksek: binde 10 (1/100)',
    'Yüksek: binde 20 (1/50)',
    'Yüksek: binde 50 (1/20)',
    'Çok yüksek: binde ≥100 (≥1/10)',
  ],
  D: [
    'Hata oluşamaz ya da her zaman tespit edilir',
    'Kanıtlı yöntem; nedeni makine yakalar, hata oluşmaz',
    'Kanıtlı sistem; istasyonda otomatik tespit',
    'Kanıtlı sistem; sonraki istasyonda otomatik tespit',
    'Kanıtlı yöntem; yarı otomatik / makine tespiti',
    'Kanıtlı yöntem; insan kontrolü / manuel ölçüm',
    'Kanıtlanmamış yöntem; makine tespiti',
    'Kanıtlanmamış yöntem; insan kontrolü / manuel ölçüm',
    'Rastgele denetim; tespit olası değil',
    'Kontrol yöntemi yok; tespit edilemez',
  ],
};

/** "7 – Ana fonksiyonda bozulma; …" (1–10 dışı ya da boş → ''). Formül baştaki sayıyı okur. */
export function sodEtiket(tur: 'S' | 'O' | 'D', n: unknown): string {
  const v = Number(n);
  return Number.isInteger(v) && v >= 1 && v <= 10 ? `${v} – ${SOD_ETIKET[tur][v - 1]}` : '';
}

/** Gizli "Listeler" sayfası: A = S, B = O, C = D (1. satır = 1 … 10. satır = 10). */
export const listeSatirlari = (): string[][] =>
  Array.from({ length: 10 }, (_, i) => (['S', 'O', 'D'] as const).map(t => sodEtiket(t, i + 1)));

type Ap = 'H' | 'M' | 'L';

/**
 * AP formülü (başında "=" yok). s/o/d: hücre adresi (H18). revize=true → "(M)" biçimi.
 * Hücrede "7 – açıklama" de olabilir düz 7 de: baştaki sayı okunur (VALUE(TRIM(LEFT(…;2)))).
 */
export function apFormulu(s: string, o: string, d: string, revize = false): string {
  const n = (h: string) => `VALUE(TRIM(LEFT(${h},2)))`;
  const ic = `INDEX('${AP_SAYFA}'!$C$2:$L$101,(${n(s)}-1)*10+${n(o)},${n(d)})`;
  return `IF(OR(${s}="",${o}="",${d}=""),"",IFERROR(${revize ? `"("&${ic}&")"` : ic},""))`;
}

/** AP matrisi sayfasının satırları: başlık + 100 satır (S, O, D1…D10). */
export function apMatrisSatirlari(m: Ap[][][]): (string | number)[][] {
  const out: (string | number)[][] = [['S', 'O', 'D=1', 'D=2', 'D=3', 'D=4', 'D=5', 'D=6', 'D=7', 'D=8', 'D=9', 'D=10']];
  for (let s = 1; s <= 10; s++)
    for (let o = 1; o <= 10; o++) out.push([s, o, ...m[s - 1][o - 1]]);
  return out;
}

const xe = (t: string) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface SodApAyar {
  ilk: number;                       // ilk veri satırı (Excel, 1 tabanlı)
  son: number;                       // son veri satırı
  s: string[]; o: string[]; d: string[];   // sütun harfleri (ör. ['H','Y'])
  ap: string[];                      // AP sütunu (değer H/M/L)
  apRevize: string[];                // revize AP sütunu (değer (H)/(M)/(L))
}

const DXF = [['FFFFC7CE', 'FF9C0006'], ['FFFFEB9C', 'FF9C5700'], ['FFC6EFCE', 'FF006100']]; // H, M, L

/**
 * Sayfa ve stil XML'ine açılır liste + AP renklendirmesi ekler (saf dönüşüm, test edilebilir).
 * Renk koşullu biçimdir: S/O/D değişince AP rengi de değişir, eski dolgu kalmaz.
 */
export function sodApXml(sayfa: string, stil: string, a: SodApAyar): { sayfa: string; stil: string } {
  const aralik = (k: string[]) => k.map(c => `${c}${a.ilk}:${c}${a.son}`).join(' ');
  // Liste kaynağı gizli "Listeler" sayfası (A=S, B=O, C=D): "7 – açıklama" satırları.
  // Satır içi liste ("1,2,…") 255 karakterle sınırlı; açıklamalı liste sığmaz.
  const liste = (ad: string, k: string[], sutun: string) =>
    `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1"`
    + ` errorTitle="Geçersiz değer" error="Listeden 1–10 arası bir değer seçin."`
    + ` promptTitle="${xe(ad)}" prompt="${xe(`Listeden seçin. Ayrıntılı kriterler: '${SOD_SAYFA}' sayfası.`)}"`
    + ` sqref="${aralik(k)}"><formula1>${LISTE_SAYFA}!$${sutun}$1:$${sutun}$10</formula1></dataValidation>`;
  const dv = `<dataValidations count="3">${liste('Şiddet (S)', a.s, 'A')}${liste('Oluşma (O)', a.o, 'B')}${liste('Tespit (D)', a.d, 'C')}</dataValidations>`;

  let p = 0;
  const kural = (k: string[], deger: (ap: string) => string) => k.length ? `<conditionalFormatting sqref="${aralik(k)}">`
    + ['H', 'M', 'L'].map((ap, i) => `<cfRule type="cellIs" dxfId="${i}" priority="${++p}" operator="equal"><formula>${xe(`"${deger(ap)}"`)}</formula></cfRule>`).join('')
    + `</conditionalFormatting>` : '';
  const cf = kural(a.ap, ap => ap) + kural(a.apRevize, ap => `(${ap})`);

  // Sıra (OOXML): sheetData, …, mergeCells, phoneticPr, conditionalFormatting, dataValidations, hyperlinks, …
  const ek = cf + dv;
  let yeniSayfa: string;
  if (sayfa.includes('</mergeCells>')) yeniSayfa = sayfa.replace('</mergeCells>', '</mergeCells>' + ek);
  else if (sayfa.includes('</sheetData>')) yeniSayfa = sayfa.replace('</sheetData>', '</sheetData>' + ek);
  else throw new Error('sheetData bulunamadı');

  const dxfs = `<dxfs count="${DXF.length}">` + DXF.map(([bg, yazi]) =>
    `<dxf><font><color rgb="${yazi}"/></font><fill><patternFill patternType="solid"><bgColor rgb="${bg}"/></patternFill></fill></dxf>`).join('') + `</dxfs>`;
  let yeniStil: string;
  if (/<dxfs count="0"\s*\/>/.test(stil)) yeniStil = stil.replace(/<dxfs count="0"\s*\/>/, dxfs);
  else if (!/<dxfs/.test(stil)) yeniStil = stil.replace(/(<tableStyles|<\/styleSheet>)/, dxfs + '$1');
  else throw new Error('styles.xml zaten dxf içeriyor — dxfId kayar');
  return { sayfa: yeniSayfa, stil: yeniStil };
}
