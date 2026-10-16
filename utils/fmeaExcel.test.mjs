// PFMEA çalışma Excel'i (tablo + listeler + Görevler) XML'i doğru mu; isteğe bağlı örnek dosya üretir.
// Excel'de gerçekten çalıştığı (satır ekle/sil, liste, Görevler) test_fmea_excel.py ile ölçülür.
//
// Çalıştır:  node utils/fmeaExcel.test.mjs [çıktı.xlsx]   (SODAP_LIB: xlsxjs.js + jszip.js klasörü)
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { buildSync } from 'esbuild';

const kod = (d) => buildSync({ entryPoints: [d], bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2020' }).outputFiles[0].text;
const yukle = async (d) => import('data:text/javascript;base64,' + Buffer.from(kod(d)).toString('base64'));
const E = await yukle('utils/fmeaExcel.ts');

const { initialApMatrix } = await yukle('utils/ap-matrix.ts');

// 1) sütun adları benzersiz (Excel tablosu şartı), harf dönüşümü
const adlar = E.SUTUNLAR.map(s => s.ad.toLowerCase());
assert.equal(new Set(adlar).size, adlar.length, 'tekrar eden sütun adı');
assert.equal(E.harf(0), 'A'); assert.equal(E.harf(29), 'AD'); assert.equal(E.harf(30), 'AE');
console.log('✓ 1  30 sütun adı benzersiz; harfler doğru');

// 2) formüller: AP, Görev No, liste yardımcısı
assert.match(E.satirFormulu(14, 20, 18), /INDEX\('AP Matrisi'/);
assert.match(E.satirFormulu(30, 20, 18), /^IF\(AND\(R20="",S20=""\),"",SUMPRODUCT/);
assert.match(E.satirFormulu(32, 20, 18), /COUNTIF\(B\$18:B20,B20\)=1,MAX\(AG\$17:AG19\)\+1/);   // 2. liste: B (Process Step)
assert.equal(E.satirFormulu(9, 20, 18), undefined);
console.log('✓ 2  AP / Görev No / liste formülleri');

// 3) XML: tablo, liste, ipucu, tekrar-gri, AP rengi
const ayar = { baslik: 17, ilk: 18, son: 25 };
const t = E.tabloXml(ayar);
assert(t.includes('ref="A17:AP25"') && t.includes('name="FMEA_Tablo"'));
assert.equal((t.match(/<tableColumn /g) || []).length, 42);
assert.equal((t.match(/<calculatedColumnFormula>/g) || []).length, 2 + 1 + 11);
const { sayfa, stil } = E.fmeaSayfaXml('<worksheet xmlns="x"><sheetData/><mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells></worksheet>',
  '<styleSheet><dxfs count="0"/></styleSheet>', ayar);
assert(sayfa.includes('<formula1>Liste_B</formula1>') && sayfa.includes('sqref="B18:B25"'));
assert(sayfa.includes('<formula1>Listeler!$D$1:$D$4</formula1>'));
assert(sayfa.includes('AND(B18&lt;&gt;&quot;&quot;,B18=B17)'));
assert(sayfa.includes('<tablePart r:id="rIdFmeaTablo"/>') && sayfa.includes('xmlns:r='));
assert.equal((stil.match(/<dxf>/g) || []).length, 4);
console.log('✓ 3  tablo (42 sütun, 14 hesaplı), 11 kademe listesi, durum listesi, ipuçları, renkler');

// 4) örnek dosya
const lib = process.env.SODAP_LIB, cikti = process.argv[2];
if (lib && cikti) {
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, Uint8Array, ArrayBuffer, TextEncoder, TextDecoder, Buffer, Date, Math, JSON, Promise });
  ctx.window = ctx; ctx.self = ctx;
  vm.runInContext(fs.readFileSync(path.join(lib, 'xlsxjs.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(lib, 'jszip.js'), 'utf8'), ctx);
  const { XLSX, JSZip } = ctx;
  const s = (item, step, m4, fstep, eff, sev, mode, cause, pc, o, dc, d, prev = '', det = '', sor = '', durum = '') => {
    const r = Array(30).fill('');
    Object.assign(r, { 0: item, 1: step, 2: m4, 3: item + ' fonksiyonu', 4: fstep, 5: 'Proses karakteristiği', 6: eff, 7: sev, 8: mode, 9: cause, 10: pc,
      11: o, 12: dc, 13: d, 14: initialApMatrix[sev - 1][o - 1][d - 1], 17: prev, 18: det, 19: sor, 21: durum });
    return r;
  };
  const satirlar = [
    s('5NA 881 989', '[10] Giriş kontrol', 'Metot', 'Malzeme uygun', '[E] Uyum sorunu', 7, 'PE köpük malzeme hatası', 'Sertifika yok', 'Tedarikçi onayı', 3, 'Giriş kontrol', 3),
    s('5NA 881 989', '[10] Giriş kontrol', 'Ölçüm', 'Malzeme uygun', '[E] Uyum sorunu', 7, 'PE köpük malzeme hatası', 'En ölçümü yapılmadı', 'Talimat', 4, 'Giriş kontrol', 3, 'Ölçüm talimatı revize', '', 'Ünal Ü.', 'Open'),
    s('5NA 881 989', '[20] Kesim', 'Makine', 'Ölçüde kesim', '[C] Montaj sorunu', 6, 'Boy uzun', 'Bıçak aşınması', 'Bakım planı', 5, 'Proses içi kontrol', 6),
    s('5NA 881 989', '[20] Kesim', 'İnsan', 'Ölçüde kesim', '[C] Montaj sorunu', 6, 'Boy uzun', 'Yanlış ayar', 'Eğitim', 4, 'İlk parça onayı', 5, '', 'İlk parça ölçümü kayıt altına', 'Umut Ç.', 'Completed'),
    s('5NA 881 989', '[30] Paketleme', 'Metot', 'Doğru ambalaj', '[C] Sevkiyat hatası', 5, 'Yanlış etiket', 'Etiket kontrolü yok', 'Talimat', 3, 'Final kontrol', 5),
  ];
  const ws = {}; const merges = [];
  ws['A1'] = { v: 'Antet', t: 's' }; merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 29 } });
  const a = E.fmeaGovdeYaz(XLSX, ws, merges, 14, satirlar, satirlar.map((_, i) => i % 2 === 0));
  assert.deepEqual(a, { baslik: 16, ilk: 17, son: 21 });
  ws['!merges'] = merges;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: a.son - 1, c: 41 } });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, E.FMEA_SAYFA);
  E.ekSayfalar(XLSX, wb, satirlar, initialApMatrix, [['ŞİDDET (S)'], ['S', 'Etki']]);
  const zip = await JSZip.loadAsync(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  await E.fmeaPaketle(zip, a);
  fs.writeFileSync(cikti, await zip.generateAsync({ type: 'nodebuffer' }));
  fs.writeFileSync(cikti + '.matris.json', JSON.stringify(initialApMatrix));
  console.log('✓ 4  örnek dosya → ' + cikti);
}
console.log('\nTüm senaryolar geçti.');
