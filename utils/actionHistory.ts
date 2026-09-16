import type { FmeaData, HistoryEntry, FmeaAction } from '../types';

/**
 * Optimizasyon aksiyonlarını PFMEA değişiklik geçmişi satırlarına çevirir.
 *
 * "Değişiklikleri Otomatik Ekle" önce yalnız tablo diff'ini BUGÜNÜN
 * tarihiyle tek satır olarak ekliyordu. Oysa her aksiyonun kendi hedef /
 * gerçekleşme tarihi ve sorumlusu var — değişiklik gerçekte o tarihte
 * yapıldı. Her aksiyon ayrı bir geçmiş satırı olur.
 *
 * Aksiyon satırları TÜRETİLMİŞTİR, dondurulmuş değil: `h_act_<aksiyonId>`
 * kimlikli satırlar her çağrıda aksiyonlardan yeniden kurulur. Bir DÖF'ün
 * tarihi veya sorumlusu sonradan değişince geçmiş de güncellenir; aksiyon
 * silinince satırı kalkar. Önce "bu id zaten var" denip atlanıyordu ve
 * güncellenen tarih geçmişe hiç yansımıyordu.
 *
 * Aynı aksiyon metni onlarca hata nedeninde tekrarlanıyor (216.0.367
 * ölçümü: 121 satırın yalnız 40'ı farklı, biri 14 kez). Aynı tarih +
 * sorumlu + açıklama bir kez yazılır; kaç nedende geçtiği "Değişiklik
 * Nedeni" sütununda belirtilir.
 */

/** Otomatik üretilen geçmiş satırının kimlik öneki. */
export const AKSIYON_ONEK = 'h_act_';

/** Uzun metni kelime sınırında keser. */
export function ozetle(metin: string, enFazla = 140): string {
  const d = String(metin || '').replace(/\s+/g, ' ').trim();
  if (d.length <= enFazla) return d;
  const kes = d.lastIndexOf(' ', enFazla);
  const n = kes > enFazla * 0.6 ? kes : enFazla;
  return d.slice(0, n).replace(/[ ,;:.\-]+$/, '') + '…';
}

export interface AksiyonGecmisiSecenek {
  hazirlayan?: string;
  onaylayan?: string;
}

/** İçerik kimliği — aynı gün, aynı kişi, aynı aksiyon metni tek satırdır. */
const icerikAnahtari = (h: { date?: string; preparedBy?: string; changeDescription?: string }) =>
  `${String(h.date || '').slice(0, 10)}|${String(h.preparedBy || '')}|${String(h.changeDescription || '')}`;

/**
 * Geçmişi tarihe göre sıralar ve revizyonları yeniden numaralandırır.
 *
 * Aksiyon satırları mevcut geçmişin SONUNA ekleniyordu: üstte 2026
 * tarihli üretim kaydı, altında 2025 tarihli aksiyonlar kalıyordu.
 * Revizyon alanı da hiç artmıyor, hepsi aynı numarayı taşıyordu.
 *
 * Aynı tarihli satırlar AYNI revizyona aittir — tek günde kapatılan yedi
 * aksiyon yedi ayrı revizyon değildir. Tarihsiz satırlar sona alınır ve
 * kendi aralarındaki sıra korunur.
 */
export function gecmisiSirala(gecmis: HistoryEntry[] | undefined): HistoryEntry[] {
  const sirali = (gecmis || [])
    .map((h, i) => ({ h, i }))
    .sort((a, b) => (String(a.h.date || '9999-12-31')
      .localeCompare(String(b.h.date || '9999-12-31'))) || (a.i - b.i))
    .map(x => x.h);
  let no = -1;
  let onceki: string | null = null;
  return sirali.map(h => {
    const t = String(h.date || '');
    if (t !== onceki) { no++; onceki = t; }
    return { ...h, revision: `Rev.${String(no).padStart(2, '0')}` };
  });
}

/** Aksiyonlardan geçmiş satırlarını üretir (tekrarlayan içerik tek satır). */
export function aksiyonGecmisi(
  data: FmeaData,
  secenek: AksiyonGecmisiSecenek = {},
): HistoryEntry[] {
  // anahtar -> { satır, kaç hata nedeninde geçti }
  const grup = new Map<string, { satir: HistoryEntry; kez: number }>();

  Object.values((data && data.failureCauses) || {}).forEach((c: any) => {
    const aksiyonlar: FmeaAction[] = (c && c.actions) || [];
    aksiyonlar.forEach((a: any) => {
      // Gerçekleşme tarihi varsa o, yoksa hedef tarih. İkisi de yoksa
      // "ne zaman yapıldı" bilinmiyor demektir — satır üretilmez.
      const tarih = String(a?.completionDate || a?.targetCompletionDate || '')
        .slice(0, 10);
      // Aksiyonun KENDİ metni (Prevention/Detection Action sütunu). Kanıt
      // alanı (Action Taken) yalnız aksiyon metni boşken yedek — önce
      // kanıt yazılıyordu, geçmişe "Mevcut iş emri / operasyon kartı"
      // gibi 15 farklı kanıt satırı düşüyordu.
      const metin = String(a?.description || a?.actionTaken || '').trim();
      if (!tarih || !metin) return;

      const tip = a?.type === 'detection' ? 'Tespit' : 'Önleme';
      const satir: HistoryEntry = {
        id: `${AKSIYON_ONEK}${a.id}`,
        revision: '',                    // gecmisiSirala() numaralandırır
        date: tarih,
        changeDescription: `${tip} aksiyonu: ${ozetle(metin)}`,
        changeReason: '',
        preparedBy: String(a?.responsiblePerson || '').trim()
          || secenek.hazirlayan || '',
        approvedBy: secenek.onaylayan || '',
      };

      const anahtar = icerikAnahtari(satir);
      const onceki = grup.get(anahtar);
      if (onceki) { onceki.kez++; return; }     // aynı satır ikinci kez yazılmaz

      const neden = String(c?.description || '').trim();
      satir.changeReason = neden ? `Neden: ${ozetle(neden, 90)}` : '';
      grup.set(anahtar, { satir, kez: 1 });
    });
  });

  return [...grup.values()].map(({ satir, kez }) => {
    if (kez > 1) {
      satir.changeReason = (satir.changeReason
        ? `${satir.changeReason} (+${kez - 1} benzer neden)`
        : `${kez} hata nedeninde uygulandı`);
    }
    return satir;
  });
}

/**
 * Geçmişin güncel hâli: elle girilen satırlar korunur, aksiyon satırları
 * DÖF'lerden yeniden türetilir, sonuç tarihe göre sıralanıp numaralanır.
 *
 * Böylece bir aksiyonun tarihi değişince ya da yenisi eklenince düğmeye
 * basmak geçmişi günceller — eskiden yalnız yeni satır ekleniyordu,
 * değişen tarih geçmişte eski hâliyle kalıyordu.
 */
export function gecmisiTazele(
  data: FmeaData,
  mevcutGecmis: HistoryEntry[] | undefined,
  secenek: AksiyonGecmisiSecenek = {},
): HistoryEntry[] {
  const elle = (mevcutGecmis || [])
    .filter(h => !String(h?.id || '').startsWith(AKSIYON_ONEK));
  return gecmisiSirala([...elle, ...aksiyonGecmisi(data, secenek)]);
}
