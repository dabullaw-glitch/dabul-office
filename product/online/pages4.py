# The online legal services pages, version 4 (11.10.2026). Yakir on v3: still boring, dry and repetitive; wants a real
# sales page: an explainer video instead of the photo, services sorted by field with clear separation, fresher colors,
# transitions between parts, Google reviews, infographics that explain, a bit about Yakir and the office, and the
# advantages of ordering online. Colors follow the explainer videos (navy blueprint + sun yellow); every field of law has
# its own color. Reviews are the real Google reviews already shown on dabullaw.co.il/המלצות (Bar advertising rules
# 4(יא) allow recommendations that do not mislead). Writes pages/<slug>.html (WordPress) and pv/<slug>.html (previews).
import json, os, re, html as H
import svcpages as P
import hub2 as HB

SV, C, CFG, esc, ils, icon = P.SV, P.C, P.CFG, P.esc, P.ils, P.icon
PHOTO = HB.PHOTO
VID = 'https://dabullaw-glitch.github.io/dabul-office/media/video/'
VIDEOS = {'hub': ('hub-video', 47), 'precheck': ('precheck-video', 58)}
FIXED = {'precheck', 'tashlumim', 'ichud', 'poa'}
def is_from(sid): return sid not in FIXED or len(P.price_rows(SV[sid])) > 1

# fields of law: id, name, color, tint, icon, when people come
DOM = [
 ('re', 'מקרקעין', '#2563EB', '#EAF1FF', 'home', 'קונים, מוכרים או רושמים דירה'),
 ('biz', 'חברות', '#7C3AED', '#F2ECFF', 'building', 'פותחים חברה או משנים משהו בה'),
 ('fam', 'משפחה וירושה', '#DB2777', '#FDEDF5', 'scroll', 'מסדרים מראש, או אחרי שמישהו נפטר'),
 ('debt', 'חובות והוצאה לפועל', '#EA580C', '#FFF1E7', 'layers', 'תשלום אחד שמתאים להכנסה'),
 ('consult', 'ייעוץ משפטי', '#0E9F6E', '#E7F7F0', 'video', 'שאלה, התלבטות או מסמך לבדיקה'),
]
DOM_OF = {'precheck': 're', 'tabu': 're', 'company': 'biz', 'registrar': 'biz', 'inherit': 'fam', 'poa': 'fam', 'ichud': 'debt', 'tashlumim': 'debt', 'zoom': 'consult'}
D = {d[0]: d for d in DOM}

SVG = {
 'check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'laptop': '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19h20"/>', 'pen': '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
 'back': '<path d="M9 14l-5-5 5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', 'x': '<path d="M7 7l10 10M17 7L7 17"/>',
 'phone': '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
 'lock': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 'mail': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
 'tag': '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
 'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
 'car': '<path d="M5 16l1.5-5h11L19 16"/><rect x="3" y="16" width="18" height="4" rx="1"/><circle cx="7" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>',
 'play': '<path d="M8 5l11 7-11 7z"/>', 'star': '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
 'form': '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>', 'card': '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>',
 'scale': '<path d="M12 3v18M5 21h14M7 7l-4 8a4 4 0 0 0 8 0zM17 7l-4 8a4 4 0 0 0 8 0zM5 7h14"/>', 'reply': '<path d="M4 4h16v12H5l-1 4z"/><path d="M8 9h8M8 12h5"/>',
}
def ic(name, sw='2'):
    if name in SVG:
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % (sw, SVG[name])
    return icon(name, sw)
STAR5 = '<span class="stars" aria-label="5 כוכבים">%s</span>' % (('<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>') * 5)

SIGN_ICON = {'none': 'laptop', 'digital': 'pen', 'meet': 'pen'}
SIGN_TXT = {'none': 'הכול אונליין, בלי להגיע', 'digital': 'חתימה מהטלפון, בלי להגיע', 'meet': 'פגישה קצרה אחת לחתימה'}
GOOGLE = 'https://search.google.com/local/reviews?placeid=ChIJFyPNpLBBHRURR161JAMeBb0'
RATING, NREV = '4.9', 73
# real Google reviews (as shown on dabullaw.co.il/המלצות), picked without comparisons to other offices
REVIEWS = [
 ('נעם פ.', 'אני בן אדם מאוד חשדן כשזה מגיע לכסף ולחוזים ארוכים, אבל יקיר קנה את האמון שלי כבר בפגישה הראשונה. הוא עבר על כל המסמכים בפינצטה ולא השאיר שום אבן הפוכה. מעבר לזה, הסבלנות שלו לענות לי על אותה שאלה שלוש פעמים עד שאבין פשוט ראויה להערכה.'),
 ('Ido Ben H.', 'בתור זוג צעיר שקונה נכס בפעם הראשונה, תהליך של רכישת דירה נראה לנו כמו הר שאי אפשר לטפס עליו. יקיר פישט לנו את הכל, תרגם את המושגים המשפטיים המסובכים לשפה יומיומית וליווה אותנו צעד אחר צעד עד לחתימה.'),
 ('נועם ל.', 'פעם שנייה שאנחנו עושים עסקה דרך המשרד ואין ספק שנחזור גם בעתיד. הכל תמיד מתנהל בצורה כל כך חלקה ומסודרת, בלי לחץ ובלי כאבי ראש של בירוקרטיה.'),
 ('Ivri S.', 'קיבלנו יחס אישי מהשנייה הראשונה, ללא סינונים וללא מתמחים באמצע. יקיר תקתק את ענייני מיסוי המקרקעין, ניהל את התהליך בשקיפות ונתן לנו ביטחון מוחלט שהעסקה בידיים טובות.'),
 ('Omer Ben H.', 'שירות מקצועי ויסודי מהרגע הראשון. קיבלתי ליווי ברור, הסברים בגובה העיניים ותחושה שיש מי שמנהל את התיק ולא נותן לדברים להתפספס. לאורך כל הדרך היו זמינים ושקופים.'),
 ('איתן', 'לא מובן מאליו למצוא היום משרד עורכי דין שמשלב גם ידע משפטי נרחב וגם אנושיות יוצאת דופן. הם תמיד זמינים, מסבירים כל שלב בגובה העיניים ונותנים תחושת ביטחון אמיתית.'),
]
ADV = [('tag', 'מחיר ידוע מראש', 'רואים את המחיר הסופי, כולל מע״מ, לפני שמשלמים. בלי הפתעות בהמשך.'),
       ('car', 'בלי נסיעות ובלי המתנה', 'ממלאים מהטלפון, בזמן שנוח לכם. גם בערב.'),
       ('user', 'עורך הדין עצמו מטפל', 'עו״ד יקיר דבול קורא כל הזמנה ומטפל בה, מההתחלה ועד הסוף.'),
       ('lock', 'תשלום מאובטח וקבלה', 'אשראי או ביט, וקבלה נשלחת אליכם למייל.'),
       ('mail', 'עדכון בכל שלב', 'מייל כשההזמנה מתקבלת, כשמתחילים, וכשהתשובה מוכנה.')]
STATS = [('+100', 'עסקאות מקרקעין בכל שנה'), (RATING + '★', 'דירוג בגוגל, %d ביקורות' % NREV), ('9', 'שירותים במחיר קבוע'), ('1', 'עורך דין שמטפל מההתחלה עד הסוף')]

CSS = r"""<style>
.dz{--navy:#0E2A57;--navy2:#163B78;--sun:#FFE14D;--sun2:#F5C518;--cream:#FFF9EC;--ink:#13203A;--mut:#5B6782;--line:#E1E8F5;--soft:#F4F7FC;--ok:#17915A;
 direction:rtl;color:var(--ink);font-size:17px;line-height:1.7;background:#fff;overflow:hidden}
.dz *{box-sizing:border-box}.dz a{color:inherit}
.dz .w{max-width:1160px;margin:0 auto;padding:0 20px}
.dz section{padding:72px 0;position:relative}
.dz h1{font-size:clamp(34px,5vw,58px);line-height:1.08;margin:0 0 16px;font-weight:800;letter-spacing:-.015em;text-wrap:balance}
.dz h2{font-size:clamp(27px,3.3vw,40px);line-height:1.15;margin:0 0 10px;font-weight:800;text-wrap:balance}
.dz h3{font-size:20px;line-height:1.3;margin:0 0 6px;font-weight:800}
.dz p{margin:0 0 12px}
.dz .kick{display:inline-flex;align-items:center;gap:8px;font-size:14.5px;font-weight:800;letter-spacing:.02em;margin:0 0 12px;color:var(--navy2)}
.dz .kick::before{content:"";width:22px;height:3px;border-radius:2px;background:var(--sun2)}
.dz .lead{color:var(--mut);font-size:19px;max-width:62ch}
.dz .hm{background:var(--sun);color:var(--navy);border-radius:12px;padding:0 12px;box-decoration-break:clone;-webkit-box-decoration-break:clone;display:inline-block;transform:rotate(-1.5deg)}
.dz .hl{background:linear-gradient(transparent 60%,var(--sun) 60%,var(--sun) 92%,transparent 92%);padding:0 4px}
.dz .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:14px;padding:16px 28px;font-weight:800;font-size:17.5px;text-decoration:none!important;line-height:1.2;transition:transform .15s,box-shadow .15s,background .15s}
.dz .btn svg{width:19px;height:19px}
.dz .btn.y{background:var(--sun);color:var(--navy)!important;box-shadow:0 14px 30px -14px rgba(245,197,24,.9)}
.dz .btn.y:hover{transform:translateY(-2px);background:#ffe766}
.dz .btn.n{background:var(--navy);color:#fff!important}.dz .btn.n:hover{background:var(--navy2)}
.dz .btn.g{background:transparent;color:#fff!important;border:1.5px solid rgba(255,255,255,.4)}.dz .btn.g:hover{border-color:#fff}
.dz .btn.o{background:#fff;color:var(--navy)!important;border:1.5px solid var(--line)}
.dz .btns{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0 0}
.dz .stars{display:inline-flex;gap:2px;color:#F5B301}.dz .stars svg{width:17px;height:17px}
/* hero */
.dz .hero{background:var(--navy);color:#fff;padding:34px 0 120px;
 background-image:radial-gradient(800px 420px at 85% -10%,rgba(255,225,77,.18),transparent 60%),linear-gradient(rgba(127,166,240,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(127,166,240,.12) 1px,transparent 1px),linear-gradient(rgba(127,166,240,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(127,166,240,.05) 1px,transparent 1px);
 background-size:auto,96px 96px,96px 96px,24px 24px,24px 24px}
.dz .hero .crumb{font-size:14px;color:#9FB4DC;margin:0 0 30px}.dz .hero .crumb a{color:#9FB4DC;text-decoration:none}
.dz .hero .kick{color:#CFE0FF}
.dz .hero .lead{color:#C9D7F2}
.dz .hg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:48px;align-items:center}
.dz .hero ul.t{list-style:none;margin:18px 0 0;padding:0;display:grid;gap:9px}
.dz .hero ul.t li{display:flex;gap:10px;align-items:flex-start;color:#E6EDFB}
.dz .hero ul.t svg{width:21px;height:21px;color:var(--sun);flex:none;margin-top:3px}
.dz .rate{display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:99px;padding:7px 14px;margin:18px 0 0;font-size:15px;color:#E6EDFB;text-decoration:none}
.dz .rate b{color:#fff}
.dz .dom{display:inline-flex;align-items:center;gap:7px;border-radius:99px;padding:5px 13px;font-size:14px;font-weight:800;margin:0 0 14px}
.dz .dom svg{width:16px;height:16px}
/* video */
.dz .vid{position:relative;border-radius:22px;overflow:hidden;background:#071936;border:1px solid rgba(255,255,255,.14);box-shadow:0 40px 80px -36px rgba(0,0,0,.8);aspect-ratio:16/9}
.dz .vid video{width:100%;height:100%;display:block;object-fit:cover}
.dz .vid .pl{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(180deg,transparent 40%,rgba(7,25,54,.55));cursor:pointer;border:0;padding:0;width:100%}
.dz .vid .pl i{width:84px;height:84px;border-radius:50%;background:var(--sun);color:var(--navy);display:grid;place-items:center;box-shadow:0 0 0 12px rgba(255,225,77,.25);transition:transform .15s}
.dz .vid .pl:hover i{transform:scale(1.07)}
.dz .vid .pl i svg{width:34px;height:34px;margin-inline-start:-4px;fill:currentColor}
.dz .vid .pl span{position:absolute;bottom:14px;right:16px;color:#fff;font-weight:700;font-size:15px;background:rgba(7,25,54,.7);border-radius:99px;padding:5px 12px}
.dz .vid.on .pl{display:none}
/* stats strip */
.dz .strip{margin-top:-74px;position:relative;z-index:2}
.dz .strip .in{background:#fff;border-radius:22px;box-shadow:0 30px 60px -34px rgba(14,42,87,.45);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding:8px}
.dz .strip .in > div{padding:18px 20px;border-inline-start:1px solid var(--line)}.dz .strip .in > div:first-child{border:0}
.dz .strip b{display:block;font-size:34px;line-height:1.05;color:var(--navy);font-weight:800}
.dz .strip span{color:var(--mut);font-size:15px;line-height:1.35;display:block;margin-top:4px}
/* price bar on service pages */
.dz .pbar{margin-top:-74px;position:relative;z-index:2}
.dz .pbar .in{background:#fff;border-radius:22px;box-shadow:0 30px 60px -34px rgba(14,42,87,.45);display:grid;grid-template-columns:auto repeat(3,minmax(0,1fr)) auto;align-items:center;gap:6px;padding:16px 18px}
.dz .pbar .pr{padding:4px 14px 4px 22px;border-inline-end:1px solid var(--line)}
.dz .pbar .pr small{display:block;color:var(--mut);font-size:13.5px}
.dz .pbar .pr b{font-size:40px;line-height:1;font-weight:800;color:var(--navy)}.dz .pbar .pr em{font-style:normal;color:var(--mut);font-size:15px;margin-inline-start:4px}
.dz .pbar .pr .v{display:block;color:var(--mut);font-size:13.5px;margin-top:4px}
.dz .pbar .f{display:flex;gap:10px;align-items:flex-start;padding:6px 12px;font-size:15px;line-height:1.4}
.dz .pbar .f svg{width:22px;height:22px;flex:none;color:var(--navy2)}
.dz .pbar .f b{display:block;font-size:15px}.dz .pbar .f span{color:var(--mut);font-size:14px}
/* steps path */
.dz .path{position:relative;display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:18px;margin-top:34px;list-style:none;padding:0}
.dz .path::before{content:"";position:absolute;top:36px;right:12%;left:12%;height:3px;background:repeating-linear-gradient(90deg,var(--sun2) 0 10px,transparent 10px 18px)}
.dz .path li{position:relative;text-align:center;padding:0 6px}
.dz .path .c{width:74px;height:74px;border-radius:50%;background:var(--navy);color:var(--sun);display:grid;place-items:center;margin:0 auto 14px;box-shadow:0 0 0 8px #fff,0 16px 30px -14px rgba(14,42,87,.7);position:relative}
.dz .path .c svg{width:32px;height:32px}
.dz .path .c em{position:absolute;top:-6px;left:-6px;width:28px;height:28px;border-radius:50%;background:var(--sun);color:var(--navy);font-style:normal;font-weight:800;font-size:14px;display:grid;place-items:center}
.dz .path b{display:block;font-size:18px;margin-bottom:4px}.dz .path span{color:var(--mut);font-size:15.5px;line-height:1.5;display:block}
.dz .path small{display:inline-block;margin-top:8px;background:var(--cream);color:#8A6A00;border-radius:99px;padding:3px 10px;font-weight:700;font-size:13px}
.dz .cream{background:var(--cream)}
.dz .sla{margin:26px 0 0;font-weight:800;display:flex;gap:8px;align-items:center;color:var(--navy);justify-content:center}.dz .sla svg{width:22px;height:22px;color:var(--sun2);flex:none}
.dz .soft{background:var(--soft)}
/* field nav + field bands */
.dz .fnav{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0 8px}
.dz .fnav a{display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-weight:800;font-size:15.5px;border-radius:99px;padding:9px 16px;background:#fff;border:1.5px solid var(--line);color:var(--ink)}
.dz .fnav a i{width:10px;height:10px;border-radius:50%}
.dz .fnav a:hover{border-color:var(--ink)}
.dz .field{display:grid;grid-template-columns:260px minmax(0,1fr);gap:22px;margin-top:30px;padding-top:30px;border-top:1px solid var(--line);scroll-margin-top:80px}
.dz .field:first-of-type{border-top:0}
.dz .fh{border-radius:20px;padding:22px;color:#fff;position:relative;overflow:hidden;align-self:start}
.dz .fh::after{content:"";position:absolute;inset:auto -40px -60px auto;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.12)}
.dz .fh i{width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,.18);display:grid;place-items:center;margin-bottom:14px}.dz .fh i svg{width:28px;height:28px}
.dz .fh h3{font-size:24px;color:#fff;margin:0 0 6px}.dz .fh p{color:rgba(255,255,255,.88);font-size:15.5px;margin:0}
.dz .fh small{display:inline-block;margin-top:14px;background:rgba(255,255,255,.18);border-radius:99px;padding:3px 12px;font-weight:700;font-size:13.5px}
.dz .cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.dz .cards.one{grid-template-columns:minmax(0,1fr)}
.dz .sc{display:flex;flex-direction:column;gap:10px;background:#fff;border:1px solid var(--line);border-top:5px solid var(--fc);border-radius:18px;padding:22px;text-decoration:none!important;transition:transform .15s,box-shadow .15s}
.dz .sc:hover{transform:translateY(-3px);box-shadow:0 24px 44px -30px rgba(14,42,87,.55)}
.dz .sc .ti{display:flex;gap:12px;align-items:center}
.dz .sc .ti i{width:46px;height:46px;border-radius:13px;background:var(--ft);color:var(--fc);display:grid;place-items:center;flex:none}.dz .sc .ti i svg{width:23px;height:23px}
.dz .sc .ti b{font-size:20px;line-height:1.25}
.dz .sc p{color:var(--mut);font-size:15.5px;line-height:1.55;margin:0;flex:1}
.dz .sc .mt{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:14px;color:var(--ink)}
.dz .sc .mt span{display:inline-flex;gap:5px;align-items:center}.dz .sc .mt svg{width:15px;height:15px;color:var(--fc)}
.dz .sc .ft{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px dashed var(--line);padding-top:14px;margin-top:4px}
.dz .sc .pz{white-space:nowrap}.dz .sc .pz small{display:block;color:var(--mut);font-size:13px;line-height:1.2}
.dz .sc .pz b{font-size:26px;font-weight:800}.dz .sc .pz em{font-style:normal;color:var(--mut);font-size:13.5px;margin-inline-start:4px}
.dz .sc .go{background:var(--navy);color:#fff;border-radius:11px;padding:11px 15px;font-weight:800;font-size:15px;white-space:nowrap}
.dz .sc:hover .go{background:var(--fc)}
/* advantages */
.dz .adv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:28px}
.dz .adv div{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px}
.dz .adv i{width:50px;height:50px;border-radius:14px;background:var(--navy);color:var(--sun);display:grid;place-items:center;margin-bottom:12px}.dz .adv i svg{width:25px;height:25px}
.dz .adv b{display:block;font-size:18px;margin-bottom:4px}.dz .adv span{color:var(--mut);font-size:15.5px;line-height:1.55;display:block}
/* about */
.dz .about{background:var(--navy);color:#fff}
.dz .about .ag{display:grid;grid-template-columns:320px minmax(0,1fr);gap:46px;align-items:center}
.dz .about .ph{border-radius:22px;overflow:hidden;background:#0a1b3b;border:4px solid var(--sun);box-shadow:0 30px 60px -30px rgba(0,0,0,.8);max-width:320px}
.dz .about .ph img{display:block;width:100%;height:auto;aspect-ratio:841/1264;object-fit:cover}
.dz .about h2{color:#fff}.dz .about .kick{color:#CFE0FF}
.dz .about p{color:#D6E2FA}
.dz .about ul{list-style:none;padding:0;margin:16px 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.dz .about li{display:flex;gap:10px;align-items:flex-start;color:#E6EDFB;font-size:16px}.dz .about li svg{width:20px;height:20px;color:var(--sun);flex:none;margin-top:3px}
.dz .media{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.dz .media span{border:1px solid rgba(255,255,255,.25);border-radius:99px;padding:5px 14px;font-weight:700;font-size:14.5px;color:#fff}
/* reviews */
.dz .rh{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between}
.dz .gbox{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:12px 18px;text-decoration:none}
.dz .gbox b{font-size:38px;line-height:1;font-weight:800;color:var(--navy)}
.dz .gbox span{display:block;font-size:14px;color:var(--mut)}
.dz .gbox .stars{color:#F5B301}
.dz .gl{font-weight:800;font-size:22px;letter-spacing:-.02em}
.dz .gl i:nth-child(1){color:#4285F4}.dz .gl i:nth-child(2){color:#EA4335}.dz .gl i:nth-child(3){color:#FBBC05}.dz .gl i:nth-child(4){color:#4285F4}.dz .gl i:nth-child(5){color:#34A853}.dz .gl i:nth-child(6){color:#EA4335}.dz .gl i{font-style:normal}
.dz .revs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:26px}
.dz .rv{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:10px}
.dz .rv p{margin:0;font-size:15.5px;line-height:1.6;color:var(--ink);flex:1}
.dz .rv .by{display:flex;align-items:center;gap:10px;font-weight:800;font-size:15px}
.dz .rv .by i{width:36px;height:36px;border-radius:50%;background:var(--navy);color:var(--sun);display:grid;place-items:center;font-style:normal;font-size:15px}
.dz .rv .by small{display:block;color:var(--mut);font-weight:400;font-size:13px}
/* included infographic */
.dz .inc{display:grid;grid-template-columns:repeat(var(--cols,3),minmax(0,1fr));gap:14px;margin-top:26px;counter-reset:n}
.dz .inc div{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px 18px 18px 16px;display:flex;gap:12px;align-items:flex-start;counter-increment:n}
.dz .inc div::before{content:counter(n);width:34px;height:34px;flex:none;border-radius:10px;background:var(--fc,#2563EB);color:#fff;font-weight:800;display:grid;place-items:center}
.dz .inc div span{font-size:16px;line-height:1.5;font-weight:600}
.dz .two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;margin-top:22px}
.dz .box{border-radius:18px;padding:24px;background:#fff;border:1px solid var(--line)}
.dz .box ul{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:10px}
.dz .box li{display:flex;gap:10px;align-items:flex-start;font-size:16px;line-height:1.5}.dz .box li svg{width:20px;height:20px;flex:none;margin-top:2px}
.dz .box.fit li svg{color:var(--ok)}.dz .box.no{background:var(--soft)}.dz .box.no li{color:var(--mut)}.dz .box.no li svg{color:#98A2B8}
/* order */
.dz .order{background:var(--navy);scroll-margin-top:60px;color:#fff}
.dz .order .oh{text-align:center;max-width:760px;margin:0 auto 22px}.dz .order h2{color:#fff}.dz .order .lead{color:#C9D7F2;margin:0 auto}
.dz .order .kick{color:#CFE0FF;justify-content:center}
.dz .prep{max-width:1000px;margin:0 auto 14px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.dz .prep span{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:99px;padding:6px 14px;font-size:14.5px;color:#E6EDFB}
.dz .prep span b{color:var(--sun)}
.dz .order .form{max-width:1000px;margin:0 auto;background:#fff;color:var(--ink);border-radius:22px;padding:22px;box-shadow:0 40px 80px -40px rgba(0,0,0,.8)}
.dz .order .pay{max-width:1000px;margin:16px auto 0;display:flex;justify-content:center;gap:18px;flex-wrap:wrap;color:#C9D7F2;font-size:14.5px}
.dz .order .pay span{display:inline-flex;gap:6px;align-items:center}.dz .order .pay svg{width:16px;height:16px;color:var(--sun)}
/* faq + closing */
.dz .faq{max-width:840px}
.dz details{background:#fff;border:1px solid var(--line);border-radius:14px;padding:2px 18px;margin-bottom:10px}
.dz summary{cursor:pointer;list-style:none;padding:14px 0;font-weight:800;font-size:17px;display:flex;justify-content:space-between;gap:12px}
.dz summary::-webkit-details-marker{display:none}
.dz summary::after{content:"+";width:26px;height:26px;border-radius:50%;background:var(--sun);color:var(--navy);display:grid;place-items:center;flex:none;font-size:18px}
.dz details[open] summary::after{content:"−"}
.dz details p{color:var(--ink);margin:0 0 14px}
.dz .close{background:linear-gradient(120deg,var(--navy),var(--navy2));color:#fff;border-radius:26px;padding:40px;display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between}
.dz .close h2{color:#fff;margin:0}.dz .close p{color:#C9D7F2;margin:6px 0 0}
.dz .srcs{font-size:14px;color:var(--mut);margin-top:30px}.dz .srcs ol{padding-inline-start:20px;margin:6px 0 12px}
.dz sup a{color:var(--navy2);text-decoration:none;font-weight:800;font-size:12px}
.dz .wave{display:block;width:100%;height:46px;margin-bottom:-1px}
.dz .mbar{display:none}
@media (max-width:980px){
 .dz .hg,.dz .about .ag{grid-template-columns:minmax(0,1fr)}
 .dz .field{grid-template-columns:minmax(0,1fr)}
 .dz .strip .in{grid-template-columns:repeat(2,minmax(0,1fr))}.dz .strip .in > div:nth-child(3){border:0}
 .dz .pbar .in{grid-template-columns:repeat(2,minmax(0,1fr))}.dz .pbar .pr{grid-column:1/-1;border:0;border-bottom:1px solid var(--line);padding:4px 6px 14px}.dz .pbar .btn{grid-column:1/-1}
 .dz .adv,.dz .revs,.dz .inc{grid-template-columns:repeat(2,minmax(0,1fr))}
 .dz .path{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:30px}.dz .path::before{display:none}
 .dz .about .ph{margin:0 auto}
}
@media (max-width:640px){
 .dz{font-size:16.5px}.dz section{padding:52px 0}.dz .w{padding:0 16px}
 .dz .hero{padding:22px 0 100px}
 .dz .btns .btn{flex:1 1 100%}
 .dz .cards,.dz .adv,.dz .revs,.dz .inc,.dz .two,.dz .about ul{grid-template-columns:minmax(0,1fr)}
 .dz .path{grid-template-columns:minmax(0,1fr)}.dz .path li{display:grid;grid-template-columns:74px minmax(0,1fr);gap:4px 14px;text-align:right}.dz .path .c{grid-row:span 3;margin:0}
 .dz .strip b{font-size:28px}
 .dz .order .form{padding:12px;border-radius:16px}
 .dz .close{padding:26px}
 .dz .mbar{display:flex;position:fixed;inset:auto 10px calc(10px + env(safe-area-inset-bottom,0px)) 10px;z-index:60;align-items:center;justify-content:space-between;gap:10px;background:var(--navy);color:#fff;border-radius:16px;padding:10px 10px 10px 16px;box-shadow:0 16px 36px -14px rgba(0,0,0,.6);transform:translateY(140%);transition:transform .25s;text-decoration:none!important}
 .dz .mbar.on{transform:none}.dz .mbar span{font-size:14px;color:#C9D7F2}.dz .mbar span b{color:#fff;font-size:17px}
 .dz .mbar em{font-style:normal;background:var(--sun);color:var(--navy);border-radius:11px;padding:10px 14px;font-weight:800;font-size:15px}
}
</style>"""

def video(key, alt):
    name, secs = VIDEOS[key]
    return ('<div class="vid" data-v><video preload="none" playsinline controls poster="%s%s-poster.jpg" aria-label="%s"><source src="%s%s.mp4" type="video/mp4"></video>'
            '<button class="pl" type="button" aria-label="הפעלת הסרטון"><i><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg></i><span>צפו: %s (%d שניות)</span></button></div>') % (VID, name, esc(alt), VID, name, esc(alt), secs)
VJS = ('<script>document.querySelectorAll(".dz [data-v]").forEach(function(v){var b=v.querySelector(".pl"),m=v.querySelector("video");if(!b||!m)return;'
       'b.addEventListener("click",function(){v.classList.add("on");m.play().catch(function(){});try{window.gtag&&gtag("event","video_play",{video:m.currentSrc||""})}catch(e){}});});</script>')

def card(sid):
    s = SV[sid]; d = D[DOM_OF[sid]]; fp = P.from_price(s)
    pre = '<small>החל מ־</small>' if is_from(sid) else '<small>מחיר קבוע</small>'
    return ('<a class="sc" href="/online/%s/" style="--fc:%s;--ft:%s"><div class="ti"><i>%s</i><b>%s</b></div><p>%s</p>'
            '<div class="mt"><span>%s%s</span><span>%s%s</span></div>'
            '<div class="ft"><div class="pz">%s<b>%s</b><em>+ מע״מ</em></div><span class="go">לפרטים ולהזמנה ←</span></div></a>') % (
        s['slug'], d[2], d[3], ic(s['icon'], '1.7'), esc(s['title']), esc(s['card']),
        ic('clock'), esc(HB.TIME[sid]), ic(SIGN_ICON[s['sign']]), esc(SIGN_TXT[s['sign']]), pre, ils(fp))

def steps_path(items, n):
    return '<ol class="path" style="--n:%d">%s</ol>' % (n, ''.join(
        '<li><div class="c">%s<em>%d</em></div><b>%s</b><span>%s</span>%s</li>' % (ic(i), k + 1, esc(a), esc(b), ('<small>%s</small>' % esc(t)) if t else '') for k, (i, a, b, t) in enumerate(items)))

def reviews(n=6):
    rv = ''.join('<div class="rv">%s<p>%s</p><div class="by"><i>%s</i><span><bdi>%s</bdi><small>ביקורת בגוגל</small></span></div></div>' % (STAR5, esc(t), esc(nm[0]), esc(nm)) for nm, t in REVIEWS[:n])
    return ('<section class="soft"><div class="w"><div class="rh"><div><span class="kick">ביקורות בגוגל</span><h2>מה לקוחות כותבים</h2></div>'
            '<a class="gbox" href="%s" target="_blank" rel="noopener nofollow"><b>%s</b><div>%s<span>%d ביקורות ב-<span class="gl"><i>G</i><i>o</i><i>o</i><i>g</i><i>l</i><i>e</i></span></span></div></a></div>'
            '<div class="revs">%s</div><p style="margin-top:16px;font-size:14px;color:var(--mut)">ביקורות של לקוחות המשרד, כפי שפורסמו בגוגל. כל עסקה ומקרה שונים.</p></div></section>') % (GOOGLE, RATING, STAR5, NREV, rv)

def about(photo_src):
    return ('<section class="about"><div class="w"><div class="ag"><div class="ph"><img src="%s" alt="עו״ד יקיר דבול" loading="lazy" decoding="async" width="841" height="1264"></div>'
            '<div><span class="kick">מי עומד מאחורי השירות</span><h2>עו״ד יקיר דבול, משרד עורכי דין בנתניה</h2>'
            '<p>המשרד עוסק במקרקעין, מיסוי מקרקעין, התחדשות עירונית, חדלות פירעון, ירושות וחברות. עו״ד יקיר דבול מלווה בכל שנה יותר ממאה עסקאות מקרקעין בשרון, ומטפל בעצמו בכל תיק, גם בשירותים שמזמינים אונליין.</p>'
            '<ul><li>%s<span>חבר בוועדות בלשכת עורכי הדין</span></li><li>%s<span>ממונה מטעם בית המשפט לרישום בתים משותפים</span></li><li>%s<span>משרד ברחוב רזיאל 1, נתניה</span></li><li>%s<span>זמינות בטלפון ובוואטסאפ</span></li></ul>'
            '<p style="margin:14px 0 4px;font-weight:800;color:#fff">התראיין והופיע ב:</p><div class="media"><span>חדשות 13</span><span>ישראל היום</span><span>וואלה נדל״ן</span><span>ביזפורטל</span></div>'
            '<div class="btns"><a class="btn y" href="#services">לבחירת שירות ←</a><a class="btn g" href="/%%D7%%90%%D7%%95%%D7%%93%%D7%%95%%D7%%AA-%%D7%%94%%D7%%9E%%D7%%A9%%D7%%A8%%D7%%93/">עוד על המשרד</a></div></div></div></div></section>') % (
        photo_src, ic('check', '2.4'), ic('check', '2.4'), ic('check', '2.4'), ic('check', '2.4'))

def advantages(title='למה להזמין אצלנו אונליין'):
    return ('<section><div class="w"><span class="kick">היתרונות</span><h2>%s</h2><p class="lead">שירות משפטי אמיתי, עם עורך דין אמיתי. רק בלי הנסיעה, בלי ההמתנה ובלי הפתעות במחיר.</p><div class="adv">%s</div></div></section>') % (
        esc(title), ''.join('<div><i>%s</i><b>%s</b><span>%s</span></div>' % (ic(a), esc(b), esc(c)) for a, b, c in ADV))

def faq(items, title):
    return '<section class="soft"><div class="w faq"><span class="kick">שאלות נפוצות</span><h2>%s</h2>%s</div></section>' % (esc(title), ''.join('<details><summary>%s</summary><p>%s</p></details>' % (esc(q), esc(a)) for q, a in items))

def old_ld(slug):
    h = open(os.path.join(P.OUT, slug + '.html'), encoding='utf8').read()
    m = re.search(r'<script type="application/ld\+json">.*?</script>', h, re.S)
    return m.group(0) if m else ''

HUB_STEPS = [('form', 'בוחרים שירות', 'לכל שירות מחיר קבוע ופירוט של מה כלול.', 'דקה'),
             ('pen', 'ממלאים טופס קצר', 'מהטלפון או מהמחשב, ומצרפים מסמכים.', 'כמה דקות'),
             ('card', 'רואים מחיר ומשלמים', 'המחיר הסופי מוצג לפני התשלום. אשראי או ביט.', 'מאובטח'),
             ('user', 'עורך הדין מטפל', 'עו״ד יקיר דבול מטפל ומעדכן אתכם במייל עד הסוף.', 'לפי הזמן שבדף השירות')]

def hub(ld, photo_src):
    hero = ('<div class="hero"><div class="w"><p class="crumb"><a href="/">דף הבית</a> › שירותים משפטיים אונליין</p><div class="hg"><div>'
            '<span class="kick">מחיר קבוע · הזמנה מהטלפון</span><h1><span class="h1k">שירותים משפטיים אונליין:</span> עורך דין, <span class="hm">בלי לצאת</span> מהבית.</h1>'
            '<p class="lead">בוחרים שירות, ממלאים טופס קצר ומשלמים באתר. עו״ד יקיר דבול מטפל בעצמו, ואתם יודעים מראש כמה זה עולה ומתי תקבלו תשובה.</p>'
            '<ul class="t"><li>%s<span>9 שירותים ב-5 תחומים, לכל אחד מחיר קבוע</span></li><li>%s<span>תשלום מאובטח באתר, קבלה למייל</span></li><li>%s<span>עורך הדין מטפל בעצמו, מההתחלה ועד הסוף</span></li></ul>'
            '<div class="btns"><a class="btn y" href="#services">לבחירת שירות ←</a><a class="btn g" href="tel:098613413">%sשאלה לפני? 09-8613413</a></div>'
            '<a class="rate" href="%s" target="_blank" rel="noopener nofollow">%s<b>%s</b> · %d ביקורות בגוגל</a></div>%s</div></div></div>') % (
        ic('check', '2.4'), ic('check', '2.4'), ic('check', '2.4'), ic('phone'), GOOGLE, STAR5, RATING, NREV, video('hub', 'איך מזמינים שירות משפטי אונליין'))
    strip = '<div class="strip"><div class="w"><div class="in">%s</div></div></div>' % ''.join('<div><b>%s</b><span>%s</span></div>' % (esc(a), esc(b)) for a, b in STATS)
    how = '<section class="cream" style="margin-top:56px"><div class="w"><span class="kick">איך זה עובד</span><h2>ארבעה צעדים, ואנחנו מטפלים</h2>%s</div></section>' % steps_path(HUB_STEPS, 4)
    nav = '<div class="fnav">%s</div>' % ''.join('<a href="#f-%s"><i style="background:%s"></i>%s</a>' % (d[0], d[2], esc(d[1])) for d in DOM)
    fields = ''
    for d in DOM:
        ids = [x for x in P.ORDER if DOM_OF[x] == d[0]]
        fields += ('<div class="field" id="f-%s"><div class="fh" style="background:linear-gradient(140deg,%s,%s)"><i>%s</i><h3>%s</h3><p>%s</p><small>%d %s</small></div><div class="cards%s">%s</div></div>') % (
            d[0], d[2], shade(d[2]), ic(d[4], '1.8'), esc(d[1]), esc(d[5]), len(ids), 'שירותים' if len(ids) > 1 else 'שירות', ' one' if len(ids) == 1 else '', ''.join(card(x) for x in ids))
    svcs = ('<section id="services" style="scroll-margin-top:60px"><div class="w"><span class="kick">בוחרים שירות</span><h2>במה אפשר לעזור לכם?</h2>'
            '<p class="lead">השירותים מסודרים לפי תחום. לחיצה על שירות פותחת את כל הפרטים והטופס להזמנה.</p>%s%s'
            '<div class="close" style="margin-top:34px"><div><h2 style="font-size:26px">לא בטוחים מה מתאים לכם?</h2><p>התקשרו, או קבעו ייעוץ קצר בזום ונכוון אתכם.</p></div>'
            '<div class="btns" style="margin:0"><a class="btn y" href="/online/zoom-consultation/">לייעוץ בזום ←</a><a class="btn g" href="tel:098613413">09-8613413</a></div></div></div></section>') % (nav, fields)
    end = ('<section><div class="w"><div class="close"><div><h2>מתחילים היום</h2><p>בוחרים שירות, ממלאים בכמה דקות, ורואים את המחיר הסופי לפני התשלום.</p></div>'
           '<div class="btns" style="margin:0"><a class="btn y" href="#services">לבחירת שירות ←</a><a class="btn g" href="https://wa.me/972505580189" target="_blank" rel="noopener">שאלה בוואטסאפ</a></div></div></div></section>')
    return CSS + '<div class="dz">' + hero + strip + how + svcs + advantages() + about(photo_src) + reviews(6) + faq(P.HUB_FAQ, 'שאלות על השירותים אונליין') + end + '</div>' + VJS + ld

def shade(hexc):
    h = hexc.lstrip('#'); r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return '#%02x%02x%02x' % (int(r * .72), int(g * .72), int(b * .72))

def srcs_html(sid):
    srcs = [P.SRC[k] for k in C[sid]['src']]
    return ('<div class="srcs"><b>מקורות</b><ol>%s</ol><p>המידע בעמוד הוא כללי ואינו ייעוץ משפטי למקרה מסוים. %s</p></div>') % (
        ''.join('<li id="src-%d"><a href="%s" target="_blank" rel="noopener noreferrer">%s</a>, <em>%s</em></li>' % (i + 1, u, esc(t), esc(w)) for i, (u, t, w) in enumerate(srcs)), esc(' '.join(CFG['terms'])))

STEP_ICONS = ['form', 'card', 'user', 'mail']
def service(sid, ld, photo_src):
    s, c = SV[sid], C[sid]; d = D[DOM_OF[sid]]; fp = P.from_price(s)
    sig = s['sign']
    right = ('<span class="dom" style="background:%s;color:%s">%s%s</span><h1>%s</h1><p class="lead">%s</p><ul class="t">%s</ul>'
             '<div class="btns"><a class="btn y" href="#order">להזמנה עכשיו ←</a><a class="btn g" href="tel:098613413">%sשאלה לפני? 09-8613413</a></div>'
             '<a class="rate" href="%s" target="_blank" rel="noopener nofollow">%s<b>%s</b> · %d ביקורות בגוגל</a>') % (
        d[3], d[2], ic(d[4], '2'), esc(d[1]), esc(s['title']), esc(s['card']),
        ''.join('<li>%s<span>%s</span></li>' % (ic('check', '2.4'), esc(x)) for x in s['incl'][:3]), ic('phone'), GOOGLE, STAR5, RATING, NREV)
    media = video(sid, s['title']) if sid in VIDEOS else ('<div class="about" style="background:none"><div class="ph" style="margin:0 auto"><img src="%s" alt="עו״ד יקיר דבול" width="841" height="1264"></div></div>' % photo_src)
    hero = ('<div class="hero"><div class="w"><p class="crumb"><a href="/">דף הבית</a> › <a href="/online/">שירותים משפטיים אונליין</a> › %s</p><div class="hg"><div>%s</div>%s</div></div></div>') % (esc(s['title']), right, media)
    pv = ('%s כולל מע״מ' % P.vat(fp)) if not is_from(sid) else 'המחיר המדויק מחושב בטופס'
    pbar = ('<div class="pbar"><div class="w"><div class="in"><div class="pr"><small>%s</small><b>%s</b><em>+ מע״מ</em><span class="v">%s</span></div>'
            '<div class="f">%s<div><b>זמן</b><span>%s</span></div></div><div class="f">%s<div><b>איך</b><span>%s</span></div></div><div class="f">%s<div><b>תשלום</b><span>מאובטח באתר, קבלה למייל</span></div></div>'
            '<a class="btn y" href="#order">להזמנה ←</a></div></div></div>') % ('החל מ־' if is_from(sid) else 'מחיר קבוע', ils(fp), esc(pv), ic('clock'), esc(HB.TIME[sid]), ic(SIGN_ICON[sig]), esc(SIGN_TXT[sig]), ic('lock'))
    st = P.STEPS[sig]
    how = '<section class="cream" style="margin-top:56px"><div class="w"><span class="kick">איך זה עובד</span><h2>ארבעה צעדים פשוטים</h2>%s<p class="sla">%s%s</p></div></section>' % (
        steps_path([(STEP_ICONS[k], a, b, '') for k, (a, b) in enumerate(st)], 4), ic('clock'), esc(s['sla']))
    inc = ('<section><div class="w"><span class="kick">מה מקבלים</span><h2>מה כלול במחיר</h2><div class="inc" style="--fc:%s;--cols:%d">%s</div>'
           '<div class="two"><div class="box fit"><h3>השירות מתאים לכם אם</h3><ul>%s</ul></div><div class="box no"><h3>מה לא כלול</h3><ul>%s%s</ul></div></div></div></section>') % (
        d[2], 2, ''.join('<div%s><span>%s</span></div>' % (' style="grid-column:1/-1"' if (k == len(s['incl']) - 1 and len(s['incl']) % 2) else '', esc(x)) for k, x in enumerate(s['incl'])),
        ''.join('<li>%s<span>%s</span></li>' % (ic('check', '2.4'), esc(x)) for x in c['who']),
        ''.join('<li>%s<span>%s</span></li>' % (ic('x'), esc(x)) for x in s['excl']), ('<li>%s<span>%s</span></li>' % (ic('x'), esc(s['gov']))) if s['gov'] else '')
    order = ('<section class="order" id="order"><div class="w"><div class="oh"><span class="kick">ההזמנה</span><h2>מזמינים בכמה דקות</h2>'
             '<p class="lead">ממלאים שלב אחרי שלב. בסוף רואים את המחיר הסופי, ורק אז משלמים.</p></div>'
             '<div class="prep">%s</div><div class="form">%s</div>'
             '<div class="pay"><span>%sתשלום מאובטח</span><span>%sקבלה למייל</span><span>%sעורך הדין מטפל בעצמו</span></div></div></section>') % (
        ''.join('<span><b>✓</b> %s</span>' % esc(x) for x in c['prep']), P.app_embed(sid), ic('lock'), ic('mail'), ic('user'))
    ex_h, ex_b = c['extra']
    extra = '<section style="padding-bottom:0"><div class="w"><span class="kick">חשוב לדעת</span><h2>%s</h2><div class="box" style="border-inline-start:5px solid %s;max-width:860px">%s</div></div></section>' % (esc(ex_h), d[2], ex_b)
    rel_ids = [x for x in c['rel']]
    rel = ('<section><div class="w"><span class="kick">עוד שירותים</span><h2>אולי יתאים לכם גם</h2><div class="cards" style="margin-top:20px">%s</div>'
           '<p style="margin-top:18px"><a href="/online/" style="font-weight:800;color:var(--navy2)">לכל השירותים לפי תחום ←</a></p>%s</div></section>') % (''.join(card(x) for x in rel_ids[:2]), srcs_html(sid))
    mbar = '<a class="mbar" href="#order"><span>%s<b>%s</b> + מע״מ</span><em>להזמנה ←</em></a>' % ('מ־' if is_from(sid) else '', ils(fp))
    js = ('<script>(function(){var r=document.getElementById("dbl-svc");if(!r||!("IntersectionObserver" in window))return;var m=r.querySelector(".mbar"),h=r.querySelector(".hero"),o=r.querySelector("#order"),v={h:1,o:0};'
          'var io=new IntersectionObserver(function(es){es.forEach(function(x){v[x.target===h?"h":"o"]=x.isIntersecting});m.classList.toggle("on",!v.h&&!v.o)});io.observe(h);io.observe(o);})();</script>')
    return (CSS + '<div class="dz" id="dbl-svc">' + hero + pbar + how + inc + order + extra + advantages('למה להזמין אצלנו אונליין') + about(photo_src) + reviews(3)
            + faq(s['faq'], 'שאלות על ' + s['title']) + rel + mbar + '</div>' + VJS + js + ld)

if __name__ == '__main__':
    PV = os.path.join(P.HERE, 'pv'); os.makedirs(PV, exist_ok=True)
    head = '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>preview</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800&display=swap"><style>body{margin:0;background:#fff;font-family:Heebo,Arial,sans-serif}</style></head><body>'
    out = [('online', hub(old_ld('online'), PHOTO))] + [(SV[sid]['slug'], service(sid, old_ld(SV[sid]['slug']), PHOTO)) for sid in P.ORDER]
    for slug, html in out:
        for bad in ('—', '–', 'מומחה', 'חינם', 'הטוב ביותר', 'הכי '):
            assert bad not in html, (slug, bad)
        open(os.path.join(P.OUT, slug + '.html'), 'w', encoding='utf8').write(html)
        pv = html.replace(PHOTO, 'yakir-about.webp')
        pv = re.sub(r'href="/online/([a-z-]+)/', r'href="\1.html', pv).replace('href="/online/"', 'href="online.html"')
        open(os.path.join(PV, slug + '.html'), 'w', encoding='utf8').write(head + pv + '</body></html>')
        print(slug, len(html))
