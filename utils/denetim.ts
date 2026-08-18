// PFMEA tamlık denetimi — AIAG-VDA 7 adım + Core Tools pratiğine göre.
//
// "FMEA yapıldı" demek her karakteristiğe bir satır açmak değildir; her hata
// türünün nedenleri 4M kapsamında (İnsan/Makine/Malzeme/Metot) düşünülmüş,
// üç seviyeli etki yazılmış, S/O/D gerekçeli, mevcut önleme+tespit tanımlı,
// yüksek AP'de aksiyon atanmış olmalıdır. Bu modül eksikleri satır satır
// çıkarır; karar vermez, ekibin gözden geçirmesi için liste üretir.
import type { FmeaData } from '../types';

export interface Bulgu {
  seviye: 'eksik' | 'uyari';        // eksik: standart gereği olmalı · uyari: gözden geçirilmeli
  kural: string;                     // kısa kural adı (grupla/filtrele)
  konum: string;                     // "Op 1 – LMM › Kalınlık" gibi insan okuru için yol
  mesaj: string;                     // ne eksik, ne yapılmalı
}

const met = (x: any) => String(x ?? '').trim();

// Nedenin hangi 4M kümesine girdiği. processWorkElement alanı serbest metin;
// yaygın yazımlar eşlenir, eşlenemeyen "diğer" sayılır (yanlış alarm vermez).
export function dortM(oge: string): 'insan' | 'makine' | 'malzeme' | 'metot' | 'diger' {
  const t = met(oge).toLocaleLowerCase('tr');
  if (/personel|insan|operat|man\b/.test(t)) return 'insan';
  if (/mak|ekipman|kalıp|kalip|machine/.test(t)) return 'makine';
  if (/malzeme|hammadde|material/.test(t)) return 'malzeme';
  if (/metot|method|talimat|proses iş/.test(t)) return 'metot';
  return 'diger';
}

// Etki metninde üç müşteri seviyesi de ele alınmış mı (End user / Ship to
// Plant / In-Plant)? "—" yazılmış seviye bilinçli boş sayılır, eksik sayılmaz.
export function etkiSeviyeleri(effectText: string): string[] {
  const t = met(effectText);
  const eksik: string[] = [];
  [['End user', /end\s*user\s*:/i], ['Ship to Plant', /ship\s*to\s*plant\s*:/i], ['In-Plant', /in-?\s*plant\s*:/i]]
    .forEach(([ad, re]) => { if (!(re as RegExp).test(t)) eksik.push(ad as string); });
  return eksik;
}

export function denetle(data: FmeaData): Bulgu[] {
  const b: Bulgu[] = [];
  const steps = Object.values<any>(data.processSteps || {});
  const fns = data.processStepFunctions || {};
  const modes = data.failureModes || {};
  const effects = data.failureEffects || {};
  const causes = data.failureCauses || {};

  if (!steps.length) return [{ seviye: 'eksik', kural: 'yapı', konum: '—', mesaj: 'Proses adımı yok — FMEA boş.' }];
  const girdiAdimVar = steps.some(s => String(s.operationNumber) === '0' || /girdi/i.test(met(s.name)));
  if (!girdiAdimVar) b.push({
    seviye: 'uyari', kural: 'girdi',
    konum: 'Genel',
    mesaj: 'Girdi (hammadde) kontrol adımı yok. Ürün ağacındaki hammaddelerin girdi riskleri değerlendirilmemiş olabilir.',
  });

  steps.forEach(st => {
    const adimAd = met(st.name) || `Op ${st.operationNumber}`;
    if (!(st.functionIds || []).length) {
      b.push({ seviye: 'eksik', kural: 'karakteristik', konum: adimAd, mesaj: 'Adımda hiç karakteristik/fonksiyon yok — bu operasyonun riskleri değerlendirilmemiş.' });
      return;
    }
    st.functionIds.forEach((fid: string) => {
      const f = fns[fid]; if (!f) return;
      const yol = `${adimAd} › ${met(f.productCharacteristic) || met(f.name) || fid}`;

      if (!(f.failureModeIds || []).length) {
        b.push({ seviye: 'eksik', kural: 'hata türü', konum: yol, mesaj: 'Karakteristiğe hata türü yazılmamış (Adım 4).' });
        return;
      }
      f.failureModeIds.forEach((mid: string) => {
        const m = modes[mid]; if (!m) return;

        // Etki + şiddet (Adım 4/5)
        if (!(m.effectIds || []).length) {
          b.push({ seviye: 'eksik', kural: 'etki', konum: yol, mesaj: `"${met(m.description)}" için etki tanımsız — şiddet gerekçesiz kalır.` });
        } else m.effectIds.forEach((eid: string) => {
          const e = effects[eid]; if (!e) return;
          const eksik = etkiSeviyeleri(e.effectText);
          if (eksik.length) b.push({
            seviye: 'uyari', kural: 'etki seviyesi', konum: yol,
            mesaj: `Etkide ${eksik.join(', ')} seviyesi ele alınmamış (üç seviye: son kullanıcı / müşteri fabrikası / kendi fabrikamız).`,
          });
          const S = Number(e.severity);
          if (!(S >= 1 && S <= 10)) b.push({ seviye: 'eksik', kural: 'S', konum: yol, mesaj: 'Şiddet (S) girilmemiş veya 1-10 dışında.' });
        });

        // Nedenler + 4M kapsamı (Adım 4)
        const ncs = (m.causeIds || []).map((c: string) => causes[c]).filter(Boolean);
        if (!ncs.length) {
          b.push({ seviye: 'eksik', kural: 'neden', konum: yol, mesaj: `"${met(m.description)}" için hata nedeni yazılmamış.` });
          return;
        }
        const kapsam = new Set(ncs.map((c: any) => dortM(c.processWorkElement)));
        const yok = (['insan', 'makine', 'malzeme', 'metot'] as const).filter(k => !kapsam.has(k));
        // Girdi adımında insan/makine beklenmez; yalnız üretim adımlarında sor
        const girdiAdimi = String(st.operationNumber) === '0' || /girdi/i.test(met(st.name));
        const sorulacak = girdiAdimi ? yok.filter(k => k === 'malzeme') : yok;
        if (sorulacak.length >= (girdiAdimi ? 1 : 3)) b.push({
          seviye: 'uyari', kural: '4M kapsamı', konum: yol,
          mesaj: `Nedenler yalnız ${[...kapsam].filter(x => x !== 'diger').join('/') || 'tek kaynak'} üzerinden; ${sorulacak.join(', ')} kaynaklı neden değerlendirilmemiş. Yoksa "değerlendirildi, yok" diye not düşün.`,
        });

        ncs.forEach((c: any) => {
          const cyol = `${yol} › ${met(c.description)}`;
          if (!met(c.preventionControl)) b.push({ seviye: 'eksik', kural: 'önleme', konum: cyol, mesaj: 'Mevcut önleme kontrolü boş (Adım 5) — hiç önlem yoksa "yok" yazılmalı.' });
          if (!met(c.detectionControl)) b.push({ seviye: 'eksik', kural: 'tespit', konum: cyol, mesaj: 'Mevcut tespit kontrolü boş (Adım 5).' });
          const O = Number(c.occurrence), D = Number(c.detection);
          if (!(O >= 1 && O <= 10)) b.push({ seviye: 'eksik', kural: 'O', konum: cyol, mesaj: 'Olasılık (O) girilmemiş veya 1-10 dışında.' });
          if (!(D >= 1 && D <= 10)) b.push({ seviye: 'eksik', kural: 'D', konum: cyol, mesaj: 'Tespit (D) girilmemiş veya 1-10 dışında.' });

          // Adım 6: yüksek/orta öncelikte aksiyon zorunlu
          const ap = met(c.actionPriority).toUpperCase();
          const acikAksiyon = (c.actions || []).filter((a: any) => met(a.description));
          if (ap === 'H' && !acikAksiyon.length) b.push({
            seviye: 'eksik', kural: 'aksiyon', konum: cyol,
            mesaj: 'AP=H — aksiyon ZORUNLU (AIAG-VDA: yüksek öncelik aksiyonsuz kapatılamaz).',
          });
          if (ap === 'M' && !acikAksiyon.length) b.push({
            seviye: 'uyari', kural: 'aksiyon', konum: cyol,
            mesaj: 'AP=M — aksiyon alınmalı ya da mevcut kontrollerin yeterliliği gerekçelendirilmeli.',
          });
          // Aksiyonda sorumlu/termin (Adım 6). Yalnız AÇIK aksiyonlarda sorulur:
          // tamamlanmış iş (mevcut uygulamayı belgeleyen) sorumlu beklemez.
          acikAksiyon.filter((a: any) => met(a.status).toLocaleLowerCase('tr') !== 'completed')
            .forEach((a: any) => {
            if (ap !== 'L' && !met(a.responsiblePerson)) b.push({
              seviye: 'uyari', kural: 'sorumlu', konum: cyol,
              mesaj: `Aksiyonun sorumlusu atanmamış: "${met(a.description)}"`,
            });
          });
        });
      });
    });
  });

  // Sıra: eksikler önce, sonra uyarılar; aynı seviyede konuma göre
  return b.sort((x, y) => (x.seviye === y.seviye ? x.konum.localeCompare(y.konum, 'tr') : x.seviye === 'eksik' ? -1 : 1));
}

export interface Ozet { eksik: number; uyari: number; kurallar: Record<string, number>; }
export function ozetle(bulgular: Bulgu[]): Ozet {
  const kurallar: Record<string, number> = {};
  bulgular.forEach(x => { kurallar[x.kural] = (kurallar[x.kural] || 0) + 1; });
  return {
    eksik: bulgular.filter(x => x.seviye === 'eksik').length,
    uyari: bulgular.filter(x => x.seviye === 'uyari').length,
    kurallar,
  };
}
