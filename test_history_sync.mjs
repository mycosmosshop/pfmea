// FMEA No / Versiyon, geçmişin SON satırıyla eşitlenebilmeli (no kısmı korunur).
//   çalıştır:  node test_history_sync.mjs
import assert from 'assert';
const esitle=(versiyon,sonRev)=>`${(versiyon||'').split('/')[0].trim()||'FMEA'} / ${sonRev.revision}`;

assert.strictEqual(esitle('FR34 / Rev.08',{revision:'Rev2'}),'FR34 / Rev2');   // ekrandaki uyumsuzluk
assert.strictEqual(esitle('54 / Rev.09',{revision:'Rev5'}),'54 / Rev5');
assert.strictEqual(esitle('',{revision:'Rev0'}),'FMEA / Rev0');                // no boşsa çökmesin
assert.strictEqual(esitle('FR34',{revision:'Rev1'}),'FR34 / Rev1');            // ayraç yoksa
// uyumsuzluk tespiti
const uyumsuz=(v,s)=>!!s && v!==esitle(v,s);
assert.strictEqual(uyumsuz('FR34 / Rev.08',{revision:'Rev2'}),true);
assert.strictEqual(uyumsuz('FR34 / Rev2',{revision:'Rev2'}),false);
assert.strictEqual(uyumsuz('FR34 / Rev.08',null),false);                       // geçmiş boşsa uyarma
console.log('✔ versiyon eşitleme: FMEA no korunuyor, revizyon geçmişten alınıyor');
