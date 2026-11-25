// Self test (TEST MODE ONLY). Runs every flow end to end on the real database with throwaway data, then removes it:
// checkout -> payment callback -> automatic activation -> limits and sold-out slots -> card upgrade and auto-renew consent
// -> sign-in -> profile checks and publish -> uploads -> reviews and the score formula -> removals -> claims -> sponsored
// article approval -> renewal reminders and renewal -> expiry -> admin role -> rate limits -> website check -> monthly stats.
// Test slugs never exist on the site, so real placements are never touched. No real mail is sent (outbox only).
import { Any, admin, randKey, sha256, emailHash, rate } from './common.ts';
import * as F from './flows.ts';
import { price, checkSlots, adIssues, reviewIssues } from './rules.ts';

export async function selftest(_req: Request, S0: Any): Promise<F.R> {
  if (S0.test_mode !== true) return [409, { error: 'only_in_test_mode' }];
  const started = new Date().toISOString();
  const R: Any[] = []; const ok = (name: string, pass: boolean, extra: Any = '') => { R.push({ name, pass: !!pass, extra: pass ? undefined : extra }); };
  const tag = 'st' + randKey(3);
  const T = { areas: [1, 2, 3, 4].map((i) => `${tag}-area${i}`), cities: [1, 2, 3, 4].map((i) => `${tag}-city${i}`), courts: [`${tag}-court1`, `${tag}-court2`], tools: [`${tag}-tool1`], raw: { areas: [], cities: [], courts: [], tools: [] } };
  const S: Any = { ...S0, test_mode: true, _selftest: true, _targets: T, quiet: true, noMail: true, notify: { telegram: false } };
  let ipN = 0;
  const anon = () => new Request('https://x', { method: 'POST', headers: { 'x-forwarded-for': `10.77.${Math.floor(Math.random() * 250)}.${++ipN % 250}` } });
  const auth = (tok: string) => new Request('https://x', { method: 'POST', headers: { authorization: 'Bearer ' + tok, 'x-forwarded-for': `10.78.0.${++ipN % 250}` } });
  const mail = (n: string) => `${tag}-${n}@example.com`;
  let phoneN = 0; const phone = () => '05' + String(Math.floor(10000000 + Math.random() * 89999999)).slice(0, 8) + '' ; void phoneN;
  const firmBody = (n: string, extra: Any = {}) => ({ name: `בדיקה ${tag} ${n}`, city: T.cities[0], phone: phone(), areas: [T.areas[0]], ...extra });
  const contact = (n: string) => ({ name: 'בודק אוטומטי', email: mail(n), phone: '0501234567' });
  const lastCode = async (ref: string) => {
    const { data } = await admin().from('fol_mail_log').select('html').eq('ref', ref).in('template', ['claim_code', 'review_code', 'removal_ack']).order('at', { ascending: false }).limit(1);
    const m = String(data?.[0]?.html || '').match(/letter-spacing:6px[^>]*>(\d{6})</); return m ? m[1] : '';
  };
  const mailCount = async (template: string, ref: string) => (await admin().from('fol_mail_log').select('id', { count: 'exact', head: true }).eq('template', template).eq('ref', ref)).count || 0;
  const firmOf = async (id: string) => (await admin().from('fol_firms').select('*').eq('id', id).single()).data;
  const users: string[] = []; const refs: string[] = []; const uploads: string[] = []; const emails: string[] = [];
  const track = (...x: (string | undefined | null)[]) => x.forEach((v) => v && refs.push(v));

  try {
    // ---- prices and package limits (pure) ----
    const plans: Record<string, Any> = {}; ((await admin().from('fol_plans').select('*')).data || []).forEach((p: Any) => { plans[p.id] = p; });
    const pl = price(plans.local, 1, 0.18);
    ok('price local: 990 + 18% VAT = 1168.2', pl?.net === 990 && pl?.vat === 178.2 && pl?.total === 1168.2, pl);
    ok('price regional 1990, national 3290, court 1900, tool 1500, article 1500, card 790', price(plans.regional, 1, .18)?.net === 1990 && price(plans.national, 1, .18)?.net === 3290
      && price(plans['court-page'], 1, .18)?.net === 1900 && price(plans['tool-sponsor'], 1, .18)?.net === 1500 && price(plans['sponsored-article'], 1, .18)?.net === 1500 && price(plans['card-upgrade'], 1, .18)?.net === 790);
    ok('price service provider: 350 a month x 3 = 1050', price(plans['service-provider'], 3, .18)?.net === 1050);
    ok('local: exactly 1 area in 1 city', checkSlots(plans.local, [{ area: T.areas[0], city: T.cities[0] }, { area: T.areas[1], city: T.cities[0] }], T).error === 'too_many_slots' && !!checkSlots(plans.local, [{ area: T.areas[0], city: T.cities[0] }], T).slots);
    ok('regional: up to 3 area+city pairs', !!checkSlots(plans.regional, [0, 1, 2].map((i) => ({ area: T.areas[i], city: T.cities[i] })), T).slots && checkSlots(plans.regional, [0, 1, 2, 3].map((i) => ({ area: T.areas[i], city: T.cities[i] })), T).error === 'too_many_slots');
    ok('national: 1 area, nationwide (city ignored)', checkSlots(plans.national, [{ area: T.areas[1], city: T.cities[0] }], T).slots?.[0].city === null);
    ok('unknown area / duplicate pair refused', checkSlots(plans.local, [{ area: 'nope', city: T.cities[0] }], T).error === 'area' && checkSlots(plans.regional, [{ area: T.areas[0], city: T.cities[0] }, { area: T.areas[0], city: T.cities[0] }], T).error === 'duplicate_slot');
    ok('ad text rules (superlative, expert, promise)', adIssues('המשרד הכי טוב').length > 0 && adIssues('אנחנו והכי זמינים').length > 0 && adIssues('נעזור להכין מסמכים').length === 0 && adIssues('צוות מומחים').length > 0 && adIssues('אנחנו מבטיחים הצלחה').length > 0 && adIssues('משרד שמתמחה במקרקעין').length === 0);
    ok('review moderation flags phone, link, case number', reviewIssues('', 'התקשרו 050-1234567 או www.x.co.il תיק 12345-05-20').length === 3);

    // ---- live checkout refused in test mode ----
    const [c0, b0] = await F.checkout(anon(), { plan: 'local' }, S);
    ok('real checkout refused while test mode is on', c0 === 409 && b0.error === 'test_mode_on', b0);

    // ---- a paid order through the payment callback (like Morning), new firm ----
    const f1Body = firmBody('אחד', { website: `https://${tag}-one.example.com` });
    const p1 = await F.prepareOrder(anon(), { plan: 'local', slots: [{ area: T.areas[0], city: T.cities[0] }], firm: f1Body, contact: contact('buyer1'), installments: 12 }, S, null);
    ok('order prepared with server price and 12 installments', !p1.error && p1.row.total_ils === 1168.2 && p1.row.installments === Math.min(12, Number(S.pay?.max_installments) || 1), p1.error);
    const key = randKey(24);
    const { data: o1 } = await admin().from('fol_orders').insert({ ...p1.row, status: 'pending', provider: 'morning', pay_key_hash: await sha256(key), is_test: true }).select('*').single();
    track(o1.id);
    const cb = (id: string, k: string, body: Any) => F.paid(new URL(`https://x/?step=paid&o=${id}&k=${k}`), new Request('https://x', { method: 'POST', body: JSON.stringify(body) }), S);
    const [w1] = await cb(o1.id, randKey(24), { amount: 1168.2 }); ok('callback with a wrong key refused', w1 === 404);
    const [r1, j1] = await cb(o1.id, key, { amount: 1168.2, transactionId: 'selftest', documentId: 'doc-selftest' });
    const { data: o1b } = await admin().from('fol_orders').select('*').eq('id', o1.id).single();
    const firm1 = await firmOf(o1b.firm_id); track(firm1.id);
    const yr = (new Date(firm1.plan_until).getTime() - Date.now()) / 86400e3;
    ok('callback with the right key: order paid, receipt reference kept', r1 === 200 && o1b.status === 'paid' && o1b.provider_doc === 'doc-selftest', { r1, j1 });
    ok('automatic activation: plan local, plan_until +1 year, featured area+city, extended profile on', firm1.plan === 'local' && yr > 360 && yr < 367 && firm1.featured_areas[0] === T.areas[0] && firm1.featured_cities[0] === T.cities[0] && firm1.extended_enabled === true, { plan: firm1.plan, yr });
    const { data: fu1 } = await admin().from('fol_firm_users').select('user_id,email').eq('firm_id', firm1.id);
    if (fu1?.[0]) users.push(fu1[0].user_id); emails.push(mail('buyer1'));
    ok('buyer becomes the firm owner (sign-in account created)', fu1?.length === 1 && fu1[0].email === mail('buyer1'));
    ok('confirmation email and admin notice written (outbox)', (await mailCount('order_paid', o1.id)) === 1 && (await mailCount('admin', o1.id)) >= 1);
    const { count: pc1 } = await admin().from('fol_placements').select('id', { count: 'exact', head: true }).eq('firm_id', firm1.id);
    const [r2, j2] = await cb(o1.id, key, { amount: 1168.2 });
    const { count: pc2 } = await admin().from('fol_placements').select('id', { count: 'exact', head: true }).eq('firm_id', firm1.id);
    ok('second callback changes nothing', r2 === 200 && j2.again === true && pc1 === pc2);
    const p1b = await F.prepareOrder(anon(), { plan: 'regional', slots: [{ area: T.areas[2], city: T.cities[2] }], firm: firmBody('שתיים-א'), contact: contact('buyer2') }, S, null);
    const k2 = randKey(24);
    const { data: o2 } = await admin().from('fol_orders').insert({ ...p1b.row, status: 'pending', provider: 'morning', pay_key_hash: await sha256(k2), is_test: true }).select('*').single(); track(o2.id);
    await cb(o2.id, k2, { amount: 5 });
    const { data: o2b } = await admin().from('fol_orders').select('status,firm_id').eq('id', o2.id).single();
    ok('lower amount: order goes to review, nothing activated', o2b.status === 'review' && !o2b.firm_id);
    const [d1, e1] = await F.checkoutTest(anon(), { plan: 'local', slots: [{ area: T.areas[1], city: T.cities[1] }], firm: { ...firmBody('כפול'), phone: firm1.phone }, contact: contact('dup') }, S);
    ok('same firm again (same phone): asked to claim the listing instead', d1 === 409 && e1.error === 'firm_exists', e1);

    // ---- add-ons and their limits: court page (3 firms), service providers (4 per court), tool (1) ----
    const court = T.courts[0]; const courtFirms: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const [s, b] = await F.checkoutTest(anon(), { plan: 'court-page', target: court, firm: firmBody('בית משפט ' + i), contact: contact('court' + i) }, S);
      if (s === 200) { courtFirms.push(b.result.firm); track(b.order, b.result.firm); emails.push(mail('court' + i)); }
      if (i <= 3) ok(`court page firm ${i} of 3 activated`, s === 200 && b.result.ok, b);
      else ok('court page: 4th firm refused (sold out)', s === 409 && b.error === 'sold_out', b);
    }
    const { data: inv } = await admin().rpc('fol_inventory', { p_kind: 'court' });
    ok('live inventory shows 3 taken on the court page', inv && inv[court] === 3, inv);
    for (let i = 1; i <= 5; i++) {
      const [s, b] = await F.checkoutTest(anon(), { plan: 'service-provider', target: court, months: 3, advertiser: { name: `שמאי ${tag} ${i}`, category: 'שמאי מקרקעין', phone: '0521234567', text: 'שמאות לבתי משפט' }, contact: contact('prov' + i) }, S);
      if (s === 200) track(b.order, ...(b.result.placements || []));
      if (i <= 4) ok(`service provider ${i} of 4 activated (3 months)`, s === 200, b);
      else ok('service providers: 5th refused (sold out)', s === 409 && b.error === 'sold_out', b);
    }
    const [tq1, tb1] = await F.checkoutTest(anon(), { plan: 'tool-sponsor', target: T.tools[0], firm: firmBody('כלי 1'), contact: contact('tool1') }, S);
    if (tq1 === 200) track(tb1.order, tb1.result.firm); emails.push(mail('tool1'));
    const [tq2, tb2] = await F.checkoutTest(anon(), { plan: 'tool-sponsor', target: T.tools[0], firm: firmBody('כלי 2'), contact: contact('tool2') }, S);
    ok('tool sponsor: 1 activated, 2nd refused', tq1 === 200 && tq2 === 409 && tb2.error === 'sold_out', { tb1, tb2 });
    const { data: slotsCourt } = await admin().rpc('fol_public_slots', { p_kind: 'court', p_target: court, p_test: true });
    const { data: slotsProv } = await admin().rpc('fol_public_slots', { p_kind: 'provider', p_target: court, p_test: true });
    const { data: slotsHidden } = await admin().rpc('fol_public_slots', { p_kind: 'court', p_target: court, p_test: false });
    ok('public slots: 3 court firms + 4 provider ads, all labelled "מודעה"', slotsCourt.length === 3 && slotsProv.length === 4 && [...slotsCourt, ...slotsProv].every((x: Any) => x.label === 'מודעה'), { c: slotsCourt.length, p: slotsProv.length });
    ok('test placements are hidden from the public view', slotsHidden.length === 0);
    // national: nationwide area page + home page
    const [nq, nb] = await F.checkoutTest(anon(), { plan: 'national', slots: [{ area: T.areas[3] }], firm: firmBody('ארצי'), contact: contact('nat') }, S);
    if (nq === 200) track(nb.order, nb.result.firm); emails.push(mail('nat'));
    const { data: home } = await admin().rpc('fol_public_slots', { p_kind: 'home', p_test: true });
    const { data: natArea } = await admin().rpc('fol_public_slots', { p_kind: 'listing', p_area: T.areas[3], p_test: true });
    ok('national: on the nationwide area page and the home page, labelled "משרד מקודם"', nq === 200 && home.some((x: Any) => x.firm?.name?.includes('ארצי')) && natArea.length === 1 && natArea[0].label === 'משרד מקודם', nb);
    // regional 3 pairs
    const [rq, rb] = await F.checkoutTest(anon(), { plan: 'regional', slots: [0, 1, 2].map((i) => ({ area: T.areas[i], city: T.cities[i + 1] })), firm: firmBody('אזורי'), contact: contact('reg') }, S);
    if (rq === 200) track(rb.order, rb.result.firm); emails.push(mail('reg'));
    ok('regional: 3 pairs activated', rq === 200 && rb.result.placements.length === 3, rb);
    // daily rotation: same order all day, different keys per day (fair rotation among equals)
    ok('daily rotation key on every slot', slotsCourt.every((x: Any) => /^[a-f0-9]{32}$/.test(x.rot)));

    // ---- sign-in (magic link + code) ----
    await F.login(anon(), { email: mail('buyer1') }, S);
    const { data: lm } = await admin().from('fol_mail_log').select('html').eq('template', 'login').eq('to_hash', await emailHash(mail('buyer1'))).order('at', { ascending: false }).limit(1);
    const th = String(lm?.[0]?.html || '').match(/#login=([a-f0-9]+)/)?.[1] || '';
    const [lv, lb] = await F.loginVerify(anon(), { token_hash: th });
    const tok1 = lb?.session?.access_token || '';
    ok('sign-in: email with link and code, link opens a session', lv === 200 && !!tok1, lb);
    await F.login(anon(), { email: mail('nobody') }, S);
    const { count: nob } = await admin().from('fol_mail_log').select('id', { count: 'exact', head: true }).eq('to_hash', await emailHash(mail('nobody')));
    ok('sign-in for an unknown email: same answer, nothing sent', (nob || 0) === 0);
    const [mq, mb] = await F.me(auth(tok1), S);
    ok('firm dashboard lists the firm, its placement and renewal link', mq === 200 && mb.firms.length === 1 && mb.firms[0].placements[0]?.renew?.includes('#renew='), mb.firms?.length);

    // ---- card upgrade with and without auto-renew consent; cancel from the dashboard ----
    const [cq, cbd] = await F.checkoutTest(auth(tok1), { plan: 'card-upgrade', firm_slug: firm1.slug, contact: contact('buyer1'), auto_renew: true, auto_renew_consent: true }, S);
    if (cq === 200) track(cbd.order);
    const f1c = await firmOf(firm1.id);
    const { data: cpl } = await admin().from('fol_placements').select('*').eq('id', cbd.result?.placements?.[0] || '00000000-0000-0000-0000-000000000000').maybeSingle();
    ok('card upgrade: extended profile, "other firms" block hidden, no top slot', cq === 200 && f1c.hide_others === true && f1c.extended_enabled === true && f1c.plan === 'local' && cpl?.area_slug === null, { cq, cbd });
    ok('auto-renew saved only with the consent box', cpl?.auto_renew === true && !!cpl?.auto_renew_consent_at);
    const [nc] = await F.checkoutTest(anon(), { plan: 'card-upgrade', firm_slug: firm1.slug, contact: contact('buyer1') }, S);
    ok('card upgrade for an existing listing needs its signed-in owner', nc === 401);
    const [xq] = await F.autoRenewCancel(auth(tok1), { placement: cpl?.id });
    const { data: cpl2 } = await admin().from('fol_placements').select('auto_renew,auto_renew_cancelled_at').eq('id', cpl?.id).single();
    ok('auto-renew cancelled from the dashboard', xq === 200 && cpl2.auto_renew === false && !!cpl2.auto_renew_cancelled_at);
    const [cq2, cb2] = await F.checkoutTest(auth(tok1), { plan: 'court-page', target: T.courts[1], firm_slug: firm1.slug, contact: contact('buyer1'), auto_renew: true }, S);
    if (cq2 === 200) track(cb2.order);
    const { data: cpl3 } = await admin().from('fol_placements').select('auto_renew').eq('id', cb2.result?.placements?.[0] || '00000000-0000-0000-0000-000000000000').maybeSingle();
    ok('auto-renew without the consent box stays off', cq2 === 200 && cpl3?.auto_renew === false, cb2);

    // ---- extended profile: automatic checks, publish, admin unpublish ----
    const bad = { description: 'משרד עם צוות מומחים, אנחנו מבטיחים תוצאות והכי טובים בעיר שלנו ובכל הארץ.', whatsapp: '0521234567', languages: ['עברית', 'קלינגונית'], hours: { sun: '09:00-18:00' } };
    const [ps1, pb1] = await F.profileSave(auth(tok1), { firm: firm1.id, data: bad }, true, S);
    ok('profile with forbidden words is not published (3 issues)', ps1 === 200 && pb1.published === false && pb1.issues.length >= 3, pb1);
    const good = { ...bad, description: 'משרד שמתמחה בעסקאות מקרקעין ובליווי רוכשי דירות, עם פגישות במשרד ובזום — בשפה פשוטה.' };
    const [ps2, pb2] = await F.profileSave(auth(tok1), { firm: firm1.id, data: good }, true, S);
    const f1p = await firmOf(firm1.id);
    ok('clean profile published automatically, with the paid label and dashes normalized', ps2 === 200 && pb2.published === true && f1p.extended.label === 'משרד מקודם' && !/[–—]/.test(f1p.extended.description) && f1p.extended.languages.length === 1, pb2);
    // ---- uploads ----
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const [u1, ub1] = await F.upload(auth(tok1), { firm: firm1.id, kind: 'logo', data: png }, S); if (ub1.path) uploads.push(ub1.path);
    const [u2, ub2] = await F.upload(auth(tok1), { firm: firm1.id, kind: 'logo', data: btoa('<script>alert(1)</script>') }, S);
    const [u3] = await F.upload(auth(tok1), { firm: firm1.id, kind: 'logo', data: btoa('x'.repeat(600 * 1024)) }, S);
    ok('upload: real PNG accepted to the public bucket; fake image 415; too big 413', u1 === 200 && ub1.url.includes('/fol-public/firms/') && u2 === 415 && u3 === 413, { u1, u2, u3, ub2 });
    const [ps3, pb3] = await F.profileSave(auth(tok1), { firm: firm1.id, data: { ...good, logo: ub1.url } }, true, S);
    ok('logo from the upload kept in the profile', ps3 === 200 && pb3.extended?.logo === ub1.url);
    const [ps4, pb4] = await F.profileSave(auth(tok1), { firm: firm1.id, data: { ...good, logo: 'https://evil.example.com/x.png' } }, false, S);
    ok('outside image address refused', ps4 === 200 && pb4.issues.length > 0 && pb4.data.logo === '');

    // ---- reviews: invite, code, publish, score formula, moderation, reply ----
    const [iv, ib] = await F.inviteCreate(auth(tok1), { firm: firm1.id }, S);
    const inviteTok = String(ib.link || '').split('#invite=')[1] || '';
    ok('review invite link created', iv === 200 && inviteTok.length === 32);
    const revBody = 'קיבלתי ליווי מסודר בעסקה, הכול הוסבר בזמן ובשפה ברורה. מרוצה מאוד מהשירות.';
    const [rs1, rb1] = await F.reviewStart(anon(), { firm: firm1.slug, rating: 5, title: 'ליווי טוב', body: revBody, name: 'דנה כהן', email: mail('rev1'), consent: true, invite: inviteTok }, S);
    track(rb1.id); emails.push(mail('rev1'));
    const [rv1, rvb1] = await F.reviewVerify(anon(), { id: rb1.id, code: await lastCode(rb1.id) }, S);
    const f1r = await firmOf(firm1.id);
    ok('review verified by code and published', rs1 === 200 && rv1 === 200 && rvb1.status === 'published', { rb1, rvb1 });
    ok('score formula: one fresh 5 = (3x4.0 + 5) / 4 = 4.25', Math.abs(Number(f1r.rank_score) - 4.25) < 0.002 && f1r.review_count === 1 && Number(f1r.review_avg) === 5, f1r.rank_score);
    const [ri] = await F.reviewStart(anon(), { firm: firm1.slug, rating: 4, body: revBody, name: 'רון לוי', email: mail('rev9'), consent: true, invite: inviteTok }, S);
    ok('used invite cannot be used again', ri === 400);
    // the same review on a free listing gets the same score: payment is not an input
    const { data: freeF } = await admin().from('fol_firms').insert({ slug: `${tag}-free`, name: `בדיקה ${tag} חינם`, phone: phone(), source: 'public', is_test: true }).select('*').single(); track(freeF.id);
    const [fs1, fb1] = await F.reviewStart(anon(), { firm: freeF.slug, rating: 5, title: 'ליווי טוב', body: revBody, name: 'דנה כהן', email: mail('rev1'), consent: true }, S); track(fb1.id);
    await F.reviewVerify(anon(), { id: fb1.id, code: await lastCode(fb1.id) }, S);
    ok('paid and free firm with the same review get the same score', fs1 === 200 && Number((await firmOf(freeF.id)).rank_score) === Number(f1r.rank_score));
    const [rd] = await F.reviewStart(anon(), { firm: firm1.slug, rating: 1, body: revBody, name: 'דנה כהן', email: mail('rev1'), consent: true }, S);
    ok('second review by the same email within a year refused', rd === 409);
    const [rw, rwb] = await F.reviewStart(anon(), { firm: firm1.slug, rating: 5, body: 'זה המשרד הכי טוב שהכרתי בכל השנים, ממליץ בחום לכולם.', name: 'אבי', email: mail('rev2'), consent: true }, S);
    ok('review with words the site never prints: asked to rephrase', rw === 400 && rwb.error === 'words');
    const [rh, rhb] = await F.reviewStart(anon(), { firm: firm1.slug, rating: 2, body: 'לא חזרו אליי. אפשר לבדוק בטלפון 050-7654321 מה קרה עם התיק שלי.', name: 'מיכל', email: mail('rev3'), consent: true }, S); track(rhb.id);
    const [, rhv] = await F.reviewVerify(anon(), { id: rhb.id, code: await lastCode(rhb.id) }, S);
    ok('review with a phone number held for moderation (not published)', rh === 200 && rhv.status === 'held');
    const [rv0] = await F.reviewVerify(anon(), { id: rhb.id, code: '000000' }, S);
    ok('wrong or reused code refused', rv0 === 400);
    const { data: pubRev } = await admin().from('fol_reviews').select('id').eq('firm_id', firm1.id).eq('status', 'published').limit(1);
    const [rp1, rpb1] = await F.reply(auth(tok1), { review: pubRev?.[0]?.id, text: 'תודה, אנחנו הכי שמחים לעזור' });
    const [rp2] = await F.reply(auth(tok1), { review: pubRev?.[0]?.id, text: 'תודה רבה על המילים, שמחנו ללוות אתכם.' });
    ok('firm reply: forbidden words refused, clean reply saved', rp1 === 400 && rpb1.error === 'rules' && rp2 === 200);

    // ---- removal / fix requests ----
    const { data: remF } = await admin().from('fol_firms').insert({ slug: `${tag}-rem`, name: `בדיקה ${tag} הסרה`, phone: phone(), website: `https://${tag}-rem.example.com`, source: 'public', is_test: true }).select('*').single(); track(remF.id);
    const [rm1, rmb1] = await F.removal(anon(), { firm: remF.slug, type: 'remove', name: 'בעל המשרד', email: `owner@${tag}-rem.example.com` }, S); track(rmb1.id); emails.push(`owner@${tag}-rem.example.com`);
    ok('removal request acknowledged at once by email', rm1 === 200 && (await mailCount('removal_ack', rmb1.id)) === 1);
    const [rmv1, rmvb1] = await F.removalVerify(anon(), { id: rmb1.id, code: await lastCode(rmb1.id) }, S);
    ok('verified owner (email on the firm domain): listing hidden automatically', rmv1 === 200 && rmvb1.hidden === true && (await firmOf(remF.id)).status === 'hidden', rmvb1);
    const [rm2, rmb2] = await F.removal(anon(), { firm: firm1.slug, type: 'fix', name: 'מישהו', email: mail('other') }, S); track(rmb2.id); emails.push(mail('other'));
    await F.removalVerify(anon(), { id: rmb2.id, code: await lastCode(rmb2.id) }, S);
    const { data: rq2 } = await admin().from('fol_removals').select('status,due_at').eq('id', rmb2.id).single();
    const dueH = (new Date(rq2.due_at).getTime() - Date.now()) / 3600e3;
    ok('other requests go to the admin queue with a 48 hour target', rm2 === 200 && rq2.status === 'verified' && dueH > 47 && dueH <= 48.1, rq2);

    // ---- claim an existing listing ----
    const { data: clF } = await admin().from('fol_firms').insert({ slug: `${tag}-claim`, name: `בדיקה ${tag} בעלות`, phone: phone(), website: `https://www.${tag}-claim.example.com`, source: 'public', is_test: true }).select('*').single(); track(clF.id);
    const [cs1, csb1] = await F.claimStart(anon(), { firm: clF.slug, name: 'עורכת הדין', email: `office@${tag}-claim.example.com` }, S); track(csb1.id); emails.push(`office@${tag}-claim.example.com`);
    const [cv1, cvb1] = await F.claimVerify(anon(), { id: csb1.id, code: await lastCode(csb1.id) }, S);
    const { data: clU } = await admin().from('fol_firm_users').select('user_id').eq('firm_id', clF.id); clU?.forEach((x: Any) => users.push(x.user_id));
    ok('claim with an email on the firm domain: approved automatically and signed in', cs1 === 200 && csb1.auto === true && cv1 === 200 && cvb1.approved === true && !!cvb1.session?.access_token && (clU || []).length === 1, cvb1);
    const [cs2, csb2] = await F.claimStart(anon(), { firm: clF.slug, name: 'מישהו אחר', email: mail('claim2') }, S);
    ok('a claimed listing cannot be claimed again', cs2 === 409 && csb2.error === 'claimed');
    const { data: clF2 } = await admin().from('fol_firms').insert({ slug: `${tag}-claim2`, name: `בדיקה ${tag} בעלות 2`, phone: phone(), website: `https://${tag}-c2.example.com`, source: 'public', is_test: true }).select('*').single(); track(clF2.id);
    const [, csb3] = await F.claimStart(anon(), { firm: clF2.slug, name: 'עורך דין', email: mail('claim3') }, S); track(csb3.id); emails.push(mail('claim3'));
    const [cv3, cvb3] = await F.claimVerify(anon(), { id: csb3.id, code: await lastCode(csb3.id) }, S);
    ok('claim from another email: verified, waits for the admin', cv3 === 200 && cvb3.approved === false);

    // ---- sponsored article: brief -> draft -> firm approval link -> published with the label ----
    const [aq, ab] = await F.checkoutTest(auth(tok1), { plan: 'sponsored-article', firm_slug: firm1.slug, brief: { topic: 'מה בודקים לפני חתימה על חוזה דירה', area: T.areas[0], points: 'נסח טאבו, היתרים' }, contact: contact('buyer1') }, S);
    const spId = ab?.result?.sponsored; track(ab.order, spId);
    ok('sponsored article: paid, brief saved for the content pipeline', aq === 200 && !!spId, ab);
    const longMd = ('## לפני החתימה\n\nבודקים נסח טאבו, היתרים וחובות לרשות המקומית. ').repeat(8);
    const [sr1] = await F.sponsoredReady(S, spId, 'המדריך הכי חשוב לקונים', longMd);
    const [sr2, srb2] = await F.sponsoredReady(S, spId, 'מה בודקים לפני חתימה על חוזה דירה', longMd);
    const appr = String(srb2.link || '').split('#approve=')[1] || '';
    ok('draft with forbidden words refused; clean draft sent to the firm for approval', sr1 === 400 && sr2 === 200 && (await mailCount('article_approval', spId)) === 1, srb2);
    const [sv] = await F.sponsoredView({ approve: appr });
    const [sd, sdb] = await F.sponsoredDecide({ approve: appr, decision: 'approve' }, S);
    const { data: spub } = await admin().rpc('fol_public_sponsored', { p_slug: sdb.slug, p_test: true });
    ok('firm approves by link: published with the "תוכן ממומן" box', sv === 200 && sd === 200 && sdb.status === 'published' && spub?.[0]?.label === 'תוכן ממומן', sdb);
    const [sd2] = await F.sponsoredDecide({ approve: appr, decision: 'approve' }, S);
    ok('approval link works once', sd2 === 404);

    // ---- renewal reminders (30 / 7), renewal by link, expiry ----
    const { data: lp } = await admin().from('fol_placements').select('*').eq('firm_id', firm1.id).eq('kind', 'listing').is('target', null).single();
    await admin().from('fol_placements').update({ ends_at: new Date(Date.now() + 29.5 * 86400e3).toISOString(), reminders: {} }).eq('id', lp.id);
    await F.daily(S);
    await F.daily(S);
    ok('30 days before the end: one reminder with a renewal link (not repeated)', (await mailCount('renew_30', lp.id)) === 1);
    await admin().from('fol_placements').update({ ends_at: new Date(Date.now() + 6 * 86400e3).toISOString() }).eq('id', lp.id);
    await F.daily(S);
    ok('7 days before the end: second reminder', (await mailCount('renew_7', lp.id)) === 1);
    const { data: lp1 } = await admin().from('fol_placements').select('*').eq('id', lp.id).single();
    const rlink = await F.renewLink(S, lp1); const rtok = rlink.split('#renew=')[1];
    const [ri1, rib1] = await F.renewInfo({ renew: rtok }, S);
    ok('renewal link shows the product and the server price', ri1 === 200 && rib1.price?.total === 1168.2, rib1);
    const [rr, rrb] = await F.checkoutTest(anon(), { renew: rtok, contact: contact('buyer1') }, S); track(rrb.order);
    const { data: lp2 } = await admin().from('fol_placements').select('*').eq('id', lp.id).single();
    const addDays = (new Date(lp2.ends_at).getTime() - new Date(lp1.ends_at).getTime()) / 86400e3;
    ok('renewal continues from the current end date (+1 year), reminders reset', rr === 200 && addDays > 360 && addDays < 367 && Object.keys(lp2.reminders || {}).length === 0, { rr, rrb, addDays });
    const [ri2] = await F.renewInfo({ renew: rtok }, S);
    ok('an old renewal link stops working after renewal', ri2 === 400);
    await admin().from('fol_placements').update({ ends_at: new Date(Date.now() - 60e3).toISOString() }).in('firm_id', [firm1.id]).eq('kind', 'listing').is('target', null);
    await F.daily(S);
    const f1e = await firmOf(firm1.id);
    const { data: lp3 } = await admin().from('fol_placements').select('status').eq('id', lp.id).single();
    ok('expiry: placement ended, firm back to free, top position removed, card upgrade kept', lp3.status === 'expired' && f1e.plan === 'free' && f1e.featured_areas.length === 0 && f1e.hide_others === true, { plan: f1e.plan });
    ok('end-of-period email with a renewal link', (await mailCount('renew_0', lp.id)) === 1);

    // ---- admin role ----
    const [ad0] = await F.adminOp(auth(tok1), { op: 'overview' }, S);
    ok('a firm owner cannot open the admin area', ad0 === 403);
    const aEmail = mail('admin');
    const { data: au } = await admin().auth.admin.createUser({ email: aEmail, email_confirm: true, user_metadata: { app: 'folivus', selftest: true } });
    if (au?.user) { users.push(au.user.id); await admin().from('fol_admins').insert({ user_id: au.user.id, email: aEmail }); }
    const sess = await F.sessionFor(aEmail);
    const [ad1, adb1] = await F.adminOp(auth(sess?.access_token || ''), { op: 'overview' }, S);
    ok('admin overview works for the admin role', ad1 === 200 && adb1.test_mode === true, adb1);
    const [ad2, adb2] = await F.adminOp(auth(sess?.access_token || ''), { op: 'orders' }, S);
    ok('admin sees orders', ad2 === 200 && adb2.rows.some((x: Any) => x.id === o1.id));
    const [ad3] = await F.adminOp(auth(sess?.access_token || ''), { op: 'claim_approve', id: csb3.id }, S);
    ok('admin approves a waiting claim', ad3 === 200 && (await admin().from('fol_claims').select('status').eq('id', csb3.id).single()).data.status === 'approved');
    const { data: c3u } = await admin().from('fol_firm_users').select('user_id').eq('firm_id', clF2.id); c3u?.forEach((x: Any) => users.push(x.user_id));
    const [ad4] = await F.adminOp(auth(sess?.access_token || ''), { op: 'profile_unpublish', id: firm1.id }, S);
    ok('admin can unpublish a profile', ad4 === 200 && Object.keys((await firmOf(firm1.id)).extended || {}).length === 0);
    const [ad5] = await F.adminOp(auth(sess?.access_token || ''), { op: 'settings_set', key: 'secret_thing', value: 1 }, S);
    ok('admin settings: only known keys can be changed', ad5 === 400);

    // ---- rate limit, website check, monthly stats ----
    const rk = 'st-' + tag;
    ok('rate limit stops the 3rd call when the limit is 2', (await rate(rk, rk, 2)) && (await rate(rk, rk, 2)) && !(await rate(rk, rk, 2)));
    await admin().from('fol_audit').delete().eq('action', 'rl:' + rk);
    await admin().from('fol_firms').update({ website: `https://${tag}.invalid` }).eq('id', freeF.id);
    const sc = await F.siteCheck(5, [freeF.id]);
    ok('website check marks a site that does not answer', sc.broken === 1 && (await firmOf(freeF.id)).site_ok === false, sc);
    await admin().rpc('fol_track', { p_slug: firm1.slug, p_event: 'views' }); await admin().rpc('fol_track', { p_slug: firm1.slug, p_event: 'phone' });
    const { data: today } = await admin().from('fol_stats_daily').select('*').eq('firm_id', firm1.id);
    ok('privacy-safe counters: daily totals only', today?.length === 1 && today[0].views === 1 && today[0].phone === 1 && Object.keys(today[0]).length === 6);
    const lastMonth = new Date(); lastMonth.setDate(1); lastMonth.setMonth(lastMonth.getMonth() - 1); lastMonth.setDate(10);
    await admin().from('fol_stats_daily').insert({ firm_id: firm1.id, day: lastMonth.toISOString().slice(0, 10), views: 42, phone: 7, website: 3, whatsapp: 2 });
    const ms = await F.monthlyStats(S, new Date(), true, firm1.id);
    const { data: mm } = await admin().from('fol_mail_log').select('html').eq('template', 'monthly').eq('ref', firm1.id).order('at', { ascending: false }).limit(1);
    ok('monthly stats email to the paid firm with last month numbers', (ms as Any).sent >= 1 && String(mm?.[0]?.html || '').includes('>42<'), ms);

    // ---- mail safety ----
    const { count: sentReal } = await admin().from('fol_mail_log').select('id', { count: 'exact', head: true }).gte('at', started).eq('status', 'sent');
    ok('no real email was sent during the test (all in the outbox)', (sentReal || 0) === 0);
  } catch (e) {
    ok('no crash', false, String((e as Error)?.stack || e).slice(0, 600));
  } finally {
    // ---- clean up everything this run made ----
    const { data: tf } = await admin().from('fol_firms').select('id').ilike('name', `%${tag}%`);
    const firmIds = (tf || []).map((x: Any) => x.id);
    if (firmIds.length) {
      const { data: fu } = await admin().from('fol_firm_users').select('user_id').in('firm_id', firmIds); (fu || []).forEach((x: Any) => users.push(x.user_id));
    }
    const { data: to } = await admin().from('fol_orders').select('id,firm_id').ilike('email', `${tag}-%`);
    const orderIds = (to || []).map((x: Any) => x.id);
    const { data: tp } = await admin().from('fol_placements').select('id').or(`order_id.in.(${orderIds.join(',') || '00000000-0000-0000-0000-000000000000'}),target.ilike.${tag}%`);
    const plIds = (tp || []).map((x: Any) => x.id);
    if (plIds.length) await admin().from('fol_placements').delete().in('id', plIds);
    if (orderIds.length) await admin().from('fol_orders').delete().in('id', orderIds);
    await admin().from('fol_claims').delete().ilike('firm_slug', `${tag}%`);
    await admin().from('fol_removals').delete().ilike('firm_slug', `${tag}%`);
    await admin().from('fol_removals').delete().in('firm_id', firmIds.length ? firmIds : ['00000000-0000-0000-0000-000000000000']);
    if (firmIds.length) await admin().from('fol_firms').delete().in('id', firmIds);
    const allRefs = [...refs, ...plIds, ...orderIds, ...firmIds];
    await admin().from('fol_codes').delete().in('ref_id', allRefs.filter((x) => /^[0-9a-f-]{36}$/.test(x)));
    await admin().from('fol_mail_log').delete().in('ref', allRefs);
    const hashes = await Promise.all([...new Set(emails.concat([mail('buyer1'), mail('admin'), mail('nobody')]))].map((e) => emailHash(e)));
    await admin().from('fol_mail_log').delete().gte('at', started).in('to_hash', hashes);
    await admin().from('fol_mail_log').delete().gte('at', started).eq('to_hash', 'none').eq('is_test', true).in('ref', ['sla', ...allRefs]);
    if (uploads.length) await admin().storage.from('fol-public').remove(uploads);
    for (const u of [...new Set(users)]) { await admin().from('fol_admins').delete().eq('user_id', u); await admin().auth.admin.deleteUser(u).catch(() => null); }
    const { count: left } = await admin().from('fol_firms').select('id', { count: 'exact', head: true }).ilike('name', `%${tag}%`);
    ok('all test data removed (firms, orders, placements, users, files)', (left || 0) === 0);
    await admin().from('fol_audit').insert({ action: 'selftest', detail: { tag, pass: R.filter((x) => x.pass).length, fail: R.filter((x) => !x.pass).length } });
  }
  return [200, { ok: R.every((x) => x.pass), passed: R.filter((x) => x.pass).length, total: R.length, steps: R }];
}
