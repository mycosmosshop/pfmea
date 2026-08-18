// Task manager görev durumu.
import type { FmeaData } from '../types';

// Durum kurali tek yerde: tamamlanirken tarih bossa bugun yazilir, geri
// alinirken tamamlanma tarihi temizlenir (yoksa "acik ama tarihli" kalir).
function uygula(a: any, tamam: boolean, bugun: string): void {
  a.status = tamam ? 'Completed' : 'Open';
  a.completionDate = tamam ? (a.completionDate || bugun) : '';
}

// Bir görevin durumunu değiştirir. Tamamlanırken tarih boşsa bugün yazılır,
// geri alınırken tamamlanma tarihi temizlenir (yoksa "açık ama tarihli" kalır).
export function durumDegistir(data: FmeaData, actionId: string, tamam: boolean, bugun: string): FmeaData {
  const yeni: FmeaData = JSON.parse(JSON.stringify(data));
  Object.values<any>(yeni.failureCauses).forEach(cause => {
    (cause.actions || []).forEach((a: any) => {
      if (a.id !== actionId) return;
      uygula(a, tamam, bugun);
    });
  });
  return yeni;
}

// Tüm görevleri tamamla / geri al. Tek görev kuralının aynısı: tamamlarken
// tarih boşsa bugün yazılır, geri alırken tamamlanma tarihi temizlenir.
export function hepsiniDegistir(data: FmeaData, tamam: boolean, bugun: string): FmeaData {
  const yeni: FmeaData = JSON.parse(JSON.stringify(data));
  Object.values<any>(yeni.failureCauses).forEach(cause => {
    (cause.actions || []).forEach((a: any) => uygula(a, tamam, bugun));
  });
  return yeni;
}
