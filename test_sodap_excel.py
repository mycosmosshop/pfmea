# PFMEA Excel'i gerçek Excel'de: S/O/D hücrelerinde açılır liste var mı, AP formülü S/O/D
# değişince matrisle aynı H/M/L'yi veriyor mu, renk kuralı işliyor mu?
# Önce:  node utils/sodAp.test.mjs <dosya.xlsx>   →   python -X utf8 test_sodap_excel.py <dosya.xlsx>
import json, os, random, sys, shutil, tempfile
import pythoncom
import win32com.client

kaynak = os.path.abspath(sys.argv[1])
m = json.load(open(kaynak + '.matris.json', encoding='utf-8'))
kopya = os.path.join(tempfile.mkdtemp(), 'sodap.xlsx')        # kullanıcı dosyasını kilitlemesin
shutil.copyfile(kaynak, kopya)

pythoncom.CoInitialize()
xl = win32com.client.DispatchEx('Excel.Application')          # kullanıcının açık Excel'ine bağlanmaz
xl.Visible = False
xl.DisplayAlerts = False
try:
    wb = xl.Workbooks.Open(kopya)
    ws = wb.Worksheets('FMEA')

    # 1) açılır liste: S/O/D sütunlarında liste (xlValidateList = 3), değerler 1..10
    for adres in ['H18', 'L22', 'N29', 'Y29', 'Z18', 'AA25']:
        v = ws.Range(adres).Validation
        assert v.Type == 3, (adres, v.Type)
        assert v.Formula1.replace(';', ',') == '1,2,3,4,5,6,7,8,9,10', (adres, v.Formula1)
    try:
        ws.Range('O18').Validation.Type
        assert False, 'AP sütununda liste olmamalı'
    except Exception:
        pass
    print('✓ 1  S/O/D hücrelerinde 1–10 açılır liste var, AP sütununda yok')

    # 2) açılışta hesap: önbellekteki değerlerle aynı
    xl.CalculateFull()
    for r in range(18, 28):
        s, o, d = (int(ws.Cells(r, c).Value) for c in (8, 12, 14))
        assert ws.Cells(r, 15).Value == m[s - 1][o - 1][d - 1], (r, s, o, d, ws.Cells(r, 15).Value)
    assert ws.Range('O28').Value in (None, ''), 'O boşken AP boş olmalı'
    assert ws.Range('AC29').Value == '(' + m[7][1][1] + ')', ws.Range('AC29').Value
    print('✓ 2  10 satırda AP = matris; O boşsa AP boş; revize AP parantezli')

    # 3) S/O/D değiştir → AP yeniden hesaplanır (300 rastgele + uç değerler)
    random.seed(7)
    deneme = [(s, o, d) for s in (1, 10) for o in (1, 10) for d in (1, 10)] + \
             [(random.randint(1, 10), random.randint(1, 10), random.randint(1, 10)) for _ in range(300)]
    for s, o, d in deneme:
        ws.Range('H18').Value = s; ws.Range('L18').Value = o; ws.Range('N18').Value = d
        assert ws.Range('O18').Value == m[s - 1][o - 1][d - 1], (s, o, d, ws.Range('O18').Value)
    print(f'✓ 3  {len(deneme)} S/O/D kombinasyonunda AP formülü matrisle aynı')

    # 4) renk: koşullu biçim AP'ye göre (H kırmızı, M sarı, L yeşil)
    renk = {'H': 0xCEC7FF, 'M': 0x9CEBFF, 'L': 0xCEEFC6}       # Excel BGR
    for s, o, d in [(10, 10, 10), (5, 8, 1), (1, 1, 1)]:
        ws.Range('H18').Value = s; ws.Range('L18').Value = o; ws.Range('N18').Value = d
        ap = ws.Range('O18').Value
        assert ws.Range('O18').DisplayFormat.Interior.Color == renk[ap], (ap, hex(int(ws.Range('O18').DisplayFormat.Interior.Color)))
    assert ws.Range('AC29').DisplayFormat.Interior.Color == renk[m[7][1][1]]
    print('✓ 4  AP rengi değere göre değişiyor (H/M/L ve revize)')
    wb.Close(False)
finally:
    xl.Quit()
print('\nTüm senaryolar geçti.')
