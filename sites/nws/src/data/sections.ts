// News sections. Colors follow the design kit approved by Yakir on 28.10.2026 (Kit.dc.html): one color per section, used for the
// kicker line above titles and the section headings. photos: the free-license section photo library (public/img/stock), the fallback
// picture of a story without its own image, picked per story so neighbouring stories do not repeat.
// 28.10.2026: police, transport and health were added (the engine, hns-write v10, fills them). A section without stories is left out
// of the menu and gets no page until its first story is published (liveSections in lib/content.ts).
export type SectionKey = 'national' | 'flash' | 'city' | 'police' | 'realestate' | 'sports' | 'transport' | 'community' | 'health' | 'leisure' | 'sharon' | 'tourism' | 'law';

export interface Section {
  key: SectionKey; slug: string; color: string; ink: string; soft: string; img: string; photos: string[]; icon: string;
  name: { he: string; ru: string; fr: string; en: string };
  title: string; desc: string; intro: string;
}

export const SECTIONS: Section[] = [
  { key: 'flash', slug: 'flash', color: '#C8102E', ink: '#A50D26', soft: '#FDECEE', img: 'road', photos: ['police-lights', 'traffic-fog', 'road-aerial', 'police-street'], icon: 'bolt',
    name: { he: 'מבזקים', ru: 'Срочно', fr: 'Flash', en: 'Breaking' },
    title: 'מבזקים מנתניה: חסימות, עבודות, מים וחשמל',
    desc: 'המבזקים של נתניה והסביבה: חסימות כבישים, עבודות, הפסקות מים וחשמל והודעות דחופות, מתעדכן לאורך היום.',
    intro: 'כל מה שקורה עכשיו בנתניה ובסביבה, בקצרה: חסימות ועבודות כביש, הפסקות מים וחשמל, הודעות של העירייה וגופי החירום.' },
  // 29.10.2026 (Yakir): national events that concern everyone (elections, war, a national emergency) are covered too, even when
  // they are not about Netanya. Filled by the engine function hns-national; the section appears with its first story.
  { key: 'national', slug: 'israel', color: '#1B3A6B', ink: '#142C52', soft: '#E8EEF8', img: 'council', photos: ['council-chamber', 'city-buildings', 'road-aerial'], icon: 'city',
    name: { he: 'חדשות ארציות', ru: 'Новости Израиля', fr: 'Israël', en: 'Israel' },
    title: 'חדשות ארציות: בחירות, ביטחון ואירועים שנוגעים לכולם',
    desc: 'החדשות הארציות החשובות שנוגעות גם לתושבי נתניה והשרון: בחירות, ביטחון, מצבי חירום והחלטות ממשלה, בקצרה ובשפה פשוטה.',
    intro: 'האירועים הארציים שנוגעים לכולם, בקצרה, בשפה פשוטה ובלי דעות.' },
  { key: 'city', slug: 'city', color: '#5B3FA8', ink: '#4A3290', soft: '#EFEAFA', img: 'council', photos: ['council-chamber', 'city-buildings', 'road-aerial'], icon: 'city',
    name: { he: 'העירייה', ru: 'Мэрия', fr: 'Municipalité', en: 'City Hall' },
    title: 'עיריית נתניה: החלטות, תקציב, שירותים ועבודות',
    desc: 'חדשות עיריית נתניה: החלטות מועצת העיר, תקציב, שירותים לתושבים, עבודות ופרויקטים בשכונות.',
    intro: 'מה מחליטה העירייה, איפה עובדים בשכונות, ואילו שירותים משתנים. בשפה פשוטה ועם קישור למקור.' },
  { key: 'police', slug: 'police', color: '#9B1C1C', ink: '#821616', soft: '#FBEAEA', img: 'police', photos: ['police-lights', 'police-street'], icon: 'shield',
    name: { he: 'משטרה ופלילים', ru: 'Полиция и криминал', fr: 'Police et faits divers', en: 'Police & Crime' },
    title: 'משטרה ופלילים בנתניה: אירועים, חקירות ובתי משפט',
    desc: 'חדשות משטרה ופלילים מנתניה והשרון: אירועים, חקירות, מעצרים והחלטות של בתי המשפט, מבוסס על הודעות רשמיות.',
    intro: 'אירועי משטרה, חקירות והחלטות של בתי משפט בנתניה ובשרון, לפי ההודעות הרשמיות ובלי שמות של חשודים שלא הותרו לפרסום.' },
  { key: 'realestate', slug: 'real-estate', color: '#B86E00', ink: '#8A5200', soft: '#FFF1DB', img: 'crane', photos: ['crane-building', 'cranes-sunset', 'scaffold', 'city-buildings'], icon: 'building',
    name: { he: 'נדל״ן ותכנון', ru: 'Недвижимость', fr: 'Immobilier', en: 'Real Estate' },
    title: 'נדל״ן ותכנון בנתניה: התחדשות עירונית, תוכניות ועסקאות',
    desc: 'נדל״ן בנתניה: התחדשות עירונית ופינוי בינוי, החלטות ועדת התכנון, פרויקטים חדשים ועסקאות דירות בעיר.',
    intro: 'מה נבנה לידכם, אילו תוכניות אושרו, ואיך זה משפיע על הדיירים ועל מחירי הדירות בעיר.' },
  { key: 'sports', slug: 'sports', color: '#17803F', ink: '#14693A', soft: '#E7F4EC', img: 'stadium', photos: ['stadium-night', 'stadium-day', 'stadium-aerial', 'stadium-crowd'], icon: 'ball',
    name: { he: 'ספורט', ru: 'Спорт', fr: 'Sport', en: 'Sports' },
    title: 'ספורט בנתניה: מכבי נתניה, ספורט נוער ואירועים',
    desc: 'ספורט בנתניה: מכבי נתניה בכדורגל ובכדורסל, ספורט נוער, מרוצים ואירועי ספורט בעיר.',
    intro: 'מכבי נתניה, קבוצות הנוער ואירועי הספורט בעיר, במקום אחד.' },
  { key: 'transport', slug: 'transport', color: '#0F6E8C', ink: '#0B5870', soft: '#E3F1F6', img: 'road', photos: ['traffic-night', 'traffic-fog', 'road-aerial'], icon: 'road',
    name: { he: 'תחבורה', ru: 'Транспорт', fr: 'Transports', en: 'Transport' },
    title: 'תחבורה בנתניה: כבישים, חסימות, תחבורה ציבורית וחניה',
    desc: 'תחבורה בנתניה והשרון: חסימות ועבודות כביש, תחבורה ציבורית, רכבת, חניה ותוכניות תנועה חדשות.',
    intro: 'הכבישים, האוטובוסים, הרכבת והחניה בנתניה ובשרון: מה משתנה, מתי, ואיך עוקפים.' },
  { key: 'community', slug: 'community', color: '#1F5FBF', ink: '#184C99', soft: '#E6EEFA', img: 'council', photos: ['city-buildings', 'beach-umbrellas', 'beach-sunset'], icon: 'school',
    name: { he: 'קהילה וחינוך', ru: 'Общество и образование', fr: 'Communauté et éducation', en: 'Community & Education' },
    title: 'קהילה וחינוך בנתניה: בתי ספר, תושבים ויוזמות',
    desc: 'קהילה וחינוך בנתניה: בתי ספר וגנים, תרבות ופעילות בשכונות, עמותות ויוזמות של תושבים.',
    intro: 'האנשים, בתי הספר והיוזמות שעושים את העיר. חדשות קהילה מכל השכונות.' },
  { key: 'health', slug: 'health', color: '#C2410C', ink: '#9A3412', soft: '#FDEDE4', img: 'city', photos: ['city-buildings', 'beach-sunset', 'wave'], icon: 'heart',
    name: { he: 'בריאות', ru: 'Здоровье', fr: 'Santé', en: 'Health' },
    title: 'בריאות בנתניה: בית החולים, קופות החולים ושירותי בריאות',
    desc: 'חדשות בריאות בנתניה והשרון: בית החולים לניאדו, קופות החולים, מרפאות, חיסונים והודעות של משרד הבריאות.',
    intro: 'בית החולים, הקופות, המרפאות והודעות משרד הבריאות שנוגעות לתושבי נתניה והשרון.' },
  { key: 'leisure', slug: 'events', color: '#B4286B', ink: '#931F57', soft: '#FBE8F0', img: 'concert', photos: ['concert', 'concert-hands', 'beach-sunset'], icon: 'music',
    name: { he: 'תרבות ובילוי', ru: 'Досуг и события', fr: 'Sorties et événements', en: 'What’s On' },
    title: 'מה עושים בנתניה: אירועים, הופעות ובילוי',
    desc: 'אירועים בנתניה: הופעות, פסטיבלים, אירועי עירייה, מסעדות חדשות ומה עושים בסוף השבוע.',
    intro: 'הופעות, פסטיבלים ואירועים בעיר ובסביבה, עם תאריך, שעה ומקום.' },
  { key: 'sharon', slug: 'sharon', color: '#0F7C7C', ink: '#0B6363', soft: '#E2F3F3', img: 'road', photos: ['road-aerial', 'city-buildings', 'beach-rocks-sail'], icon: 'pin',
    name: { he: 'השרון', ru: 'Шарон', fr: 'Le Sharon', en: 'Sharon' },
    title: 'חדשות השרון: אבן יהודה, קדימה צורן, עמק חפר וכפר יונה',
    desc: 'חדשות השרון הסמוך לנתניה: אבן יהודה, קדימה צורן, עמק חפר, כפר יונה, תל מונד והסביבה.',
    intro: 'מה קורה ביישובים שסביב נתניה: תחבורה, תכנון, חינוך ואירועים.' },
  { key: 'tourism', slug: 'tourism', color: '#0B6FA4', ink: '#095A85', soft: '#E4F1F9', img: 'beach', photos: ['beach-umbrellas', 'beach-sunset', 'beach-rocks-sail', 'wave'], icon: 'wave',
    name: { he: 'חופים ותיירות', ru: 'Туризм', fr: 'Tourisme', en: 'Tourism' },
    title: 'תיירות בנתניה: חופים, טיילת, מלונות ואטרקציות',
    desc: 'תיירות בנתניה: החופים, הטיילת והמצוק, מלונות, אטרקציות ומידע למבקרים.',
    intro: 'החופים, הטיילת, המלונות והאטרקציות של נתניה, לתושבים ולמבקרים.' },
  { key: 'law', slug: 'law', color: '#3B4656', ink: '#2B3442', soft: '#EEF0F4', img: 'council', photos: ['council-chamber', 'police-street'], icon: 'scale',
    name: { he: 'חוק ומשפט', ru: 'Закон', fr: 'Justice', en: 'Law' },
    title: 'חוק ומשפט בנתניה: פסקי דין והחלטות בשפה פשוטה',
    desc: 'חוק ומשפט בנתניה: פסקי דין והחלטות שנוגעים לתושבים, לתכנון ולעירייה, מוסברים בשפה פשוטה.',
    intro: 'פסקי דין והחלטות שנוגעים לתושבי העיר, בלי שמות של אנשים פרטיים, ובשפה פשוטה.' },
];

export const SECTION_BY_KEY = Object.fromEntries(SECTIONS.map((s) => [s.key, s])) as Record<SectionKey, Section>;
/** the main menu, in the order of the approved design (בעלי מקצוע is added by the layout) */
export const NAV_ORDER: SectionKey[] = ['flash', 'national', 'city', 'police', 'realestate', 'sports', 'transport', 'community', 'health', 'leisure', 'sharon'];
/** sections that always have a page, even before their first story (the rest appear with their first story) */
export const CORE_SECTIONS: SectionKey[] = ['flash', 'city', 'realestate', 'sports', 'community', 'leisure', 'sharon', 'tourism', 'law'];
