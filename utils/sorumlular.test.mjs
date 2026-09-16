// Lokasyon tespiti: ERP rotasından hangi şube?
//
// Kırılan hâl: erpPfmea.ts sabit 'Çerkezköy' yazıyordu — Ankara ürününde
// bile Çerkezköy ekibi atanıyordu. Kaynak operasyon kartındaki
// makine_grup sütunu ("ANKARA SUBESI"); adındaki "(ANK)" izi yedek.
//
// Çalıştır:  node utils/sorumlular.test.mjs
import { lokasyonBul, sorumlular, EKIP, listeGuncelle } from './sorumlular.ts';

let hata = 0;
const ok = (ad, kosul, ek) => {
  if (kosul) console.log('  OK  ' + ad);
  else { console.log('HATA ' + ad + (ek !== undefined ? '  -> ' + JSON.stringify(ek) : '')); hata++; }
};

// ERP'den okunan gerçek rota (216.0.367 · Bazotect plaka · MAN 83.72010-6984)
const ANKARA = [
  { makine_kodu: '910.5.003', makine_adi: 'BLS BSL204 YATAY KESIM', makine_grup: 'ANKARA SUBESI' },
  { makine_kodu: '910.5.701', makine_adi: 'LMN4 TUNEL LAMINASYON MAKINESI (ANK)', makine_grup: 'ANKARA SUBESI' },
  { makine_kodu: '910.5.700', makine_adi: 'SJT2 SU JETI KESIM MAKINESI (ANK)', makine_grup: 'ANKARA SUBESI' },
  { makine_kodu: '910.5.705', makine_adi: 'PAKETLEME ISÇILIGI', makine_grup: 'ANKARA SUBESI' },
];
const CERKEZKOY = [
  { makine_kodu: '910.5.719', makine_adi: 'SICAK SILINDIR 2 CRK', makine_grup: 'ÇERKEZKÖY TEKNIK' },
  { makine_kodu: '910.5.951', makine_adi: '(CRK) AIÇ AMBALAJLAMA ISÇILIGI', makine_grup: 'ÇERKEZKÖY TEKNIK' },
];

console.log('='.repeat(62));
console.log('PFMEA LOKASYON TESPİTİ');
console.log('='.repeat(62));

ok('Ankara rotası Ankara', lokasyonBul(ANKARA) === 'Ankara', lokasyonBul(ANKARA));
ok('Çerkezköy rotası Çerkezköy', lokasyonBul(CERKEZKOY) === 'Çerkezköy', lokasyonBul(CERKEZKOY));
ok('boş rota merkeze düşer', lokasyonBul([]) === 'Çerkezköy');
ok('rota yoksa çökmüyor', lokasyonBul(undefined) === 'Çerkezköy');
ok('boş alanlarda çökmüyor', lokasyonBul([{}, null]) === 'Çerkezköy');

// Diğer şubeler de kendi adlarıyla görünmeli (ekipleri yok, merkeze düşerler)
ok('Eskişehir şubesi', lokasyonBul([{ makine_grup: 'ESKISEHIR SUBESI' }]) === 'Eskişehir',
   lokasyonBul([{ makine_grup: 'ESKISEHIR SUBESI' }]));
ok('Veliköy şubesi', lokasyonBul([{ makine_grup: 'VELIKÖY SUBESI' }]) === 'Veliköy',
   lokasyonBul([{ makine_grup: 'VELIKÖY SUBESI' }]));

// Karışık rota: 700.0.570-A gibi ürünlerde araya tek Çerkezköy makinesi giriyor
const KARISIK = [...ANKARA, CERKEZKOY[0]];
ok('karışık rotada çoğunluk kazanır', lokasyonBul(KARISIK) === 'Ankara', lokasyonBul(KARISIK));
ok('çoğunluk Çerkezköy ise Çerkezköy',
   lokasyonBul([ANKARA[0], ...CERKEZKOY]) === 'Çerkezköy');

// Grup boşsa makine adındaki iz yedek (ERP'de 5 satırın grubu boş)
ok('grup boşken ad izi yedek',
   lokasyonBul([{ makine_adi: 'SJT2 SU JETI KESIM MAKINESI (ANK)' }]) === 'Ankara');
ok('ad izi yoksa merkez',
   lokasyonBul([{ makine_adi: 'KALENDER HATTI' }]) === 'Çerkezköy');
ok('ANKRAJ gibi kelime tetiklemiyor',
   lokasyonBul([{ makine_adi: 'ANKRAJ PRES' }]) === 'Çerkezköy',
   lokasyonBul([{ makine_adi: 'ANKRAJ PRES' }]));
ok('rota adından da bulur',
   lokasyonBul([{ rota_adi: 'Ankara su jeti kesim' }]) === 'Ankara');

// Lokasyon → ekip
const ank = sorumlular('Ankara');
ok('Ankara ekibi 5 kişi eklendi',
   ['Emre Biçer', 'Mete Yılmaz', 'Taner Şeşenoğlu', 'Hasan Köse', 'Nagihan Şeşenoğlu']
     .every(k => ank.includes(k)), ank);
ok('Çerkezköy kişisi Ankara listesinde yok', !ank.includes('Umut Çiftçiogulları'));
ok('Ankara EKIP metni unvanlı', EKIP.ankara.includes('Mete Yılmaz (Fabrika Müdürü)'));
ok('ekibi olmayan şube merkeze düşer',
   sorumlular('Eskişehir').includes('Umut Çiftçiogulları'));
ok('elle eklenen ad korunuyor',
   listeGuncelle([...sorumlular('Çerkezköy'), 'Dış Danışman'], 'Ankara')
     .includes('Dış Danışman'));

console.log('='.repeat(62));
console.log(hata ? `${hata} HATA` : 'TÜM KONTROLLER GEÇTİ');
process.exit(hata ? 1 : 0);
