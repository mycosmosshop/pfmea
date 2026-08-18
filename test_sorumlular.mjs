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


// -- Aksiyon sorumlusu atama havuzu --
const hc = K.atamaHavuzu('Çerkezköy');
assert.ok(!hc.includes('Emrah Eryılmaz') && !hc.includes('Ünal Ürkmez'),
  'Emrah ve Ünal aksiyon sahibi olarak atanmaz');
assert.ok(hc.includes('Umut Çiftçiogulları') && hc.includes('Volkan Pekatik'));
// Ağırlık: birincil iki isim havuzun üçte ikisi
const sayac = (h, ad) => h.filter(x => x === ad).length;
assert.strictEqual(sayac(hc, 'Umut Çiftçiogulları') + sayac(hc, 'Volkan Pekatik'), (hc.length / 3) * 2,
  'birincil isimler havuzun 2/3ü olmalı');
assert.ok(hc.includes('Necmettin Altıntaş'), 'ekibin geri kalanı da dağılıma girer');

const ha = K.atamaHavuzu('Ankara');
assert.ok(ha.includes('Mete Yılmaz') && ha.includes('Emre Biçer'));
assert.ok(!ha.includes('Umut Çiftçiogulları'), 'Ankara havuzunda Umut olmamalı');
assert.ok(!ha.includes('Emrah Eryılmaz') && !ha.includes('Ünal Ürkmez'));
assert.strictEqual(sayac(ha, 'Mete Yılmaz') + sayac(ha, 'Emre Biçer'), (ha.length / 3) * 2);

// Atama sırayla ve TEKRARLANABILIR (rastgele değil)
assert.strictEqual(K.atananSorumlu(hc, 0), K.atananSorumlu(hc, 0));
assert.strictEqual(K.atananSorumlu(hc, 0), hc[0]);
assert.strictEqual(K.atananSorumlu(hc, hc.length), hc[0], 'havuz başa döner');
assert.strictEqual(K.atananSorumlu([], 3), '', 'havuz boşsa boş döner');
// Dağılım: 60 atamada birincil pay ~2/3
const dagilim = Array.from({length: 60}, (_, i) => K.atananSorumlu(hc, i));
const birincilPay = dagilim.filter(x => x === 'Umut Çiftçiogulları' || x === 'Volkan Pekatik').length;
assert.strictEqual(birincilPay, 40, 'aksiyonların 2/3ü birincil isimlere gitmeli');

console.log('OK sorumlular: Çerkezköy/Ankara listeleri, yazım varyasyonları, özel ad koruma.');
