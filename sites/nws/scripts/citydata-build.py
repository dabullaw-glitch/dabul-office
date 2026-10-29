# citydata-build (29.10.2026): turns the raw official data (branch city-data, raw/*.json, from citydata-fetch.mjs) into the
# guide files src/data/city/<slug>.json. Only official datasets are used here (data.gov.il); every item keeps its source.
# Usage: python3 scripts/citydata-build.py <raw dir>
import json, sys, os, re
from pyproj import Transformer
RAW = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'city')
CHECKED = '2026-10-29'
itm = Transformer.from_crs(2039, 4326, always_xy=True)
def load(rid):
    return json.load(open(os.path.join(RAW, f'gov-{rid}.json')))
def save(slug, items, note=None):
    d = {'checked': CHECKED, 'items': items}
    if note: d['note'] = note
    json.dump(d, open(os.path.join(OUT, f'{slug}.json'), 'w'), ensure_ascii=False, indent=1)
    print(slug, len(items))
clean = lambda s: re.sub(r'\s+', ' ', str(s or '').replace('""', '"').strip().strip('"')).strip()

# banks: Bank of Israel list of physical branches
b = load('2202bada-4baf-45f5-aa61-8c5bad9646d3')
SHORT = {'לאומי': 'לאומי', 'הפועלים': 'הפועלים', 'דיסקונט': 'דיסקונט', 'מזרחי': 'מזרחי טפחות', 'הבינלאומי': 'הבינלאומי', 'מרכנתיל': 'מרכנתיל', 'ירושלים': 'בנק ירושלים', 'יהב': 'בנק יהב', 'מסד': 'בנק מסד', 'דואר': 'בנק הדואר', 'אגוד': 'בנק איגוד', 'איגוד': 'בנק איגוד', 'אוצר החייל': 'אוצר החייל', 'וואן זירו': 'וואן זירו'}
def bank_short(n):
    for k, v in SHORT.items():
        if k in n: return v
    return clean(n).replace(' בע"מ', '')
banks = []
for r in b['records']:
    if r.get('City') != 'נתניה' or clean(r.get('Close_Date')): continue
    notes = []
    if r.get('day_closed'): notes.append(f"יום סגור: {clean(r['day_closed'])}")
    if r.get('Handicap_Access') == 'כן': notes.append('נגיש לנכים')
    if r.get('Branch_Type') and r['Branch_Type'] != 'רגיל': notes.append(f"סוג סניף: {clean(r['Branch_Type'])}")
    banks.append({'name': f"{bank_short(r['Bank_Name'])}, סניף {clean(r['Branch_Name'])} ({r['Branch_Code']})", 'kind': bank_short(r['Bank_Name']),
                  'address': clean(r['Branch_Address']), 'phone': clean(r.get('Telephone')), 'notes': '. '.join(notes),
                  'lat': r.get('X_Coordinate'), 'lon': r.get('Y_Coordinate'), 'source': b['url'], 'srcName': 'בנק ישראל, רשימת סניפי הבנקים'})
banks.sort(key=lambda x: (x['kind'], x['name']))
save('banks', banks, 'הרשימה הרשמית של בנק ישראל. שעות הפתיחה משתנות מסניף לסניף ואינן מופיעות ברשימה, כדאי לבדוק באתר הבנק לפני ההגעה.')

# schools: Ministry of Education list of active institutions (schools only, no kindergartens or day care)
s = load('2055063b-93e8-4d6a-b2c5-c253d18c0cf6')
KEEP = {'בית ספר', 'ישיבה קטנה', 'ישיבה תיכונית', 'תלמוד תורה', 'סמינר רגיל', 'אולפנה', 'מתי"א', 'מחוננים', 'חוה חקלאית', 'מרכז חינוך', 'פנימיה צמודה לבית ספר'}
schools = []
for r in s['records']:
    if r['TEUR_TAT_SUG_MISGERET'] not in KEEP or r['TEUR_STATUS'] != 'פעיל': continue
    lon, lat = itm.transform(r['X'], r['Y']) if r.get('X') and r.get('Y') else (None, None)
    stage = clean(r.get('TEUR_SHLAV_HINUH'))
    notes = [x for x in [f"פיקוח: {clean(r['TEUR_PIKOH1'])}" if r.get('TEUR_PIKOH1') not in (None, 'NULL') else '', f"חינוך {clean(r['TEUR_SUG_CHINUCH'])}" if r.get('TEUR_SUG_CHINUCH') == 'מיוחד' else '', f"סמל מוסד {r['SEMEL_MOSAD']}"] if x]
    schools.append({'name': clean(r['SHEM_MOSAD']), 'kind': stage or clean(r['TEUR_TAT_SUG_MISGERET']), 'notes': '. '.join(notes),
                    'lat': round(lat, 6) if lat else None, 'lon': round(lon, 6) if lon else None, 'source': s['url'], 'srcName': 'משרד החינוך, טבלת מוסדות חינוך'})
schools.sort(key=lambda x: (x['kind'], x['name']))
save('schools', schools, 'בתי הספר הפעילים בנתניה לפי משרד החינוך (בלי גני ילדים ומעונות). הכתובת המדויקת לא מופיעה ברשימה הרשמית; הקישור "במפה" מוביל למיקום שמשרד החינוך רשם.')

# neighborhoods: the national data dictionary (מערך הדיגיטל הלאומי)
n = load('d6b9634d-8e79-4fdf-80e4-678cd583a116')
hoods = []
for r in n['records']:
    if r.get('Name_City_Hebrew') != 'נתניה': continue
    desc = clean(r.get('Description_Hebrew'))
    parts = [p.strip() for p in desc.split(';') if p.strip()]
    m = next((re.match(r'^(צפון|דרום|מזרח|מערב|מרכז)(?: נתניה| העיר)?$', p) for p in parts if re.match(r'^(צפון|דרום|מזרח|מערב|מרכז)(?: נתניה| העיר)?$', p)), None)
    area = m.group(1) if m else ''
    parts = [p for p in parts if not (m and p == m.group(0))]
    name = re.sub(r'\s*\(נתניה\)\s*$', '', clean(r['Name_Neighborhood_Hebrew']))
    hoods.append({'name': name, 'area': f'{area} העיר' if area else '', 'notes': '; '.join(parts), 'source': n['url'], 'srcName': 'מערך הדיגיטל הלאומי, מילון שכונות'})
hoods.sort(key=lambda x: x['name'])
save('neighborhoods', hoods)
