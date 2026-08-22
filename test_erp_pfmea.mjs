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
const metinler = (...a) => K.aksiyonlar(...a).map(x => x.metin).join(' | ');
assert.ok(metinler('L', { olculecek: 'Yanma hızı' }).includes('sertifika'),
  'emniyette AP düşük olsa da süreklilik aksiyonu');

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
assert.strictEqual(c1.remarks, '', 'remarks ekibin alanı — üretim doldurmamalı');
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
  [planSatir(1, 'Yanma Davranışı')], {}, 'kontrol planı', hafiza, '2026-03-10', ['Ali']);
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
assert.strictEqual(hc.remarks, '', 'uyarlamada da remarks boş kalmalı');
assert.strictEqual(hc.actions[0].description, 'Tedarikçiden her partide FR sertifikası istenmektedir.');
assert.strictEqual(hc.actions[0].actionTaken, 'Mevcut sertifika kontrolü', 'yapılan iş metni korunmalı');
// Önceki projede yapılmış iş, yeni projede yeniden "açık görev" olmamalı
assert.strictEqual(hc.actions[0].responsiblePerson, 'Ali', 'lokasyon listesindeki sorumlu korunmalı');
// Lokasyon dışı sorumlu taşınmamalı (Ankara'daki ad Çerkezköy projesine gelmesin)
const fdBaska = K.iskeletUret({ kod: 'X', ad: 'X' }, [], [{ op_no: 1, makine_adi: 'M' }],
  [planSatir(1, 'Yanma Davranışı')], {}, 'kontrol planı', hafiza, '2026-03-10', ['Veli']);
assert.strictEqual(Object.values(fdBaska.failureCauses)[0].actions[0].responsiblePerson, '',
  'lokasyon listesinde olmayan sorumlu temizlenmeli');
assert.strictEqual(hc.actions[0].completionDate, '2026-01-01', 'tamamlanma tarihi korunmalı');
assert.strictEqual(hc.actions[0].status, 'Completed');

// ── Hedef tarih kontrol planı tarihinden ──
assert.strictEqual(K.hedefTarih('', 'H').length, 10, 'plan tarihi yoksa bugünden');
assert.strictEqual(K.hedefTarih('2026-03-10', 'H'), '2026-04-09', 'AP=H → 30 gün');
assert.strictEqual(K.hedefTarih('2026-03-10', 'M'), '2026-05-09', 'AP=M → 60 gün');
assert.strictEqual(K.hedefTarih('2026-03-10', 'L'), '2026-06-08', 'AP=L → 90 gün');
assert.strictEqual(hc.actions[0].targetCompletionDate, '2026-01-01', 'kaynaktaki hedef tarih korunmalı');

// Hafızada karşılığı olmayan karakteristik kurallara düşmeli
const fdK = K.iskeletUret({ kod: 'X', ad: 'X' }, [], [{ op_no: 1, makine_adi: 'M' }],
  [planSatir(1, 'Kesim ölçüsü')], {}, 'kontrol planı', hafiza, '2026-03-10');
const kc = Object.values(fdK.failureCauses)[0];
assert.strictEqual(kc.description, 'Proses parametresi sapması (ayar/hız/sıcaklık)',
  'eşleşme yoksa kural tabanlı üretim');
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


// ── Üretilen proje hafızaya girmemeli (işaret artık proje düzeyinde) ──
const otoProje = proje('D', '');
otoProje.data.otomatik = true;
assert.strictEqual(Object.keys(K.hafizaKur([otoProje])).length, 0,
  'otomatik üretilmiş proje hafızaya alınmamalı');

// ── Örnekleme sıklığı: girişte "Her lot", proseste dakika ──
// (plandan ham sayı geliyor: 60 → girdide "60" yazıyordu)
assert.strictEqual(K.siklik({ ornekleme_sikligi: 60 }, true), 'Her lot', 'girdi lot bazında');
assert.strictEqual(K.siklik({ ornekleme_sikligi: 60 }, false), '60 dk');
assert.strictEqual(K.siklik({ ornekleme_sikligi: 'Her vardiya' }, false), 'Her vardiya', 'metin korunmalı');
assert.strictEqual(K.siklik({}, true), 'Her lot');
assert.strictEqual(K.tespitKontrol({ yontem: 'TL 07', ornekleme_buyuklugu: 1, ornekleme_sikligi: 60 }, true),
  'TL 07 · 1 adet · Her lot');
assert.strictEqual(K.tespitKontrol({ yontem: 'TL 07', ornekleme_buyuklugu: 0, ornekleme_sikligi: 60 }, false),
  'TL 07 · 60 dk', 'örnek büyüklüğü 0 ise yazılmamalı');

const fdLot = K.iskeletUret({ kod: 'X', ad: 'X' }, [{ tuketim_kodu: '909.4.018', tuketim_adi: 'A' }], [], [],
  { '909.4.018': [{ olculecek: 'Kalınlık', yontem: 'Mikrometre', ornekleme_sikligi: 60, giris: 1 }] },
  'kontrol planı');
const lf = Object.values(fdLot.processStepFunctions)[0];
assert.strictEqual(lf.sampleFrequency, 'Her lot', 'girdi adımında sıklık Her lot olmalı');
const lc = Object.values(fdLot.failureCauses)[0];
assert.ok(lc.detectionControl.includes('Her lot') && !lc.detectionControl.includes('60'),
  'girdi tespit kontrolünde 60 dk yazmamalı');


// -- Akis semasinda adim basina TEK satir --
// (7 karakteristikli adim akisda 7 ayni satir olarak tekrarliyordu)
const fdAkis = K.iskeletUret({ kod: 'X', ad: 'X' }, [], [{ op_no: 1, makine_adi: 'M' }],
  [planSatir(1, 'A'), planSatir(1, 'B'), planSatir(1, 'C')], {}, 'kontrol plani');
const semboller = Object.values(fdAkis.processStepFunctions).map(f => f.flowchartSymbol);
assert.strictEqual(semboller.filter(Boolean).length, 1, 'adim basina tek akis satiri');
assert.strictEqual(semboller[0], 'process', 'sembol ilk karakteristikte olmali');
assert.strictEqual(Object.keys(fdAkis.processStepFunctions).length, 3,
  'karakteristikler FMEA tarafinda eksilmemeli');


// -- PF (Process Function) etkide dolu gelmeli --
// (agacta "S: 5 | PF: -" yaziyordu)
const fdPf = K.iskeletUret({ kod: 'X', ad: 'X' }, [], [{ op_no: 1, makine_adi: 'M' }],
  [{ op_no: 1, olculecek: 'Kalinlik', hedef_nicel: 6.5, hedef_nitel: 'mm', yontem: 'Mikrometre' },
   { op_no: 1, olculecek: 'Gorunum', yontem: 'Gozle' }], {}, 'kontrol plani');
const pfler = Object.values(fdPf.failureEffects).map(e => e.selectedPFByType?.E);
assert.deepStrictEqual(pfler, ['Kalinlik (6.5 mm)', 'Gorunum'],
  'PF karakteristik + sartnameden turemeli; sartname yoksa yalniz karakteristik');
assert.ok(!pfler.some(x => String(x).includes('—')), 'PF metninde tire kalmamali');

// -- Onceki projeden gelen aksiyon TAMAM gelmeli --
const hafizaTamam = { 'gramaj': { kaynak: 'P', mode: 'm', effectText: 'e', severity: 6, causes: [{
  description: 'n', occurrence: 3, detection: 4, actionPriority: 'L',
  preventionControl: 'p', detectionControl: 'd',
  actions: [{ type: 'prevention', status: 'Completed', actionTaken: 'yapildi',
    description: 'Mevcut gorsel talimat', responsiblePerson: 'Mete',
    completionDate: '2026-03-16', targetCompletionDate: '2026-03-16' }] }] } };
const fdT = K.iskeletUret({ kod: 'X', ad: 'X' }, [], [{ op_no: 1, makine_adi: 'M' }],
  [planSatir(1, 'Gramaj')], {}, 'kontrol plani', hafizaTamam, '2026-03-10', ['Mete']);
const tAks = Object.values(fdT.failureCauses)[0].actions[0];
assert.strictEqual(tAks.status, 'Completed', 'onceki projede yapilmis is acik gorev olarak gelmemeli');
assert.strictEqual(tAks.completionDate, '2026-03-16');
assert.strictEqual(tAks.responsiblePerson, 'Mete', 'sorumlu korunmali');


// -- Girdi olcutu: giris satiri olan HER kalem (yari mamul dahil) --
// 203.20.413 yari mamuldur ama kendi giris kontrol plani vardir; kod kurali
// onu hammadde saymaz, yine de FMEA ya girmeli.
assert.strictEqual(K.girdiSatirlari('909.4.018', [{ olculecek: 'a' }]).length, 1,
  'kod kurali hammadde: bayraksiz eski planin tamami girdi sayilir');
assert.strictEqual(K.girdiSatirlari('203.20.413', [{ olculecek: 'a' }]).length, 0,
  'yari mamulun proses plani girdi adimina donmemeli');
assert.strictEqual(K.girdiSatirlari('203.20.413', [{ olculecek: 'a', giris: 1 }, { olculecek: 'b' }]).length, 1,
  'giris bayragi varsa yari mamul de girdi adimi alir, yalniz giris satirlariyla');
assert.strictEqual(K.girdiSatirlari('909.4.018', []).length, 0, 'plani yoksa adim acilmaz');

const fdYari = K.iskeletUret({ kod: 'X', ad: 'X' },
  [{ tuketim_kodu: '203.20.413', tuketim_adi: 'YARI MAMUL' },
   { tuketim_kodu: '944.4.KFR30-065-1', tuketim_adi: 'FR KROS' }],
  [], [],
  { '203.20.413': [{ olculecek: 'Kalinlik', giris: 1, yontem: 'Mikrometre' }],
    '944.4.KFR30-065-1': [{ olculecek: 'Yogunluk', giris: 1, yontem: 'Terazi' }] },
  'kontrol plani');
assert.strictEqual(Object.keys(fdYari.processSteps).length, 2,
  'giris plani olan yari mamul de girdi adimi almali');


// -- Urun agaci COK SEVIYELI taranmali --
// 203.0.414 -> 203.30.414 -> 203.50.414 -> 203.20.413 -> {944..., 952...}
// Alt seviyedeki hammaddelerin girdi kontrol plani vardi ama hic gorulmuyordu.
// H* kodlari kod kuralina gore HAMMADDE (orta parca .4.), Y* yari mamul (.20.)
const AGAC = {
  '203.0.K':  [{ urun_kodu: '203.0.K', tuketim_kodu: '203.20.Y1', tuketim_adi: 'yari' },
                { urun_kodu: '203.0.K', tuketim_kodu: '909.4.H1', tuketim_adi: 'ham1' }],
  '203.20.Y1': [{ urun_kodu: '203.20.Y1', tuketim_kodu: '203.20.Y2', tuketim_adi: 'yari2' }],
  '203.20.Y2': [{ urun_kodu: '203.20.Y2', tuketim_kodu: '909.4.H2', tuketim_adi: 'ham2' },
                 { urun_kodu: '203.20.Y2', tuketim_kodu: '909.4.H3', tuketim_adi: 'ham3', varsayilan: false }],
};
const okundu = [];
const oku = async (kodlar) => { okundu.push([...kodlar]); return kodlar.flatMap(k => AGAC[k] || []); };
const hicTazele = async () => {};
const duz = await K.agacDuz('203.0.K', oku, hicTazele);
assert.deepStrictEqual(duz.map(x => x.tuketim_kodu).sort(), ['203.20.Y1', '203.20.Y2', '909.4.H1', '909.4.H2'],
  'alt seviyedeki hammaddeler de gelmeli; varsayilan olmayan dal gelmemeli');
assert.deepStrictEqual(okundu[0], ['203.0.K'], 'seviye seviye okunmali');

// Dongu: A -> B -> A sonsuz donmemeli
const DONGU = { '203.20.A': [{ urun_kodu: '203.20.A', tuketim_kodu: '203.20.B' }],
                '203.20.B': [{ urun_kodu: '203.20.B', tuketim_kodu: '203.20.A' }] };
const dz = await K.agacDuz('203.20.A', async ks => ks.flatMap(k => DONGU[k] || []), hicTazele);
assert.deepStrictEqual(dz.map(x => x.tuketim_kodu), ['203.20.B'], 'dongude tekrar eklenmemeli');

// Agaci ERP de olmayan kalem icin LeanSys ten BIR kez cekilmeli
const cagri = [];
let ilk = true;
const okuBir = async (ks) => { if (ilk) { ilk = false; return []; } return ks.flatMap(k => AGAC[k] || []); };
const dz2 = await K.agacDuz('203.0.K', okuBir, async (yol, kod) => { cagri.push([yol, kod]); });
assert.deepStrictEqual(cagri, [['refreshbom', '203.0.K']],
  'eksik agac icin BIR kez LeanSys cagrilmali; hammadde yapraklari icin cagrilmamali');
assert.ok(dz2.length > 0, 'cekildikten sonra agac okunmali');


// ── Aksiyonlar prosese ÖZGÜ olmalı, jenerik olmamalı ──
// Eskiden AP'ye bakıp "Kontrol sıklığının artırılması (60 → daha sık)" gibi
// her satıra aynı metni yazıyordu.
const HEPSI = [
  ['L', { olculecek: 'Kesim ölçüsü', yontem: 'Kumpas' }, false],
  ['M', { olculecek: 'MAKINE ISI AYARI', hedef_nicel: 80, hedef_nitel: 'C', uretim_ekipman: 'LMM' }, false],
  ['H', { olculecek: 'Gramaj', yontem: 'Terazi', ozel_kar: 'X' }, false],
  ['L', { olculecek: 'Kalınlık', yontem: 'Mikrometre' }, true],
].map(([ap, it, g]) => metinler(ap, it, g)).join(' ');
assert.ok(!/sıklığın artırılması|Poka-yoke|periyodik gözden geçirmede teyit|8D/.test(HEPSI),
  'jenerik aksiyon metinleri kalmamalı');

// Girdi: tedarikçi tarafına bakan aksiyon
assert.ok(metinler('L', { olculecek: 'Kalınlık', yontem: 'Mikrometre' }, true).includes('tedarikçi'),
  'girdide kabul/tedarikçi aksiyonu');

// Makine ayarı: set değeri iş emrine + makine adı
const ayar = metinler('M', { olculecek: 'MAKINE ISI AYARI', hedef_nicel: 80, hedef_nitel: 'C', uretim_ekipman: 'LMM LAMINASYON' });
assert.ok(ayar.includes('set değeri') && ayar.includes('(80 C)') && ayar.includes('LMM LAMINASYON'),
  'ayar karakteristiğinde set değeri, hedef ve makine yazmalı');

// Özel karakteristik: ilk parça onayı
assert.ok(metinler('L', { olculecek: 'Gramaj', yontem: 'Terazi', ozel_kar: 'X' }).includes('ilk parça onayı'),
  'özel karakteristikte ilk parça onayı');

// Ölçüm yöntemi tanımsızsa önce onu tanımlat
const yontemsiz = K.aksiyonlar('L', { olculecek: 'Etiket' });
assert.ok(yontemsiz.some(x => x.tur === 'detection' && x.metin.includes('kontrol planında tanımlanır')),
  'yöntem yoksa tespit aksiyonu yöntemi tanımlatmalı');
assert.ok(!K.aksiyonlar('H', { olculecek: 'Etiket' }).some(x => x.metin.includes('alt/üst sınır')),
  'yöntem yokken sınır aksiyonu önerilmemeli');

// AP=H: ölçüm formuna sınır — ek yatırım istemeyen tespit
assert.ok(metinler('H', { olculecek: 'Boy', yontem: 'Şeritmetre', hedef_nicel: 150, hedef_nitel: 'mm' })
  .includes('alt/üst sınır'), 'AP yüksekte sınır kontrolü');

// Her satırda en az bir önleme ve bir tespit aksiyonu olmalı
[['L', {}], ['M', { yontem: 'Kumpas' }], ['H', { yontem: 'Kumpas' }]].forEach(([ap, it]) => {
  const a = K.aksiyonlar(ap, it);
  assert.ok(a.some(x => x.tur === 'prevention') && a.some(x => x.tur === 'detection'),
    `AP=${ap} için hem önleme hem tespit aksiyonu`);
});

// ── Optimizasyon (Adım 6): revize S/O/D ve AP ──
const iy = K.iyilestirme(8, 5, 7, [{ tur: 'prevention' }, { tur: 'detection' }]);
assert.strictEqual(iy.S, 8, 'şiddet proses aksiyonuyla düşmez');
assert.strictEqual(iy.O, 4);
assert.strictEqual(iy.D, 6);
assert.strictEqual(iy.ap, K.apHesapla(8, 4, 6));
assert.strictEqual(K.iyilestirme(8, 5, 7, [{ tur: 'detection' }]).O, 5, 'önleme yoksa O düşmez');
assert.strictEqual(K.iyilestirme(8, 5, 7, [{ tur: 'prevention' }]).D, 7, 'tespit yoksa D düşmez');
assert.strictEqual(K.iyilestirme(8, 2, 2, [{ tur: 'prevention' }, { tur: 'detection' }]).O, 2,
  'tek kademe iyileştirme 2 nin altına inmemeli');

const fdRev = K.iskeletUret({ kod: 'X', ad: 'X' }, [], [{ op_no: 1, makine_adi: 'M' }],
  [{ op_no: 1, olculecek: 'Kesim ölçüsü', yontem: 'Kumpas', proses_kontrol: 'Talimat' }], {}, 'kontrol planı');
const rc = Object.values(fdRev.failureCauses)[0];
assert.strictEqual(rc.revisedSeverity, 5);
assert.strictEqual(rc.revisedOccurrence, rc.occurrence - 1);
assert.strictEqual(rc.revisedDetection, rc.detection - 1);
assert.strictEqual(rc.revisedActionPriority, K.apHesapla(5, rc.revisedOccurrence, rc.revisedDetection));


// Kaynak kayitta revize alani BOS METIN olabiliyor; gecerli sayilmamali
assert.strictEqual(K.doluDeger('', 7), 7);
assert.strictEqual(K.doluDeger(null, 7), 7);
assert.strictEqual(K.doluDeger(undefined, 7), 7);
assert.strictEqual(K.doluDeger(0, 7), 0, '0 gecerli bir degerdir');
assert.strictEqual(K.doluDeger(3, 7), 3);

const hafizaBos = { 'gramaj': { kaynak: 'P', mode: 'm', effectText: 'e', severity: 6, causes: [{
  description: 'n', occurrence: 4, detection: 5, actionPriority: 'M',
  revisedSeverity: '', revisedOccurrence: '', revisedDetection: '', revisedActionPriority: '',
  actions: [{ type: 'prevention', description: 'x' }, { type: 'detection', description: 'y' }] }] } };
const fdB = K.iskeletUret({ kod: 'X', ad: 'X' }, [], [{ op_no: 1, makine_adi: 'M' }],
  [planSatir(1, 'Gramaj')], {}, 'kontrol plani', hafizaBos, '2026-03-10');
const bc = Object.values(fdB.failureCauses)[0];
assert.strictEqual(bc.revisedOccurrence, 3, 'bos kaynak degeri yerine hesaplanan kullanilmali');
assert.strictEqual(bc.revisedDetection, 4);
assert.ok(bc.revisedActionPriority, 'revize AP bos kalmamali');


// ── Mevcut uygulamayı belgeleyen aksiyon TAMAM doğar, gerçek eksik AÇIK ──
// (Task manager'da "zaten yapılıyor" işler açık görev olarak birikiyordu)
const durumlari = (it, ap = 'L') => {
  const fd = K.iskeletUret({ kod: 'X', ad: 'X' }, [], [{ op_no: 1, makine_adi: 'M' }],
    [{ op_no: 1, ...it }], {}, 'kontrol planı', {}, '2026-03-10');
  return Object.values(fd.failureCauses)[0].actions.map(a => ({ d: a.description, s: a.status, t: a.completionDate }));
};
// Yöntem tanımlı: her iki aksiyon da mevcut uygulama → Completed
durumlari({ olculecek: 'Kesim', yontem: 'Kumpas', proses_kontrol: 'Talimat' }).forEach(a => {
  assert.strictEqual(a.s, 'Completed', `mevcut uygulama açık görev olmamalı: ${a.d}`);
  assert.ok(a.t, 'tamamlanan aksiyonda tamamlanma tarihi olmalı');
});
// Yöntem tanımsız: bu GERÇEK bir eksik → açık kalmalı
const eksikli = durumlari({ olculecek: 'Etiket' });
const acik = eksikli.filter(a => a.s === 'Open');
assert.strictEqual(acik.length, 1, 'ölçüm yöntemi tanımsızlığı açık görev olmalı');
assert.ok(acik[0].d.includes('kontrol planında tanımlanır'));
assert.strictEqual(acik[0].t, '', 'açık görevde tamamlanma tarihi olmamalı');
// AP=H sınır aksiyonu da gerçek bir iyileştirme → açık
const yuksek = K.iskeletUret({ kod: 'X', ad: 'X' }, [], [{ op_no: 1, makine_adi: 'M' }],
  [{ op_no: 1, olculecek: 'Boy', yontem: 'Kumpas', son_kontrol: true }], {}, 'kontrol planı', {}, '2026-03-10');
const hAks = Object.values(yuksek.failureCauses).flatMap(c => c.actions)
  .filter(a => a.description.includes('alt/üst sınır'));
if (hAks.length) assert.strictEqual(hAks[0].status, 'Open', 'AP=H iyileştirmesi açık görev olmalı');


// -- Uretilmis neden taninmali: uc bagimsiz yol --
// (remarks isareti kullanici istegiyle kaldirilinca dongu geri gelmisti)
assert.strictEqual(K.uretilmisMi({ otoUretim: true }), true, 'gorunmez isaret');
assert.strictEqual(K.uretilmisMi({ remarks: 'OTOMATIK ONERI - x' }), false, 'yanlis yazim eslesmemeli');
assert.strictEqual(K.uretilmisMi({ remarks: 'OTOMATİK ÖNERİ — x' }), true, 'eski remarks isareti');
assert.strictEqual(K.uretilmisMi({ actions: [{ description:
  'Kabulde tedarikçi sertifikası/irsaliyesinde En değeri teyit edilir' }] }), true,
  'metin imzasi: bayraksiz eski kayit');
assert.strictEqual(K.uretilmisMi({ actions: [{ description:
  'İlk parça ve son parçada Boy, Kumpas ile ölçülüp kontrol formuna kaydedilir' }] }), true);
assert.strictEqual(K.uretilmisMi({ description: 'Karışım oranı',
  remarks: 'Ekip toplantısında belirlendi',
  actions: [{ description: 'Tedarikçiden her partide FR sertifikasi istenmektedir.' }] }), false,
  'insan yazimi neden uretilmis sayilmamali');

// Hafiza: bu uc yolun her biri kaydi disarida birakmali
const projeIle = (neden) => ({ name: 'P', data: { fmeaData: {
  processStepFunctions: { f1: { productCharacteristic: 'Gramaj', failureModeIds: ['m1'] } },
  failureModes: { m1: { description: 'x', effectIds: ['e1'], causeIds: ['c1'] } },
  failureEffects: { e1: { effectText: 'e', severity: 7 } },
  failureCauses: { c1: { description: 'n', occurrence: 4, detection: 5, actions: [], ...neden } },
} } });
assert.strictEqual(Object.keys(K.hafizaKur([projeIle({ otoUretim: true })])).length, 0,
  'otoUretim tasiyan neden hafizaya girmemeli');
assert.strictEqual(Object.keys(K.hafizaKur([projeIle({ actions: [{ description:
  'İlk parça ve son parçada Boy, Kumpas ile ölçülüp kontrol formuna kaydedilir' }] })])).length, 0,
  'kendi aksiyon metnimizi tasiyan neden hafizaya girmemeli');
assert.strictEqual(Object.keys(K.hafizaKur([projeIle({})])).length, 1,
  'insan yazimi neden hafizaya girmeli');


// -- Uretilen aksiyonlar sorumlusuz kalmamali --
const fdAta = K.iskeletUret({ kod: 'X', ad: 'X' }, [], [{ op_no: 1, makine_adi: 'M' }],
  [planSatir(1, 'Boy'), planSatir(2, 'En')], {}, 'kontrol plani', {}, '2026-03-10',
  ['Ayse', 'Mehmet'], ['Ayse', 'Mehmet']);
const ataAks = Object.values(fdAta.failureCauses).flatMap(c => c.actions);
assert.ok(ataAks.length > 0);
assert.strictEqual(ataAks.filter(a => !a.responsiblePerson).length, 0,
  'uretilen her aksiyona sorumlu atanmali');
assert.ok(ataAks.every(a => ['Ayse', 'Mehmet'].includes(a.responsiblePerson)),
  'sorumlu havuzdan gelmeli');
// Ayni nedenin tum aksiyonlari ayni kisiye
Object.values(fdAta.failureCauses).forEach(c => {
  const kisiler = new Set(c.actions.map(a => a.responsiblePerson));
  assert.strictEqual(kisiler.size, 1, 'bir nedenin isleri tek sahipte olmali');
});


// ── Çoklu ürün kodu ayrıştırma ──
// Kullanıcı "205.0.214-C, 203.0.414" yazıp tek seferde çok PFMEA üretebiliyor.
assert.deepStrictEqual(K.kodListesi('205.0.214-C'), ['205.0.214-C']);
assert.deepStrictEqual(K.kodListesi('205.0.214-C, 203.0.414 , 227.0.132'),
  ['205.0.214-C', '203.0.414', '227.0.132'], 'virgül ve boşluklar');
assert.deepStrictEqual(K.kodListesi('a;b\nc'), ['a', 'b', 'c'], 'noktalı virgül ve satır sonu');
assert.deepStrictEqual(K.kodListesi('a, a , b'), ['a', 'b'], 'tekrar elenir, sıra korunur');
assert.deepStrictEqual(K.kodListesi('  ,  , '), [], 'boş girdi');
assert.deepStrictEqual(K.kodListesi(null), []);
assert.deepStrictEqual(K.kodListesi('9MM.4.648, 944.4.KFR30-065-1'),
  ['9MM.4.648', '944.4.KFR30-065-1'], 'nokta, harf ve tire bozulmamalı');


// ── PFMEA'sı olan ürün yeniden üretilmesin ──
const kayit = (projectId, project) => ({ projectData: { fmea: { projectId, project } } });
const PROJELER = [
  kayit('proj_203_0_414', '203.0.414 PFMEA'),
  kayit('proj_203_0_414_A', '203.0.414-A PFMEA'),
  kayit('205_0_133', '205.0.133 PFMEA'),          // eski biçim: proj_ öneki yok
  kayit('proj_6FA881989', '6FA 881 989 PFMEA'),
  kayit('proj_227_0_132', 'Mercedes kapi sungeri 2026'),   // ekip yeniden adlandirmis
];
assert.strictEqual(K.projeKimligi('203.0.414'), 'proj_203_0_414');
assert.strictEqual(K.projeKimligi('944.4.KFR30-065-1'), 'proj_944_4_KFR30_065_1', 'tire de alt çizgi olur');

assert.ok(K.mevcutProje(PROJELER, '203.0.414'), 'kimlikten yakalanmalı');
assert.ok(K.mevcutProje(PROJELER, '205.0.133'), 'eski biçimli kayıt ad üzerinden yakalanmalı');
assert.ok(K.mevcutProje(PROJELER, '6FA 881 989'), 'boşluklu kod ad üzerinden yakalanmalı');
assert.ok(K.mevcutProje(PROJELER, '227.0.132'),
  'proje yeniden adlandirilmis olsa da kimlikten yakalanmali');
assert.strictEqual(K.mevcutProje(PROJELER, '999.0.999'), null, 'olmayan ürün null');
assert.strictEqual(K.mevcutProje(PROJELER, ''), null);
assert.strictEqual(K.mevcutProje([], '203.0.414'), null);

// Farklı ürünler karışmamalı: 203.0.414-A ayrı bir üründür
const a = K.mevcutProje(PROJELER, '203.0.414-A');
assert.ok(a && a.projectData.fmea.projectId === 'proj_203_0_414_A',
  '203.0.414 ile 203.0.414-A birbirine karışmamalı');
assert.notStrictEqual(K.mevcutProje(PROJELER, '203.0.414'), a);

console.log('OK ERP’den PFMEA: AP tablosu, S/O/D kuralları (emniyet yalnız S), girdi hammaddesi ayrımı,');
console.log('   mevcut kontroller, aksiyonlar, iskelet zinciri; operasyon kartı yokken plandan\n   adım kurma, aynı op tek adım, giriş ayrımı ve hafizadan uyarlama doğru.');
