// ERP'den PFMEA üretimi: S/O/D kuralları, AP tablosu, girdi hammaddesi ayrımı
// ve iskelet yapısı. Kod utils/erpPfmea.ts'ten ALINIR (kopya değil).
//   çalıştır:  node test_erp_pfmea.mjs
import assert from 'assert';
import fs from 'fs';

// TS -> JS donusumu icin depoda hazir olan esbuild kullanilir (elle tip
// siyirma kirilgandi). Yalniz SAF fonksiyonlar test edilir; ag erisimi olan
// erpdenUret/erpUrunListesi disarida birakilmaz — modul tumuyle yuklenir,
// fetch cagrisi yapilmadigi surece sorun cikarmaz.
import { buildSync } from 'esbuild';

const cikti = buildSync({
  entryPoints: ['utils/erpPfmea.ts'],
  bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2020',
}).outputFiles[0].text;

const K = await import('data:text/javascript;base64,' + Buffer.from(cikti).toString('base64'));

// ── AP: resmi AIAG-VDA değerleri ──
[[7,4,5,'M'],[7,3,4,'L'],[7,6,5,'H'],[1,1,1,'L'],[10,10,10,'H'],[10,1,1,'L']]
  .forEach(([S,O,D,b]) => assert.strictEqual(K.apHesapla(S,O,D), b, `AP S${S}/O${O}/D${D}`));
assert.strictEqual(K.apHesapla(0,0,0), 'L', 'sınır dışı 1e kırpılmalı');

// ── Girdi hammaddesi: kodun ORTA parçası ──
assert.strictEqual(K.girdiMalzemeMi('909.4.018'), true);
assert.strictEqual(K.girdiMalzemeMi('952.10.004'), true);
assert.strictEqual(K.girdiMalzemeMi('205.0.214-C'), false, '.0. mamul — girdi değil');
assert.strictEqual(K.girdiMalzemeMi(null), false);

// ── Emniyet: YALNIZ şiddeti yükseltir ──
assert.strictEqual(K.emniyetMi({ olculecek: 'Yanma hızı (FMVSS 302)' }), true);
assert.strictEqual(K.emniyetMi({ olculecek: 'Kesim ölçüsü' }), false);
assert.strictEqual(K.siddet({ olculecek: 'Yanma hızı' }, false), 9);
assert.strictEqual(K.siddet({ ozel_kar: 'X' }, false), 8);
assert.strictEqual(K.siddet({ son_kontrol: true }, false), 7);
assert.strictEqual(K.siddet({}, false), 5);
assert.strictEqual(K.olasilik({ olculecek: 'Yanma hızı', proses_kontrol: 'SPC' }),
                   K.olasilik({ olculecek: 'Kesim', proses_kontrol: 'SPC' }), 'emniyet O’yu değiştirmemeli');
assert.strictEqual(K.tespit({ olculecek: 'Yanma hızı', yontem: 'Kumpas' }),
                   K.tespit({ olculecek: 'Kesim', yontem: 'Kumpas' }), 'emniyet D’yi değiştirmemeli');

// ── O ve D kuralları ──
assert.strictEqual(K.olasilik({ proses_kontrol: 'SPC' }), 3);
assert.strictEqual(K.olasilik({}), 5);
assert.strictEqual(K.tespit({ yontem: '%100 otomatik kamera' }), 2);
assert.strictEqual(K.tespit({ yontem: 'Kumpas' }), 4);
assert.strictEqual(K.tespit({ yontem: 'Gözle' }), 7);
assert.strictEqual(K.tespit({}), 9, 'yöntem tanımsızsa tespit güvencesi yok');
assert.strictEqual(K.tespit({ yontem: 'Kumpas', ornekleme_sikligi: 'Her parça' }), 3);
assert.strictEqual(K.tespit({ yontem: 'Kumpas', ornekleme_sikligi: 'Vardiyada 1' }), 5);

// ── Mevcut kontroller kontrol planından ──
assert.strictEqual(K.onlemeKontrol({ proses_kontrol: 'Parametre takibi' }), 'Parametre takibi');
assert.ok(K.onlemeKontrol({}).includes('FR17'));
assert.strictEqual(K.tespitKontrol({ yontem: 'Kumpas', ornekleme_buyuklugu: 5, ornekleme_sikligi: 'Her lot' }),
  'Kumpas · 5 adet · Her lot');
assert.ok(K.aksiyonlar('L', { olculecek: 'Yanma hızı' }).join(' ').includes('sertifika'),
  'emniyette AP düşük olsa da süreklilik aksiyonu');
assert.ok(K.aksiyonlar('H', {}).join(' ').includes('Poka-yoke'));

// ── İskelet ──
const fd = K.iskeletUret(
  { kod: '205.0.214-C', ad: 'SES VE ISI YALITIM SÜNGERİ' },
  [{ tuketim_kodu: '909.4.018', tuketim_adi: 'BASOTECT' },
   { tuketim_kodu: '205.0.300', tuketim_adi: 'YARI MAMUL' }],          // elenmeli
  [{ op_no: 2, makine_adi: 'PAKETLEME' }, { op_no: 1, makine_adi: 'SU JETİ' }],
  [{ op_no: 1, olculecek: 'Kesim ölçüsü', hedef_nicel: 195, hedef_nitel: 'mm', yontem: 'Kumpas',
     ornekleme_buyuklugu: 5, ornekleme_sikligi: 'Her lot', proses_kontrol: 'Proses talimatı', ozel_kar: 'X' },
   { op_no: 2, olculecek: 'Etiket', hedef_nitel: 'Uygun', yontem: 'Gözle' }],
  { '909.4.018': [{ olculecek: 'Yoğunluk', hedef_nicel: 9, hedef_nitel: 'kg/m³', yontem: 'Terazi' }] },
  'kontrol planı (Plan 1 Rev.2)');

assert.strictEqual(Object.keys(fd.processSteps).length, 3, '1 girdi + 2 operasyon (yarı mamul elenir)');
assert.ok(!JSON.stringify(fd.processSteps).includes('205.0.300'), 'mamul için girdi adımı açılmamalı');
const adimlar = Object.values(fd.processSteps);
assert.strictEqual(adimlar[0].operationNumber, '0');
assert.deepStrictEqual(adimlar.slice(1).map(x => x.operationNumber), ['1', '2'], 'op no sırasında');
assert.strictEqual(Object.keys(fd.processStepFunctions).length, 3);

const f1 = Object.values(fd.processStepFunctions).find(f => f.productCharacteristic === 'Kesim ölçüsü');
assert.strictEqual(f1.productSpecificationTolerance, '195 mm');
assert.strictEqual(f1.classificationSpecialCharacteristic, true);
const m1 = fd.failureModes[f1.failureModeIds[0]];
assert.strictEqual(fd.failureEffects[m1.effectIds[0]].severity, 8);
assert.strictEqual(m1.causeIds.length, 3, 'üretim adımında 3 neden');
const c1 = fd.failureCauses[m1.causeIds[0]];
assert.strictEqual(c1.occurrence, 3);
assert.strictEqual(c1.detection, 5);
assert.strictEqual(c1.actionPriority, K.apHesapla(8, 3, 5));
assert.ok(c1.remarks.includes('OTOMATİK ÖNERİ') && c1.remarks.includes('Plan 1'),
  'kaydın otomatik olduğu ve kaynağı remarks’ta yazmalı');
assert.ok(c1.actions.length >= 1);

// Girdi adımı: kendi malzemesinin karakteristiği + tedarikçi odaklı nedenler
const gAdim = Object.values(fd.processSteps).find(x => x.name.includes('909.4.018'));
assert.deepStrictEqual(gAdim.functionIds.map(i => fd.processStepFunctions[i].productCharacteristic), ['Yoğunluk']);
const gm = fd.failureModes[fd.processStepFunctions[gAdim.functionIds[0]].failureModeIds[0]];
assert.strictEqual(gm.causeIds.length, 2);
assert.ok(fd.failureCauses[gm.causeIds[0]].description.includes('Tedarikçi'));

console.log('OK ERP’den PFMEA: AP tablosu, S/O/D kuralları (emniyet yalnız S), girdi hammaddesi ayrımı,');
console.log('   mevcut kontroller, aksiyonlar ve iskelet zinciri doğru.');
