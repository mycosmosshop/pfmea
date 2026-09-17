// Akış şeması Excel'i: hücrede gerçek şekil + ok (drawing) doğru üretiliyor mu?
//
// Kırılan hâl: "Export to Excel" sembol yerine "●" yazıyordu; web görünümündeki
// dikdörtgen/karar/ok yoktu. xlsx-js-style şekil çizemez; drawing XML'i pakete
// sonradan ekleniyor. Burada (1) XML'in kendisi, (2) pakete ekleme ölçülür;
// dosyanın Excel'de gerçekten açılıp şekil saydığı ayrı Python testinde
// (test_flow_excel_sekil.py) Excel COM ile ölçülür.
//
// Çalıştır:  node utils/flowDrawing.test.mjs
import { strict as assert } from 'node:assert';
import { flowDrawingXml, drawingEkle, SEKIL_GEOM, colPx } from './flowDrawing.ts';

// 1) Registry'deki 27 anahtarın hepsi geçerli bir preset geometriye bağlı
const registryKeys = ['process', 'alternate_process', 'decision', 'data', 'predefined_process',
  'internal_storage', 'document', 'multi_document', 'terminator', 'preparation', 'manual_input',
  'manual_operation', 'connector_on_page', 'connector_off_page', 'card', 'punched_tape',
  'summing_junction', 'or_junction', 'collate', 'sort', 'extract', 'merge', 'stored_data', 'delay',
  'sequential_access_storage', 'magnetic_disk', 'direct_access_storage'];
for (const k of registryKeys) assert.match(SEKIL_GEOM[k] || '', /^flowChart[A-Z]/, `${k} geometrisi yok`);
assert.equal(registryKeys.length, 27);

// 2) XML: 3 şekil + 2 ok, anchor hücre içinde
const cols = [10, 8, 8, 8, 16, 18, 42];
const rowPt = r => (r >= 10 ? 34 : 15);
const xml = flowDrawingXml(
  [{ col: 1, row: 10, key: 'process' }, { col: 2, row: 11, key: 'decision' }, { col: 1, row: 12, key: 'data' }],
  [{ fromCol: 1, fromRow: 10, toCol: 2, toRow: 11 }, { fromCol: 2, fromRow: 11, toCol: 1, toRow: 12 }],
  cols, rowPt);
assert.ok(xml.startsWith('<?xml'), 'XML bildirimi');
assert.equal((xml.match(/<xdr:sp /g) || []).length, 3, '3 şekil');
assert.equal((xml.match(/<xdr:cxnSp /g) || []).length, 2, '2 ok');
assert.ok(xml.includes('prst="flowChartProcess"') && xml.includes('prst="flowChartDecision"') && xml.includes('prst="flowChartInputOutput"'));
assert.ok(xml.includes('<a:tailEnd type="triangle"/>'), 'ok ucu');
// cNvPr id benzersiz
const ids = [...xml.matchAll(/cNvPr id="(\d+)"/g)].map(m => +m[1]);
assert.equal(new Set(ids).size, ids.length, 'id tekrar etti');
// şekil anchor'u kendi hücresinde: from ve to aynı col/row, ofset %12/%88
const wEmu = colPx(8) * 9525, hEmu = 34 * 12700;
assert.ok(xml.includes(`<xdr:col>1</xdr:col><xdr:colOff>${Math.round(wEmu * 0.12)}</xdr:colOff><xdr:row>10</xdr:row><xdr:rowOff>${Math.round(hEmu * 0.12)}</xdr:rowOff>`), 'from ofseti');
assert.ok(xml.includes(`<xdr:col>1</xdr:col><xdr:colOff>${Math.round(wEmu * 0.88)}</xdr:colOff><xdr:row>10</xdr:row><xdr:rowOff>${Math.round(hEmu * 0.88)}</xdr:rowOff>`), 'to ofseti');
// sola giden ok yatay çevrilir, sağa giden çevrilmez
assert.equal((xml.match(/flipH="1"/g) || []).length, 1, 'yalnız sola giden ok flipH');
// bilinmeyen anahtar şekil üretmez, ok yine üretilir
const bilinmez = flowDrawingXml([{ col: 1, row: 10, key: 'yok' }], [], cols, rowPt);
assert.equal((bilinmez.match(/<xdr:sp /g) || []).length, 0);

// 3) Pakete ekleme: sahte zip (Map) ile rels yokken ve varken
function sahteZip(dosyalar) {
  const m = new Map(Object.entries(dosyalar));
  return {
    file(yol, icerik) {
      if (icerik !== undefined) { m.set(yol, icerik); return; }
      return m.has(yol) ? { async: async () => m.get(yol) } : null;
    },
    get: yol => m.get(yol),
  };
}
const sheet = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/><pageMargins left="0.7"/></worksheet>';
const ct = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>';
const z1 = sahteZip({ 'xl/worksheets/sheet1.xml': sheet, '[Content_Types].xml': ct });
assert.equal(await drawingEkle(z1, xml), true);
assert.ok(z1.get('xl/drawings/sheet1_drawing.xml') === xml, 'drawing parçası');
assert.ok(z1.get('xl/worksheets/_rels/sheet1.xml.rels').includes('Target="../drawings/sheet1_drawing.xml"'), 'rels oluşturuldu');
const s1 = z1.get('xl/worksheets/sheet1.xml');
assert.ok(s1.includes('xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'), 'r namespace eklendi');
assert.ok(/<pageMargins[^>]*\/><drawing r:id="rIdDrw1"\/><\/worksheet>$/.test(s1), 'drawing pageMargins SONRASI ve sonda');
assert.ok(z1.get('[Content_Types].xml').includes('PartName="/xl/drawings/sheet1_drawing.xml"'), 'içerik türü');
assert.equal(await drawingEkle(z1, xml), false, 'ikinci çağrı bir şey yapmaz');
assert.equal((z1.get('[Content_Types].xml').match(/sheet1_drawing/g) || []).length, 1, 'içerik türü tekrar etmedi');

// rels zaten varsa (örn. köprü) ekleniyor, ezilmiyor
const z2 = sahteZip({
  'xl/worksheets/sheet1.xml': sheet, '[Content_Types].xml': ct,
  'xl/worksheets/_rels/sheet1.xml.rels': '<Relationships><Relationship Id="rId1" Type="x" Target="y"/></Relationships>',
});
await drawingEkle(z2, xml);
const r2 = z2.get('xl/worksheets/_rels/sheet1.xml.rels');
assert.ok(r2.includes('Id="rId1"') && r2.includes('Id="rIdDrw1"'), 'mevcut ilişki korundu');

console.log('flowDrawing: tüm kontroller geçti');
