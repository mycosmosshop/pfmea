// Ortak (bulut) proje deposu — Supabase PostgREST uzerinden, ek bagimlilik yok (sadece fetch).
// Amac: PFMEA projelerini TUM kullanicilarin gordugu ortak bir tabloda saklamak.
//
// Tasarim: BULUT-ONCELIKLI + YEREL YEDEK.
//   - Yazma  -> once buluta upsert; ayrica yerel IndexedDB'ye onbellek (cevrimdisi son durum).
//   - Okuma  -> once bulut; bulut erisilemezse yerel onbellekten don (uygulama cokmoesin).
//   - Silme  -> bulut + yerel.
//
// Mevcut projectDb.ts arayuzuyle BIREBIR ayni imzalar -> App.tsx sadece import satirini degistirir.
//
// NOT: Bu tablo, Kalite Kontrol Supabase projesinde (ref nnubrxbpthmkitueixbh) AYRI bir tablodur.
// Diger modullerin tablolarina dokunmaz. Anon key publictir (diger modullerde de gomulu).

import type { FullProjectState } from '../types';
import {
  saveProject as localSave,
  getProject as localGet,
  getAllProjects as localGetAll,
  deleteProject as localDelete,
} from './projectDb';

const SUPABASE_URL = 'https://nnubrxbpthmkitueixbh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5udWJyeGJwdGhta2l0dWVpeGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjI2MDIsImV4cCI6MjA5NjEzODYwMn0.CHZUOylf_q8kkOQbFf9VWZ6-doUTlynmAhahM2EuImE';
const TABLE = 'pfmea_projects';
const REST = `${SUPABASE_URL}/rest/v1/${TABLE}`;

const baseHeaders = {
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${SUPABASE_ANON}`,
  'Content-Type': 'application/json',
};

// FullProjectState icinden okunabilir bir ad turet (yalnizca 'name' sutunu icin; uygulama gosterimi 'data'dan gelir).
function deriveName(p: FullProjectState): string {
  const pd: any = (p as any).projectData;
  return (
    pd?.fmea?.project ||
    pd?.fmea?.productName ||
    pd?.project ||
    pd?.name ||
    (p as any).id ||
    'PFMEA'
  );
}

// --- Yazma: bulut upsert + yerel onbellek ---
export async function saveProject(project: FullProjectState): Promise<void> {
  // Yerel onbellek (best-effort, hata uygulamayi durdurmasin)
  try { await localSave(project); } catch { /* yoksay */ }

  const row = { id: (project as any).id, name: deriveName(project), data: project };
  const res = await fetch(`${REST}?on_conflict=id`, {
    method: 'POST',
    headers: { ...baseHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Bulut kayit hatasi (${res.status}): ${txt}`);
  }
}

// --- Okuma (tek): bulut; bulutta YOKSA veya hata olursa YEREL ---
// ONEMLI: Bulut erisilebilir ama bu id'de satir yoksa (tablo yeni, proje henuz
// buluta yuklenmemis) yerele dusulur. Aksi halde dashboard'da gorunen ama yalniz
// yerelde olan proje acilirken "Project could not be found" hatasi olusur.
export async function getProject(id: string): Promise<FullProjectState | undefined> {
  try {
    const res = await fetch(`${REST}?id=eq.${encodeURIComponent(id)}&select=data`, { headers: baseHeaders });
    if (!res.ok) throw new Error(String(res.status));
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) return rows[0].data as FullProjectState;
    // Bulutta yok -> yerelden dene (birlesik dashboard ile tutarli)
    return await localGet(id);
  } catch {
    return localGet(id);
  }
}

// --- Okuma (tum): bulut + yerel BIRLESIK (id'ye gore, bulut oncelikli) ---
// Birlestirme sayesinde: tablo yeni acildiginda (bulut bos) mevcut yerel projeler
// kaybolmaz; kullanici Save'e basinca buluta cikar ve herkese gorunur olur.
export async function getAllProjects(): Promise<FullProjectState[]> {
  const local = await localGetAll().catch(() => [] as FullProjectState[]);
  try {
    const res = await fetch(`${REST}?select=data&order=updated_at.desc`, { headers: baseHeaders });
    if (!res.ok) throw new Error(String(res.status));
    const rows = await res.json();
    const cloud = (Array.isArray(rows) ? rows : []).map((r: any) => r.data as FullProjectState).filter(Boolean);
    // Bulut basariliysa yerel onbellegi tazele (cevrimdisi yedek guncel kalsin)
    Promise.all(cloud.map(p => localSave(p).catch(() => {}))).catch(() => {});
    // Birlestir: bulut oncelikli, yerelde olup bulutta olmayanlari ekle
    const byId = new Map<string, FullProjectState>();
    local.forEach(p => byId.set((p as any).id, p));
    cloud.forEach(p => byId.set((p as any).id, p)); // bulut yereli ezer
    return Array.from(byId.values());
  } catch {
    return local;
  }
}

// --- Silme: bulut + yerel ---
export async function deleteProject(id: string): Promise<void> {
  try { await localDelete(id); } catch { /* yoksay */ }
  const res = await fetch(`${REST}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...baseHeaders, Prefer: 'return=minimal' },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Bulut silme hatasi (${res.status}): ${txt}`);
  }
}
