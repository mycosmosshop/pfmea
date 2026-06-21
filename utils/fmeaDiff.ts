import type { FmeaData, FmeaAction } from '../types';

// İki FMEA durumu arasındaki değişiklikleri insan-okur Türkçe satırlara çevirir.
// Project History "Değişiklik Açıklaması" için kullanılır (opsiyonel oto-kayıt).

const fmt = (v: any): string => {
    if (v === undefined || v === null || v === '') return '—';
    return String(v);
};

type FieldSpec = { key: string; label: string };

const collectActions = (d: FmeaData): Record<string, FmeaAction & { _cause: string }> => {
    const out: Record<string, any> = {};
    Object.values(d.failureCauses || {}).forEach(c => {
        (c.actions || []).forEach(a => { out[a.id] = { ...a, _cause: c.description || '' }; });
    });
    return out;
};

export function diffFmea(oldD: FmeaData | null | undefined, newD: FmeaData): string[] {
    const changes: string[] = [];
    if (!oldD) {
        return ['İlk revizyon kaydı — mevcut durum temel (baseline) olarak alındı.'];
    }

    const cmp = (
        oldRec: Record<string, any> | undefined,
        newRec: Record<string, any> | undefined,
        typeName: string,
        nameOf: (x: any) => string,
        fields: FieldSpec[],
    ) => {
        const o = oldRec || {}, n = newRec || {};
        const oldIds = Object.keys(o), newIds = Object.keys(n);
        newIds.forEach(id => { if (!o[id]) changes.push(`Yeni ${typeName}: "${nameOf(n[id])}"`); });
        oldIds.forEach(id => { if (!n[id]) changes.push(`Silinen ${typeName}: "${nameOf(o[id])}"`); });
        newIds.forEach(id => {
            if (!o[id]) return;
            fields.forEach(({ key, label }) => {
                const ov = o[id][key], nv = n[id][key];
                if ((ov ?? '') !== (nv ?? '')) {
                    changes.push(`${typeName} "${nameOf(n[id])}" — ${label}: ${fmt(ov)} → ${fmt(nv)}`);
                }
            });
        });
    };

    cmp(oldD.processSteps, newD.processSteps, 'Proses Adımı',
        (x) => x.name || x.operationNumber || '?',
        [{ key: 'operationNumber', label: 'Op. No' }, { key: 'name', label: 'Ad' }, { key: 'machineDeviceSource', label: 'Makine/Kaynak' }]);

    cmp(oldD.processStepFunctions, newD.processStepFunctions, 'Fonksiyon',
        (x) => x.name || '?',
        [{ key: 'name', label: 'Ad' }, { key: 'productCharacteristic', label: 'Ürün Karakt.' }, { key: 'productSpecificationTolerance', label: 'Tolerans' }]);

    cmp(oldD.failureModes, newD.failureModes, 'Hata Modu',
        (x) => x.description || '?',
        [{ key: 'description', label: 'Açıklama' }]);

    cmp(oldD.failureEffects, newD.failureEffects, 'Hata Etkisi',
        (x) => x.effectText || '?',
        [{ key: 'effectText', label: 'Etki' }, { key: 'severity', label: 'S (Şiddet)' }]);

    cmp(oldD.failureCauses, newD.failureCauses, 'Hata Nedeni',
        (x) => x.description || '?',
        [
            { key: 'description', label: 'Açıklama' },
            { key: 'preventionControl', label: 'Önleme Kontrolü' },
            { key: 'occurrence', label: 'O (Olasılık)' },
            { key: 'detectionControl', label: 'Tespit Kontrolü' },
            { key: 'detection', label: 'D (Tespit)' },
            { key: 'actionPriority', label: 'AP' },
            { key: 'revisedSeverity', label: 'Rev. S' },
            { key: 'revisedOccurrence', label: 'Rev. O' },
            { key: 'revisedDetection', label: 'Rev. D' },
            { key: 'revisedActionPriority', label: 'Rev. AP' },
            { key: 'remarks', label: 'Notlar' },
        ]);

    cmp(collectActions(oldD), collectActions(newD), 'Aksiyon (Step 6)',
        (x) => x.description || x._cause || '?',
        [
            { key: 'description', label: 'Açıklama' },
            { key: 'responsiblePerson', label: 'Sorumlu' },
            { key: 'targetCompletionDate', label: 'Hedef Tarih' },
            { key: 'status', label: 'Durum' },
            { key: 'actionTaken', label: 'Yapılan İşlem' },
            { key: 'completionDate', label: 'Tamamlanma Tarihi' },
        ]);

    return changes;
}
