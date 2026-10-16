// PFMEA Excel'i: S/O/D açıklamalı etiket, AP formülü ve AP matrisi sayfası doğru mu?
// Excel'deki davranış (liste, AP, renk, tablo) test_fmea_excel.py ile Excel COM üzerinden ölçülür.
//
// Çalıştır:  node utils/sodAp.test.mjs
import { strict as assert } from 'node:assert';
import { buildSync } from 'esbuild';

const kod = (dosya) => buildSync({ entryPoints: [dosya], bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2020' }).outputFiles[0].text;
const yukle = async (dosya) => import('data:text/javascript;base64,' + Buffer.from(kod(dosya)).toString('base64'));
const { apFormulu, apMatrisSatirlari, sodEtiket, listeSatirlari } = await yukle('utils/sodAp.ts');
const { initialApMatrix } = await yukle('utils/ap-matrix.ts');

// 1) Formül: üç değer yoksa boş, baştaki sayı okunur ("7 – …" ya da 7), revize parantezli
assert.equal(apFormulu('H18', 'L18', 'N18'),
  `IF(OR(H18="",L18="",N18=""),"",IFERROR(INDEX('AP Matrisi'!$C$2:$L$101,(VALUE(TRIM(LEFT(H18,2)))-1)*10+VALUE(TRIM(LEFT(L18,2))),VALUE(TRIM(LEFT(N18,2)))),""))`);
assert.equal(sodEtiket('S', 10), '10 – Çalışan / son kullanıcı güvenliği riski');
assert.equal(sodEtiket('O', 1), '1 – Önleyici kontrolle hata ortadan kalkmış');
assert.equal(sodEtiket('D', 0), ''); assert.equal(sodEtiket('S', undefined), '');
const L = listeSatirlari();
assert.equal(L.length, 10); L.forEach((r, i) => r.forEach(e => assert(e.startsWith(`${i + 1} – `), e)));
assert.match(apFormulu('Y5', 'Z5', 'AA5', true), /"\("&INDEX\(.*\)&"\)"/);
console.log('✓ 1  AP formülü (normal + revize parantezli)');

// 2) Matris sayfası: 100 satır, satır (S-1)*10+O, sütun D
const m = apMatrisSatirlari(initialApMatrix);
assert.equal(m.length, 101);
for (let s = 1; s <= 10; s++) for (let o = 1; o <= 10; o++) for (let d = 1; d <= 10; d++)
  assert.equal(m[(s - 1) * 10 + o][1 + d], initialApMatrix[s - 1][o - 1][d - 1], `S${s} O${o} D${d}`);
console.log('✓ 2  AP matrisi sayfası 1000 hücrede uygulamadaki matrisle aynı');

console.log('\nTüm senaryolar geçti.');
