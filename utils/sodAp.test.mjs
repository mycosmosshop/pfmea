// PFMEA Excel'i: S/O/D açılır listesi + AP formülü + koşullu renk XML'i doğru üretiliyor mu?
// Ayrıca Excel'de gerçekten çalıştığı (liste var, AP formülü matrisle aynı sonucu veriyor)
// test_sodap_excel.py ile Excel COM üzerinden ölçülür; o test bu dosyanın ürettiği xlsx'i kullanır.
//
// Çalıştır:  node utils/sodAp.test.mjs [çıktı.xlsx]   (xlsx-js-style + jszip yolu: SODAP_LIB klasörü)
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { buildSync } from 'esbuild';

const kod = (dosya) => buildSync({ entryPoints: [dosya], bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2020' }).outputFiles[0].text;
const yukle = async (dosya) => import('data:text/javascript;base64,' + Buffer.from(kod(dosya)).toString('base64'));
const { apFormulu, apMatrisSatirlari, sodApXml, AP_SAYFA } = await yukle('utils/sodAp.ts');
const { initialApMatrix } = await yukle('utils/ap-matrix.ts');

// 1) Formül: üç değer yoksa boş, revize parantezli
assert.equal(apFormulu('H18', 'L18', 'N18'),
  `IF(COUNT(H18,L18,N18)<3,"",IFERROR(INDEX('AP Matrisi'!$C$2:$L$101,(H18-1)*10+L18,N18),""))`);
assert.match(apFormulu('Y5', 'Z5', 'AA5', true), /"\("&INDEX\(.*\)&"\)"/);
console.log('✓ 1  AP formülü (normal + revize parantezli)');

// 2) Matris sayfası: 100 satır, satır (S-1)*10+O, sütun D
const m = apMatrisSatirlari(initialApMatrix);
assert.equal(m.length, 101);
for (let s = 1; s <= 10; s++) for (let o = 1; o <= 10; o++) for (let d = 1; d <= 10; d++)
  assert.equal(m[(s - 1) * 10 + o][1 + d], initialApMatrix[s - 1][o - 1][d - 1], `S${s} O${o} D${d}`);
console.log('✓ 2  AP matrisi sayfası 1000 hücrede uygulamadaki matrisle aynı');

// 3) XML: liste ve koşullu biçim mergeCells'ten sonra, dxf 3 adet
const ayar = { ilk: 18, son: 63, s: ['H', 'Y'], o: ['L', 'Z'], d: ['N', 'AA'], ap: ['O'], apRevize: ['AC'] };
const sayfa0 = '<worksheet><sheetData><row r="1"/></sheetData><mergeCells count="1"><mergeCell ref="A1:A2"/></mergeCells><ignoredErrors/></worksheet>';
const stil0 = '<styleSheet><cellXfs/><dxfs count="0"/><tableStyles count="0"/></styleSheet>';
const { sayfa, stil } = sodApXml(sayfa0, stil0, ayar);
assert(sayfa.indexOf('</mergeCells><conditionalFormatting') > 0, 'CF mergeCells sonrası değil');
assert(sayfa.indexOf('</dataValidations><ignoredErrors') > 0, 'dataValidations ignoredErrors önünde değil');
assert(sayfa.includes('sqref="H18:H63 Y18:Y63"') && sayfa.includes('sqref="N18:N63 AA18:AA63"'));
assert.equal((sayfa.match(/<cfRule /g) || []).length, 6);
assert(sayfa.includes('<formula>&quot;(H)&quot;</formula>'));
assert.equal((stil.match(/<dxf>/g) || []).length, 3);
assert.throws(() => sodApXml(sayfa0, stil.replace('', ''), ayar), /dxf/);   // ikinci kez eklenmez
console.log('✓ 3  açılır liste (S/O/D) + 6 renk kuralı + 3 dxf doğru yerde');

// 4) Gerçek paket: xlsx-js-style ile yazılır, XML eklenir → Excel testine dosya
const lib = process.env.SODAP_LIB;
const cikti = process.argv[2];
if (lib && cikti) {
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, Uint8Array, ArrayBuffer, TextEncoder, TextDecoder, Buffer, Date, Math, JSON, Promise });
  ctx.window = ctx; ctx.self = ctx;
  vm.runInContext(fs.readFileSync(path.join(lib, 'xlsxjs.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(lib, 'jszip.js'), 'utf8'), ctx);
  const { XLSX, JSZip } = ctx;
  const ws = {};
  const yaz = (r, c, h) => { ws[XLSX.utils.encode_cell({ r, c })] = h; };
  // 18..27: farklı S/O/D; 28: boş O (AP boş olmalı); 29: revize değerli
  const ornek = [[10, 10, 10], [9, 2, 1], [8, 6, 5], [7, 4, 7], [6, 8, 2], [5, 3, 9], [4, 7, 4], [3, 9, 6], [2, 8, 8], [1, 1, 1]];
  ornek.forEach(([s, o, d], i) => {
    const r = 17 + i, R = r + 1;
    yaz(r, 7, { v: s, t: 'n' }); yaz(r, 11, { v: o, t: 'n' }); yaz(r, 13, { v: d, t: 'n' });
    yaz(r, 14, { f: apFormulu(`H${R}`, `L${R}`, `N${R}`), v: initialApMatrix[s - 1][o - 1][d - 1], t: 's' });
  });
  yaz(27, 7, { v: 7, t: 'n' }); yaz(27, 13, { v: 3, t: 'n' }); yaz(27, 14, { f: apFormulu('H28', 'L28', 'N28'), v: '', t: 's' });
  yaz(28, 24, { v: 8, t: 'n' }); yaz(28, 25, { v: 2, t: 'n' }); yaz(28, 26, { v: 2, t: 'n' });
  yaz(28, 28, { f: apFormulu('Y29', 'Z29', 'AA29', true), v: '(' + initialApMatrix[7][1][1] + ')', t: 's' });
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }];
  ws['!ref'] = 'A1:AD29';
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'FMEA');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(m), AP_SAYFA);
  const zip = await JSZip.loadAsync(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  const x = sodApXml(await zip.file('xl/worksheets/sheet1.xml').async('string'), await zip.file('xl/styles.xml').async('string'),
    { ...ayar, son: 29 });
  zip.file('xl/worksheets/sheet1.xml', x.sayfa); zip.file('xl/styles.xml', x.stil);
  fs.writeFileSync(cikti, await zip.generateAsync({ type: 'nodebuffer' }));
  fs.writeFileSync(cikti + '.matris.json', JSON.stringify(initialApMatrix));
  console.log('✓ 4  paket yazıldı → ' + cikti);
}
console.log('\nTüm senaryolar geçti.');
