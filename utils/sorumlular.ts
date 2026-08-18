// Lokasyona göre aksiyon sorumluları. Aksiyon ekranındaki "Responsible"
// listesi projenin kayıt defterinden gelir; proje açılışında ve lokasyon
// değişiminde bu listelerle doldurulur.
const ORTAK = [
  'Necmettin Altıntaş', 'Sinem Kaya', 'Emrah Eryılmaz', 'Ünal Ürkmez',
  'Gökhan Öztekin', 'Adnan Semiz', 'K.Altıparmak', 'Volkan Pekatik',
];

export const SORUMLULAR: Record<string, string[]> = {
  cerkezkoy: [...ORTAK, 'Umut Çiftçiogulları'],
  ankara: [...ORTAK, 'Emre Biçer', 'Mete Yılmaz'],
};

const duz = (x: any) => String(x ?? '').toLocaleLowerCase('tr')
  .replace(/[ıİ]/g, 'i').replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u');

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
