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
// Kontrol plani metin alanlarinda bos yerine 0 gelebiliyor ("mevcut onleme: 0"
// diye yaziliyordu); metin baglaminda 0 bos sayilir.
const metinS = (x: any) => { const t = met(x); return t === '0' ? '' : t; };
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
  return metinS(it.proses_kontrol) || 'Proses talimatı + operatör eğitimi (FR17)';
}
// Ornekleme sikligi: plandan ham sayi geliyor (dakika). Girdi kontrolunde
// sure olcusu anlamsiz - malzeme lot bazinda kontrol edilir.
export function siklik(it: any, girdiMi: boolean): string {
  if (girdiMi) return 'Her lot';
  const t = metinS(it.ornekleme_sikligi);
  return /^\d+$/.test(t) ? `${t} dk` : t;
}
export function tespitKontrol(it: any, girdiMi = false): string {
  const p = [metinS(it.yontem) || 'Tanımlı ölçüm yöntemi yok'];
  if (metinS(it.ornekleme_buyuklugu)) p.push(met(it.ornekleme_buyuklugu) + ' adet');
  const sk = siklik(it, girdiMi);
  if (sk) p.push(sk);
  return p.join(' · ');
}
// Aksiyon hedef tarihi kontrol plani revizyon tarihinden turetilir; yuksek AP
// daha kisa vadeli olur.
export function hedefTarih(planTarihi: string, ap: string): string {
  const t = planTarihi ? new Date(planTarihi) : new Date();
  const gun = ap === 'H' ? 30 : ap === 'M' ? 60 : 90;
  t.setDate(t.getDate() + gun);
  return t.toISOString().slice(0, 10);
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

// ── HAFIZA: mevcut PFMEA projelerinden ogrenme ───────────────────────────
// 12 projede 900'den fazla insan yazimi neden ve 600'den fazla aksiyon var.
// Ayni karakteristik (ornek "Gramaj", "Yanma Davranisi") daha once ele
// alindiysa, jenerik metin uretmek yerine ORADAN uyarlanir: hata turu, etki,
// siddet ve nedenler ekibin gecmiste verdigi kararlardir.
export interface HafizaKayit {
  kaynak: string;
  mode: string;
  effectText: string;
  severity: number;
  causes: any[];
}
export type Hafiza = Record<string, HafizaKayit>;

// Uretilen projeler data.otomatik ile isaretlenir; hafiza bunlari atlar.
// Eski projelerde isaret remarks metnindeydi - geriye donuk guvence olarak kalir.
export const OTOMATIK = /^(OTOMATİK ÖNERİ|BENZER PROJEDEN)/;

// Turkce duyarli sadelestirme: eslesme "GRAMAJ" ile "gramaj (gr/m2)" arasinda da tutsun
export function anahtarla(x: any): string {
  return met(x).toLocaleLowerCase('tr')
    .replace(/[ıİ]/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
function benzerlik(a: string, b: string): number {
  const A = new Set(a.split(' ').filter(w => w.length > 2));
  const B = new Set(b.split(' ').filter(w => w.length > 2));
  if (!A.size || !B.size) return 0;
  let ortak = 0; A.forEach(w => { if (B.has(w)) ortak++; });
  // Birlesim uzerinden (Jaccard): kisa taraf uzerinden normalize edilirse tek
  // ortak kelime %100 cikar ve "Yanma" -> "Yanma Davranisi" nedenlerini kopyalar.
  return ortak / (A.size + B.size - ortak);
}

export async function hafizaYukle(): Promise<Hafiza> {
  return hafizaKur(await sorgu('pfmea_projects?select=name,data'));
}

export function hafizaKur(projeler: any[]): Hafiza {
  const h: Hafiza = {};
  projeler.forEach((pr: any) => {
    if (pr?.data?.otomatik) return;      // kendi urettigimiz projeden ogrenme
    const fd = pr?.data?.fmeaData; if (!fd) return;
    const fns = fd.processStepFunctions || {}, modes = fd.failureModes || {},
          causes = fd.failureCauses || {}, effects = fd.failureEffects || {};
    Object.values<any>(fns).forEach(f => {
      const k = anahtarla(f.productCharacteristic);
      if (!k) return;
      const mid = (f.failureModeIds || [])[0]; const m = mid && modes[mid]; if (!m) return;
      const e = effects[(m.effectIds || [])[0]];
      // Otomatik uretilmis nedenler hafizaya ALINMAZ: yoksa uretim kendi
      // ciktisindan ogrenir ve jenerik metin kendini besler (dongu).
      const ncs = (m.causeIds || []).map((c: string) => causes[c])
        .filter(Boolean).filter((c: any) => !OTOMATIK.test(met(c.remarks)));
      if (!ncs.length) return;
      // Daha zengin kayit (daha cok neden) tercih edilir
      const mevcut = h[k];
      if (mevcut && mevcut.causes.length >= ncs.length) return;
      h[k] = {
        kaynak: met(pr.name), mode: met(m.description),
        effectText: met(e?.effectText), severity: Number(e?.severity) || 5,
        causes: ncs,
      };
    });
  });
  return h;
}

// Karakteristige en yakin hafiza kaydi (once birebir, sonra kelime ortakligi)
export function hafizadaAra(hafiza: Hafiza, karakteristik: string): HafizaKayit | null {
  const k = anahtarla(karakteristik);
  if (!k) return null;
  if (hafiza[k]) return hafiza[k];
  let enA = '', enSkor = 0;
  Object.keys(hafiza).forEach(a => {
    const s = benzerlik(k, a);
    if (s > enSkor) { enSkor = s; enA = a; }
  });
  return enSkor >= 0.6 ? hafiza[enA] : null;   // yarisindan azi ortaksa uyarlama yapma
}

export interface UretimSonuc {
  fmeaData: any;
  ozet: { adim: number; karakteristik: number; hata: number; neden: number; girdi: number; elenen: number; planiOlmayan: number; uyarlanan: number; opKartiYok: boolean };
  urunAdi: string;
  planNo: string;
  planTarihi: string;
  planKod: string;
  planRev: string;
  pfListesi: string[];
}

// ── İskelet üretici (saf: test edilebilir) ────────────────────────────────
export function iskeletUret(urun: { kod: string; ad: string }, bom: any[], rota: any[], plan: any[], bomPlan: Record<string, any[]>, kaynakNot: string, hafiza: Hafiza = {}, planTarihi = '') {
  const fd: any = { failureModes: {}, processItems: {}, processSteps: {}, failureCauses: {}, failureEffects: {}, processItemIds: [], processStepFunctions: {} };
  let ns = 0, nf = 0, nm = 0, nc = 0, ne = 0;

  const itemId = 'i_1';
  fd.processItems[itemId] = { id: itemId, name: `${met(urun.ad)} (${met(urun.kod)})`, stepIds: [] };
  fd.processItemIds = [itemId];

  const adimlar: any[] = [];

  // Girdi adimi YALNIZ gercekten girdi kontrolu olan malzeme icin acilir.
  // LeanSys'te bunu `giris` bayragi isaretler; bayrak hic kullanilmamis eski
  // planlarda malzemenin kendi planinin tamami girdi kontrolu sayilir.
  const girdiSatir = (k: string) => {
    const t = bomPlan[k] || [];
    const g = t.filter(x => !!Number(x.giris));
    return g.length ? g : t;
  };
  bom.filter(b => girdiMalzemeMi(b.tuketim_kodu) && girdiSatir(met(b.tuketim_kodu)).length)
    .forEach(b => adimlar.push({
      girdi: true, op: 0, kod: met(b.tuketim_kodu),
      ad: `Girdi Kalite Kontrol – ${met(b.tuketim_adi)} (${met(b.tuketim_kodu)})`,
      mak: 'GKK / FR34-GKK', sembol: 'document',
    }));
  // Urunun KENDI planindaki girdi satirlari (or. disaridan gelen yari mamul)
  const kendiGirdi = plan.filter(x => !!Number(x.giris));
  if (kendiGirdi.length) adimlar.push({
    girdi: true, kendi: true, op: 0, kod: met(urun.kod),
    ad: `Girdi Kalite Kontrol – ${met(urun.ad)} (${met(urun.kod)})`,
    mak: 'GKK / FR34-GKK', sembol: 'document',
  });

  // Proses adimlari: operasyon karti + kontrol planindaki op numaralarinin
  // BIRLESIMI. Operasyon karti ERP'ye aktarilmamissa adimlar plandan kurulur -
  // eskiden bu durumda proses tarafi komple bos kaliyordu.
  const opNo = (v: any) => { const x = Number(v); return v === null || v === '' || isNaN(x) ? null : x; };
  const opMak = new Map<number | string, string[]>();
  const ekle = (k: number | string, ad: string) => {
    const l = opMak.get(k) || []; if (ad && !l.includes(ad)) l.push(ad); opMak.set(k, l);
  };
  rota.forEach(r => { const k = opNo(r.op_no); if (k !== null) ekle(k, met(r.makine_adi) || met(r.makine_kodu)); });
  plan.filter(x => !Number(x.giris)).forEach(x => {
    const k = opNo(x.op_no);
    // Op no'su olmayan plan satirlari sessizce kaybolmasin diye kendi adimina gider
    ekle(k === null ? 'yok' : k, met(x.uretim_ekipman));
  });
  [...opMak.keys()]
    .sort((a, b) => (a === 'yok' ? 1 : b === 'yok' ? -1 : Number(a) - Number(b)))
    .forEach(k => {
      const mak = (opMak.get(k) || []).join(' / ');
      adimlar.push(k === 'yok'
        ? { girdi: false, op: null, ad: 'Op — (kontrol planinda op no yok)', mak, sembol: 'process' }
        : { girdi: false, op: Number(k), ad: `Op ${k} – ${mak || 'Operasyon'}`, mak, sembol: 'process' });
    });

  adimlar.forEach(a => {
    const sid = `s_${++ns}`;
    fd.processSteps[sid] = { id: sid, name: a.ad, functionIds: [], includeInPF: true, operationNumber: a.op === null ? '' : String(a.op), machineDeviceSource: a.mak };
    fd.processItems[itemId].stepIds.push(sid);

    const maddeler: any[] = a.girdi
      ? (a.kendi ? kendiGirdi : girdiSatir(a.kod))
      : plan.filter(x => !Number(x.giris) && opNo(x.op_no) === a.op);

    // Akis semasi ADIM bazlidir: sembol adimda yalniz ilk karakteristige
    // verilir, yoksa 7 karakteristikli bir adim akisda 7 ayni satir olur.
    maddeler.forEach((it, sira) => {
      const fid = `f_${++nf}`;
      const spec = [met(it.hedef_nicel), met(it.hedef_nitel)].filter(Boolean).join(' ')
        || [met(it.alt_limit), met(it.ust_limit)].filter(Boolean).join(' – ')
        || '—';
      fd.processStepFunctions[fid] = {
        id: fid, name: `${met(it.olculecek)} değerini şartname sınırlarında tutmak`,
        clientType: 'E', sampleSize: met(it.ornekleme_buyuklugu), controlMethod: onlemeKontrol(it),
        failureModeIds: [], flowchartSymbol: sira === 0 ? a.sembol : '', sampleFrequency: siklik(it, a.girdi),
        processDescription: a.ad, includeInControlPlan: true,
        productCharacteristic: met(it.olculecek), productSpecificationTolerance: spec,
        evaluationMeasurementTechnique: met(it.yontem),
        classificationSpecialCharacteristic: !!met(it.ozel_kar),
      };
      fd.processSteps[sid].functionIds.push(fid);

      // Once HAFIZA: ayni karakteristik daha once ele alindiysa oradan uyarla
      const hk = hafizadaAra(hafiza, it.olculecek);
      const S = hk ? hk.severity : siddet(it, a.girdi);
      const O = olasilik(it), D = tespit(it);
      const mid = `m_${++nm}`, eid = `e_${++ne}`;
      const emn = emniyetMi(it);
      // PF (Process Function): etkinin bagli oldugu fonksiyon. Uretimde bos
      // kaliyordu; karakteristik + sartnameden turetilir (kayit defterindeki
      // "yapistirma 25N (+-3)" bicimiyle ayni).
      const pfAdi = met(it.olculecek) + (spec && spec !== '—' ? ` (${spec})` : '');
      fd.failureEffects[eid] = {
        id: eid, severity: S, clientType: 'E',
        selectedPFByType: { E: pfAdi },
        effectText: hk ? hk.effectText : emn
          ? `End user:\nYanma davranışı / yasal şartname uygunsuzluğu — can güvenliği ve mevzuat riski. (${S})\nShip to Plant:\nMüşteri hattında red, yasal uygunsuzluk bildirimi. (${S})\nIn-Plant:\nToplu blokaj, geri çağırma riski. (${S})`
          : `End user:\n— (—)\nShip to Plant:\n${met(it.olculecek)} uygunsuzluğu nedeniyle montaj/işlev sapması. (${S})\nIn-Plant:\nYeniden işlem, hurda, hat duruşu. (${S})`,
      };
      fd.failureModes[mid] = { id: mid, causeIds: [], effectIds: [eid],
        description: hk ? hk.mode : `${met(it.olculecek)} şartname dışı (${spec})` };
      fd.processStepFunctions[fid].failureModeIds.push(mid);

      if (hk) {
        // HAFIZADAN UYARLAMA: nedenler, mevcut önleme/tespit kontrolleri ve
        // aksiyon metinleri benzer projeden gelir (ekibin yazdığı gerçek
        // uygulamalar). Sorumlu/tamamlanma bu ürün için boşaltılır.
        hk.causes.forEach((kn: any) => {
          const cid = `c_${++nc}`;
          const ap = kn.actionPriority || apHesapla(S, Number(kn.occurrence) || O, Number(kn.detection) || D);
          fd.failureCauses[cid] = {
            id: cid,
            // Onceki projeden gelen aksiyon zaten yapilmis bir istir (mevcut
            // uygulama); durumu, tarihi ve sorumlusu korunur - gorev listesinde
            // yeniden "acik is" olarak cikmasin.
            actions: (kn.actions || []).map((ak: any, i: number) => ({
              id: `${cid}_a${i + 1}`, type: ak.type || 'prevention', number: i + 1,
              status: met(ak.status) || 'Open', actionTaken: met(ak.actionTaken),
              description: met(ak.description),
              completionDate: met(ak.completionDate),
              responsiblePerson: met(ak.responsiblePerson),
              targetCompletionDate: met(ak.targetCompletionDate) || hedefTarih(planTarihi, ap),
            })),
            remarks: '',
            detection: Number(kn.detection) || D, occurrence: Number(kn.occurrence) || O,
            description: met(kn.description), actionPriority: ap,
            revisedSeverity: null,
            detectionControl: metinS(kn.detectionControl) || tespitKontrol(it, a.girdi), revisedDetection: null,
            preventionControl: metinS(kn.preventionControl) || onlemeKontrol(it), revisedOccurrence: null,
            processWorkElement: met(kn.processWorkElement), workElementFunction: met(kn.workElementFunction),
          };
          fd.failureModes[mid].causeIds.push(cid);
        });
      } else {
        const nedenler: [string, string][] = a.girdi
          ? [['Tedarikçi kaynaklı malzeme sapması', 'Malzeme'], ['Girdi kalite kontrol planına uyulmaması', 'Personel']]
          : [['Proses parametresi sapması (ayar/hız/sıcaklık)', 'Makine'], ['Ekipman/kalıp aşınması veya hatalı ayar', 'Makine'], ['Operatör uygulama hatası', 'Personel']];
        nedenler.forEach(([aciklama, oge]) => {
          const cid = `c_${++nc}`;
          const ap = apHesapla(S, O, D);
          fd.failureCauses[cid] = {
            id: cid,
            actions: aksiyonlar(ap, it).map((d, i) => ({
              id: `${cid}_a${i + 1}`, type: i === 0 ? 'prevention' : 'detection', number: i + 1,
              status: 'Open', actionTaken: '', description: d,
              completionDate: '', responsiblePerson: '',
              targetCompletionDate: hedefTarih(planTarihi, ap),
            })),
            remarks: '',
            detection: D, occurrence: O, description: aciklama, actionPriority: ap,
            revisedSeverity: null, detectionControl: tespitKontrol(it, a.girdi), revisedDetection: null,
            preventionControl: onlemeKontrol(it), revisedOccurrence: null,
            processWorkElement: oge, workElementFunction: '',
          };
          fd.failureModes[mid].causeIds.push(cid);
        });
      }
    });
  });
  return fd;
}

// ── ERP'den oku + üret ────────────────────────────────────────────────────
// Eksik ERP verisini yerel LeanSys ajani ceker (LeanSys yalnizca OKUNUR).
// Ajan kapaliysa sessizce gecilir; uretim eldeki veriyle surer.
async function ajanTazele(yol: string, kod: string): Promise<void> {
  try {
    const c = new AbortController();
    const z = setTimeout(() => c.abort(), 180000);
    await fetch(`http://127.0.0.1:17777/${yol}?codes=${encodeURIComponent(kod)}`, { signal: c.signal });
    clearTimeout(z);
  } catch { /* ajan yok - eldeki veriyle devam */ }
}

export async function erpdenUret(stokKodu: string): Promise<UretimSonuc> {
  const kod = encodeURIComponent(stokKodu);
  let [bomHam, rotaHam, planHam] = await Promise.all([
    sorgu(`urun_agaclari?select=tuketim_kodu,tuketim_adi,varsayilan&urun_kodu=eq.${kod}`),
    sorgu(`operasyon_kartlari?select=op_no,makine_kodu,makine_adi,rota_adi,varsayilan,header_id&stok_kodu=eq.${kod}`),
    sorgu(`leansys_kontrol_plani?select=*&stok_kodu=eq.${kod}`),
  ]);
  // Eksik olan neyse LeanSys'ten cekilir, sonra yeniden okunur
  const eksik: Promise<void>[] = [];
  if (!bomHam.length) eksik.push(ajanTazele('refreshbom', stokKodu));
  if (!rotaHam.length) eksik.push(ajanTazele('refreshop', stokKodu));
  if (!planHam.length) eksik.push(ajanTazele('refreshplan', stokKodu));
  if (eksik.length) {
    await Promise.all(eksik);
    const [b2, r2, p2] = await Promise.all([
      bomHam.length ? Promise.resolve(bomHam) : sorgu(`urun_agaclari?select=tuketim_kodu,tuketim_adi,varsayilan&urun_kodu=eq.${kod}`),
      rotaHam.length ? Promise.resolve(rotaHam) : sorgu(`operasyon_kartlari?select=op_no,makine_kodu,makine_adi,rota_adi,varsayilan,header_id&stok_kodu=eq.${kod}`),
      planHam.length ? Promise.resolve(planHam) : sorgu(`leansys_kontrol_plani?select=*&stok_kodu=eq.${kod}`),
    ]);
    bomHam = b2; rotaHam = r2; planHam = p2;
  }
  if (!rotaHam.length && !planHam.length) throw new Error('Bu ürün için operasyon kartı ve kontrol planı bulunamadı (LeanSys’ten de gelmedi).');

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
  const opKartiYok = !rotaHam.length;

  const ilk = planHam[0] || {};
  const urunAdi = met(ilk.stok_adi) || stokKodu;
  const planNo = [met(ilk.plan_no) && `Plan ${met(ilk.plan_no)}`, met(ilk.rev_no) && `Rev.${met(ilk.rev_no)}`].filter(Boolean).join(' ') || 'kontrol planı';
  // FMEA/aksiyon tarihleri kontrol planinin revizyon tarihinden turetilir.
  // Satir sirasi rastgele oldugu icin planin EN GUNCEL revizyon tarihi alinir.
  const planTarihi = planHam.map(x => met(x.tr_revtarih).slice(0, 10))
    .filter(Boolean).sort().pop() || '';
  // Mevcut projelerden ogren (hata turu, etki, siddet, nedenler, aksiyonlar)
  let hafiza: Hafiza = {};
  try { hafiza = await hafizaYukle(); } catch { /* hafiza okunamazsa kurallarla devam */ }
  const fd = iskeletUret({ kod: stokKodu, ad: urunAdi }, bom, rota, planHam, bomPlan, `kontrol planı (${planNo})`, hafiza, planTarihi);
  // Uretilen PF adlari kayit defterine eklenecek (acilir listede gorunsun)
  const pfListesi = [...new Set(Object.values<any>(fd.failureEffects)
    .map(e => e.selectedPFByType?.E).filter(Boolean))] as string[];
  // Kac karakteristik hafizadan uyarlandi (ozet mesaji icin)
  const uyarlanan = Object.values<any>(fd.processStepFunctions)
    .filter(f => hafizadaAra(hafiza, f.productCharacteristic)).length;

  return {
    fmeaData: fd, urunAdi, planNo, planTarihi, pfListesi,
    planKod: met(ilk.plan_no), planRev: met(ilk.rev_no),
    ozet: {
      adim: Object.keys(fd.processSteps).length,
      karakteristik: Object.keys(fd.processStepFunctions).length,
      hata: Object.keys(fd.failureModes).length,
      neden: Object.keys(fd.failureCauses).length,
      girdi: bom.length, elenen: bomTum.length - bom.length, planiOlmayan,
      uyarlanan, opKartiYok,
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
