// Lokasyona göre aksiyon sorumluları. Aksiyon ekranındaki "Responsible"
// listesi projenin kayıt defterinden gelir; proje açılışında ve lokasyon
// değişiminde bu listelerle doldurulur.
const duz = (x: any) => String(x ?? '').toLocaleLowerCase('tr')
  .replace(/[ıİ]/g, 'i').replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u');

const ORTAK = [
  'Necmettin Altıntaş', 'Sinem Kaya', 'Emrah Eryılmaz', 'Ünal Ürkmez',
  'Gökhan Öztekin', 'Adnan Semiz', 'K.Altıparmak', 'Volkan Pekatik',
];

export const SORUMLULAR: Record<string, string[]> = {
  cerkezkoy: [...ORTAK, 'Umut Çiftçiogulları'],
  ankara: [...ORTAK, 'Emre Biçer', 'Mete Yılmaz', 'Taner Şeşenoğlu',
           'Hasan Köse', 'Nagihan Şeşenoğlu'],
};

/** Lokasyonun ekibi — unvanlarıyla (FMEA "Team members" alanı için). */
export const EKIP: Record<string, string> = {
  ankara: 'Mete Yılmaz (Fabrika Müdürü), Emre Biçer (Kalite Mühendisi), '
        + 'Taner Şeşenoğlu (Üretim Sorumlusu), Hasan Köse (Bakım), '
        + 'Nagihan Şeşenoğlu (Ar-Ge ve Planlama)',
  cerkezkoy: '',
};

// ERP'deki şube adları (operasyon_kartlari.makine_grup) → kısa ad.
const SUBELER: [string, string][] = [
  ['ankara', 'Ankara'], ['cerkezkoy', 'Çerkezköy'],
  ['eskisehir', 'Eskişehir'], ['velikoy', 'Veliköy'],
];

/**
 * ERP operasyon kartından üretim yerini bulur.
 *
 * Kaynak makine_grup sütunu ("ANKARA SUBESI", "ÇERKEZKÖY TEKNIK").
 * Rota birden çok şubeye değiyorsa çoğunluk kazanır — 700.0.570-A gibi
 * ürünlerde araya tek bir Çerkezköy makinesi girebiliyor.
 *
 * Grup boşsa makine adındaki "(ANK)" izine düşülür; o da yoksa merkez
 * (Çerkezköy) — eski davranış. Adda iz yalnız 3 makinede var, bu yüzden
 * yedek; birincil kaynak grup sütunu.
 */
export function lokasyonBul(rota: any[] | undefined): string {
  const say = new Map<string, number>();
  (rota || []).forEach((r: any) => {
    const g = duz(r?.makine_grup);
    const bulunan = SUBELER.find(([anahtar]) => g.includes(anahtar));
    if (bulunan) say.set(bulunan[1], (say.get(bulunan[1]) || 0) + 1);
  });
  if (say.size) {
    return [...say].sort((a, b) => b[1] - a[1])[0][0];
  }
  const iz = (rota || []).some((r: any) => {
    const s = duz(`${r?.makine_adi ?? ''} ${r?.makine_kodu ?? ''} `
      + `${r?.rota_adi ?? ''}`);
    return /\(ank\)|\bank\b|ankara/.test(s);
  });
  return iz ? 'Ankara' : 'Çerkezköy';
}



// Lokasyon adından liste seçer; tanınmayan lokasyon Çerkezköy'e düşer (merkez).
export function sorumlular(lokasyon: any): string[] {
  return duz(lokasyon).includes('ankara') ? SORUMLULAR.ankara : SORUMLULAR.cerkezkoy;
}

// Lokasyon değişiminde kayıt defteri listesini günceller: iki standart
// listeye ait adlar çıkarılıp yeni lokasyonunkiler konur; kullanıcının elle
// eklediği özel adlar korunur.
export function listeGuncelle(mevcut: string[] | undefined, lokasyon: any): string[] {
  const standart = new Set([...SORUMLULAR.cerkezkoy, ...SORUMLULAR.ankara]);
  const ozel = (mevcut || []).filter(p => !standart.has(p));
  return [...sorumlular(lokasyon), ...ozel];
}

// ── Aksiyon sorumlusu ataması ────────────────────────────────────────────
// Üretilen aksiyonlara sorumlu atanır. Emrah Eryılmaz ve Ünal Ürkmez ekipte
// olmakla birlikte aksiyon sahibi olarak atanmaz (onay/gözden geçirme
// tarafındalar); ağırlık lokasyonun birincil isimlerinde.
const BIRINCIL: Record<string, string[]> = {
  cerkezkoy: ['Umut Çiftçiogulları', 'Volkan Pekatik'],
  ankara: ['Mete Yılmaz', 'Emre Biçer'],
};
const ATANMAZ = ['Emrah Eryılmaz', 'Ünal Ürkmez'];

// Sıralı havuz: her iki birincil isimden sonra bir diğer ekip üyesi gelir,
// böylece yük ağırlıklı olarak birincillerde kalır ama ekip de dağılır.
export function atamaHavuzu(lokasyon: any): string[] {
  const anahtar = duz(lokasyon).includes('ankara') ? 'ankara' : 'cerkezkoy';
  const birincil = BIRINCIL[anahtar];
  const diger = sorumlular(lokasyon).filter(p => !birincil.includes(p) && !ATANMAZ.includes(p));
  if (!diger.length) return [...birincil];
  const havuz: string[] = [];
  diger.forEach(p => havuz.push(birincil[0], birincil[1], p));
  return havuz;
}

// Sıra numarasına göre sorumlu — aynı girdi aynı atamayı verir (rastgele değil).
export function atananSorumlu(havuz: string[], sira: number): string {
  return havuz.length ? havuz[Math.abs(sira) % havuz.length] : '';
}
