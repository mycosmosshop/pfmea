// Task manager görev durumu.
import type { FmeaData } from '../types';

// Bir görevin durumunu değiştirir. Tamamlanırken tarih boşsa bugün yazılır,
// geri alınırken tamamlanma tarihi temizlenir (yoksa "açık ama tarihli" kalır).
export function durumDegistir(data: FmeaData, actionId: string, tamam: boolean, bugun: string): FmeaData {
  const yeni: FmeaData = JSON.parse(JSON.stringify(data));
  Object.values<any>(yeni.failureCauses).forEach(cause => {
    (cause.actions || []).forEach((a: any) => {
      if (a.id !== actionId) return;
      a.status = tamam ? 'Completed' : 'Open';
      a.completionDate = tamam ? (a.completionDate || bugun) : '';
    });
  });
  return yeni;
}
