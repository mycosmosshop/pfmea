// Task manager görev durumu: tamamlandı işaretleme / geri alma.
//   çalıştır:  node test_gorev.mjs
import assert from 'assert';
import { buildSync } from 'esbuild';

const cikti = buildSync({
  entryPoints: ['utils/gorev.ts'],
  bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2020',
}).outputFiles[0].text;
const { durumDegistir } = await import('data:text/javascript;base64,' + Buffer.from(cikti).toString('base64'));

const veri = () => ({
  failureCauses: {
    c1: { id: 'c1', actions: [
      { id: 'a1', status: 'Open', completionDate: '' },
      { id: 'a2', status: 'Open', completionDate: '' },
    ] },
    c2: { id: 'c2', actions: [{ id: 'a3', status: 'Completed', completionDate: '2026-01-05' }] },
    c3: { id: 'c3' },                       // aksiyonsuz neden — patlamamalı
  },
});

// Tamamla: yalnız hedef görev değişir, tarih bugünden yazılır
const v1 = durumDegistir(veri(), 'a1', true, '2026-08-19');
assert.strictEqual(v1.failureCauses.c1.actions[0].status, 'Completed');
assert.strictEqual(v1.failureCauses.c1.actions[0].completionDate, '2026-08-19');
assert.strictEqual(v1.failureCauses.c1.actions[1].status, 'Open', 'diğer görev etkilenmemeli');
assert.strictEqual(v1.failureCauses.c2.actions[0].completionDate, '2026-01-05');

// Girdi verisi değişmemeli (kopya üzerinde çalışılır)
const asil = veri();
durumDegistir(asil, 'a1', true, '2026-08-19');
assert.strictEqual(asil.failureCauses.c1.actions[0].status, 'Open', 'girdi bozulmamalı');

// Geri al: tamamlanma tarihi temizlenmeli
const v2 = durumDegistir(veri(), 'a3', false, '2026-08-19');
assert.strictEqual(v2.failureCauses.c2.actions[0].status, 'Open');
assert.strictEqual(v2.failureCauses.c2.actions[0].completionDate, '', 'açık görevde tamamlanma tarihi kalmamalı');

// Var olan tamamlanma tarihi korunur (yeniden işaretlemede üzerine yazılmaz)
const v3 = durumDegistir(veri(), 'a3', true, '2026-08-19');
assert.strictEqual(v3.failureCauses.c2.actions[0].completionDate, '2026-01-05');

// Bilinmeyen görev: hiçbir şey değişmemeli
assert.deepStrictEqual(durumDegistir(veri(), 'yok', true, '2026-08-19'), veri());

console.log('OK görev durumu: işaretleme, geri alma, tarih kuralları, kopya güvenliği.');
