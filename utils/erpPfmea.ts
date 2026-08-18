// ERP verisinden PFMEA üretimi.
//
// Kaynak: Kalite Kontrol Supabase projesindeki üç tablo —
//   urun_agaclari        : ürün ağacı (hammaddeler)
//   operasyon_kartlari   : rota / operasyon adımları
//   leansys_kontrol_plani: kontrol planı maddeleri (karakteristikler)
// Üçü de anon anahtarla okunabilir; ayrı bir oturum gerekmez.
//
// Üretilen S/O/D ve aksiyonlar KURALLARA dayanır ve her nedenin remarks alanında
// hangi kontrol planına dayandığı yazar — denetimde gerekçesi sorulduğunda
// izlenebilsin diye. Hata türleri/etkiler iskelet olarak açılır; ekip doldurur.

import { initialApMatrix } from './ap-matrix';

const SUPABASE_URL = 'https://nnubrxbpthmkitueixbh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5udWJyeGJwdGhta2l0dWVpeGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjI2MDIsImV4cCI6MjA5NjEzODYwMn0.CHZUOylf_q8kkOQbFf9VWZ6-doUTlynmAhahM2EuImE';

const H = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };

async function sorgu(yol: string): Promise<any[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${yol}`, { headers: H });
  if (!r.ok) throw new Error(`ERP verisi okunamadı (HTTP ${r.status})`);
  return r.json();
}

const met = (x: any) => String(x ?? '').trim();
const buyuk = (x: any) => met(x).toLocaleUpperCase('tr');

// ── Girdi hammaddesi ayrımı ───────────────────────────────────────────────
// Girdi kalite kontrolüne tabi malzemeler stok kodunun ORTA parçasından
// ayrılır: 909.4.018 / 952.10.004 girdi hammaddesi; 205.0.214-C işletmede
// üretilen mamul olduğu için girdi kontrol adımı açılmaz.
export const GIRDI_ORTA_KODLAR = ['4', '10'];
export function girdiMalzemeMi(kod: any): boolean {
  const m = met(kod).match(/^\s*\d+\s*\.\s*(\d+)\s*\./);
  return !!m && GIRDI_ORTA_KODLAR.includes(m[1]);
}

// ── Emniyet / mevzuat karakteristiği ──────────────────────────────────────
// Yanma davranışı (FMVSS 302 / ISO 3795), toksisite, emisyon: can güvenliği ve
// yasal uygunluk. AIAG-VDA'ya göre bunlar YALNIZ Şiddet'i yükseltir.
const EMNIYET =
  /(YANMA|YANMAZ|ALEV|TUTUŞ|TUTUS|FLAME|FLAMMAB|FMVSS|ISO ?3795|EMNİYET|EMNIYET|GÜVENL|GUVENL|SAFETY|TOKSİK|TOKSIK|ZEHİR|ZEHIR|EMİSYON|EMISYON|VOC|FOGGING|MEVZUAT|YASAL|REGULAT)/;
export function emniyetMi(it: any): boolean {
  return EMNIYET.test(buyuk(it.olculecek) + ' ' + buyuk(it.hedef_nitel) + ' ' + buyuk(it.ozel_kar));
}

// ── Şiddet: karakteristiğin türünden ──────────────────────────────────────
export function siddet(it: any, girdiMi: boolean): number {
  if (emniyetMi(it)) return 9;              // 10 = uyarısız; ürün/müşteri bilgisi gerektirir, ekip yükseltebilir
  if (met(it.ozel_kar)) return 8;
  if (it.son_kontrol) return 7;
  return girdiMi ? 5 : 5;
}
// ── Olasılık: önleyici kontrolün varlığından ──────────────────────────────
export function olasilik(it: any): number {
  let o = met(it.proses_kontrol) ? 3 : 5;
  return Math.min(10, Math.max(1, o));
}
// ── Tespit: ölçüm yöntemi ve örnekleme sıklığından ────────────────────────
export function tespit(it: any): number {
  const y = buyuk(it.yontem);
  const f = buyuk(it.ornekleme_sikligi);
  let d: number;
  if (/%100|100%|OTOMAT|SENSÖR|SENSOR|KAMERA|MASTAR|GAUGE|POKA/.test(y)) d = 2;
  else if (/KUMPAS|MİKROMETRE|MIKROMETRE|TERAZİ|TERAZI|TARTI|KOMPARATÖR|CETVEL|ÖLÇÜM|OLCUM|TEST|CİHAZ|CIHAZ/.test(y)) d = 4;
  else if (/GÖZLE|GOZLE|GÖRSEL|GORSEL|VİZÜEL|VIZUEL|BAKARAK/.test(y)) d = 7;
  else if (!y) d = 9;                        // yöntem tanımsız → tespit güvencesi yok
  else d = 5;
  if (/HER PARÇA|HER ÜRÜN|HER PARCA|HER URUN|%100/.test(f)) d -= 1;
  else if (/VARDİYA|VARDIYA|GÜN|GUN|HAFTA|AY|PERİYOD|PERIYOD|LOT/.test(f)) d += 1;
  return Math.min(10, Math.max(1, d));
}
export function apHesapla(S: number, O: number, D: number): 'H' | 'M' | 'L' {
  const k = (v: number) => Math.min(10, Math.max(1, Math.round(v) || 1));
  return initialApMatrix[k(S) - 1][k(O) - 1][k(D) - 1];
}
export function onlemeKontrol(it: any): string {
  return met(it.proses_kontrol) || 'Proses talimatı + operatör eğitimi (FR17)';
}
export function tespitKontrol(it: any): string {
  const p = [met(it.yontem) || 'Tanımlı ölçüm yöntemi yok'];
  if (met(it.ornekleme_buyuklugu)) p.push(met(it.ornekleme_buyuklugu) + ' adet');
  if (met(it.ornekleme_sikligi)) p.push(met(it.ornekleme_sikligi));
  return p.join(' · ');
}
export function aksiyonlar(ap: string, it: any): string[] {
  // Emniyet karakteristiğinde AP düşük çıksa bile kontrolün sürekliliği belgelenmeli.
  if (emniyetMi(it)) return [
    'Yanma/mevzuat testinin periyodik tekrarı ve sertifika geçerliliğinin izlenmesi',
    'Malzeme değişikliğinde (tedarikçi/reçete) yeniden onay — PPAP/IMDS güncellemesi',
    ...(ap === 'L' ? [] : ['Kontrol sıklığının artırılması ve sonuçların kayıt altına alınması']),
  ];
  if (ap === 'H') return [
    'Poka-yoke / otomatik kontrol devreye alınması (tespit gücünü artırır)',
    'SPC ile izleme başlatılması (X̄-R kontrol grafiği)',
    'DÖF açılması ve kök neden analizi (8D)',
  ];
  if (ap === 'M') return [
    'Kontrol sıklığının artırılması (' + (met(it.ornekleme_sikligi) || 'mevcut sıklık') + ' → daha sık)',
    'Operatör eğitimi (FR17) ve çalışma talimatının güncellenmesi',
  ];
  return ['Mevcut kontroller yeterli — periyodik gözden geçirmede teyit'];
}

export interface UretimSonuc {
  fmeaData: any;
  ozet: { adim: number; karakteristik: number; hata: number; neden: number; girdi: number; elenen: number; planiOlmayan: number };
  urunAdi: string;
  planNo: string;
}

// ── İskelet üretici (saf: test edilebilir) ────────────────────────────────
export function iskeletUret(urun: { kod: string; ad: string }, bom: any[], rota: any[], plan: any[], bomPlan: Record<string, any[]>, kaynakNot: string) {
  const fd: any = { failureModes: {}, processItems: {}, processSteps: {}, failureCauses: {}, failureEffects: {}, processItemIds: [], processStepFunctions: {} };
  let ns = 0, nf = 0, nm = 0, nc = 0, ne = 0;

  const itemId = 'i_1';
  fd.processItems[itemId] = { id: itemId, name: `${met(urun.ad)} (${met(urun.kod)})`, stepIds: [] };
  fd.processItemIds = [itemId];

  const adimlar: any[] = [];
  bom.filter(b => girdiMalzemeMi(b.tuketim_kodu)).forEach(b => adimlar.push({
    girdi: true, op: 0, kod: met(b.tuketim_kodu),
    ad: `Girdi Kalite Kontrol – ${met(b.tuketim_adi)} (${met(b.tuketim_kodu)})`,
    mak: 'GKK / FR34-GKK', sembol: 'document',
  }));
  [...rota].sort((a, b) => Number(a.op_no) - Number(b.op_no)).forEach(r => adimlar.push({
    girdi: false, op: Number(r.op_no),
    ad: `Op ${met(r.op_no)} – ${met(r.makine_adi) || met(r.makine_kodu)}`,
    mak: met(r.makine_adi) || met(r.makine_kodu), sembol: 'process',
  }));

  adimlar.forEach(a => {
    const sid = `s_${++ns}`;
    fd.processSteps[sid] = { id: sid, name: a.ad, functionIds: [], includeInPF: true, operationNumber: String(a.op), machineDeviceSource: a.mak };
    fd.processItems[itemId].stepIds.push(sid);

    const maddeler: any[] = a.girdi
      ? (bomPlan[a.kod] || [])
      : plan.filter(x => Number(x.op_no) === a.op && !x.giris);

    maddeler.forEach(it => {
      const fid = `f_${++nf}`;
      const spec = [met(it.hedef_nicel), met(it.hedef_nitel)].filter(Boolean).join(' ')
        || [met(it.alt_limit), met(it.ust_limit)].filter(Boolean).join(' – ')
        || '—';
      fd.processStepFunctions[fid] = {
        id: fid, name: `${met(it.olculecek)} değerini şartname sınırlarında tutmak`,
        clientType: 'E', sampleSize: met(it.ornekleme_buyuklugu), controlMethod: onlemeKontrol(it),
        failureModeIds: [], flowchartSymbol: a.sembol, sampleFrequency: met(it.ornekleme_sikligi),
        processDescription: a.ad, includeInControlPlan: true,
        productCharacteristic: met(it.olculecek), productSpecificationTolerance: spec,
        evaluationMeasurementTechnique: met(it.yontem),
        classificationSpecialCharacteristic: !!met(it.ozel_kar),
      };
      fd.processSteps[sid].functionIds.push(fid);

      const S = siddet(it, a.girdi), O = olasilik(it), D = tespit(it);
      const mid = `m_${++nm}`, eid = `e_${++ne}`;
      const emn = emniyetMi(it);
      fd.failureEffects[eid] = {
        id: eid, severity: S, clientType: 'E',
        effectText: emn
          ? `End user:\nYanma davranışı / yasal şartname uygunsuzluğu — can güvenliği ve mevzuat riski. (${S})\nShip to Plant:\nMüşteri hattında red, yasal uygunsuzluk bildirimi. (${S})\nIn-Plant:\nToplu blokaj, geri çağırma riski. (${S})`
          : `End user:\n— (—)\nShip to Plant:\n${met(it.olculecek)} uygunsuzluğu nedeniyle montaj/işlev sapması. (${S})\nIn-Plant:\nYeniden işlem, hurda, hat duruşu. (${S})`,
      };
      fd.failureModes[mid] = { id: mid, causeIds: [], effectIds: [eid], description: `${met(it.olculecek)} şartname dışı (${spec})` };
      fd.processStepFunctions[fid].failureModeIds.push(mid);

      const nedenler: [string, string][] = a.girdi
        ? [['Tedarikçi kaynaklı malzeme sapması', 'Malzeme'], ['Girdi kalite kontrol planına uyulmaması', 'Personel']]
        : [['Proses parametresi sapması (ayar/hız/sıcaklık)', 'Makine'], ['Ekipman/kalıp aşınması veya hatalı ayar', 'Makine'], ['Operatör uygulama hatası', 'Personel']];
      nedenler.forEach(([aciklama, oge]) => {
        const cid = `c_${++nc}`;
        const ap = apHesapla(S, O, D);
        fd.failureCauses[cid] = {
          id: cid,
          actions: aksiyonlar(ap, it).map((d, i) => ({ id: `${cid}_a${i + 1}`, description: d, status: 'open', responsible: '', dueDate: '' })),
          remarks: `OTOMATİK ÖNERİ — ${kaynakNot} esas alındı; S/O/D ve aksiyonlar ekip tarafından doğrulanmalıdır.`,
          detection: D, occurrence: O, description: aciklama, actionPriority: ap,
          revisedSeverity: null, detectionControl: tespitKontrol(it), revisedDetection: null,
          preventionControl: onlemeKontrol(it), revisedOccurrence: null,
          processWorkElement: oge, workElementFunction: '',
        };
        fd.failureModes[mid].causeIds.push(cid);
      });
    });
  });
  return fd;
}

// ── ERP'den oku + üret ────────────────────────────────────────────────────
export async function erpdenUret(stokKodu: string): Promise<UretimSonuc> {
  const kod = encodeURIComponent(stokKodu);
  const [bomHam, rotaHam, planHam] = await Promise.all([
    sorgu(`urun_agaclari?select=tuketim_kodu,tuketim_adi,varsayilan&urun_kodu=eq.${kod}`),
    sorgu(`operasyon_kartlari?select=op_no,makine_kodu,makine_adi,rota_adi,varsayilan,header_id&stok_kodu=eq.${kod}`),
    sorgu(`leansys_kontrol_plani?select=*&stok_kodu=eq.${kod}`),
  ]);
  if (!rotaHam.length && !planHam.length) throw new Error('Bu ürün için operasyon kartı ve kontrol planı bulunamadı.');

  const bomTum = bomHam.filter(b => b.varsayilan !== false);
  const bom = bomTum.filter(b => girdiMalzemeMi(b.tuketim_kodu));
  const rotaHid = (rotaHam.find(r => r.varsayilan === true) || rotaHam[0] || {}).header_id;
  const rota = rotaHam.filter(r => r.header_id === rotaHid);

  // Her girdi hammaddesinin KENDİ girdi kontrol planı
  const bomPlan: Record<string, any[]> = {};
  if (bom.length) {
    const kodlar = bom.map(b => b.tuketim_kodu).filter(Boolean);
    for (let i = 0; i < kodlar.length; i += 40) {
      const liste = kodlar.slice(i, i + 40).map((c: string) => `"${c}"`).join(',');
      const d = await sorgu(`leansys_kontrol_plani?select=*&stok_kodu=in.(${encodeURIComponent(liste)})`);
      d.forEach(x => (bomPlan[x.stok_kodu] = bomPlan[x.stok_kodu] || []).push(x));
    }
  }
  const planiOlmayan = bom.filter(b => !(bomPlan[b.tuketim_kodu] || []).length).length;

  const ilk = planHam[0] || {};
  const urunAdi = met(ilk.stok_adi) || stokKodu;
  const planNo = [met(ilk.plan_no) && `Plan ${met(ilk.plan_no)}`, met(ilk.rev_no) && `Rev.${met(ilk.rev_no)}`].filter(Boolean).join(' ') || 'kontrol planı';
  const fd = iskeletUret({ kod: stokKodu, ad: urunAdi }, bom, rota, planHam, bomPlan, `kontrol planı (${planNo})`);

  return {
    fmeaData: fd, urunAdi, planNo,
    ozet: {
      adim: Object.keys(fd.processSteps).length,
      karakteristik: Object.keys(fd.processStepFunctions).length,
      hata: Object.keys(fd.failureModes).length,
      neden: Object.keys(fd.failureCauses).length,
      girdi: bom.length, elenen: bomTum.length - bom.length, planiOlmayan,
    },
  };
}

// Kontrol planı olan ürünlerin listesi (arama kutusu için)
export async function erpUrunListesi(): Promise<{ kod: string; ad: string }[]> {
  const d = await sorgu('leansys_kontrol_plani?select=stok_kodu,stok_adi&limit=20000');
  const m = new Map<string, string>();
  d.forEach(x => { if (x.stok_kodu && !m.has(x.stok_kodu)) m.set(x.stok_kodu, met(x.stok_adi)); });
  return [...m.entries()].map(([kod, ad]) => ({ kod, ad })).sort((a, b) => a.kod.localeCompare(b.kod, 'tr'));
}
