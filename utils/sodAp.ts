// PFMEA Excel'i: S/O/D hücreleri açılır listeden (1–10) seçilir, AP (H/M/L) formülle hesaplanır.
//
// AP, pakete eklenen "AP Matrisi" sayfasındaki 100×10 tablodan okunur: satır = (S-1)*10+O, sütun = D.
// Tablo uygulamanın AP matrisiyle birebir yazılır (kullanıcı matrisi değiştirdiyse o).
// xlsx-js-style açılır liste / koşullu biçim yazamadığı için bunlar paket XML'ine sonradan eklenir.

export const AP_SAYFA = 'AP Matrisi';
export const SOD_SAYFA = 'S-O-D Tabloları';

type Ap = 'H' | 'M' | 'L';

/** AP formülü (başında "=" yok). s/o/d: hücre adresi (H18). revize=true → "(M)" biçimi. */
export function apFormulu(s: string, o: string, d: string, revize = false): string {
  const ic = `INDEX('${AP_SAYFA}'!$C$2:$L$101,(${s}-1)*10+${o},${d})`;
  return `IF(COUNT(${s},${o},${d})<3,"",IFERROR(${revize ? `"("&${ic}&")"` : ic},""))`;
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
  const liste = (ad: string, k: string[]) =>
    `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1"`
    + ` errorTitle="Geçersiz değer" error="1 ile 10 arasında bir değer seçin."`
    + ` promptTitle="${xe(ad)}" prompt="${xe(`1–10 arası seçin. Puan kriterleri: '${SOD_SAYFA}' sayfası.`)}"`
    + ` sqref="${aralik(k)}"><formula1>"1,2,3,4,5,6,7,8,9,10"</formula1></dataValidation>`;
  const dv = `<dataValidations count="3">${liste('Şiddet (S)', a.s)}${liste('Oluşma (O)', a.o)}${liste('Tespit (D)', a.d)}</dataValidations>`;

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
