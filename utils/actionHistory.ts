import type { FmeaData, HistoryEntry, FmeaAction } from '../types';

/**
 * Optimizasyon aksiyonlarını PFMEA değişiklik geçmişi satırlarına çevirir.
 *
 * "Değişiklikleri Otomatik Ekle" önce yalnız tablo diff'ini BUGÜNÜN
 * tarihiyle tek satır olarak ekliyordu. Oysa her aksiyonun kendi hedef /
 * gerçekleşme tarihi ve sorumlusu var — değişiklik gerçekte o tarihte
 * yapıldı. Her aksiyon ayrı bir geçmiş satırı olur.
 *
 * İki tür tekrar koruması var:
 *  - id ile: satırın id'si `h_act_<aksiyonId>`, aynı aksiyon ikinci
 *    tıklamada yeniden yazılmaz. Metin karşılaştırması kırılgan olurdu;
 *    açıklama sonradan düzenlenince aynı aksiyon tekrar eklenirdi.
 *  - içerik ile: aynı aksiyon metni onlarca hata nedeninde tekrarlanıyor
 *    (216.0.367 ölçümü: 121 satırın yalnız 40'ı farklı, biri 14 kez).
 *    Aynı tarih + sorumlu + açıklama bir kez yazılır; kaç nedende geçtiği
 *    "Değişiklik Nedeni" sütununda belirtilir.
 */

/** Uzun metni kelime sınırında keser. */
export function ozetle(metin: string, enFazla = 140): string {
  const d = String(metin || '').replace(/\s+/g, ' ').trim();
  if (d.length <= enFazla) return d;
  const kes = d.lastIndexOf(' ', enFazla);
  const n = kes > enFazla * 0.6 ? kes : enFazla;
  return d.slice(0, n).replace(/[ ,;:.\-]+$/, '') + '…';
}

export interface AksiyonGecmisiSecenek {
  revision?: string;
  hazirlayan?: string;
  onaylayan?: string;
}

/**
 * İçerik kimliği. "Değişiklik Nedeni" DIŞARIDA bırakılır: tekrar sayısı
 * oraya yazıldığı için, ikinci tıklamada anahtar değişmesin.
 */
const icerikAnahtari = (h: { date?: string; preparedBy?: string; changeDescription?: string }) =>
  `${String(h.date || '').slice(0, 10)}|${String(h.preparedBy || '')}|${String(h.changeDescription || '')}`;

export function aksiyonGecmisi(
  data: FmeaData,
  mevcutGecmis: HistoryEntry[] | undefined,
  secenek: AksiyonGecmisiSecenek = {},
): HistoryEntry[] {
  const varOlanId = new Set((mevcutGecmis || []).map(h => h.id));
  const varOlanIcerik = new Set((mevcutGecmis || []).map(icerikAnahtari));
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

      const id = `h_act_${a.id}`;
      if (varOlanId.has(id)) return;      // TEKRAR: bu aksiyon zaten kayıtlı
      varOlanId.add(id);

      const tip = a?.type === 'detection' ? 'Tespit' : 'Önleme';
      const satir: HistoryEntry = {
        id,
        revision: secenek.revision || '',
        date: tarih,
        changeDescription: `${tip} aksiyonu: ${ozetle(metin)}`,
        changeReason: '',
        preparedBy: String(a?.responsiblePerson || '').trim()
          || secenek.hazirlayan || '',
        approvedBy: secenek.onaylayan || '',
      };

      const anahtar = icerikAnahtari(satir);
      if (varOlanIcerik.has(anahtar)) return;   // geçmişte aynısı duruyor
      const onceki = grup.get(anahtar);
      if (onceki) { onceki.kez++; return; }     // aynı satır ikinci kez yazılmaz

      const neden = String(c?.description || '').trim();
      satir.changeReason = neden ? `Neden: ${ozetle(neden, 90)}` : '';
      grup.set(anahtar, { satir, kez: 1 });
    });
  });

  const out = [...grup.values()].map(({ satir, kez }) => {
    if (kez > 1) {
      satir.changeReason = (satir.changeReason
        ? `${satir.changeReason} (+${kez - 1} benzer neden)`
        : `${kez} hata nedeninde uygulandı`);
    }
    return satir;
  });
  out.sort((x, y) => x.date.localeCompare(y.date));
  return out;
}
