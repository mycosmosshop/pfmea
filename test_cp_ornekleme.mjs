// Kontrol planindaki ornekleme buyuklugu ERP'nin GUNCEL degerini gostermeli.
// Kirilan hâl: ayna doluysa LeanSys'ten hic tazelenmiyordu; ERP'de buyukluk
// 1'e cekilmisken PFMEA aylar oncesinin 3'unu (bir satirda 26'sini) basiyordu.
//   calistir:  node test_cp_ornekleme.mjs        (ag: Supabase + yerel ajan)
import assert from 'assert';
import { buildSync } from 'esbuild';

const cikti = buildSync({
  entryPoints: ['utils/erpPfmea.ts'],
  bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2020',
}).outputFiles[0].text;
const K = await import('data:text/javascript;base64,' + Buffer.from(cikti).toString('base64'));

const KOD = '216.0.367';
const U = 'https://nnubrxbpthmkitueixbh.supabase.co';
const A = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5udWJyeGJwdGhta2l0dWVpeGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjI2MDIsImV4cCI6MjA5NjEzODYwMn0.CHZUOylf_q8kkOQbFf9VWZ6-doUTlynmAhahM2EuImE';

const ayna = await (await fetch(
  `${U}/rest/v1/leansys_kontrol_plani?select=olculecek,ornekleme_buyuklugu&stok_kodu=eq.${KOD}`,
  { headers: { apikey: A, Authorization: `Bearer ${A}` } })).json();
assert.ok(ayna.length, 'aynada kontrol plani yok');

const sonuc = await K.erpdenUret(KOD);
const fonk = Object.values(sonuc.fmeaData.processStepFunctions);
const beklenen = new Map(ayna.map(x => [String(x.olculecek || '').trim(),
                                        String(x.ornekleme_buyuklugu ?? '').trim()]));
let bakilan = 0;
for (const f of fonk) {
  const b = beklenen.get(String(f.productCharacteristic || '').trim());
  if (b === undefined) continue;         // agactaki alt kalemden gelen satir
  bakilan++;
  assert.strictEqual(String(f.sampleSize ?? ''), b,
    `${f.productCharacteristic}: CP ${f.sampleSize} ≠ ERP ${b}`);
}
assert.ok(bakilan >= 10, `yalniz ${bakilan} karakteristik karsilastirildi`);
const kume = [...new Set(fonk.map(f => String(f.sampleSize ?? '')))].sort();
console.log(`OK ${bakilan} karakteristikte örnekleme büyüklüğü ERP ile birebir · CP'deki değerler: ${kume.join(', ')}`);
