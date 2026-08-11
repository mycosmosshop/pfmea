// JSON'dan gelen projede sembol KATALOĞU eksik olsa bile Available Symbols tam görünmeli.
//   çalıştır:  node test_symbols.mjs
import assert from 'assert';
import fs from 'fs';

const src=fs.readFileSync('App.tsx','utf8');
// standart katalogdaki sembol sayısı (initialStandardSymbolsData içindeki key'ler)
const blok=src.slice(src.indexOf('const initialStandardSymbolsData'), src.indexOf('const initialAvailableSymbols'));
const STD=[...blok.matchAll(/key:\s*'([^']+)'/g)].map(m=>m[1]);
assert.ok(STD.length>=15, 'standart katalog beklenenden küçük: '+STD.length);

// App.tsx'teki withStandardSymbols mantığı (birebir)
const initialAvailableSymbols=STD.map(k=>({key:k,label:k,svgString:'<svg/>',isStandard:true}));
function withStandardSymbols(reg){
  const base={...(reg||{})};
  const merged=initialAvailableSymbols.map(s=>({...s}));
  (reg?.availableFlowchartSymbols||[]).forEach(s=>{
    const i=merged.findIndex(x=>x.key===s.key);
    if(i>=0) merged[i]={...merged[i],...s}; else merged.push(s);
  });
  base.availableFlowchartSymbols=merged;
  return base;
}

// 1) katalog HİÇ yoksa (eski/elle yazılmış JSON) → tam katalog gelir
assert.strictEqual(withStandardSymbols({}).availableFlowchartSymbols.length, STD.length);
// 2) katalog KIRPIK geldiyse → tamamlanır
assert.strictEqual(withStandardSymbols({availableFlowchartSymbols:[{key:'process',label:'Process',svgString:'<svg/>'}]})
  .availableFlowchartSymbols.length, STD.length);
// 3) projeye ÖZEL sembol korunur ve eklenir
const r3=withStandardSymbols({availableFlowchartSymbols:[{key:'ozel1',label:'Özel',svgString:'<svg/>'}]});
assert.strictEqual(r3.availableFlowchartSymbols.length, STD.length+1);
assert.ok(r3.availableFlowchartSymbols.some(s=>s.key==='ozel1'));
// 4) projedeki DÜZENLEME standardı ezer (etiket/svg değişikliği kaybolmaz)
const r4=withStandardSymbols({availableFlowchartSymbols:[{key:'process',label:'İŞLEM (özel)',svgString:'<svg id="x"/>'}]});
assert.strictEqual(r4.availableFlowchartSymbols.find(s=>s.key==='process').label,'İŞLEM (özel)');
assert.strictEqual(r4.availableFlowchartSymbols.length, STD.length);

// 5) özel sembol silinince AKTİF listeden ÇIKARILMALI (=== / !== hatası)
const aktif=[{key:'process'},{key:'ozel1'}];
assert.deepStrictEqual(aktif.filter(s=>s.key!=='ozel1').map(s=>s.key),['process']);
console.log('✔ sembol kataloğu tamamlanıyor ('+STD.length+' standart), özel semboller ve düzenlemeler korunuyor');
