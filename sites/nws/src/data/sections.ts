// News sections. Each has its own color (approved design 23.10.2026) and an SEO intro.
export type SectionKey = 'flash' | 'city' | 'realestate' | 'community' | 'sports' | 'leisure' | 'sharon' | 'tourism' | 'law';

export interface Section {
  key: SectionKey; slug: string; color: string; ink: string; soft: string; img: string;
  name: { he: string; ru: string; fr: string; en: string };
  title: string; desc: string; intro: string;
}

export const SECTIONS: Section[] = [
  { key: 'flash', slug: 'flash', color: '#C8102E', ink: '#A60D26', soft: '#FFF5F6', img: 'road',
    name: { he: 'מבזקים', ru: 'Срочно', fr: 'Flash', en: 'Breaking' },
    title: 'מבזקים מנתניה: חסימות, עבודות, מים וחשמל',
    desc: 'המבזקים של נתניה והסביבה: חסימות כבישים, עבודות, הפסקות מים וחשמל והודעות דחופות, מתעדכן לאורך היום.',
    intro: 'כל מה שקורה עכשיו בנתניה ובסביבה, בקצרה: חסימות ועבודות כביש, הפסקות מים וחשמל, הודעות של העירייה וגופי החירום.' },
  { key: 'city', slug: 'city', color: '#6D3FC0', ink: '#5A2FA8', soft: '#F6F2FD', img: 'council',
    name: { he: 'העירייה', ru: 'Мэрия', fr: 'Municipalité', en: 'City Hall' },
    title: 'עיריית נתניה: החלטות, תקציב, שירותים ועבודות',
    desc: 'חדשות עיריית נתניה: החלטות מועצת העיר, תקציב, שירותים לתושבים, עבודות ופרויקטים בשכונות.',
    intro: 'מה מחליטה העירייה, איפה עובדים בשכונות, ואילו שירותים משתנים. בשפה פשוטה ועם קישור למקור.' },
  { key: 'realestate', slug: 'real-estate', color: '#E08A00', ink: '#9A5A00', soft: '#FFF7EB', img: 'crane',
    name: { he: 'נדל״ן ותכנון', ru: 'Недвижимость', fr: 'Immobilier', en: 'Real Estate' },
    title: 'נדל״ן ותכנון בנתניה: התחדשות עירונית, תוכניות ועסקאות',
    desc: 'נדל״ן בנתניה: התחדשות עירונית ופינוי בינוי, החלטות ועדת התכנון, פרויקטים חדשים ועסקאות דירות בעיר.',
    intro: 'מה נבנה לידכם, אילו תוכניות אושרו, ואיך זה משפיע על הדיירים ועל מחירי הדירות בעיר.' },
  { key: 'community', slug: 'community', color: '#0B5FCC', ink: '#0A4FA8', soft: '#EEF4FC', img: 'council',
    name: { he: 'קהילה וחינוך', ru: 'Общество и образование', fr: 'Communauté et éducation', en: 'Community & Education' },
    title: 'קהילה וחינוך בנתניה: בתי ספר, תושבים ויוזמות',
    desc: 'קהילה וחינוך בנתניה: בתי ספר וגנים, תרבות ופעילות בשכונות, עמותות ויוזמות של תושבים.',
    intro: 'האנשים, בתי הספר והיוזמות שעושים את העיר. חדשות קהילה מכל השכונות.' },
  { key: 'sports', slug: 'sports', color: '#1E8A4C', ink: '#17703D', soft: '#EEF8F2', img: 'stadium',
    name: { he: 'ספורט', ru: 'Спорт', fr: 'Sport', en: 'Sports' },
    title: 'ספורט בנתניה: מכבי נתניה, ספורט נוער ואירועים',
    desc: 'ספורט בנתניה: מכבי נתניה בכדורגל ובכדורסל, ספורט נוער, מרוצים ואירועי ספורט בעיר.',
    intro: 'מכבי נתניה, קבוצות הנוער ואירועי הספורט בעיר, במקום אחד.' },
  { key: 'leisure', slug: 'events', color: '#D6337A', ink: '#B0245F', soft: '#FFF6FA', img: 'concert',
    name: { he: 'בילוי ואירועים', ru: 'Досуг и события', fr: 'Sorties et événements', en: 'What’s On' },
    title: 'מה עושים בנתניה: אירועים, הופעות ובילוי',
    desc: 'אירועים בנתניה: הופעות, פסטיבלים, אירועי עירייה, מסעדות חדשות ומה עושים בסוף השבוע.',
    intro: 'הופעות, פסטיבלים ואירועים בעיר ובסביבה, עם תאריך, שעה ומקום.' },
  { key: 'sharon', slug: 'sharon', color: '#0E8A8A', ink: '#0A6E6E', soft: '#EBF7F7', img: 'road',
    name: { he: 'השרון', ru: 'Шарон', fr: 'Le Sharon', en: 'Sharon' },
    title: 'חדשות השרון: אבן יהודה, קדימה צורן, עמק חפר וכפר יונה',
    desc: 'חדשות השרון הסמוך לנתניה: אבן יהודה, קדימה צורן, עמק חפר, כפר יונה, תל מונד והסביבה.',
    intro: 'מה קורה ביישובים שסביב נתניה: תחבורה, תכנון, חינוך ואירועים.' },
  { key: 'tourism', slug: 'tourism', color: '#2B8FD8', ink: '#1C6FAE', soft: '#EEF6FD', img: 'beach',
    name: { he: 'תיירות', ru: 'Туризм', fr: 'Tourisme', en: 'Tourism' },
    title: 'תיירות בנתניה: חופים, טיילת, מלונות ואטרקציות',
    desc: 'תיירות בנתניה: החופים, הטיילת והמצוק, מלונות, אטרקציות ומידע למבקרים.',
    intro: 'החופים, הטיילת, המלונות והאטרקציות של נתניה, לתושבים ולמבקרים.' },
  { key: 'law', slug: 'law', color: '#3B4656', ink: '#2B3442', soft: '#F3F5F8', img: 'council',
    name: { he: 'חוק ומשפט', ru: 'Закон', fr: 'Justice', en: 'Law' },
    title: 'חוק ומשפט בנתניה: פסקי דין והחלטות בשפה פשוטה',
    desc: 'חוק ומשפט בנתניה: פסקי דין והחלטות שנוגעים לתושבים, לתכנון ולעירייה, מוסברים בשפה פשוטה.',
    intro: 'פסקי דין והחלטות שנוגעים לתושבי העיר, בלי שמות של אנשים פרטיים, ובשפה פשוטה.' },
];

export const SECTION_BY_KEY = Object.fromEntries(SECTIONS.map((s) => [s.key, s])) as Record<SectionKey, Section>;
