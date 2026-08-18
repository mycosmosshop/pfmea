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


// ── Operasyon kartı ERP'de YOKSA: adımlar kontrol planından kurulmalı ──
// (203.0.414'te operasyon kartı hiç aktarılmamıştı; PFMEA yalnız girdi
//  adımlarıyla çıkıyor, proses tarafı komple boş kalıyordu.)
const planSatir = (op, ad, ek = {}) => ({ op_no: op, olculecek: ad, yontem: 'Kumpas', ...ek });
const fdOpsuz = K.iskeletUret(
  { kod: 'X', ad: 'X ÜRÜN' }, [], [],                       // rota BOŞ
  [planSatir(1, 'KALINLIK'), planSatir(2, 'PLAKA BOYU'), planSatir(3, 'EN')],
  {}, 'kontrol planı');
const opsuzAdim = Object.values(fdOpsuz.processSteps);
assert.strictEqual(opsuzAdim.length, 3, 'operasyon kartı yokken adımlar plandan kurulmalı');
assert.deepStrictEqual(opsuzAdim.map(x => x.operationNumber), ['1', '2', '3']);
assert.strictEqual(Object.keys(fdOpsuz.processStepFunctions).length, 3,
  'her plan satırı bir karakteristik olmalı');

// ── Aynı op numarasında birden fazla makine: TEK adım ──
// (203.0.414 op 1'de LMM LAMINASYON + KP10 PRES var; adım başına kopyalanırsa
//  aynı 7 karakteristik iki kez yazılırdı.)
const fdCift = K.iskeletUret(
  { kod: 'X', ad: 'X' },
  [], [{ op_no: 1, makine_adi: 'LMM LAMINASYON' }, { op_no: 1, makine_adi: 'KP10 PRES' }],
  [planSatir(1, 'KALINLIK')], {}, 'kontrol planı');
assert.strictEqual(Object.keys(fdCift.processSteps).length, 1, 'aynı op tek adım olmalı');
assert.strictEqual(Object.keys(fdCift.processStepFunctions).length, 1, 'karakteristik kopyalanmamalı');
const cAdim = Object.values(fdCift.processSteps)[0];
assert.ok(cAdim.machineDeviceSource.includes('LMM') && cAdim.machineDeviceSource.includes('KP10'),
  'iki makine de adımda yazmalı');

// ── Op no'su olmayan plan satırı sessizce kaybolmamalı ──
const fdNoOp = K.iskeletUret({ kod: 'X', ad: 'X' }, [], [],
  [planSatir(null, 'MIKTAR')], {}, 'kontrol planı');
assert.strictEqual(Object.keys(fdNoOp.processStepFunctions).length, 1, 'op no yoksa da satır işlenmeli');
assert.strictEqual(Object.values(fdNoOp.processSteps)[0].operationNumber, '');

// ── Girdi adımı YALNIZ gerçek girdi kontrolü olan malzemeye ──
const bomIki = [{ tuketim_kodu: '909.4.018', tuketim_adi: 'A' }, { tuketim_kodu: '981.4.204', tuketim_adi: 'B' }];
const fdGirdi = K.iskeletUret({ kod: 'X', ad: 'X' }, bomIki, [], [],
  { '909.4.018': [planSatir(1, 'Yoğunluk', { giris: 1 })] },   // B'nin planı yok
  'kontrol planı');
assert.strictEqual(Object.keys(fdGirdi.processSteps).length, 1, 'planı olmayan malzemeye girdi adımı açılmamalı');
assert.ok(Object.values(fdGirdi.processSteps)[0].name.includes('909.4.018'));

// giris=1 satırları girdi adımına gider, proses adımına GİTMEZ
const fdGiris = K.iskeletUret({ kod: 'Y', ad: 'Y' }, [], [{ op_no: 1, makine_adi: 'M' }],
  [planSatir(1, 'Boy', { giris: 1 }), planSatir(1, 'Kalınlık')], {}, 'kontrol planı');
const girdiAdim = Object.values(fdGiris.processSteps).find(x => x.name.startsWith('Girdi'));
const prosesAdim = Object.values(fdGiris.processSteps).find(x => !x.name.startsWith('Girdi'));
assert.ok(girdiAdim, 'ürünün kendi giriş satırları için girdi adımı açılmalı');
assert.deepStrictEqual(girdiAdim.functionIds.map(i => fdGiris.processStepFunctions[i].productCharacteristic), ['Boy']);
assert.deepStrictEqual(prosesAdim.functionIds.map(i => fdGiris.processStepFunctions[i].productCharacteristic), ['Kalınlık']);

// ── HAFIZA: benzer projeden uyarlama ──
assert.strictEqual(K.anahtarla('  GRAMAJ  '), 'gramaj');
assert.strictEqual(K.anahtarla('Yanma Davranışı'), 'yanma davranisi');
const hafiza = {
  'yanma davranisi': {
    kaynak: '205.0.214 PFMEA', mode: 'Yanma hızı limit üstü',
    effectText: 'Müşteri hattında red', severity: 10,
    causes: [{
      description: 'Hammadde FR katkı oranı düşük', occurrence: 4, detection: 6,
      actionPriority: 'H', preventionControl: 'Her partide sertifika kontrolü',
      detectionControl: 'FMVSS 302 yanma testi', processWorkElement: 'Malzeme',
      workElementFunction: 'FR katkı', actions: [
        { type: 'prevention', status: 'Completed', actionTaken: 'Mevcut sertifika kontrolü',
          description: 'Tedarikçiden her partide FR sertifikası istenmektedir.',
          responsiblePerson: 'Ali', completionDate: '2026-01-01', targetCompletionDate: '2026-01-01' },
      ],
    }],
  },
};
assert.ok(K.hafizadaAra(hafiza, 'YANMA DAVRANIŞI'), 'büyük/küçük ve Türkçe harf farkı eşleşmeli');
assert.ok(K.hafizadaAra(hafiza, 'Yanma Davranışı Testi'),
  'birebir olmayan ama kelimeleri örtüşen karakteristik de eşleşmeli');
assert.strictEqual(K.hafizadaAra(hafiza, 'Yanma'), null,
  'tek kelimelik zayıf örtüşmede uyarlama yapılmamalı');
assert.strictEqual(K.hafizadaAra(hafiza, 'Kesim ölçüsü'), null, 'alakasız karakteristik eşleşmemeli');

const fdH = K.iskeletUret({ kod: 'X', ad: 'X' }, [], [{ op_no: 1, makine_adi: 'M' }],
  [planSatir(1, 'Yanma Davranışı')], {}, 'kontrol planı', hafiza, '2026-03-10');
const hf = Object.values(fdH.processStepFunctions)[0];
const hm = fdH.failureModes[hf.failureModeIds[0]];
assert.strictEqual(hm.description, 'Yanma hızı limit üstü', 'hata türü hafızadan gelmeli');
assert.strictEqual(fdH.failureEffects[hm.effectIds[0]].severity, 10, 'şiddet ekibin verdiği değer olmalı');
assert.strictEqual(hm.causeIds.length, 1, 'nedenler hafızadan gelmeli (jenerik 3 neden değil)');
const hc = fdH.failureCauses[hm.causeIds[0]];
assert.strictEqual(hc.description, 'Hammadde FR katkı oranı düşük');
assert.strictEqual(hc.preventionControl, 'Her partide sertifika kontrolü', 'mevcut önleme yazılmalı');
assert.strictEqual(hc.detectionControl, 'FMVSS 302 yanma testi');
assert.strictEqual(hc.occurrence, 4);
assert.ok(hc.remarks.includes('BENZER PROJEDEN') && hc.remarks.includes('205.0.214'),
  'uyarlamanın kaynağı remarks’ta yazmalı');
assert.strictEqual(hc.actions[0].description, 'Tedarikçiden her partide FR sertifikası istenmektedir.');
assert.strictEqual(hc.actions[0].actionTaken, 'Mevcut sertifika kontrolü', 'yapılan iş metni korunmalı');
assert.strictEqual(hc.actions[0].responsiblePerson, '', 'sorumlu bu ürün için boşaltılmalı');
assert.strictEqual(hc.actions[0].completionDate, '', 'tamamlanma bu ürün için boşaltılmalı');
assert.strictEqual(hc.actions[0].status, 'Open');

// ── Hedef tarih kontrol planı tarihinden ──
assert.strictEqual(K.hedefTarih('', 'H').length, 10, 'plan tarihi yoksa bugünden');
assert.strictEqual(K.hedefTarih('2026-03-10', 'H'), '2026-04-09', 'AP=H → 30 gün');
assert.strictEqual(K.hedefTarih('2026-03-10', 'M'), '2026-05-09', 'AP=M → 60 gün');
assert.strictEqual(K.hedefTarih('2026-03-10', 'L'), '2026-06-08', 'AP=L → 90 gün');
assert.strictEqual(hc.actions[0].targetCompletionDate, K.hedefTarih('2026-03-10', 'H'),
  'aksiyon hedef tarihi plan tarihine bağlı olmalı');

// Hafızada karşılığı olmayan karakteristik kurallara düşmeli
const fdK = K.iskeletUret({ kod: 'X', ad: 'X' }, [], [{ op_no: 1, makine_adi: 'M' }],
  [planSatir(1, 'Kesim ölçüsü')], {}, 'kontrol planı', hafiza, '2026-03-10');
const kc = Object.values(fdK.failureCauses)[0];
assert.ok(kc.remarks.includes('OTOMATİK ÖNERİ'), 'eşleşme yoksa kural tabanlı üretim');
assert.ok(kc.actions[0].targetCompletionDate, 'kural tabanlı aksiyonda da hedef tarih olmalı');


// ── Hafıza kurulumu: kendi ürettiğinden ÖĞRENMEMELİ (döngü) ──
// İlk denemede üretim, bir gün önce kendi ürettiği projeden "öğrenip" jenerik
// metni kendine geri besliyordu ("kaynak: 203.0.414 PFMEA").
const proje = (ad, remarks) => ({
  name: ad,
  data: { fmeaData: {
    processStepFunctions: { f1: { productCharacteristic: 'Gramaj', failureModeIds: ['m1'] } },
    failureModes: { m1: { description: 'Gramaj sapması', effectIds: ['e1'], causeIds: ['c1'] } },
    failureEffects: { e1: { effectText: 'Müşteri reddi', severity: 7 } },
    failureCauses: { c1: { description: 'Karışım oranı', remarks, occurrence: 4, detection: 5, actions: [] } },
  } },
});
assert.strictEqual(Object.keys(K.hafizaKur([proje('A', 'OTOMATİK ÖNERİ — kontrol planı esas alındı')])).length, 0,
  'otomatik üretilmiş neden hafızaya alınmamalı');
assert.strictEqual(Object.keys(K.hafizaKur([proje('B', 'BENZER PROJEDEN UYARLANDI — kaynak: X')])).length, 0,
  'uyarlanmış neden de hafızaya alınmamalı');
const hIns = K.hafizaKur([proje('C', 'Ekip toplantısında belirlendi')]);
assert.strictEqual(hIns['gramaj'].kaynak, 'C', 'ekibin yazdığı neden hafızaya girmeli');
assert.strictEqual(hIns['gramaj'].severity, 7);

// ── Kontrol planında metin alanı 0 gelirse boş sayılmalı ──
// (canlı denemede "mevcut önleme: 0" yazıyordu)
assert.ok(K.onlemeKontrol({ proses_kontrol: 0 }).includes('FR17'), '0 → metin değil, varsayılan');
assert.ok(K.onlemeKontrol({ proses_kontrol: '0' }).includes('FR17'));
assert.ok(K.tespitKontrol({ yontem: 0 }).startsWith('Tanımlı'), '0 → yöntem tanımsız sayılmalı');

console.log('OK ERP’den PFMEA: AP tablosu, S/O/D kuralları (emniyet yalnız S), girdi hammaddesi ayrımı,');
console.log('   mevcut kontroller, aksiyonlar, iskelet zinciri; operasyon kartı yokken plandan\n   adım kurma, aynı op tek adım, giriş ayrımı ve hafizadan uyarlama doğru.');
