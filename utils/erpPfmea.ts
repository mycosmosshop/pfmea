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
import { sorumlular } from './sorumlular';

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
// acik: gercek bir eksigi kapatan is (acik gorev dogar). Bayraksizlar mevcut
// uygulamayi belgeler ve Completed dogar.
export interface Aksiyon { tur: 'prevention' | 'detection'; metin: string; acik?: boolean; }

// Makine ayarina bagli karakteristikler (set degeri is emrinde sabitlenebilir)
const AYAR = /AYAR|SET|ISI|SICAK|BASKI|HIZ|SURE|SÜRE|BASINC|BASIN\u00c7|DEGER|DE\u011eER/;

// Aksiyonlar kontrol plani satirinin KENDI verisinden turer; jenerik "kontrol
// sikligini artir" yerine o prosese ozgu, ispat yuku dusuk onlemler.
export function aksiyonlar(ap: string, it: any, girdiMi = false): Aksiyon[] {
  const k = metinS(it.olculecek) || 'karakteristik';
  const hedef = [metinS(it.hedef_nicel), metinS(it.hedef_nitel)].filter(Boolean).join(' ')
    || [metinS(it.alt_limit), metinS(it.ust_limit)].filter(Boolean).join('–');
  const hd = hedef ? ` (${hedef})` : '';
  const yontem = metinS(it.yontem);
  const mak = metinS(it.uretim_ekipman);
  const liste: Aksiyon[] = [];

  // ÖNLEME — doğru değeri belirsizlikten çıkarır (O'yu düşürür)
  if (girdiMi) liste.push({ tur: 'prevention',
    metin: `Kabulde tedarikçi sertifikası/irsaliyesinde ${k} değeri${hd} teyit edilir; uygun olmayan lot bloke edilip tedarikçiye bildirilir` });
  else if (AYAR.test(buyuk(k))) liste.push({ tur: 'prevention',
    metin: `${k} set değeri${hd} iş emri/operasyon kartına yazılır ve vardiya başında${mak ? ` ${mak} üzerinde` : ''} operatörle teyit edilir` });
  else if (metinS(it.ozel_kar)) liste.push({ tur: 'prevention',
    metin: `${k} özel karakteristik olarak iş emrinde ve istasyon talimatında işaretlenir; ilk parça onayı alınmadan üretime devam edilmez` });
  else liste.push({ tur: 'prevention',
    metin: `${k} hedef değeri${hd} istasyondaki görsel talimatta öne çıkarılır ve vardiya başı bilgilendirmede hatırlatılır` });

  // TESPİT — ölçümü kayda bağlar (D'yi düşürür)
  if (!yontem) liste.push({ tur: 'detection', acik: true,
    metin: `${k} için ölçüm yöntemi ve numune büyüklüğü kontrol planında tanımlanır (şu an tanımlı değil)` });
  else liste.push({ tur: 'detection',
    metin: `İlk parça ve son parçada ${k}, ${yontem} ile ölçülüp kontrol formuna kaydedilir (${siklik(it, girdiMi)})` });

  // AP yüksekse ölçümü sınır kontrolüne bağla — ek yatırım gerektirmez
  if (ap === 'H' && yontem) liste.push({ tur: 'detection', acik: true,
    metin: `${yontem} ölçüm formuna alt/üst sınır${hd} basılır; sınır dışı değerde parça ayrılır ve ayar teyit edilmeden devam edilmez` });

  // Emniyet/mevzuat: AP düşük olsa da sürekliliği belgelenmeli
  if (emniyetMi(it)) liste.push({ tur: 'prevention',
    metin: `${k} için laboratuvar/tedarikçi sertifikasının geçerliliği izlenir; malzeme veya reçete değişiminde yeniden test edilir` });

  return liste;
}

// Aksiyon sonrası beklenen değerler. Şiddet proses aksiyonuyla DEĞİŞMEZ
// (AIAG-VDA: S ancak ürün/tasarım değişirse düşer); önleme aksiyonu O'yu,
// tespit aksiyonu D'yi bir kademe iyileştirir.
// Kaynak kayitta alan bos METIN de olabiliyor; ?? bunu gecerli sayip AP yi
// bos birakiyordu. Bos metin de "yok" sayilir.
export function doluDeger<T>(v: any, varsayilan: T): T {
  return v === null || v === undefined || v === '' ? varsayilan : v;
}

export function iyilestirme(S: number, O: number, D: number, aks: Aksiyon[]) {
  const rO = aks.some(a => a.tur === 'prevention') ? Math.max(2, O - 1) : O;
  const rD = aks.some(a => a.tur === 'detection') ? Math.max(2, D - 1) : D;
  return { S, O: rO, D: rD, ap: apHesapla(S, rO, rD) };
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

// Uretilen projeler data.otomatik, uretilen nedenler otoUretim tasir; hafiza
// bunlari atlar. Eski kayitlarda isaret remarks metnindeydi ya da hic yoktu -
// o yuzden uretimin kendi aksiyon metinleri de imza olarak taninir.
export const OTOMATIK = /^(OTOMATİK ÖNERİ|BENZER PROJEDEN)/;
const URETIM_IZI = /Kabulde tedarikçi sertifikası\/irsaliyesinde|İlk parça ve son parçada .+ ile ölçülüp kontrol formuna|set değeri.{0,40}iş emri\/operasyon kartına yazılır|hedef değeri.{0,40}görsel talimatta öne çıkarılır|ölçüm formuna alt\/üst sınır|şu an tanımlı değil/;

// Bu neden bu uretim tarafindan mi yazilmis?
export function uretilmisMi(c: any): boolean {
  if (c?.otoUretim) return true;
  if (OTOMATIK.test(met(c?.remarks))) return true;
  return (c?.actions || []).some((a: any) => URETIM_IZI.test(met(a?.description)));
}

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
        .filter(Boolean).filter((c: any) => !uretilmisMi(c));
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
  ozet: { adim: number; karakteristik: number; hata: number; neden: number; girdi: number; elenen: number; planiOlmayan: number; uyarlanan: number; opKartiYok: boolean; agacKalem: number };
  urunAdi: string;
  planNo: string;
  planTarihi: string;
  planKod: string;
  planRev: string;
}

// ── İskelet üretici (saf: test edilebilir) ────────────────────────────────
// Bir kalemin GIRDI kontrol satirlari. LeanSys'te girdi kontrolunu `giris`
// bayragi isaretler; bayrak varsa o satirlar esastir. Bayrak hic kullanilmamis
// eski planlarda, kod kurali hammadde diyorsa planin tamami girdi sayilir -
// yari mamulun kendi proses plani yanlislikla girdi adimina donmesin diye.
export function girdiSatirlari(kod: string, planlar: any[]): any[] {
  const g = planlar.filter(x => !!Number(x.giris));
  return g.length ? g : (girdiMalzemeMi(kod) ? planlar : []);
}

export function iskeletUret(urun: { kod: string; ad: string }, bom: any[], rota: any[], plan: any[], bomPlan: Record<string, any[]>, kaynakNot: string, hafiza: Hafiza = {}, planTarihi = '', sorumluListe: string[] = []) {
  // Lokasyon disi sorumlu tasinmaz: kaynak projedeki ad bu lokasyonun
  // listesinde yoksa bos birakilir (Ankara'daki ad Cerkezkoy'e gelmesin).
  const sorumluSuz = (ad: string) => (sorumluListe.includes(ad) ? ad : '');
  const tamamTarihi = planTarihi || new Date().toISOString().slice(0, 10);
  const fd: any = { failureModes: {}, processItems: {}, processSteps: {}, failureCauses: {}, failureEffects: {}, processItemIds: [], processStepFunctions: {} };
  let ns = 0, nf = 0, nm = 0, nc = 0, ne = 0;

  const itemId = 'i_1';
  fd.processItems[itemId] = { id: itemId, name: `${met(urun.ad)} (${met(urun.kod)})`, stepIds: [] };
  fd.processItemIds = [itemId];

  const adimlar: any[] = [];

  const girdiSatir = (k: string) => girdiSatirlari(k, bomPlan[k] || []);
  bom.filter(b => girdiSatir(met(b.tuketim_kodu)).length)
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
          const hRev = iyilestirme(S, Number(kn.occurrence) || O, Number(kn.detection) || D,
            (kn.actions || []).map((x: any) => ({ tur: x.type === 'detection' ? 'detection' : 'prevention', metin: '' })));
          fd.failureCauses[cid] = {
            id: cid, otoUretim: true,
            // Onceki projeden gelen aksiyon zaten yapilmis bir istir (mevcut
            // uygulama); durumu, tarihi ve sorumlusu korunur - gorev listesinde
            // yeniden "acik is" olarak cikmasin.
            actions: (kn.actions || []).map((ak: any, i: number) => ({
              id: `${cid}_a${i + 1}`, type: ak.type || 'prevention', number: i + 1,
              status: met(ak.status) || 'Open', actionTaken: met(ak.actionTaken),
              description: met(ak.description),
              completionDate: met(ak.completionDate),
              responsiblePerson: sorumluSuz(met(ak.responsiblePerson)),
              targetCompletionDate: met(ak.targetCompletionDate) || hedefTarih(planTarihi, ap),
            })),
            remarks: '',
            detection: Number(kn.detection) || D, occurrence: Number(kn.occurrence) || O,
            description: met(kn.description), actionPriority: ap,
            revisedSeverity: doluDeger(kn.revisedSeverity, hRev.S),
            detectionControl: metinS(kn.detectionControl) || tespitKontrol(it, a.girdi),
            revisedDetection: doluDeger(kn.revisedDetection, hRev.D),
            preventionControl: metinS(kn.preventionControl) || onlemeKontrol(it),
            revisedOccurrence: doluDeger(kn.revisedOccurrence, hRev.O),
            revisedActionPriority: doluDeger(kn.revisedActionPriority, hRev.ap),
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
          const aks = aksiyonlar(ap, it, a.girdi);
          const rev = iyilestirme(S, O, D, aks);
          fd.failureCauses[cid] = {
            id: cid, otoUretim: true,
            // Mevcut uygulamayi belgeleyen aksiyonlar Completed dogar (is
            // zaten yapiliyor); gercek eksikler (acik bayragi) acik gorev olur.
            actions: aks.map((x, i) => ({
              id: `${cid}_a${i + 1}`, type: x.tur, number: i + 1,
              status: x.acik ? 'Open' : 'Completed',
              actionTaken: x.acik ? '' : 'Mevcut uygulama — kontrol planında tanımlı',
              description: x.metin,
              completionDate: x.acik ? '' : tamamTarihi, responsiblePerson: '',
              targetCompletionDate: x.acik ? hedefTarih(planTarihi, ap) : tamamTarihi,
            })),
            remarks: '',
            detection: D, occurrence: O, description: aciklama, actionPriority: ap,
            revisedSeverity: rev.S, detectionControl: tespitKontrol(it, a.girdi), revisedDetection: rev.D,
            preventionControl: onlemeKontrol(it), revisedOccurrence: rev.O,
            revisedActionPriority: rev.ap,
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

// Urun agacini seviye seviye tarar. Bir seviyede agaci ERP'de bulunmayan
// kalemler icin LeanSys'ten bir kez cekilir, sonra o seviye yeniden okunur.
export async function agacDuz(kok: string, oku: (k: string[]) => Promise<any[]> = agacOku,
                             tazele: (y: string, k: string) => Promise<void> = ajanTazele): Promise<any[]> {
  const gorulen = new Set<string>([met(kok)]);
  const sonuc: any[] = [];
  let seviye = [met(kok)];
  for (let derinlik = 0; derinlik < 8 && seviye.length; derinlik++) {
    let satir = await oku(seviye);
    // Hammaddenin agaci zaten olmaz; yalniz yari mamul/mamul icin cekilir
    // (yoksa her yaprak icin ayri ayri LeanSys cagrisi yapiliyordu).
    const bosalanlar = seviye.filter(k => !girdiMalzemeMi(k) && !satir.some(b => met(b.urun_kodu) === k));
    if (bosalanlar.length) {                      // agaci ERP'de yok - LeanSys'ten cek
      await tazele('refreshbom', bosalanlar.join(','));
      satir = await oku(seviye);
    }
    const sonraki: string[] = [];
    satir.filter(b => b.varsayilan !== false).forEach(b => {
      const k = met(b.tuketim_kodu);
      if (!k || gorulen.has(k)) return;           // dongu ve tekrar korumasi
      gorulen.add(k); sonuc.push(b); sonraki.push(k);
    });
    seviye = sonraki;
  }
  return sonuc;
}

async function agacOku(kodlar: string[]): Promise<any[]> {
  const cikti: any[] = [];
  for (let i = 0; i < kodlar.length; i += 40) {
    const liste = kodlar.slice(i, i + 40).map(c => `"${c}"`).join(',');
    cikti.push(...await sorgu(`urun_agaclari?select=urun_kodu,tuketim_kodu,tuketim_adi,varsayilan&urun_kodu=in.(${encodeURIComponent(liste)})`));
  }
  return cikti;
}

// Verilen kodlarin kontrol planlari; ERP'de olmayanlar LeanSys'ten cekilir.
async function planlariOku(kodlar: string[]): Promise<Record<string, any[]>> {
  const oku = async (liste: string[]) => {
    const cikti: any[] = [];
    for (let i = 0; i < liste.length; i += 40) {
      const g = liste.slice(i, i + 40).map(c => `"${c}"`).join(',');
      cikti.push(...await sorgu(`leansys_kontrol_plani?select=*&stok_kodu=in.(${encodeURIComponent(g)})`));
    }
    return cikti;
  };
  let satir = await oku(kodlar);
  const eksik = kodlar.filter(k => !satir.some(x => met(x.stok_kodu) === k));
  if (eksik.length) {                             // plani ERP'de yok - LeanSys'ten cek
    await ajanTazele('refreshplan', eksik.join(','));
    satir = await oku(kodlar);
  }
  const m: Record<string, any[]> = {};
  satir.forEach(x => (m[met(x.stok_kodu)] = m[met(x.stok_kodu)] || []).push(x));
  return m;
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

  // Agacin TUM seviyeleri (yari mamullerin altindaki hammaddeler dahil)
  const bomTum = await agacDuz(stokKodu);
  const rotaHid = (rotaHam.find(r => r.varsayilan === true) || rotaHam[0] || {}).header_id;
  const rota = rotaHam.filter(r => r.header_id === rotaHid);

  // Agactaki her kalemin KENDI kontrol plani (eksikse LeanSys'ten cekilir)
  const bomPlan = bomTum.length
    ? await planlariOku([...new Set(bomTum.map(b => met(b.tuketim_kodu)).filter(Boolean))])
    : {};
  // Girdi kontrolu olan kalemler FMEA'ya girer (kural: girdiSatirlari)
  const bom = bomTum.filter(b => girdiSatirlari(met(b.tuketim_kodu), bomPlan[met(b.tuketim_kodu)] || []).length);
  // Kod kurali hammadde diyor ama hicbir plani yok - uyarilmali
  const planiOlmayan = bomTum.filter(b => girdiMalzemeMi(b.tuketim_kodu)
    && !(bomPlan[met(b.tuketim_kodu)] || []).length).length;
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
  const fd = iskeletUret({ kod: stokKodu, ad: urunAdi }, bom, rota, planHam, bomPlan, `kontrol planı (${planNo})`, hafiza, planTarihi, sorumlular('Çerkezköy'));
  // Kac karakteristik hafizadan uyarlandi (ozet mesaji icin)
  const uyarlanan = Object.values<any>(fd.processStepFunctions)
    .filter(f => hafizadaAra(hafiza, f.productCharacteristic)).length;

  return {
    fmeaData: fd, urunAdi, planNo, planTarihi,
    planKod: met(ilk.plan_no), planRev: met(ilk.rev_no),
    ozet: {
      adim: Object.keys(fd.processSteps).length,
      karakteristik: Object.keys(fd.processStepFunctions).length,
      hata: Object.keys(fd.failureModes).length,
      neden: Object.keys(fd.failureCauses).length,
      girdi: bom.length, elenen: bomTum.length - bom.length, planiOlmayan,
      agacKalem: bomTum.length,
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
