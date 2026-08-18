// Canlı deneme: gerçek ERP verisiyle bir ürün için PFMEA üretir ve özetini
// yazar. Test değildir (ağ + LeanSys ajanı gerektirir); elle doğrulama içindir.
//   çalıştır:  node deneme_erp.mjs 203.0.414
import { buildSync } from 'esbuild';

const cikti = buildSync({
  entryPoints: ['utils/erpPfmea.ts'],
  bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2020',
}).outputFiles[0].text;
const K = await import('data:text/javascript;base64,' + Buffer.from(cikti).toString('base64'));

const kod = process.argv[2] || '203.0.414';
const s = await K.erpdenUret(kod);

console.log(`\n${kod} — ${s.urunAdi}`);
console.log(`kaynak: ${s.planNo}   plan tarihi: ${s.planTarihi || '(yok)'}`);
console.log(`adım ${s.ozet.adim} · karakteristik ${s.ozet.karakteristik} · hata ${s.ozet.hata} · neden ${s.ozet.neden}`);
console.log(`hafızadan uyarlanan neden: ${s.ozet.uyarlanan} · operasyon kartı yok mu: ${s.ozet.opKartiYok}`);
console.log('\nADIMLAR');
for (const st of Object.values(s.fmeaData.processSteps)) {
  console.log(`  [${st.operationNumber || '—'}] ${st.name}   (${st.machineDeviceSource || '—'})`);
  for (const fid of st.functionIds) {
    const f = s.fmeaData.processStepFunctions[fid];
    const m = s.fmeaData.failureModes[f.failureModeIds[0]];
    const c = s.fmeaData.failureCauses[m.causeIds[0]];
    console.log(`        · ${f.productCharacteristic} → S${s.fmeaData.failureEffects[m.effectIds[0]].severity}`
      + `/O${c.occurrence}/D${c.detection} AP=${c.actionPriority}`
      + `  ${c.remarks.startsWith('BENZER') ? '[uyarlandı]' : ''}`);
  }
}
const akis = Object.values(s.fmeaData.processStepFunctions).filter(f => f.flowchartSymbol).length;
console.log(`
akis semasi satiri: ${akis}  (adim sayisi: ${s.ozet.adim})`);
const g = Object.values(s.fmeaData.processSteps).find(x => x.name.startsWith('Girdi'));
const gf = s.fmeaData.processStepFunctions[g.functionIds[0]];
console.log('girdi ornekleme sikligi:', gf.sampleFrequency);
console.log('girdi tespit kontrol   :', s.fmeaData.failureCauses[Object.keys(s.fmeaData.failureCauses)[0]].detectionControl);
console.log('remarks (ilk 3)        :', JSON.stringify(Object.values(s.fmeaData.failureCauses).slice(0,3).map(c => c.remarks)));
const ornek = Object.values(s.fmeaData.failureCauses).find(c => c.preventionControl && c.preventionControl.length > 25);
if (ornek) {
  console.log('\nUYARLANAN ÖRNEK');
  console.log('  neden      :', ornek.description);
  console.log('  mevcut önleme:', ornek.preventionControl);
  console.log('  mevcut tespit:', ornek.detectionControl);
  console.log('  not        :', ornek.remarks);
  (ornek.actions || []).forEach(a => console.log(`  aksiyon(${a.type}) hedef ${a.targetCompletionDate}: ${a.description}`));
}
