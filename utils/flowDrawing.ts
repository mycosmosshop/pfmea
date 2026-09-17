// Akış şeması Excel çıktısı: hücre içine GERÇEK şekil (DrawingML) + bağlantı oku.
//
// xlsx-js-style yalnız hücre yazar, şekil çizemez; "●" ile idare ediliyordu.
// Burada üretilen drawing XML'i, yazılmış .xlsx paketine (zip) sonradan
// eklenir: xl/drawings/drawing1.xml + sayfa ilişkisi + içerik türü.
// Saf fonksiyonlar — tarayıcıya bağlı değil, Node'da test edilir.

// Registry sembol anahtarı -> OOXML preset geometri (ST_ShapeType)
export const SEKIL_GEOM: Record<string, string> = {
  process: 'flowChartProcess',
  alternate_process: 'flowChartAlternateProcess',
  decision: 'flowChartDecision',
  data: 'flowChartInputOutput',
  predefined_process: 'flowChartPredefinedProcess',
  internal_storage: 'flowChartInternalStorage',
  document: 'flowChartDocument',
  multi_document: 'flowChartMultidocument',
  terminator: 'flowChartTerminator',
  preparation: 'flowChartPreparation',
  manual_input: 'flowChartManualInput',
  manual_operation: 'flowChartManualOperation',
  connector_on_page: 'flowChartConnector',
  connector_off_page: 'flowChartOffpageConnector',
  card: 'flowChartPunchedCard',
  punched_tape: 'flowChartPunchedTape',
  summing_junction: 'flowChartSummingJunction',
  or_junction: 'flowChartOr',
  collate: 'flowChartCollate',
  sort: 'flowChartSort',
  extract: 'flowChartExtract',
  merge: 'flowChartMerge',
  stored_data: 'flowChartOnlineStorage',
  delay: 'flowChartDelay',
  sequential_access_storage: 'flowChartMagneticTape',
  magnetic_disk: 'flowChartMagneticDisk',
  direct_access_storage: 'flowChartMagneticDrum',
};

export interface Sekil { col: number; row: number; key: string }
export interface Ok { fromCol: number; fromRow: number; toCol: number; toRow: number }

const EMU_PX = 9525;      // 1 px = 9525 EMU (96 dpi)
const EMU_PT = 12700;     // 1 pt = 12700 EMU
// Excel'in "wch" karakter genişliği -> piksel (Calibri 11 için SheetJS yaklaşımı)
export const colPx = (wch: number) => Math.round(wch * 7 + 5);

// Şekil hücrenin %12-%88'i arasında; ok bir hücrenin altından diğerinin üstüne
const PAY = 0.12;

/** Sayfa drawing XML'i. colWch: kolon genişlikleri; rowPt(r): satır yüksekliği (pt). */
export function flowDrawingXml(sekiller: Sekil[], oklar: Ok[], colWch: number[], rowPt: (r: number) => number): string {
  const cw = (c: number) => colPx(colWch[c] ?? 8) * EMU_PX;
  const rh = (r: number) => rowPt(r) * EMU_PT;
  const anchor = (c0: number, x0: number, r0: number, y0: number, c1: number, x1: number, r1: number, y1: number) =>
    `<xdr:from><xdr:col>${c0}</xdr:col><xdr:colOff>${Math.round(x0)}</xdr:colOff><xdr:row>${r0}</xdr:row><xdr:rowOff>${Math.round(y0)}</xdr:rowOff></xdr:from>` +
    `<xdr:to><xdr:col>${c1}</xdr:col><xdr:colOff>${Math.round(x1)}</xdr:colOff><xdr:row>${r1}</xdr:row><xdr:rowOff>${Math.round(y1)}</xdr:rowOff></xdr:to>`;
  let id = 2;
  const parca: string[] = [];

  sekiller.forEach(s => {
    const geom = SEKIL_GEOM[s.key];
    if (!geom) return;                                   // bilinmeyen anahtar: şekil yok, hücre boş kalır
    const w = cw(s.col), h = rh(s.row);
    parca.push(
      `<xdr:twoCellAnchor editAs="oneCell">${anchor(s.col, w * PAY, s.row, h * PAY, s.col, w * (1 - PAY), s.row, h * (1 - PAY))}` +
      `<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="${id}" name="${geom} ${id}"/><xdr:cNvSpPr/></xdr:nvSpPr>` +
      `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="${geom}"><a:avLst/></a:prstGeom>` +
      `<a:solidFill><a:srgbClr val="A0C0E0"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln></xdr:spPr>` +
      `</xdr:sp><xdr:clientData/></xdr:twoCellAnchor>`);
    id++;
  });

  oklar.forEach(o => {
    // Kaynak şeklin alt orta noktası -> hedef şeklin üst orta noktası.
    // Anchor sol-üst -> sağ-alt gider; hedef solda kalırsa çizgi yatay çevrilir.
    const xF = cw(o.fromCol) / 2, xT = cw(o.toCol) / 2;
    const yF = rh(o.fromRow) * (1 - PAY), yT = rh(o.toRow) * PAY;
    const solda = o.toCol < o.fromCol;
    const c0 = solda ? o.toCol : o.fromCol, c1 = solda ? o.fromCol : o.toCol;
    const x0 = solda ? xT : xF, x1 = solda ? xF : xT;
    parca.push(
      `<xdr:twoCellAnchor>${anchor(c0, x0, o.fromRow, yF, c1, x1, o.toRow, yT)}` +
      `<xdr:cxnSp macro=""><xdr:nvCxnSpPr><xdr:cNvPr id="${id}" name="Arrow ${id}"/><xdr:cNvCxnSpPr/></xdr:nvCxnSpPr>` +
      `<xdr:spPr><a:xfrm${solda ? ' flipH="1"' : ''}><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="straightConnector1"><a:avLst/></a:prstGeom>` +
      `<a:ln w="12700"><a:solidFill><a:srgbClr val="2563EB"/></a:solidFill><a:tailEnd type="triangle"/></a:ln></xdr:spPr>` +
      `</xdr:cxnSp><xdr:clientData/></xdr:twoCellAnchor>`);
    id++;
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    parca.join('') + `</xdr:wsDr>`;
}

// JSZip'in kullandığımız kadarı (tarayıcıda global JSZip, testte npm paketi)
export interface ZipGibi {
  file(yol: string): { async(t: 'string'): Promise<string> } | null;
  file(yol: string, icerik: string): unknown;
}

const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const DRW_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing';
const DRW_CT = 'application/vnd.openxmlformats-officedocument.drawing+xml';

/** Drawing'i yazılmış pakete ekler (ilk sayfa). İkinci çağrı bir şey yapmaz. */
export async function drawingEkle(zip: ZipGibi, drawingXml: string, sayfa = 'sheet1'): Promise<boolean> {
  const sayfaYolu = `xl/worksheets/${sayfa}.xml`;
  const sayfaDosya = zip.file(sayfaYolu);
  if (!sayfaDosya) throw new Error(`${sayfaYolu} yok`);
  let sx = await sayfaDosya.async('string');
  if (sx.includes('<drawing ')) return false;

  const rid = 'rIdDrw1';
  zip.file(`xl/drawings/${sayfa}_drawing.xml`, drawingXml);

  // Sayfa ilişkileri: varsa ekle, yoksa oluştur
  const relYolu = `xl/worksheets/_rels/${sayfa}.xml.rels`;
  const relDosya = zip.file(relYolu);
  const rel = `<Relationship Id="${rid}" Type="${DRW_REL}" Target="../drawings/${sayfa}_drawing.xml"/>`;
  if (relDosya) {
    const rx = await relDosya.async('string');
    zip.file(relYolu, rx.replace('</Relationships>', rel + '</Relationships>'));
  } else {
    zip.file(relYolu, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rel}</Relationships>`);
  }

  // <drawing> öğesi pageMargins/pageSetup'tan SONRA, tableParts/extLst'ten ÖNCE gelmeli;
  // xlsx-js-style bunları yazmadığı için </worksheet> hemen öncesi doğru yer.
  if (!sx.includes('xmlns:r=')) sx = sx.replace('<worksheet ', `<worksheet xmlns:r="${R_NS}" `);
  sx = sx.replace('</worksheet>', `<drawing r:id="${rid}"/></worksheet>`);
  zip.file(sayfaYolu, sx);

  const ctYolu = '[Content_Types].xml';
  const ct = await zip.file(ctYolu)!.async('string');
  zip.file(ctYolu, ct.replace('</Types>',
    `<Override PartName="/xl/drawings/${sayfa}_drawing.xml" ContentType="${DRW_CT}"/></Types>`));
  return true;
}
