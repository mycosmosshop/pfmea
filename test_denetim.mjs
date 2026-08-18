// Tamlık denetimi: AIAG-VDA 7 adım + 4M kapsam kontrolleri.
//   çalıştır:  node test_denetim.mjs
import assert from 'assert';
import { buildSync } from 'esbuild';

const cikti = buildSync({
  entryPoints: ['utils/denetim.ts'],
  bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2020',
}).outputFiles[0].text;
const K = await import('data:text/javascript;base64,' + Buffer.from(cikti).toString('base64'));

// ── 4M eşleme ──
assert.strictEqual(K.dortM('Personel'), 'insan');
assert.strictEqual(K.dortM('Mak.'), 'makine');
assert.strictEqual(K.dortM('Malzeme'), 'malzeme');
assert.strictEqual(K.dortM('Metot'), 'metot');
assert.strictEqual(K.dortM('çevre'), 'diger', 'eşlenemeyen küme yanlış alarm vermemeli');

// ── Üç seviyeli etki ──
assert.deepStrictEqual(K.etkiSeviyeleri('End user:\nX (5)\nShip to Plant:\nY (5)\nIn-Plant:\nZ (5)'), []);
assert.deepStrictEqual(K.etkiSeviyeleri('End user: sadece bu'), ['Ship to Plant', 'In-Plant']);
assert.deepStrictEqual(K.etkiSeviyeleri('End user:\n— (—)\nShip to Plant:\nY\nIn-Plant:\nZ'), [],
  'bilinçli "—" eksik sayılmamalı');

// ── Tam bir FMEA: bulgu çıkmamalı ──
const tam = () => ({
  processSteps: {
    s0: { id: 's0', name: 'Girdi Kalite Kontrol – A', operationNumber: '0', functionIds: ['f0'] },
    s1: { id: 's1', name: 'Op 1 – PRES', operationNumber: '1', functionIds: ['f1'] },
  },
  processStepFunctions: {
    f0: { id: 'f0', productCharacteristic: 'Yoğunluk', failureModeIds: ['m0'] },
    f1: { id: 'f1', productCharacteristic: 'Kalınlık', failureModeIds: ['m1'] },
  },
  failureModes: {
    m0: { id: 'm0', description: 'Yoğunluk düşük', effectIds: ['e0'], causeIds: ['c0'] },
    m1: { id: 'm1', description: 'Kalınlık dışı', effectIds: ['e1'], causeIds: ['c1', 'c2', 'c3'] },
  },
  failureEffects: {
    e0: { id: 'e0', severity: 6, effectText: 'End user:\nX\nShip to Plant:\nY\nIn-Plant:\nZ' },
    e1: { id: 'e1', severity: 7, effectText: 'End user:\nX\nShip to Plant:\nY\nIn-Plant:\nZ' },
  },
  failureCauses: {
    c0: { id: 'c0', description: 'Tedarikçi sapması', processWorkElement: 'Malzeme', occurrence: 3, detection: 4,
          preventionControl: 'Sertifika', detectionControl: 'Terazi', actionPriority: 'L', actions: [] },
    c1: { id: 'c1', description: 'Ayar', processWorkElement: 'Makine', occurrence: 3, detection: 4,
          preventionControl: 'Set değeri', detectionControl: 'Mikrometre', actionPriority: 'L', actions: [] },
    c2: { id: 'c2', description: 'Operatör', processWorkElement: 'Personel', occurrence: 3, detection: 4,
          preventionControl: 'Eğitim', detectionControl: 'Kontrol formu', actionPriority: 'L', actions: [] },
    c3: { id: 'c3', description: 'Talimat', processWorkElement: 'Metot', occurrence: 3, detection: 4,
          preventionControl: 'Talimat', detectionControl: 'Denetim', actionPriority: 'L', actions: [] },
  },
});
assert.deepStrictEqual(K.denetle(tam()), [], 'eksiksiz FMEA temiz çıkmalı');

// ── Eksikler tek tek yakalanmalı ──
const bul = (v, kural) => K.denetle(v).filter(x => x.kural === kural);

let v = tam(); v.failureModes.m1.effectIds = [];
assert.strictEqual(bul(v, 'etki').length, 1, 'etkisiz hata türü');

v = tam(); v.failureEffects.e1.severity = null;
assert.strictEqual(bul(v, 'S').length, 1, 'şiddet boş');

v = tam(); v.failureEffects.e1.effectText = 'End user: yalnız bu';
assert.strictEqual(bul(v, 'etki seviyesi').length, 1, 'iki müşteri seviyesi eksik');

v = tam(); v.failureModes.m1.causeIds = [];
assert.strictEqual(bul(v, 'neden').length, 1, 'nedensiz hata türü');

// 4M: üretim adımında nedenler yalnız tek kaynaktansa uyarı
v = tam(); v.failureModes.m1.causeIds = ['c1'];
assert.strictEqual(bul(v, '4M kapsamı').length, 1, 'yalnız makine kaynaklı → insan/malzeme/metot sorulmalı');
// İki kaynak varsa (yalnız 1-2 eksikse) susmalı — her satırda 4 neden dayatmıyoruz
v = tam(); v.failureModes.m1.causeIds = ['c1', 'c2'];
assert.strictEqual(bul(v, '4M kapsamı').length, 0, 'iki küme kapsanınca uyarı verilmemeli');
// Girdi adımında insan/makine beklenmez
v = tam(); v.failureCauses.c0.processWorkElement = 'Personel';
assert.strictEqual(bul(v, '4M kapsamı').length, 1, 'girdi adımında malzeme kaynaklı neden yoksa uyarı');

v = tam(); v.failureCauses.c1.preventionControl = '';
assert.strictEqual(bul(v, 'önleme').length, 1, 'önleme boş');

v = tam(); v.failureCauses.c1.detection = 0;
assert.strictEqual(bul(v, 'D').length, 1, 'D aralık dışı');

// AP kuralları
v = tam(); v.failureCauses.c1.actionPriority = 'H';
let ax = bul(v, 'aksiyon');
assert.strictEqual(ax.length, 1);
assert.strictEqual(ax[0].seviye, 'eksik', 'AP=H aksiyonsuz → EKSİK');
v.failureCauses.c1.actions = [{ description: 'Poka-yoke', responsiblePerson: 'Ali' }];
assert.strictEqual(bul(v, 'aksiyon').length, 0, 'aksiyon yazılınca susmalı');

v = tam(); v.failureCauses.c1.actionPriority = 'M';
ax = bul(v, 'aksiyon');
assert.strictEqual(ax[0].seviye, 'uyari', 'AP=M aksiyonsuz → UYARI');

v = tam(); v.failureCauses.c1.actionPriority = 'H';
v.failureCauses.c1.actions = [{ description: 'X', responsiblePerson: '' }];
assert.strictEqual(bul(v, 'sorumlu').length, 1, 'AP≠L aksiyonda sorumlu atanmalı');
v = tam(); v.failureCauses.c1.actionPriority = 'L';
v.failureCauses.c1.actions = [{ description: 'X', responsiblePerson: '' }];
assert.strictEqual(bul(v, 'sorumlu').length, 0,
  'AP=L de sorumlu sorulmaz — düşük öncelikte gürültü üretme');
// Tamamlanmış aksiyon sorumlu beklemez (mevcut uygulamayı belgeleyenler)
v = tam(); v.failureCauses.c1.actionPriority = 'H';
v.failureCauses.c1.actions = [{ description: 'X', responsiblePerson: '', status: 'Completed' }];
assert.strictEqual(bul(v, 'sorumlu').length, 0, 'tamamlanan işe sorumlu sorulmaz');

// Girdi adımı hiç yoksa uyarı
v = tam(); delete v.processSteps.s0;
v.processStepFunctions = { f1: v.processStepFunctions.f1 };
assert.strictEqual(bul(v, 'girdi').length, 1, 'girdi adımı yoksa uyarı');

// Adımda karakteristik yoksa
v = tam(); v.processSteps.s1.functionIds = [];
assert.strictEqual(bul(v, 'karakteristik').length, 1);

// Sıralama: eksikler uyarılardan önce
v = tam(); v.failureCauses.c1.preventionControl = ''; v.failureModes.m1.causeIds = ['c1'];
const sirali = K.denetle(v);
const ilkUyari = sirali.findIndex(x => x.seviye === 'uyari');
const sonEksik = sirali.map(x => x.seviye).lastIndexOf('eksik');
assert.ok(ilkUyari === -1 || sonEksik < ilkUyari, 'eksikler önce gelmeli');

// Özet
const oz = K.ozetle([{ seviye: 'eksik', kural: 'S', konum: '', mesaj: '' }, { seviye: 'uyari', kural: 'S', konum: '', mesaj: '' }]);
assert.deepStrictEqual(oz, { eksik: 1, uyari: 1, kurallar: { S: 2 } });

console.log('OK tamlık denetimi: 4M eşleme, üç seviyeli etki, zincir eksikleri, AP kuralları,');
console.log('   girdi adımı, sıralama ve özet doğru.');
