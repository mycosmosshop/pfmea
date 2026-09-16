// Aksiyon geçmişi: tarih, özet ve TEKRAR koruması doğru mu?
//
// Kırılan hâl: "Değişiklikleri Otomatik Ekle" yalnız tablo diff'ini
// BUGÜNÜN tarihiyle tek satır ekliyordu; aksiyonların kendi hedef /
// gerçekleşme tarihleri geçmişe hiç girmiyordu. İkinci tıklamada aynı
// aksiyon tekrar yazılabiliyordu.
//
// Çalıştır:  node utils/actionHistory.test.mjs
import { strict as assert } from 'node:assert';
// Node 22 .ts dosyasini dogrudan yukluyor; onceki regex ile tip siyirma
// kirilgandi (yeni bir tip anotasyonu testi sessizce cokertiyordu).
import { aksiyonGecmisi, ozetle, gecmisiSirala } from './actionHistory.ts';

let hata = 0;
const ok = (ad, kosul, ek) => {
  if (kosul) console.log('  OK  ' + ad);
  else { console.log('HATA ' + ad + (ek !== undefined ? '  -> ' + JSON.stringify(ek) : '')); hata++; }
};

const VERI = {
  failureCauses: {
    c1: {
      description: 'Operatör iş emrindeki parametreyi görmüyor',
      actions: [
        { id: 'a1', type: 'prevention', number: 1,
          description: 'İş emri / operasyon kartı ekranında ilgili parametre alanı en üste alınarak operatörün ilk gördüğü bilgi haline getirilmiştir.',
          responsiblePerson: 'Volkan Pekatik',
          targetCompletionDate: '2026-02-16', status: 'Completed' },
        { id: 'a2', type: 'detection',
          description: 'Operasyon başlangıcında iş emrindeki ilgili parametre operatör ile sözlü olarak teyit edilmekte; istasyondaki mevcut görsel talimat üzerinde bu değer büyük punto ile öne çıkarılmıştır.',
          responsiblePerson: 'Necmettin Altıntaş',
          targetCompletionDate: '2026-03-16', status: 'Completed' },
      ],
    },
    c2: {
      description: 'Yanlış yarı mamul kullanımı',
      actions: [
        { id: 'a3', type: 'prevention', description: 'Tarihsiz aksiyon' },      // tarih yok
        { id: 'a4', type: 'prevention', targetCompletionDate: '2026-04-01' },   // metin yok
        { id: 'a5', type: 'prevention', description: 'Gerçekleşme tarihi olan aksiyon',
          targetCompletionDate: '2026-05-01', completionDate: '2026-04-20' },
      ],
    },
  },
};

console.log('='.repeat(62));
console.log('PFMEA AKSİYON GEÇMİŞİ');
console.log('='.repeat(62));

const s1 = aksiyonGecmisi(VERI, [], { revision: '1/0', hazirlayan: 'X', onaylayan: 'Y' });
ok(`tarihli ve metinli aksiyonlar satır oldu (${s1.length})`, s1.length === 3, s1.map(x => x.id));
ok('tarihsiz aksiyon atlandı', !s1.some(x => x.id === 'h_act_a3'));
ok('metinsiz aksiyon atlandı', !s1.some(x => x.id === 'h_act_a4'));

// Tarih: bugün DEĞİL, aksiyonun kendi tarihi
const bugun = new Date().toISOString().slice(0, 10);
ok('tarih bugünün tarihi değil', !s1.some(x => x.date === bugun), s1.map(x => x.date));
ok('hedef tarih kullanılıyor',
   s1.find(x => x.id === 'h_act_a1').date === '2026-02-16');
ok('gerçekleşme tarihi hedefe yeğleniyor',
   s1.find(x => x.id === 'h_act_a5').date === '2026-04-20',
   s1.find(x => x.id === 'h_act_a5').date);
ok('tarihe göre sıralı',
   s1.map(x => x.date).join() === [...s1.map(x => x.date)].sort().join(),
   s1.map(x => x.date));

// Özet ve sorumlular
const a1 = s1.find(x => x.id === 'h_act_a1');
ok('açıklama özetlenmiş (≤160)', a1.changeDescription.length <= 160,
   a1.changeDescription.length);
ok('tip etiketi var', a1.changeDescription.startsWith('Önleme aksiyonu:'),
   a1.changeDescription.slice(0, 24));
ok('tespit aksiyonu ayrı etiketli',
   s1.find(x => x.id === 'h_act_a2').changeDescription.startsWith('Tespit aksiyonu:'));
ok('hazırlayan = aksiyon sorumlusu', a1.preparedBy === 'Volkan Pekatik', a1.preparedBy);
ok('sorumlusuz aksiyonda varsayılan hazırlayan',
   s1.find(x => x.id === 'h_act_a5').preparedBy === 'X');
ok('değişiklik nedeni failure cause’dan', a1.changeReason.startsWith('Neden:'),
   a1.changeReason);
ok('özet kelime sınırında kesiyor', ozetle('a'.repeat(50) + ' bcd efg', 55).endsWith('…'));
ok('kısa metin olduğu gibi', ozetle('kısa') === 'kısa');

// ── TEKRAR koruması ──
const s2 = aksiyonGecmisi(VERI, s1, { revision: '1/0' });
ok('ikinci çağrıda tekrar eklenmiyor', s2.length === 0, s2.map(x => x.id));

const yariGecmis = s1.filter(x => x.id === 'h_act_a1');
const s3 = aksiyonGecmisi(VERI, yariGecmis, {});
ok('yalnız kayıtlı olmayanlar ekleniyor', s3.length === 2, s3.map(x => x.id));

// Açıklama sonradan düzenlenmiş olsa da tekrar sayılır (id ile eşleşme)
const duzenlenmis = s1.map(x => ({ ...x, changeDescription: 'elle düzenlendi' }));
ok('açıklama düzenlenince de tekrar eklenmiyor',
   aksiyonGecmisi(VERI, duzenlenmis, {}).length === 0);

// ── Aksiyon metni: Prevention/Detection Action, kanit DEGIL ────────────
// Once actionTaken (kanit) yaziliyordu; gecmise "Mevcut is emri /
// operasyon karti" gibi 15 kanit satiri dusuyordu.
{
  const V = { failureCauses: { c: { description: 'n', actions: [{
    id: 'x1', type: 'prevention', targetCompletionDate: '2026-01-05',
    description: 'Parametre alani ekranda en uste alinmistir',
    actionTaken: 'Mevcut is emri / operasyon karti' }] } } };
  const r = aksiyonGecmisi(V, [], {});
  ok('aksiyon metni yazılıyor (kanıt değil)',
     r[0].changeDescription === 'Önleme aksiyonu: Parametre alani ekranda en uste alinmistir',
     r[0].changeDescription);
}
{
  const V = { failureCauses: { c: { description: 'n', actions: [{
    id: 'x2', targetCompletionDate: '2026-01-05',
    actionTaken: 'Yalniz kanit var' }] } } };
  ok('aksiyon metni yoksa kanıt yedek',
     aksiyonGecmisi(V, [], {})[0].changeDescription.includes('Yalniz kanit var'));
}

// ── Tekrar eleme: ayni metin onlarca hata nedeninde geciyor ────────────
// 216.0.367 olcumu: 121 satirin yalniz 40'i farkliydi, biri 14 kez.
const AYNI = (n) => ({ failureCauses: Object.fromEntries(
  Array.from({ length: n }, (_, i) => [`c${i}`, { description: `Neden ${i}`, actions: [{
    id: `a${i}`, type: 'prevention', responsiblePerson: 'Mete Yılmaz',
    completionDate: '2026-02-16', description: 'Is emri ekraninda parametre one alindi' }] }]))
});
{
  const r = aksiyonGecmisi(AYNI(14), [], {});
  ok('14 aynı aksiyon tek satır', r.length === 1, r.length);
  ok('kaç nedende geçtiği nedende yazıyor',
     r[0].changeReason.includes('+13 benzer neden'), r[0].changeReason);
  // Farkli tarih / farkli sorumlu ayri satir kalmali
  const karisik = AYNI(3);
  karisik.failureCauses.c1.actions[0].completionDate = '2026-03-16';
  karisik.failureCauses.c2.actions[0].responsiblePerson = 'Emre Biçer';
  ok('tarih farklıysa ayrı satır', aksiyonGecmisi(karisik, [], {}).length === 3,
     aksiyonGecmisi(karisik, [], {}).map(x => x.date + '|' + x.preparedBy));
}
{
  // Ikinci tiklama: id farkli olsa bile ayni icerik yeniden yazilmaz
  const ilk = aksiyonGecmisi(AYNI(14), [], {});
  const baskaId = { failureCauses: { z: { description: 'Baska neden', actions: [{
    id: 'bambaska', type: 'prevention', responsiblePerson: 'Mete Yılmaz',
    completionDate: '2026-02-16', description: 'Is emri ekraninda parametre one alindi' }] } } };
  ok('geçmişte aynı içerik varsa yeni id de eklenmiyor',
     aksiyonGecmisi(baskaId, ilk, {}).length === 0);
  ok('tekrar sayısı nedene yazılınca anahtar bozulmuyor',
     aksiyonGecmisi(AYNI(14), ilk, {}).length === 0);
}

ok('boş veride satır yok', aksiyonGecmisi({}, [], {}).length === 0);
ok('failureCauses yoksa çökmüyor', aksiyonGecmisi({ failureCauses: null }, [], {}).length === 0);

// ── Sıralama ve revizyon numaralandırma ───────────────────────────────
// Aksiyon satirlari sona ekleniyordu: ustte 2026 uretim kaydi, altinda
// 2025 aksiyonlari. Revizyon alani da hic artmiyordu.
{
  const G = [
    { id: 'a', date: '2026-06-05', changeDescription: 'ERP uretimi' },
    { id: 'b', date: '2025-01-03', changeDescription: 'Onleme 1' },
    { id: 'c', date: '2025-01-03', changeDescription: 'Onleme 2' },
    { id: 'd', date: '2025-03-17', changeDescription: 'Onleme 3' },
  ];
  const s = gecmisiSirala(G);
  ok('tarihe göre baştan sona sıralı',
     s.map(x => x.date).join() === '2025-01-03,2025-01-03,2025-03-17,2026-06-05',
     s.map(x => x.date));
  ok('revizyon tarihle birlikte artıyor',
     s.map(x => x.revision).join() === 'Rev.00,Rev.00,Rev.01,Rev.02',
     s.map(x => x.revision));
  ok('aynı tarih aynı revizyon', s[0].revision === s[1].revision);
  ok('satır içeriği korunuyor',
     s.map(x => x.changeDescription).join() === 'Onleme 1,Onleme 2,Onleme 3,ERP uretimi');
  ok('aynı tarihte özgün sıra korunuyor', s[0].id === 'b' && s[1].id === 'c');
}
{
  const s = gecmisiSirala([
    { id: 'x', changeDescription: 'tarihsiz' },
    { id: 'y', date: '2025-05-01' },
  ]);
  ok('tarihsiz satır sona', s[1].id === 'x', s.map(x => x.id));
  ok('tarihsiz satır da numaralanıyor', s[1].revision === 'Rev.01');
}
ok('boş geçmiş çökmüyor', gecmisiSirala([]).length === 0 && gecmisiSirala(undefined).length === 0);
ok('sıralama kararlı (iki kez aynı sonuç)', (() => {
  const G = [{ id: 'a', date: '2025-02-02' }, { id: 'b', date: '2025-01-01' }];
  return JSON.stringify(gecmisiSirala(gecmisiSirala(G))) === JSON.stringify(gecmisiSirala(G));
})());

console.log('='.repeat(62));
console.log(hata ? `${hata} HATA` : 'TÜM KONTROLLER GEÇTİ');
process.exit(hata ? 1 : 0);
