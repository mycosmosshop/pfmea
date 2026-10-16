// PFMEA Excel'i: S/O/D hücreleri açılır listeden (1–10) seçilir, AP (H/M/L) formülle hesaplanır.
//
// AP, pakete eklenen "AP Matrisi" sayfasındaki 100×10 tablodan okunur: satır = (S-1)*10+O, sütun = D.
// Tablo uygulamanın AP matrisiyle birebir yazılır (kullanıcı matrisi değiştirdiyse o).
// xlsx-js-style açılır liste / koşullu biçim yazamadığı için bunlar paket XML'ine sonradan eklenir.

export const AP_SAYFA = 'AP Matrisi';
export const SOD_SAYFA = 'S-O-D Tabloları';
export const LISTE_SAYFA = 'Listeler';     // açılır liste kaynağı (gizli sayfa)

// Açılır listedeki kısa Türkçe anlamlar (AIAG-VDA PFMEA; ERP'deki S/O/D pencereleriyle aynı tablolar).
// Dizi sırası 1 → 10.
export const SOD_ETIKET: Record<'S' | 'O' | 'D', string[]> = {
  S: [
    'Fark edilebilir etki yok',
    'Hafif rahatsızlık; süreçte küçük aksama',
    'Orta rahatsızlık; kısmi istasyon içi tamir',
    'Belirgin görünüm/ses kusuru; %100 istasyonda tamir',
    'İkincil fonksiyonda bozulma; kısmi hat dışı tamir',
    'İkincil fonksiyon kaybı; %100 hat dışı tamir',
    'Ana fonksiyonda bozulma; kısmi hurda, ayıklama',
    'Ana fonksiyon kaybı; %100 hurda, sevkiyat durur',
    'Yasal mevzuata aykırılık',
    'Çalışan / son kullanıcı güvenliği riski',
  ],
  O: [
    'Önleyici kontrolle hata ortadan kalkmış',
    'Çok düşük: binde <0,001 (1/1.000.000)',
    'Düşük: binde 0,01 (1/100.000)',
    'Orta: binde 0,1 (1/10.000)',
    'Orta: binde 0,5 (1/2.000)',
    'Orta: binde 2 (1/500)',
    'Yüksek: binde 10 (1/100)',
    'Yüksek: binde 20 (1/50)',
    'Yüksek: binde 50 (1/20)',
    'Çok yüksek: binde ≥100 (≥1/10)',
  ],
  D: [
    'Hata oluşamaz ya da her zaman tespit edilir',
    'Kanıtlı yöntem; nedeni makine yakalar, hata oluşmaz',
    'Kanıtlı sistem; istasyonda otomatik tespit',
    'Kanıtlı sistem; sonraki istasyonda otomatik tespit',
    'Kanıtlı yöntem; yarı otomatik / makine tespiti',
    'Kanıtlı yöntem; insan kontrolü / manuel ölçüm',
    'Kanıtlanmamış yöntem; makine tespiti',
    'Kanıtlanmamış yöntem; insan kontrolü / manuel ölçüm',
    'Rastgele denetim; tespit olası değil',
    'Kontrol yöntemi yok; tespit edilemez',
  ],
};

/** "7 – Ana fonksiyonda bozulma; …" (1–10 dışı ya da boş → ''). */
export function sodEtiket(tur: 'S' | 'O' | 'D', n: unknown): string {
  const v = Number(n);
  return Number.isInteger(v) && v >= 1 && v <= 10 ? `${v} – ${SOD_ETIKET[tur][v - 1]}` : '';
}

/** Hücreye yazılan puan: 1–10 tam sayı, değilse ''. */
export function sodPuan(n: unknown): number | '' {
  const v = Number(n);
  return n !== '' && n != null && Number.isInteger(v) && v >= 1 && v <= 10 ? v : '';
}

/**
 * Liste kaynağındaki hücrenin sayı biçimi: değer 4, görünen "4 – Orta: binde 0,1 …".
 * Açılır liste görüneni gösterir ama seçilince hücreye yalnız SAYI yazılır (Excel 2019'da denendi).
 */
export const sodBicim = (tur: 'S' | 'O' | 'D', n: number): string =>
  '0"' + sodEtiket(tur, n).slice(String(n).length).replace(/"/g, "'") + '"';

type Ap = 'H' | 'M' | 'L';

/**
 * AP formülü (başında "=" yok). s/o/d: hücre adresi (H18). revize=true → "(M)" biçimi.
 * Hücrede "7 – açıklama" de olabilir düz 7 de: baştaki sayı okunur (VALUE(TRIM(LEFT(…;2)))).
 */
export function apFormulu(s: string, o: string, d: string, revize = false): string {
  const n = (h: string) => `VALUE(TRIM(LEFT(${h},2)))`;
  const ic = `INDEX('${AP_SAYFA}'!$C$2:$L$101,(${n(s)}-1)*10+${n(o)},${n(d)})`;
  return `IF(OR(${s}="",${o}="",${d}=""),"",IFERROR(${revize ? `"("&${ic}&")"` : ic},""))`;
}

/** AP matrisi sayfasının satırları: başlık + 100 satır (S, O, D1…D10). */
export function apMatrisSatirlari(m: Ap[][][]): (string | number)[][] {
  const out: (string | number)[][] = [['S', 'O', 'D=1', 'D=2', 'D=3', 'D=4', 'D=5', 'D=6', 'D=7', 'D=8', 'D=9', 'D=10']];
  for (let s = 1; s <= 10; s++)
    for (let o = 1; o <= 10; o++) out.push([s, o, ...m[s - 1][o - 1]]);
  return out;
}
