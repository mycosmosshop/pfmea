// Var olan PFMEA'nin uzerine ikinci bir proje acilmamali.
// Kirilan hâl: eslesme yalniz projectId ve "<kod> PFMEA" adina bakiyordu.
// Proje musteri parca numarasiyla adlandirilinca ("83.72010-6191 INDEX A
// PFMEA") stok koduyla yapilan uretim onu goremiyor, ayni urune ikinci kayit
// aciliyordu — ekibin uzerinde calistigi FMEA ikizlenir.
//   calistir:  node test_mevcut_proje.mjs
import assert from 'assert';
import { buildSync } from 'esbuild';

const c = buildSync({ entryPoints: ['utils/erpPfmea.ts'], bundle: true, write: false,
  format: 'esm', platform: 'neutral', target: 'es2020' }).outputFiles[0].text;
const K = await import('data:text/javascript;base64,' + Buffer.from(c).toString('base64'));

const p = (id, project, productName, name) =>
  ({ id, name, projectData: { fmea: { projectId: id, project, productName } } });

// Panodaki gercek kayitlarin bicimi
const pano = [
  p('proj_216_0_367', '216.0.367 PFMEA', '83.72010-6984 INDEX - (216.0.367)', '216.0.367 PFMEA'),
  p('proj_700_0_570_A', '83.72010-6191 INDEX A PFMEA',
    '83.72010-6191 INDEX A - SES VE ISI YALITIM SÜNGERİ (700.0.570-A)', '83.72010-6191 INDEX A PFMEA'),
  p('proj_1790076688384', '213.0.116 PFMEA', 'A4257270006 (213.0.116)', '213.0.116 PFMEA'),
];

// 1) Kimlikten
assert.ok(K.mevcutProje(pano, '216.0.367'), 'projectId eşleşmesi');
// 2) Musteri parca numarasiyla adlandirilmis proje, STOK KODUYLA bulunmali
assert.ok(K.mevcutProje(pano, '700.0.570-A'), 'ürün adındaki parantezli stok kodu');
// 3) Musteri parca numarasiyla da bulunmali
assert.ok(K.mevcutProje(pano, '83.72010-6191'), 'müşteri parça numarası');
// 4) Kimligi zaman damgali olan kayit da bulunmali
assert.ok(K.mevcutProje(pano, '213.0.116'), 'zaman damgalı id, ad eşleşmesi');
// 5) Olmayan urun YENI uretilebilmeli
assert.strictEqual(K.mevcutProje(pano, '999.9.999'), null, 'olmayan ürün');
// 6) Cok kisa kod yanlis eslesme yapmamali
assert.strictEqual(K.mevcutProje(pano, '21'), null, 'kısa kod yanlış eşleşmemeli');

console.log('OK mevcut PFMEA 4 farklı adlandırmada da bulunuyor; olmayan ürün üretilebiliyor');
