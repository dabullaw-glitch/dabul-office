import type { Lang } from '../data/site';

const he = {
  brandName: 'חדשות נתניה והשרון', tagline: 'מה שקורה עכשיו, ליד הבית',
  home: 'ראשי', flash: 'מבזקים', allFlash: 'כל המבזקים', now: 'נתניה עכשיו', directory: 'מדריך עסקים', search: 'חיפוש',
  searchPh: 'חיפוש חדשות, רחוב או בעל מקצוע', joinTelegram: 'הצטרפו לטלגרם', alerts: 'התראות', sendNews: 'שלחו ידיעה', advertise: 'פרסמו אצלנו',
  latestNow: 'עכשיו בנתניה', more: 'עוד', toSection: 'לכל המדור', readMore: 'לכתבה המלאה', minutesAgo: 'לפני', source: 'מקור',
  updated: 'עודכן', published: 'פורסם', by: 'מערכת חדשות נתניה והשרון', share: 'שיתוף', related: 'עוד בנושא', keyPoints: 'בקצרה', whatItMeans: 'מה זה אומר לתושבים',
  faq: 'שאלות ותשובות', sourceBox: 'מקור הידיעה', viewSource: 'לצפייה במקור', foundError: 'מצאתם טעות?', requestFix: 'בקשת תיקון', haveInfo: 'יש לכם מידע נוסף?', sendUs: 'שלחו לנו',
  neighborhoods: 'שכונות', proTitle: 'בעלי מקצוע בנתניה', addBiz: 'הוסיפו את העסק שלכם', toDirectory: 'לכל המדריך',
  joinTitle: 'המבזקים של נתניה, ישר לטלפון', joinText: 'חסימה, הפסקת מים או אזעקה: יודעים ראשונים. בלי ספאם.',
  footAbout: 'חדשות נתניה והשרון. מבזקים, נתונים חיים ומדריך עסקים.', sectionsH: 'מדורים', usefulH: 'שימושי', siteH: 'האתר',
  about: 'אודות', editorial: 'מדיניות עריכה', corrections: 'תיקונים והסרות', contact: 'צור קשר', terms: 'תקנון', privacy: 'פרטיות', accessibility: 'הצהרת נגישות',
  rights: 'ידיעות נכתבות מתוך מקורות רשמיים ותקשורתיים, עם קרדיט וקישור למקור.', breadcrumbs: 'מיקום בדף', previewNote: 'אתר בבנייה: תצוגה לפני השקה',
  liveSoon: 'הנתונים החיים יתחברו בשלב החיבורים לפני ההשקה.', city: 'נתניה', events: 'מה עושים בסוף השבוע', videos: 'העיר בתמונות',
};
type UI = typeof he;

const ru: UI = {
  brandName: 'Новости Нетании и Шарона', tagline: 'Что происходит рядом с домом',
  home: 'Главная', flash: 'Срочно', allFlash: 'Все срочные', now: 'Нетания сейчас', directory: 'Справочник', search: 'Поиск',
  searchPh: 'Поиск новостей, улицы или мастера', joinTelegram: 'Telegram', alerts: 'Уведомления', sendNews: 'Сообщить новость', advertise: 'Реклама',
  latestNow: 'Сейчас в Нетании', more: 'Ещё', toSection: 'Весь раздел', readMore: 'Читать полностью', minutesAgo: '', source: 'Источник',
  updated: 'Обновлено', published: 'Опубликовано', by: 'Редакция NWS', share: 'Поделиться', related: 'По теме', keyPoints: 'Коротко', whatItMeans: 'Что это значит для жителей',
  faq: 'Вопросы и ответы', sourceBox: 'Источник', viewSource: 'Открыть источник', foundError: 'Нашли ошибку?', requestFix: 'Запросить исправление', haveInfo: 'Есть информация?', sendUs: 'Напишите нам',
  neighborhoods: 'Районы', proTitle: 'Мастера в Нетании', addBiz: 'Добавить бизнес', toDirectory: 'Весь справочник',
  joinTitle: 'Срочные новости Нетании прямо в телефон', joinText: 'Перекрытия, отключения воды, тревоги: узнавайте первыми.',
  footAbout: 'Новости Нетании и Шарона: срочные сообщения, данные в реальном времени и справочник.', sectionsH: 'Разделы', usefulH: 'Полезное', siteH: 'О сайте',
  about: 'О нас', editorial: 'Редакционная политика', corrections: 'Исправления', contact: 'Контакты', terms: 'Условия', privacy: 'Конфиденциальность', accessibility: 'Доступность',
  rights: 'Новости основаны на официальных источниках, со ссылкой на источник.', breadcrumbs: 'Навигация', previewNote: 'Сайт в разработке: предварительный просмотр',
  liveSoon: 'Данные в реальном времени будут подключены перед запуском.', city: 'Нетания', events: 'Куда пойти на выходных', videos: 'Город в фото',
};
const fr: UI = {
  brandName: 'Actualités de Netanya et du Sharon', tagline: 'Ce qui se passe près de chez vous',
  home: 'Accueil', flash: 'Flash', allFlash: 'Tous les flashs', now: 'Netanya maintenant', directory: 'Annuaire', search: 'Recherche',
  searchPh: 'Rechercher une info, une rue, un artisan', joinTelegram: 'Telegram', alerts: 'Alertes', sendNews: 'Envoyer une info', advertise: 'Publicité',
  latestNow: 'En ce moment à Netanya', more: 'Plus', toSection: 'Toute la rubrique', readMore: 'Lire l’article', minutesAgo: '', source: 'Source',
  updated: 'Mis à jour', published: 'Publié', by: 'Rédaction NWS', share: 'Partager', related: 'Sur le même sujet', keyPoints: 'En bref', whatItMeans: 'Ce que cela change pour les habitants',
  faq: 'Questions et réponses', sourceBox: 'Source de l’info', viewSource: 'Voir la source', foundError: 'Une erreur ?', requestFix: 'Demander une correction', haveInfo: 'Vous avez une info ?', sendUs: 'Écrivez-nous',
  neighborhoods: 'Quartiers', proTitle: 'Artisans à Netanya', addBiz: 'Ajouter votre entreprise', toDirectory: 'Tout l’annuaire',
  joinTitle: 'Les flashs de Netanya sur votre téléphone', joinText: 'Routes fermées, coupures d’eau, alertes : soyez les premiers informés.',
  footAbout: 'Actualités de Netanya et du Sharon : flashs, données en direct et annuaire.', sectionsH: 'Rubriques', usefulH: 'Pratique', siteH: 'Le site',
  about: 'À propos', editorial: 'Charte éditoriale', corrections: 'Corrections', contact: 'Contact', terms: 'Conditions', privacy: 'Confidentialité', accessibility: 'Accessibilité',
  rights: 'Les informations proviennent de sources officielles, avec lien vers la source.', breadcrumbs: 'Fil d’Ariane', previewNote: 'Site en construction : aperçu',
  liveSoon: 'Les données en direct seront connectées avant le lancement.', city: 'Netanya', events: 'Que faire ce week-end', videos: 'La ville en images',
};
const en: UI = {
  brandName: 'Netanya & Sharon News', tagline: 'What’s happening near home',
  home: 'Home', flash: 'Breaking', allFlash: 'All updates', now: 'Netanya Now', directory: 'Directory', search: 'Search',
  searchPh: 'Search news, streets or local pros', joinTelegram: 'Telegram', alerts: 'Alerts', sendNews: 'Send a tip', advertise: 'Advertise',
  latestNow: 'Now in Netanya', more: 'More', toSection: 'Full section', readMore: 'Read more', minutesAgo: '', source: 'Source',
  updated: 'Updated', published: 'Published', by: 'NWS Desk', share: 'Share', related: 'Related', keyPoints: 'In brief', whatItMeans: 'What it means for residents',
  faq: 'Q&A', sourceBox: 'Source', viewSource: 'View source', foundError: 'Found an error?', requestFix: 'Request a correction', haveInfo: 'Have more information?', sendUs: 'Tell us',
  neighborhoods: 'Neighborhoods', proTitle: 'Local pros in Netanya', addBiz: 'Add your business', toDirectory: 'Full directory',
  joinTitle: 'Netanya’s breaking news on your phone', joinText: 'Road closures, water outages, alerts: be the first to know.',
  footAbout: 'Netanya & Sharon News: breaking updates, live data and a local directory.', sectionsH: 'Sections', usefulH: 'Useful', siteH: 'About the site',
  about: 'About', editorial: 'Editorial policy', corrections: 'Corrections', contact: 'Contact', terms: 'Terms', privacy: 'Privacy', accessibility: 'Accessibility',
  rights: 'Stories are based on official and media sources, credited and linked.', breadcrumbs: 'Breadcrumbs', previewNote: 'Under construction: preview',
  liveSoon: 'Live data will be connected before launch.', city: 'Netanya', events: 'This weekend', videos: 'The city in pictures',
};

export const UI_STR: Record<Lang, UI> = { he, ru, fr, en };
export const t = (lang: Lang) => UI_STR[lang];
