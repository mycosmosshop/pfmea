# PFMEA çalışma Excel'i gerçek Excel'de: tablo, satır ekle/sil, kademe listeleri, Görevler sekmesi.
# Önce:  node utils/fmeaExcel.test.mjs <dosya.xlsx>   →   python -X utf8 test_fmea_excel.py <dosya.xlsx>
import json, os, shutil, sys, tempfile
import pythoncom
import win32com.client

kaynak = os.path.abspath(sys.argv[1])
m = json.load(open(kaynak + '.matris.json', encoding='utf-8'))
kopya = os.path.join(tempfile.mkdtemp(), 'fmea.xlsx')
shutil.copyfile(kaynak, kopya)

pythoncom.CoInitialize()
xl = win32com.client.DispatchEx('Excel.Application')
xl.Visible = False
xl.DisplayAlerts = False
try:
    wb = xl.Workbooks.Open(kopya)
    ws = wb.Worksheets('FMEA')
    G = wb.Worksheets('Görevler')
    L = wb.Worksheets('Listeler')
    xl.CalculateFull()

    def liste(ad):
        return [c.Value for c in wb.Names(ad).RefersToRange if c.Value]

    def gorevler():
        return [(int(G.Cells(r, 1).Value), G.Cells(r, 2).Value) for r in range(3, 40) if G.Cells(r, 1).Value not in (None, '')]

    # 1) tablo açılıyor (onarım yok), Listeler gizli
    assert ws.ListObjects.Count == 1 and ws.ListObjects(1).Name == 'FMEA_Tablo'
    t = ws.ListObjects(1)
    assert t.ListRows.Count == 5, t.ListRows.Count
    assert L.Visible == 0
    print('✓ 1  FMEA_Tablo açılıyor (5 satır), Listeler gizli')

    # 2) kademe listesi: üstte kullanılan değerler, tekrarsız
    assert liste('Liste_B') == ['[10] Giriş kontrol', '[20] Kesim', '[30] Paketleme'], liste('Liste_B')
    assert liste('Liste_C') == ['Metot', 'Ölçüm', 'Makine', 'İnsan'], liste('Liste_C')
    v = ws.Range('B17').Validation
    assert v.Type == 3 and v.Formula1 == '=Liste_B' and v.ShowError is False
    print('✓ 2  adım/4M listeleri tekrarsız; elle yeni değer yazmak serbest')

    # 3) üstteki satırla aynı değer gri, ilk görünen siyah
    assert ws.Range('B18').DisplayFormat.Font.Color == 0xA6A6A6, hex(int(ws.Range('B18').DisplayFormat.Font.Color))
    assert ws.Range('B17').DisplayFormat.Font.Color != 0xA6A6A6
    print('✓ 3  tekrar eden kademe değeri soluk gri')

    # 4) Görevler: aksiyonlu 2 satır
    assert gorevler() == [(1, '[10] Giriş kontrol'), (2, '[20] Kesim')], gorevler()
    print('✓ 4  Görevler sekmesi aksiyonlu 2 satırla dolu')

    # 5) tabloya satır ekle (sona): formül, liste, AP, yeni adım listeye, aksiyon Görevler'e
    yeni = t.ListRows.Add().Range
    r = yeni.Row
    assert ws.Cells(r, 15).HasFormula and ws.Cells(r, 31).HasFormula, 'yeni satırda formül yok'
    assert ws.Cells(r, 8).Validation.Type == 3 and ws.Cells(r, 2).Validation.Formula1 == '=Liste_B'
    ws.Cells(r, 2).Value = '[40] Sevkiyat'
    ws.Cells(r, 8).Value = L.Range('A8').Value          # S = 8 (listeden)
    ws.Cells(r, 12).Value = 6                           # O elle düz sayı
    ws.Cells(r, 14).Value = L.Range('C7').Value         # D = 7
    ws.Cells(r, 18).Value = 'Sevk etiketi doğrulama'
    xl.Calculate()
    assert ws.Cells(r, 15).Value == m[7][5][6], (ws.Cells(r, 15).Value, m[7][5][6])
    assert '[40] Sevkiyat' in liste('Liste_B')
    assert gorevler()[-1] == (3, '[40] Sevkiyat'), gorevler()
    print('✓ 5  eklenen satıra formül/liste geçiyor; AP hesaplandı; yeni adım listede; aksiyon Görevler\'e düştü')

    # 6) araya satır ekle, aksiyonlu satırı sil → Görevler yeniden sıralanır
    t.ListRows.Add(2)
    assert ws.Cells(18, 15).HasFormula and ws.Cells(18, 31).HasFormula
    sil = next(i for i in range(1, t.ListRows.Count + 1) if t.ListRows(i).Range.Cells(1, 18).Value)
    t.ListRows(sil).Delete()
    xl.Calculate()
    g = gorevler()
    assert [n for n, _ in g] == [1, 2] and g[0][1] == '[20] Kesim' and g[1][1] == '[40] Sevkiyat', g
    print('✓ 6  araya eklenen satır formüllü; aksiyonlu satır silinince Görevler 1, 2 diye yeniden sıralandı')
    # 7) AP: 308 S/O/D birleşiminde matrisle aynı; "7 – …" metni ve düz sayı; renk
    import random
    random.seed(7)
    r = t.ListRows(1).Range.Row
    deneme = [(a, b, c) for a in (1, 10) for b in (1, 10) for c in (1, 10)] + \
             [(random.randint(1, 10), random.randint(1, 10), random.randint(1, 10)) for _ in range(300)]
    for i, (S, O, D) in enumerate(deneme):
        deger = (lambda k, n: L.Range(f'{k}{n}').Value) if i % 2 else (lambda k, n: n)
        ws.Cells(r, 8).Value = deger('A', S); ws.Cells(r, 12).Value = deger('B', O); ws.Cells(r, 14).Value = deger('C', D)
        assert ws.Cells(r, 15).Value == m[S - 1][O - 1][D - 1], (S, O, D, ws.Cells(r, 15).Value)
    renk = {'H': 0xCEC7FF, 'M': 0x9CEBFF, 'L': 0xCEEFC6}
    for S, O, D in [(10, 10, 10), (5, 8, 1), (1, 1, 1)]:
        ws.Cells(r, 8).Value = S; ws.Cells(r, 12).Value = O; ws.Cells(r, 14).Value = D
        assert ws.Cells(r, 15).DisplayFormat.Interior.Color == renk[ws.Cells(r, 15).Value]
    ws.Cells(r, 25).Value = 8; ws.Cells(r, 26).Value = 2; ws.Cells(r, 27).Value = 2
    assert ws.Cells(r, 29).Value == '(' + m[7][1][1] + ')', ws.Cells(r, 29).Value
    assert ws.Cells(r, 29).DisplayFormat.Interior.Color == renk[m[7][1][1]]
    ws.Cells(r, 12).Value = None
    assert ws.Cells(r, 15).Value in (None, ''), 'O boşken AP boş olmalı'
    print(f'✓ 7  {len(deneme)} S/O/D birleşiminde AP = matris (liste metni ve düz sayı); renk; revize AP; boşsa boş')
    wb.Close(False)
finally:
    xl.Quit()
print('\nTüm senaryolar geçti.')
