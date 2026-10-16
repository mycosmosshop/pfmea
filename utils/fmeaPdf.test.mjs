// PFMEA PDF (tüm sayfalar): gerçek jsPDF + autotable ile üretir; sayfa sırası, seçim, antet, Türkçe karakter.
// Çalıştır:  node utils/fmeaPdf.test.mjs <lib klasörü> <çıktı.pdf> [satirlar.json] [proje.json] [kriter.json]
//   lib klasörü: jspdf.js, autotable.js (CDN UMD), roboto-regular.ttf, roboto-bold.ttf
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { buildSync } from 'esbuild';

const kod = (d) => buildSync({ entryPoints: [d], bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2020' }).outputFiles[0].text;
const yukle = async (d) => import('data:text/javascript;base64,' + Buffer.from(kod(d)).toString('base64'));
const [lib, cikti, satirF, projeF, kriterF] = process.argv.slice(2);
const T = await yukle('utils/fmeaPdf.ts');
const { initialApMatrix } = await yukle('utils/ap-matrix.ts');

const ctx = vm.createContext({ console, Uint8Array, ArrayBuffer, Uint16Array, Uint32Array, Int32Array, Float32Array, DataView, TextEncoder, TextDecoder, Buffer, Date, Math, JSON, Promise, setTimeout, clearTimeout, atob, btoa, Object, Array, String, Number, RegExp, Error });
ctx.window = ctx; ctx.self = ctx; ctx.navigator = { userAgent: 'node' };
vm.runInContext(fs.readFileSync(path.join(lib, 'jspdf.js'), 'utf8'), ctx);
ctx.jsPDF = ctx.jspdf.jsPDF;
vm.runInContext(fs.readFileSync(path.join(lib, 'autotable.js'), 'utf8'), ctx);
const font = { normal: fs.readFileSync(path.join(lib, 'roboto-regular.ttf')).toString('base64'), bold: fs.readFileSync(path.join(lib, 'roboto-bold.ttf')).toString('base64') };

const satirlar = satirF ? JSON.parse(fs.readFileSync(satirF, 'utf8')) : [
  ['5NA 881 989', '[10] Giriş kontrol', 'Metot', '5NA 881 989', 'Malzeme uygun', '', '[E] Uyum sorunu (7)\nŞ ğ ı İ ö ç ⚠', 5, 'Yanma testi başarısız ⚠', 'Sertifika yok', 'Tedarikçi onayı', 3, 'Giriş kontrol', 6, '', '', '', 'Önleyici', '', 'Ünal Ü.', '2026-08-01', 'Completed', 'Yapıldı', '2026-08-01', 7, 2, 6, '', '', ''],
  ['5NA 881 989', '[10] Giriş kontrol', 'Ölçüm', '5NA 881 989', 'Malzeme uygun', '', '[E] Uyum sorunu (7)\nŞ ğ ı İ ö ç ⚠', 7, 'Kalınlık', 'Ölçülmedi', 'Talimat', 4, 'Mikrometre', 6, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
];
const proje = projeF ? JSON.parse(fs.readFileSync(projeF, 'utf8')) : null;
const pd = proje ? (proje[0]?.data || proje).projectData : { fmea: { project: 'Test PFMEA', client: 'BROSE SITECH GmbH', productName: 'Ürün ğüşıöç', companyName: 'Sanifoam', teamMembers: 'Volkan Pekatik, Ünal Ürkmez' }, history: [{ revision: 'Rev.00', date: '2026-07-14', changeDescription: 'İlk yayın — çğış', changeReason: 'Yeni ürün', preparedBy: 'CFT', approvedBy: 'Ünal Ürkmez' }] };
const kriter = kriterF ? JSON.parse(fs.readFileSync(kriterF, 'utf8')) : [['ŞİDDET (S)'], ['S', 'Etki', 'Tesis içi', 'Sevk', 'Son kullanıcı'], [10, 'Yüksek', 'a', 'b', 'c'], [], ['OLUŞMA (O)'], ['O', 'Olasılık', 'Sıklık'], [1, 'Düşük', '≤ 1/1.000.000']];
const zebra = satirlar.map((_, i) => i % 4 < 2);
const g = (secim) => ({ secim, fmea: pd.fmea, history: pd.history, satirlar, zebra, apMatrix: initialApMatrix, kriter, antet: { docNo: 'FR 34', rev: '4', date: '02.01.2025' }, font });

// 1) seçim: yalnız seçilen bölümler, sırayla; ilk boş sayfa kalmaz
const yalniz = T.fmeaPdfOlustur(ctx.jsPDF, g(['gecmis', 'ap']));
const s1 = yalniz.internal.pages.slice(1).map(p => p.join('\n'));
assert(s1.length >= 2, s1.length);
assert(yalniz.internal.pageSize.getWidth() < 220, 'AP Matrisi A4 dikey olmalı (son sayfa)');
console.log('✓ 1  yalnız Proje Geçmişi + AP Matrisi seçildi →', s1.length, 'sayfa');

// 2) tümü
const doc = T.fmeaPdfOlustur(ctx.jsPDF, g(T.PDF_SAYFALAR.map(s => s.key)));
const N = doc.getNumberOfPages();
doc.setPage(1); assert(doc.internal.pageSize.getWidth() > 400, 'FMEA A3 yatay olmalı');
if (cikti) fs.writeFileSync(cikti, Buffer.from(doc.output('arraybuffer')));
console.log('✓ 2  tüm sayfalar →', N, 'sayfa' + (cikti ? ' → ' + cikti : ''));
console.log('\nTüm senaryolar geçti.');
