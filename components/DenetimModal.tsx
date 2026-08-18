import React, { useMemo, useState } from 'react';
import type { FmeaData } from '../types';
import { denetle, ozetle, Bulgu } from '../utils/denetim';

declare const XLSX: any;

// Tamlık denetimi: FMEA bittikten sonra "her konu değerlendirildi mi?"
// sorusunu satır satır listeler. Salt okunur — düzeltme FMEA içinde yapılır.
export const DenetimModal: React.FC<{ allData: FmeaData; onClose: () => void }> = ({ allData, onClose }) => {
  const bulgular = useMemo(() => denetle(allData), [allData]);
  const ozet = useMemo(() => ozetle(bulgular), [bulgular]);
  const [suzgec, setSuzgec] = useState<string>('');

  const gorunen = suzgec ? bulgular.filter(b => b.kural === suzgec) : bulgular;

  // Yapilacaklar listesi olarak disa aktar: Karar/Sorumlu/Termin/Durum bos
  // birakilir, ekip Excel'de doldurup takip eder. Suzgec uygulanmissa yalniz
  // gorunen satirlar aktarilir.
  const excelAktar = () => {
    const ws = XLSX.utils.json_to_sheet(gorunen.map(b => ({
      'Seviye': b.seviye === 'eksik' ? 'EKSİK' : 'UYARI',
      'Konu': b.kural,
      'Konum': b.konum,
      'Bulgu': b.mesaj,
      'Karar': '',        // Yapilacak / Gerekcelendirildi-kapatildi
      'Sorumlu': '',
      'Termin': '',
      'Durum': 'Açık',
    })));
    ws['!cols'] = [{wch:8},{wch:12},{wch:50},{wch:70},{wch:26},{wch:16},{wch:12},{wch:10}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Denetim');
    XLSX.writeFile(wb, 'Tamlik_Denetimi.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h2 className="text-lg font-bold text-blue-700">Tamlık Denetimi</h2>
            <p className="text-xs text-gray-500">
              AIAG-VDA 7 adım + 4M kapsamına göre eksik değerlendirme listesi. Düzeltmeler FMEA içinde yapılır.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={excelAktar} disabled={!gorunen.length}
              title="Görünen satırları yapılacaklar listesi olarak Excel'e aktarır (Karar/Sorumlu/Termin sütunlarıyla)"
              className="px-3 py-1 text-sm border rounded bg-gray-100 hover:bg-gray-200 border-gray-300 disabled:opacity-50">
              Excel (to-do)
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xl px-2">×</button>
          </div>
        </div>

        <div className="px-5 py-3 flex flex-wrap items-center gap-2 border-b bg-gray-50">
          {bulgular.length === 0 ? (
            <span className="text-sm font-semibold text-green-700">✓ Eksik bulunamadı — tüm satırlarda etki, S/O/D, kontroller ve gerekli aksiyonlar tanımlı.</span>
          ) : (
            <>
              <span className="text-sm font-semibold text-red-700">{ozet.eksik} eksik</span>
              <span className="text-sm font-semibold text-amber-600">{ozet.uyari} uyarı</span>
              <span className="mx-2 text-gray-300">|</span>
              <button onClick={() => setSuzgec('')}
                className={`px-2 py-0.5 text-xs rounded-full border ${!suzgec ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
                tümü {bulgular.length}
              </button>
              {Object.entries(ozet.kurallar).map(([k, n]) => (
                <button key={k} onClick={() => setSuzgec(suzgec === k ? '' : k)}
                  className={`px-2 py-0.5 text-xs rounded-full border ${suzgec === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
                  {k} {n}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm table-fixed">
            <thead className="sticky top-0 bg-gray-100">
              <tr>
                <th className="text-left px-4 py-2 w-16 font-semibold text-gray-600">Seviye</th>
                <th className="text-left px-4 py-2 w-28 font-semibold text-gray-600">Konu</th>
                <th className="text-left px-4 py-2 w-72 font-semibold text-gray-600">Konum</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Bulgu</th>
              </tr>
            </thead>
            <tbody>
              {gorunen.map((b: Bulgu, i: number) => (
                <tr key={i} className={`border-t ${b.seviye === 'eksik' ? 'bg-red-50' : 'bg-amber-50/40'}`}>
                  <td className="px-4 py-2 align-top">
                    <span className={`text-xs font-bold ${b.seviye === 'eksik' ? 'text-red-700' : 'text-amber-600'}`}>
                      {b.seviye === 'eksik' ? 'EKSİK' : 'UYARI'}
                    </span>
                  </td>
                  <td className="px-4 py-2 align-top text-xs text-gray-500">{b.kural}</td>
                  <td className="px-4 py-2 align-top text-gray-700 break-words">{b.konum}</td>
                  <td className="px-4 py-2 align-top text-gray-800 break-words">{b.mesaj}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t text-xs text-gray-500">
          <b>EKSİK</b> standart gereğidir, kapatılmalıdır. <b>UYARI</b> zorunlu değildir: ekip değerlendirir,
          ya düzeltilir ya da "değerlendirildi, gerek yok" diye gerekçelendirilip kapatılır — ikisi de geçerli kapanıştır.
          <span className="mx-1 text-gray-300">|</span>
          Kontroller: zincir · üç seviyeli etki · 4M neden kapsamı · S/O/D aralıkları · önleme+tespit ·
          AP=H'de zorunlu aksiyon, AP=M'de gerekçe · aksiyon sorumlusu · girdi adımı.
        </div>
      </div>
    </div>
  );
};
