// "None" seçilince özel karakteristik sembolü GERÇEKTEN kalkmalı — hem neden hem de
// üst fonksiyon seviyesinde. Tablo/flow fonksiyon seviyesini okuduğu için biri kalırsa sembol ekranda durur.
//   çalıştır:  node test_classification.mjs
import assert from 'assert';

// App.tsx handleSetCauseClassification mantığı (birebir)
function setCauseCls(data, causeId, symbol){
  const next=JSON.parse(JSON.stringify(data));
  const sym=(!symbol||symbol==='none')?undefined:symbol;
  next.failureCauses[causeId].classificationSymbol=sym;
  const modeId=Object.keys(next.failureModes).find(m=>(next.failureModes[m].causeIds||[]).includes(causeId));
  const funcId=modeId&&Object.keys(next.processStepFunctions).find(f=>(next.processStepFunctions[f].failureModeIds||[]).includes(modeId));
  if(funcId){ const func=next.processStepFunctions[funcId];
    if(sym){ func.classificationSpecialCharacteristic=true;
      if(!func.classificationSymbolBefore) func.classificationSymbolBefore=sym;
      if(!func.classificationSymbolAfter)  func.classificationSymbolAfter=sym;
    } else {
      const baskasindaVar=(func.failureModeIds||[]).flatMap(m=>next.failureModes[m]?.causeIds||[])
        .some(c=>c!==causeId && next.failureCauses[c]?.classificationSymbol);
      if(!baskasindaVar){ func.classificationSpecialCharacteristic=false;
        func.classificationSymbolBefore=undefined; func.classificationSymbolAfter=undefined; }
    }
  }
  return next;
}
const baz=()=>({ processStepFunctions:{F1:{failureModeIds:['M1']}},
                 failureModes:{M1:{causeIds:['C1','C2']}},
                 failureCauses:{C1:{},C2:{}} });

let d=setCauseCls(baz(),'C1','(***)');
assert.strictEqual(d.failureCauses.C1.classificationSymbol,'(***)');
assert.strictEqual(d.processStepFunctions.F1.classificationSpecialCharacteristic,true);
assert.strictEqual(d.processStepFunctions.F1.classificationSymbolBefore,'(***)');

d=setCauseCls(d,'C1','none');                                  // ← bozuk olan buydu
assert.strictEqual(d.failureCauses.C1.classificationSymbol,undefined);
assert.strictEqual(d.processStepFunctions.F1.classificationSpecialCharacteristic,false,'fonksiyon işareti kalkmalı');
assert.strictEqual(d.processStepFunctions.F1.classificationSymbolBefore,undefined,'2. adım temizlenmeli');
assert.strictEqual(d.processStepFunctions.F1.classificationSymbolAfter,undefined,'6. adım temizlenmeli');

// aynı fonksiyonda BAŞKA nedende sembol varsa fonksiyon seviyesi KORUNMALI
let e=setCauseCls(setCauseCls(baz(),'C1','diamond'),'C2','shield');
e=setCauseCls(e,'C1','none');
assert.strictEqual(e.failureCauses.C1.classificationSymbol,undefined);
assert.strictEqual(e.processStepFunctions.F1.classificationSpecialCharacteristic,true,'C2 hâlâ sembollü → korunmalı');

// DataEntryModal handleSelectSymbol mantığı
function selSym(prev,symbol){ const f={...prev};
  if(symbol==='none'){ f.classificationSymbolBefore=''; f.classificationSymbolAfter=''; f.classificationSpecialCharacteristic=false; return f; }
  if(prev.classificationSpecialCharacteristic) f.classificationSymbolBefore=symbol; else f.classificationSymbolAfter=symbol;
  return f; }
const g=selSym({classificationSpecialCharacteristic:true,classificationSymbolBefore:'diamond',classificationSymbolAfter:'shield'},'none');
assert.deepStrictEqual([g.classificationSymbolBefore,g.classificationSymbolAfter,g.classificationSpecialCharacteristic],['','',false]);
console.log('✔ "None" sembolü her iki seviyeden de kaldırıyor');
