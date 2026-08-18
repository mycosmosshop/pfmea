// Lokasyona göre sorumlu listeleri.
//   çalıştır:  node test_sorumlular.mjs
import assert from 'assert';
import { buildSync } from 'esbuild';

const cikti = buildSync({
  entryPoints: ['utils/sorumlular.ts'],
  bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2020',
}).outputFiles[0].text;
const K = await import('data:text/javascript;base64,' + Buffer.from(cikti).toString('base64'));

// Çerkezköy: 9 kişi, Umut var; Emre/Mete yok
const c = K.sorumlular('Çerkezköy');
assert.strictEqual(c.length, 9);
assert.ok(c.includes('Umut Çiftçiogulları'));
assert.ok(c.includes('Volkan Pekatik'));
assert.ok(!c.includes('Emre Biçer') && !c.includes('Mete Yılmaz'));

// Ankara: Umut yok; Emre ve Mete var
const a = K.sorumlular('Ankara');
assert.strictEqual(a.length, 10);
assert.ok(!a.includes('Umut Çiftçiogulları'), 'Ankara listesinde Umut olmamalı');
assert.ok(a.includes('Emre Biçer') && a.includes('Mete Yılmaz'));
assert.ok(a.includes('Necmettin Altıntaş'), 'ortak isimler iki listede de olmalı');

// Yazım varyasyonları
assert.deepStrictEqual(K.sorumlular('ANKARA'), a);
assert.deepStrictEqual(K.sorumlular('Ankara / Sincan'), a);
assert.deepStrictEqual(K.sorumlular('çerkezköy'), c);
assert.deepStrictEqual(K.sorumlular(''), c, 'tanınmayan lokasyon merkeze (Çerkezköy) düşmeli');
assert.deepStrictEqual(K.sorumlular(null), c);

// Lokasyon değişiminde: standart adlar değişir, özel adlar korunur
const eski = [...K.sorumlular('Çerkezköy'), 'Ayşegül Danışman'];
const yeni = K.listeGuncelle(eski, 'Ankara');
assert.ok(!yeni.includes('Umut Çiftçiogulları'), 'Umut çıkmalı');
assert.ok(yeni.includes('Emre Biçer') && yeni.includes('Mete Yılmaz'), 'Ankara adları gelmeli');
assert.ok(yeni.includes('Ayşegül Danışman'), 'elle eklenen özel ad korunmalı');
assert.deepStrictEqual(K.listeGuncelle(undefined, 'Ankara'), K.sorumlular('Ankara'), 'boş liste de çalışmalı');

console.log('OK sorumlular: Çerkezköy/Ankara listeleri, yazım varyasyonları, özel ad koruma.');
