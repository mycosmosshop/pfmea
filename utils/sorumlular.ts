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
