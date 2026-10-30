// What a story is about, for its illustration (30.10.2026, Yakir: the photo follows the TOPIC first, never a random landmark).
// One source for the site build (src/lib/content.ts, the photo pick of every story, new or old) and the daily self check
// (scripts/imgcheck.mjs), so both read a story the same way.
//
// hard: a topic illustration only (police car, ambulance, ballot box, pitch...), never a place photo, even when a place is named.
// place: a photo of the place may fit, but only when the story is really about that place, and only photos that show what the
// topic is about (placeTopics: municipal -> city hall, aerial, square; never a nature photo for a municipal story).
// sets: the topic illustration sets of the photo library (scripts/photolib/harvest.mjs), in order of preference.
// stock: the old generic stock photos (public/img/stock, no landmarks), the last fallback while a set is empty.
// rx: words in the title (x3), the summary (x2) and the first paragraphs (x1). weak: words that count only when a strong word
// of the same topic is there too (שער, משחק are also a gate and a game).
export const TOPICS = [
  { key: 'security', hard: true, sets: ['security', 'police'], stock: ['police-lights', 'police-street'],
    rx: /טרור|פיגוע|מחבל|נשק |נשק,|כלי נשק|הנשק|אמל"ח|אמל״ח|תחמושת|רימון|מטען חבלה|שב"כ|שב״כ|ביטחוני|צה"ל|צה״ל|אזעק|רקט|טילים|טיל |כטב"ם|יירוט|פיקוד העורף|ממ"ד|ממ״ד|מקלט|מקלטים/g },
  { key: 'police', hard: true, sets: ['police', 'security'], stock: ['police-lights', 'police-street'],
    rx: /משטר|שוטר|ניידת|נעצר|נעצרו|העצור|עצורים|חשוד|כתב אישום|כתבי אישום|רצח|נרצח|דקיר|נדקר|יריות| ירי |בירי |בירי,|ירי,|נורה|שוד |שוד,|שודד|פריצה|פריצות|פרץ ל|גניב|נגנב|סמים|הונאה|אלימות|תקיפ|קטטה|מעצר|בילוש|פלילי|עבריי|סחיט|הימורים/g },
  { key: 'accident', hard: true, sets: ['ambulance'], stock: ['traffic-night', 'traffic-fog'],
    rx: /תאונ|נפגע|נפגעה|נפגעו|נפצע|פצוע|פצועים|פצועה|התהפך|התנגש|הולך רגל|הולכת רגל|פגע וברח|מד"א|מד״א|אמבולנס|חובש|פרמדיק|פונה לבית|פונו לבית|הוחש|טביעה|טבע בים|החייאה|נפל מ|נחנק|נחנקה/g },
  { key: 'fire', hard: true, sets: ['fire'], stock: ['police-lights'],
    rx: /שריפ|שרפה|שרפות|נשרף|נשרפו|דליקה|דליקות|כבאי|כבאות|לוחמי האש|לוחמי אש|הצתה|הוצת|עשן כבד|לכודים|חילוץ|לכוד /g },
  { key: 'health', hard: true, sets: ['hospital'], stock: ['city-buildings'],
    rx: /בית החולים|בית חולים|בתי חולים|לניאדו|מרכז רפואי|רפואי|רפואה|רופא |רופאה|הרופא|רופאים|רופאת|מרפא|קופת חולים|קופות החולים|חיסון|חיסונים|נגיף|מחלה|מחלות|בריאות|אחיות|ניתוח|חדר מיון|מרכז שיקום|מתחם השיקום|שיקום רפואי|טיפת חלב/g },
  { key: 'courts', hard: true, sets: ['courts'], stock: ['council-chamber'],
    rx: /בית המשפט|בית משפט|בתי המשפט|שופט|שופטת|גזר הדין|גזר דין|נגזר|הכרעת דין|עתיר|בג"ץ|בג״ץ|ערעור|תביעה|תביעות|פרקליט|הורשע|הורשעו|מאסר|עורך דין|עורכת דין|עו"ד|עו״ד|ייצוגית|פסק דין|פסק הדין/g },
  { key: 'election', hard: true, sets: ['election'], stock: ['council-chamber'],
    rx: /בחירות|קלפי|מצביעים|מועמד|מועמדת|מועמדים|מנדט|ספירת הקולות|שיעור ההצבעה|פריימריז|ועדת הבחירות|לראשות העיר|סקר בחירות/g },
  { key: 'weather', hard: true, sets: ['weather'], stock: ['wave'],
    rx: /גשם|גשמים|סערה|סופה|סופת|מזג האוויר|מזג אוויר|שרב|חמסין|ברד |ברד,|הצפה|הצפות|שיטפון|שטפונות|רוחות|גלים גבוהים|ים סוער|גובה הגלים|חזאי|התחממות|התקררות|עומס חום|ערפל/g },
  { key: 'sports', hard: true, sets: ['football', 'basketball'], stock: ['stadium-day', 'stadium-night', 'stadium-aerial'],
    rx: /מכבי נתניה|אליצור נתניה|הפועל|בית"ר|בית״ר|ליגה|ליגת|כדורגל|כדורסל|כדוריד|כדורעף|אצטדיון|אליפות|גביע|ספורט|טניס|אתלטיקה|מרתון|אולימפ|נבחרת|דרבי|הבקיע|השוער|שוער /g,
    weak: /שער|שערים|משחק|מאמן|שחקן|שחקני|שחקנית|המחזור ה|קבוצה|קבוצת|ניצחון|הפסד|תיקו|אוהדים|נקודות/g },
  { key: 'education', hard: true, sets: ['school'], stock: ['city-buildings'],
    rx: /בית ספר|בית הספר|בתי ספר|בתי הספר|תלמיד|חינוך|גן ילדים|גני ילדים|גני הילדים|גננת|המורה|למורה|מורה ו|המורים|למורים|מורים ו|מורות|שנת הלימודים|בגרות|כיתה|כיתות|אוניברסיט|מכללה|סטודנט|לימודים|חופשת הקיץ|הסעות תלמידים/g },
  { key: 'economy', hard: true, sets: ['money'], stock: ['city-buildings'], pri: -1,
    rx: /ארנונה|תקציב|מחירי|מחיר |שקלים|₪|כלכל|יוקר המחיה|משכורת|שכר מינימום|מיסים|מס הכנסה|הנחה ב|תעריף|ריבית|בנק |בנקים|אינפלציה|קנס|קנסות|גירעון|חובות/g },
  { key: 'traffic', hard: true, sets: ['traffic', 'roadworks'], stock: ['traffic-night', 'traffic-fog', 'road-aerial'],
    rx: /כביש|צומת|מחלף|פקק|פקקים|עומס תנועה|תנועה|רמזור|נתיב|נת"צ|נת״צ|חניה|חנייה|חניון|נהג |נהגת|נהגים|נהגי |מצלמת מהירות|מהירות מופרזת/g },
  { key: 'roadworks', hard: true, sets: ['roadworks', 'construction', 'traffic'], stock: ['scaffold', 'road-aerial'], pri: 1,
    rx: /עבודות תשתית|עבודות פיתוח|עבודות ביוב|עבודות בכביש|עבודות ברחוב|עבודות ה?סלילה|סלילת|ריבוד|סגירת כביש|סגירת רחוב|ייסגר|ייסגרו|הסדרי תנועה|תשתיות|צנרת|חפירות|עבודות ב|עבודות ל|חסימה|חסימות|מעקות|מעקה בטיחות/g },
  { key: 'transport', hard: true, sets: ['transport'], stock: ['road-aerial', 'traffic-night'],
    rx: /הקו האדום|הקו הסגול|רכבת קלה|רק"ל|רק״ל|אוטובוס|קו \d|קווי |תחבורה ציבורית|רכבת|תחנה מרכזית|מסוף|רב.קו|הסעה|הסעות|אופניים|קורקינט|תחבורה/g },
  // place topics: a place photo may fit (municipal, real estate, leisure, tourism, beach, parks)
  { key: 'realestate', sets: ['realestate', 'construction'], stock: ['crane-building', 'cranes-sunset', 'scaffold'], pri: 1,
    placeTopics: ['buildings', 'realestate', 'construction', 'aerial', 'neighborhood'],
    rx: /נדל"ן|נדל״ן|דירה|דירות|דירת|מחיר למשתכן|דירה בהנחה|שכירות|שכר דירה|רוכשי|עסקאות|יח"ד|יח״ד|יחידות דיור|התחדשות עירונית|פינוי.בינוי|תמ"א|תמ״א|קבלן|(?<!מ)יזם |היזם|(?<!מ)יזמים|היתר בנייה|היתרי בנייה|מגדל מגורים|מגדלי מגורים|קומות|בנייה|בניה|עגורן|תוכנית בניין/g },
  { key: 'municipal', sets: ['cityhall'], stock: ['council-chamber'],
    placeTopics: ['cityhall', 'city', 'aerial', 'square', 'street'],
    rx: /עירי|ראש העיר|מועצת העיר|מליאת|מליאה|סגן ראש העיר|סגנית ראש העיר|חבר מועצה|חברי מועצה|חברי המועצה|מנכ"ל העירייה|מוקד 106|המוקד העירוני|אגף ה/g },
  { key: 'culture', sets: ['culture'], stock: ['concert', 'concert-hands'],
    placeTopics: ['culture', 'square', 'art'],
    rx: /הופע|תיאטרון|קונצרט|פסטיבל|תערוכ|מוזיאון|קולנוע|הצגה|הצגות|ספרייה|ספריות|ספריית|זמר|זמרת|להקה|מופע |מופעים|המופע|מופעי|סדנ|הרצא|תרבות|מסיבה|חגיגה|קרנבל|האמן|אמנים|אמנית|אמנות/g },
  { key: 'market', sets: ['market'], stock: ['city-buildings'],
    placeTopics: ['commerce', 'street'],
    rx: /שוק |השוק|דוכן|דוכנים|קניון|חנות|חנויות|בעלי עסקים|בית עסק|בתי עסק|מסחר|פתיחת סניף|סניף חדש|נפתח סניף|נפתחה חנות/g },
  { key: 'beach', sets: [], stock: ['beach-umbrellas', 'beach-sunset', 'beach-rocks-sail'],
    placeTopics: ['beach', 'sea', 'promenade', 'sunset'],
    rx: /חוף |חוף,|חופי|החוף|בחוף|לחוף|רחצה|מציל|הטיילת|טיילת|מדוז|גולשי גלים|גלישת גלים/g },
  { key: 'tourism', sets: [], stock: ['beach-umbrellas', 'beach-sunset', 'beach-rocks-sail'],
    placeTopics: ['beach', 'promenade', 'sunset', 'sea', 'tourism'],
    rx: /תייר|מלון|מלונות|אטרקצי|טיול|מסלול|נופש|צימר/g },
  { key: 'nature', sets: [], stock: ['beach-sunset'],
    placeTopics: ['park', 'nature', 'river', 'dunes'],
    rx: /פארק|גינה ציבורית|גינות|גן ציבורי|גן השעשועים|שמורה|שמורת|הטבע|בטבע|יער|נחל |הנחל|אירוס|פריחה|צמחי|עצים|ציפור|ציפורים|צבי ים|חיות בר/g },
];
export const TOPIC_BY_KEY = Object.fromEntries(TOPICS.map((t) => [t.key, t]));
// a section's own topic (a small push, never enough alone) and its neutral illustration (sets, then stock) for a story whose
// topic is not clear: never a landmark
export const SECTION_TOPIC = { police: 'police', sports: 'sports', law: 'courts', health: 'health', realestate: 'realestate', transport: 'traffic',
  leisure: 'culture', tourism: 'tourism', city: 'municipal', flash: 'police' };
export const SECTION_NEUTRAL = { flash: ['police', 'traffic'], police: ['police'], sports: ['football'], law: ['courts'], health: ['hospital'],
  realestate: ['construction', 'realestate'], transport: ['transport', 'traffic'], leisure: ['culture'], city: ['cityhall'], national: [],
  community: [], sharon: [], tourism: [], blog: [] };

// places: the Netanya neighbourhoods, the city, and places outside it (a Netanya landmark never illustrates a story from there)
export const NETANYA = 'נתניה';
export const OUTSIDE = ['כפר יונה', 'אבן יהודה', 'קדימה', 'צורן', 'תל מונד', 'פרדסיה', 'עמק חפר', 'כפר סבא', 'רעננה', 'הוד השרון', 'הרצליה', 'חדרה',
  'טייבה', 'טירה', 'קלנסווה', 'קלנסוואה', "ג'לג'וליה", 'ג׳לג׳וליה', 'כפר קאסם', 'כפר ברא', 'כפר חבלה', "ג'ת", 'באקה', 'אום אל', 'תל אביב', 'ירושלים',
  'חיפה', 'ראשון לציון', 'פתח תקווה', 'פתח תקוה', 'בת ים', 'חולון', 'רמת גן', 'גבעתיים', 'אשדוד', 'אשקלון', 'באר שבע', 'בני ברק', 'רמלה', 'לוד',
  'נצרת', 'עפולה', 'טבריה', ' צפת', 'אילת', 'קיסריה', 'זכרון יעקב', 'פרדס חנה', 'כרכור', 'בית ינאי', 'מכמורת', 'חוף השרון', 'לב השרון',
  'דרום השרון', 'אליכין', 'בת חפר', 'אור עקיבא', 'כפר ויתקין', 'בית יצחק', 'רמת הכובש', 'יקום', 'שפיים', 'געש', 'ארסוף', 'יהודה ושומרון',
  'עזה', 'לבנון', 'מודיעין', 'רחובות', 'נס ציונה', 'יבנה', 'קריית גת', 'דימונה', 'כרמיאל', 'עכו', 'נהריה', 'קריית שמונה', 'אריאל', 'ראש העין',
  'כפר יעבץ', 'קלנסואה', 'בקה אל'];

const count = (rx, s, cap = 2) => { if (!s) return 0; rx.lastIndex = 0; const m = s.match(rx); return m ? Math.min(cap, m.length) : 0; };
/** the topic scores of a story: { key: score } (title x3, summary x2, first paragraphs x1) */
export function scoreTopics({ title = '', dek = '', body = [], section = '' }) {
  const lead = (Array.isArray(body) ? body : [body]).slice(0, 4).join(' ');
  const s = {};
  for (const t of TOPICS) {
    let v = 3 * count(t.rx, title) + 2 * count(t.rx, dek) + count(t.rx, lead, 3);
    if (t.weak && v > 0) v += Math.min(2, count(t.weak, title) + count(t.weak, dek));
    if (SECTION_TOPIC[section] === t.key && v > 0) v += 1;
    if (v > 0) s[t.key] = v;
  }
  return s;
}
/** the story's topic: { key, score, conf: 'high'|'low' } or null. A hard topic named in the title or the summary wins over a place
 *  topic (a weapons story in a museum town is a security story). Below 3 points (one word in the body only) the topic is unclear. */
// a digest of many stories (the day summary, the week in Netanya) has no one topic: the neutral picture of its section
const DIGEST = /^(סיכום היום|סיכום השבוע|השבוע בנתניה|השבוע בשרון|כל מה שקרה)/;
export function topicOf(a) {
  if (DIGEST.test(String(a.title || '').trim())) return null;
  const s = scoreTopics(a);
  const rank = (k) => s[k] + (TOPIC_BY_KEY[k].pri || 0) + (TOPIC_BY_KEY[k].hard ? 1 : 0);
  const keys = Object.keys(s).sort((x, y) => rank(y) - rank(x) || TOPICS.indexOf(TOPIC_BY_KEY[x]) - TOPICS.indexOf(TOPIC_BY_KEY[y]));
  const hard = keys.filter((k) => TOPIC_BY_KEY[k].hard && s[k] >= 3);
  const key = hard.length && rank(hard[0]) >= rank(keys[0]) - 2 ? hard[0] : keys[0];
  if (!key) return null;
  return { key, score: s[key], conf: s[key] >= 3 ? 'high' : 'low', scores: s };
}
/** where the story is: 'netanya', 'outside' (another locality is named and Netanya is not), or '' (not clear) */
export function whereOf({ title = '', dek = '', body = [], section = '', neighborhoods = [] }, netanyaPlaces = []) {
  const head = `${title} ${dek}`;
  const lead = (Array.isArray(body) ? body : [body]).slice(0, 2).join(' ');
  const out = OUTSIDE.some((p) => head.includes(p));
  const nt = head.includes(NETANYA) || netanyaPlaces.some((p) => head.includes(p)) || (neighborhoods || []).some((p) => netanyaPlaces.includes(p));
  if (out && !nt) return 'outside';
  if (nt) return 'netanya';
  if (section === 'national' || section === 'sharon') return OUTSIDE.some((p) => lead.includes(p)) || !lead.includes(NETANYA) ? 'outside' : 'netanya';
  if (OUTSIDE.some((p) => lead.includes(p)) && !lead.includes(NETANYA)) return 'outside';
  return lead.includes(NETANYA) ? 'netanya' : '';
}
/** the illustration sets for this story's topic: a sports story is football unless it is about basketball */
export function setsOf(T, a) {
  if (!T) return [];
  if (T.key !== 'sports') return T.sets;
  const text = [a.title, a.dek, ...(Array.isArray(a.body) ? a.body.slice(0, 2) : [])].join(' ');
  return /כדורסל|יורוליג|ליגת ווינר|הפועל הולון|מכבי תל אביב בכדורסל|אליצור נתניה/.test(text) ? ['basketball'] : ['football'];
}
// what a library photo shows: a topic illustration (set), or a place photo; nature and landscape photos are only for nature,
// park, beach and weather stories
export const LANDSCAPE = ['nature', 'park', 'river', 'dunes', 'sunset', 'agriculture'];
/** the self check of one story and its photo: '' when fine, else why not. photo: a library photo { set, places, topics } or
 *  { stock: name } or { own: true } (AI image or the story's own photo: not checked) */
export function checkPick(a, photo, netanyaPlaces = []) {
  if (!photo || photo.own) return '';
  const t = topicOf(a); const where = whereOf(a, netanyaPlaces);
  const T = t && t.conf === 'high' ? TOPIC_BY_KEY[t.key] : null;
  if (photo.stock) return T && T.hard && !T.stock.includes(photo.stock) ? `${t.key} story with the stock photo ${photo.stock}` : '';
  const isPlace = !photo.set;
  if (!T && isPlace) return 'unclear topic but a place photo';
  if (T && T.hard && isPlace) return `${t.key} story with a place photo`;
  if (T && T.hard && !setsOf(T, a).includes(photo.set)) return `${t.key} story with a ${photo.set} illustration`;
  if (T && T.key === 'sports' && !['football', 'basketball'].includes(photo.set)) return 'sports story without a sports image';
  if (isPlace && where === 'outside' && (photo.places || []).some((p) => p === NETANYA || netanyaPlaces.includes(p))) return 'Netanya photo on a story from another place';
  if (isPlace && T && !(photo.topics || []).some((x) => (T.placeTopics || []).includes(x))) return `${t.key} story with a photo of ${(photo.topics || []).join('/')}`;
  if (isPlace && (photo.topics || []).some((x) => LANDSCAPE.includes(x)) && !(photo.topics || []).some((x) => !LANDSCAPE.includes(x)) && !(T && ['nature', 'beach', 'tourism', 'weather'].includes(T.key)))
    return 'landscape photo on a story that is not about nature';
  if (!isPlace && T && !T.hard && T.sets.length && !setsOf(T, a).includes(photo.set)) return `${t.key} story with a ${photo.set} illustration`;
  return '';
}
