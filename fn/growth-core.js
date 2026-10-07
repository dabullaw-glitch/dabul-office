function start(D) {
  const { loadSecrets, json, cors, admin, env } = D;
  const SITE = "https://dabullaw.co.il";
  const OFFICE = { name: "\u05D9\u05E7\u05D9\u05E8 \u05D3\u05D1\u05D5\u05DC - \u05DE\u05E9\u05E8\u05D3 \u05E2\u05D5\u05E8\u05DB\u05D9 \u05D3\u05D9\u05DF", lawyer: "\u05E2\u05D5\u05F4\u05D3 \u05D9\u05E7\u05D9\u05E8 \u05D3\u05D1\u05D5\u05DC", address: "\u05E8\u05D6\u05D9\u05D0\u05DC 1, \u05E0\u05EA\u05E0\u05D9\u05D4", phone: "09-8613413", wa: "050-5580189" };
  const C = { accent: "#8c7646", ink: "#141414", fg: "#1f2937", muted: "#6b7280", soft: "#ecedf2", border: "#e2e0da", gold: "#e4d19c" };
  const CONSENT_V = "c1-2026-10";
  const CONSENT_TEXT = "\u05D0\u05E0\u05D9 \u05DE\u05D0\u05E9\u05E8/\u05EA \u05DC\u05E7\u05D1\u05DC \u05DE\u05D9\u05E7\u05D9\u05E8 \u05D3\u05D1\u05D5\u05DC - \u05DE\u05E9\u05E8\u05D3 \u05E2\u05D5\u05E8\u05DB\u05D9 \u05D3\u05D9\u05DF \u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD, \u05DE\u05D0\u05DE\u05E8\u05D9\u05DD \u05D5\u05D4\u05D6\u05DE\u05E0\u05D5\u05EA \u05DC\u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9\u05D9\u05DD \u05D1\u05D3\u05D5\u05D0\u05E8 \u05D0\u05DC\u05E7\u05D8\u05E8\u05D5\u05E0\u05D9, \u05DB\u05D5\u05DC\u05DC \u05D3\u05D1\u05E8\u05D9 \u05E4\u05E8\u05E1\u05D5\u05DE\u05EA. \u05D0\u05E4\u05E9\u05E8 \u05DC\u05D4\u05E1\u05D9\u05E8 \u05D0\u05EA \u05E2\u05E6\u05DE\u05D9 \u05D1\u05DB\u05DC \u05E2\u05EA \u05D1\u05DC\u05D7\u05D9\u05E6\u05D4 \u05E2\u05DC \u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05E9\u05D1\u05EA\u05D7\u05EA\u05D9\u05EA \u05DB\u05DC \u05DE\u05D9\u05D9\u05DC.";
  const MAGNETS = {
    "buyer-checklist": { title: "\u05E6'\u05E7\u05DC\u05D9\u05E1\u05D8 \u05DC\u05E4\u05E0\u05D9 \u05E9\u05E7\u05D5\u05E0\u05D9\u05DD \u05D3\u05D9\u05E8\u05D4 \u05D9\u05D3 \u05E9\u05E0\u05D9\u05D9\u05D4", path: "magnets/buyer-checklist.pdf" },
    // the updates list: regular guides, explanations and new rulings; the checklist is a joining gift
    "updates": { title: "\u05E6'\u05E7\u05DC\u05D9\u05E1\u05D8 \u05DC\u05E4\u05E0\u05D9 \u05E9\u05E7\u05D5\u05E0\u05D9\u05DD \u05D3\u05D9\u05E8\u05D4 \u05D9\u05D3 \u05E9\u05E0\u05D9\u05D9\u05D4", path: "magnets/buyer-checklist.pdf" }
  };
  const TOPICS = { realestate: "\u05E7\u05E0\u05D9\u05D9\u05D4 \u05D5\u05DE\u05DB\u05D9\u05E8\u05D4 \u05E9\u05DC \u05D3\u05D9\u05E8\u05D5\u05EA", renewal: "\u05D4\u05EA\u05D7\u05D3\u05E9\u05D5\u05EA \u05E2\u05D9\u05E8\u05D5\u05E0\u05D9\u05EA \u05D5\u05D1\u05EA\u05D9\u05DD \u05DE\u05E9\u05D5\u05EA\u05E4\u05D9\u05DD", tax: "\u05DE\u05D9\u05E1\u05D5\u05D9 \u05DE\u05E7\u05E8\u05E7\u05E2\u05D9\u05DF", insolvency: "\u05D7\u05D5\u05D1\u05D5\u05EA \u05D5\u05D7\u05D3\u05DC\u05D5\u05EA \u05E4\u05D9\u05E8\u05E2\u05D5\u05DF", family: "\u05E6\u05D5\u05D5\u05D0\u05D5\u05EA, \u05D9\u05E8\u05D5\u05E9\u05D5\u05EA \u05D5\u05D9\u05D9\u05E4\u05D5\u05D9 \u05DB\u05D5\u05D7 \u05DE\u05EA\u05DE\u05E9\u05DA" };
  const BANNED = /הטוב(?:ים|ה|ות)? ביותר|הכי טוב|מקסימלי|מומחה|מומחים|חינם|ללא עלות|ללא תשלום|הנחה של|הנחות|מבצע מיוחד|מבצעים|אחוזי הצלחה|מבטיח|מובטח|מוביל(?:ים|ה)? בתחום|מספר 1|שכר טרחה|שכ[״"]ט|ייעוץ ראשוני/;
  const hasMagnet = (k) => Object.prototype.hasOwnProperty.call(MAGNETS, k);
  const DASH = /\s*[—–]\s*/g;
  const db = () => admin().from("docs");
  const getDoc = async (coll, id) => {
    const { data } = await db().select("data").match({ coll, id }).maybeSingle();
    return data ? data.data : null;
  };
  const merge = (coll, id, patch) => admin().rpc("docs_merge", { p_coll: coll, p_id: id, p_patch: patch });
  const all = async (coll) => {
    const out = [];
    for (let from = 0; ; from += 1e3) {
      const { data } = await db().select("id,data").eq("coll", coll).order("id").range(from, from + 999);
      out.push(...data || []);
      if (!data || data.length < 1e3) break;
    }
    return out;
  };
  const tok = () => crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const self = () => `${env("SUPABASE_URL")}/functions/v1/growth`;
  const pub = (a, t) => `${(env("PUBLIC_PAGE_BASE") || "https://dabullaw-glitch.github.io/dabul-office/portal.html").replace(/#.*$/, "")}#g=${a}&t=${t}`;
  const FORMJS = `<script>document.addEventListener('submit',function(e){var f=e.target;if(!f||String(f.method).toLowerCase()!=='post'||!f.getAttribute('action'))return;e.preventDefault();var b=f.querySelector('button[type=submit]');if(b){b.disabled=true;b.textContent='\u05E8\u05D2\u05E2...';}fetch(f.getAttribute('action'),{method:'POST',body:new URLSearchParams(new FormData(f))}).then(function(r){return r.text();}).then(function(t){document.open();document.write(t);document.close();window.scrollTo(0,0);}).catch(function(){if(b){b.disabled=false;b.textContent='\u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1';}});});<\/script>`;
  const ilNow = () => new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const nis = (n) => "\u20AA" + Math.round(n).toLocaleString("en-US");
  const HE_MONTHS = ["\u05D9\u05E0\u05D5\u05D0\u05E8", "\u05E4\u05D1\u05E8\u05D5\u05D0\u05E8", "\u05DE\u05E8\u05E5", "\u05D0\u05E4\u05E8\u05D9\u05DC", "\u05DE\u05D0\u05D9", "\u05D9\u05D5\u05E0\u05D9", "\u05D9\u05D5\u05DC\u05D9", "\u05D0\u05D5\u05D2\u05D5\u05E1\u05D8", "\u05E1\u05E4\u05D8\u05DE\u05D1\u05E8", "\u05D0\u05D5\u05E7\u05D8\u05D5\u05D1\u05E8", "\u05E0\u05D5\u05D1\u05DE\u05D1\u05E8", "\u05D3\u05E6\u05DE\u05D1\u05E8"];
  async function tg(text, buttons) {
    const token = env("TELEGRAM_BOT_TOKEN"), chat = env("TELEGRAM_CHAT_ID");
    if (!token || !chat) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4e3), disable_web_page_preview: true, reply_markup: buttons ? { inline_keyboard: buttons } : void 0 })
    }).catch(() => null);
  }
  function page(title, body, status = 200) {
    return new Response(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;background:${C.soft};font-family:Assistant,Arial,sans-serif;color:${C.fg};line-height:1.7}main{max-width:560px;margin:40px auto;padding:32px 24px;background:#fff;border:1px solid ${C.border};border-radius:14px}
h1{color:${C.ink};font-size:1.6rem;margin:0 0 12px}a.btn,button{display:inline-block;background:${C.gold};color:${C.ink};border:0;border-radius:10px;padding:14px 22px;font-size:1.05rem;font-weight:700;text-decoration:none;cursor:pointer;font-family:inherit}
.muted{color:${C.muted};font-size:.9rem}.top{color:#fff;background:${C.ink};margin:-32px -24px 22px;padding:16px 24px;border-radius:14px 14px 0 0;border-bottom:3px solid ${C.gold};font-weight:700;letter-spacing:.02em}</style></head>
<body><main><div class="top">${esc(OFFICE.name)}</div><h1>${esc(title)}</h1>${body}</main>${FORMJS}</body></html>`, { status, headers: { ...cors, "content-type": "text/html; charset=utf-8" } });
  }
  async function quota(want) {
    const cfg = await getDoc("settings", "growth") || {};
    const cap = Number(cfg.newsletter?.dailyCap || 95);
    const day = ymd(ilNow());
    const q = await getDoc("nlstate", "quota") || {};
    const used = q.day === day ? Number(q.used || 0) : 0;
    return { day, used, left: Math.max(0, cap - used), take: Math.min(want, Math.max(0, cap - used)) };
  }
  async function spend(n) {
    if (!n) return;
    const q = await quota(0);
    await db().upsert({ coll: "nlstate", id: "quota", data: { day: q.day, used: q.used + n }, updated_at: (/* @__PURE__ */ new Date()).toISOString() });
  }
  const emailReady = () => !!(env("RESEND_API_KEY") && env("NL_FROM"));
  function unsubHeaders(t) {
    const u = `${self()}?a=unsub&t=${t}`;
    return { "List-Unsubscribe": `<${u}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  }
  async function sendEmails(msgs) {
    if (!emailReady() || !msgs.length) return { ok: 0, failed: msgs.map((m) => m.to), rejected: [] };
    const q = await quota(msgs.length);
    if (q.take < msgs.length) return { ok: 0, failed: msgs.map((m) => m.to), rejected: [] };
    const payload = msgs.map((m) => ({ from: env("NL_FROM"), to: [m.to], reply_to: env("NL_REPLY_TO") || void 0, subject: m.subject, html: m.html, text: m.text, headers: unsubHeaders(m.t) }));
    const r = await fetch("https://api.resend.com/emails/batch", { method: "POST", headers: { authorization: `Bearer ${env("RESEND_API_KEY")}`, "content-type": "application/json", "x-batch-validation": "permissive" }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("resend", r.status, JSON.stringify(j).slice(0, 300));
      return { ok: 0, failed: msgs.map((m) => m.to), rejected: [] };
    }
    const rejected = (j.errors || []).map((e) => msgs[Number(e.index)]?.to).filter(Boolean);
    const ok = msgs.length - rejected.length;
    await spend(ok);
    return { ok, failed: [], rejected };
  }
  function shell(inner, t, pre = "", isAd = true) {
    const unsub2 = pub("unsub", t);
    return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.soft}"><span style="display:none;max-height:0;overflow:hidden">${esc(pre)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${C.border};border-radius:14px;font-family:Arial,Helvetica,sans-serif;color:${C.fg};direction:rtl;text-align:right">
<tr><td style="padding:22px 28px;background:${C.ink};border-radius:14px 14px 0 0;border-bottom:3px solid ${C.gold}"><div style="font-size:20px;font-weight:bold;color:#ffffff">${esc(OFFICE.name)}</div><div style="font-size:13px;color:${C.gold}">\u05DE\u05E7\u05E8\u05E7\u05E2\u05D9\u05DF, \u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05E0\u05D3\u05DC\u05F4\u05DF \u05D5\u05D4\u05EA\u05D7\u05D3\u05E9\u05D5\u05EA \u05E2\u05D9\u05E8\u05D5\u05E0\u05D9\u05EA \xB7 \u05E0\u05EA\u05E0\u05D9\u05D4 \u05D5\u05D4\u05E9\u05E8\u05D5\u05DF</div></td></tr>
<tr><td style="padding:26px 28px;font-size:16px;line-height:1.75">${inner}</td></tr>
<tr><td style="padding:18px 28px;background:${C.soft};border-radius:0 0 14px 14px;font-size:12px;line-height:1.7;color:${C.muted}">
${isAd ? "\u05E7\u05D9\u05D1\u05DC\u05EA \u05D0\u05EA \u05D4\u05DE\u05D9\u05D9\u05DC \u05D4\u05D6\u05D4 \u05DB\u05D9 \u05E0\u05E8\u05E9\u05DE\u05EA \u05DC\u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD \u05E9\u05DC \u05D4\u05DE\u05E9\u05E8\u05D3 \u05D1\u05D0\u05EA\u05E8 dabullaw.co.il. " : ""}${esc(OFFICE.name)}, ${esc(OFFICE.address)}, \u05D8\u05DC\u05E4\u05D5\u05DF ${esc(OFFICE.phone)}, <a href="${SITE}" style="color:${C.accent}">dabullaw.co.il</a>.<br>
\u05DC\u05D4\u05E1\u05E8\u05D4 \u05DE\u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05EA\u05E4\u05D5\u05E6\u05D4: <a href="${unsub2}" style="color:${C.accent}">\u05DC\u05D7\u05E6\u05D5 \u05DB\u05D0\u05DF \u05DC\u05D4\u05E1\u05E8\u05D4</a>.<br>
\u05D4\u05DE\u05D9\u05D3\u05E2 \u05D1\u05DE\u05D9\u05D9\u05DC \u05DB\u05DC\u05DC\u05D9 \u05D5\u05D0\u05D9\u05E0\u05D5 \u05DE\u05D4\u05D5\u05D5\u05D4 \u05D9\u05D9\u05E2\u05D5\u05E5 \u05DE\u05E9\u05E4\u05D8\u05D9 \u05DC\u05E2\u05E0\u05D9\u05D9\u05DF \u05DE\u05E1\u05D5\u05D9\u05DD.</td></tr></table></td></tr></table></body></html>`;
  }
  const utm = (u, campaign) => {
    try {
      const x = new URL(u);
      x.searchParams.set("utm_source", "newsletter");
      x.searchParams.set("utm_medium", "email");
      x.searchParams.set("utm_campaign", campaign);
      return x.toString();
    } catch {
      return u;
    }
  };
  const btn = (href, label) => `<a href="${href}" style="display:inline-block;background:${C.gold};color:${C.ink};text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:10px;font-size:16px">${esc(label)}</a>`;
  async function readForm(req) {
    const ct = req.headers.get("content-type") || "";
    const out = {};
    if (ct.includes("json")) {
      const j = await req.json().catch(() => ({}));
      for (const [k, v] of Object.entries(j || {})) out[k] = String(v ?? "");
    } else {
      const f = await req.formData().catch(() => null);
      f?.forEach((v, k) => {
        out[k] = String(v);
      });
    }
    return out;
  }
  async function subscribe(req) {
    const f = await readForm(req);
    if (f.hp || f.website) return json({ ok: true, msg: "\u05EA\u05D5\u05D3\u05D4!" });
    const email = String(f.email || "").trim().toLowerCase();
    const name = String(f.name || "").trim().slice(0, 80);
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) || email.length > 160) return json({ ok: false, msg: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D4\u05DE\u05D9\u05D9\u05DC \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4." }, 400);
    if (!["1", "true", "on", "yes"].includes(String(f.consent || "").toLowerCase())) return json({ ok: false, msg: "\u05DB\u05D3\u05D9 \u05DC\u05D4\u05D9\u05E8\u05E9\u05DD \u05E6\u05E8\u05D9\u05DA \u05DC\u05E1\u05DE\u05DF \u05D0\u05EA \u05EA\u05D9\u05D1\u05EA \u05D4\u05D0\u05D9\u05E9\u05D5\u05E8." }, 400);
    const magnet = hasMagnet(f.magnet || "") ? f.magnet : "buyer-checklist";
    const source = String(f.source || "website").slice(0, 60);
    const DONE = json({ ok: true, msg: "\u05DB\u05DE\u05E2\u05D8 \u05E1\u05D9\u05D9\u05DE\u05E0\u05D5! \u05D0\u05DD \u05D4\u05DB\u05EA\u05D5\u05D1\u05EA \u05EA\u05E7\u05D9\u05E0\u05D4, \u05E0\u05E9\u05DC\u05D7 \u05D0\u05DC\u05D9\u05D4 \u05DE\u05D9\u05D9\u05DC \u05E2\u05DD \u05DB\u05E4\u05EA\u05D5\u05E8 \u05D0\u05D9\u05E9\u05D5\u05E8, \u05D5\u05DE\u05D9\u05D3 \u05D0\u05D7\u05E8\u05D9\u05D5 \u05D4\u05DE\u05D3\u05E8\u05D9\u05DA. \u05D0\u05DD \u05DC\u05D0 \u05D4\u05D2\u05D9\u05E2 \u05EA\u05D5\u05DA \u05DB\u05DE\u05D4 \u05D3\u05E7\u05D5\u05EA, \u05D1\u05D3\u05E7\u05D5 \u05D2\u05DD \u05D1\u05E1\u05E4\u05D0\u05DD \u05D0\u05D5 \u05D1\u05E7\u05D9\u05D3\u05D5\u05DE\u05D9 \u05DE\u05DB\u05D9\u05E8\u05D5\u05EA." });
    const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "").trim();
    const rk = `ip-${ip.replace(/[^0-9a-f.:]/gi, "")}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 13)}`;
    const rl = await getDoc("ratelimit", rk) || { n: 0 };
    if (rl.n >= 5) return DONE;
    await db().upsert({ coll: "ratelimit", id: rk, data: { n: rl.n + 1 }, updated_at: (/* @__PURE__ */ new Date()).toISOString() });
    if (["1", "true", "on", "yes"].includes(String(f.callme || "").toLowerCase()) && f.phone) {
      await fetch(`${env("SUPABASE_URL")}/functions/v1/lead?source=website`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": env("LEAD_KEY") },
        body: JSON.stringify({ name: name || email, phone: f.phone, email, message: `\u05D1\u05D9\u05E7\u05E9/\u05D4 \u05E9\u05D9\u05D7\u05D4 \u05D7\u05D5\u05D6\u05E8\u05EA \u05D3\u05E8\u05DA \u05D8\u05D5\u05E4\u05E1 \u05D4\u05D4\u05E8\u05E9\u05DE\u05D4 (${MAGNETS[magnet].title})` })
      }).catch(() => null);
    }
    const prev = await getDoc("subs", email);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (prev && prev.status === "active") {
      if (!prev.welcomeAt || Date.now() - Date.parse(prev.welcomeAt) > 864e5) {
        if (await sendWelcome(email, prev.name || name, prev.tok, magnet, false)) await merge("subs", email, { welcomeAt: now });
      }
      return DONE;
    }
    if (prev && prev.status === "test") return DONE;
    if (prev && prev.status === "pending" && prev.confirmSentAt && Date.now() - Date.parse(prev.confirmSentAt) < 864e5) return DONE;
    const t = prev?.tok || tok();
    await db().upsert({ coll: "subs", id: email, data: Object.assign({}, prev || {}, {
      email,
      name: name || prev?.name || "",
      status: "pending",
      source,
      magnet,
      tok: t,
      created: prev?.created || now,
      interests: String(f.interests || "").split(",").map((x) => x.trim()).filter((x) => Object.prototype.hasOwnProperty.call(TOPICS, x)).slice(0, 5),
      list: magnet === "updates" ? "updates" : prev?.list || "guide",
      consent: { v: CONSENT_V, text: CONSENT_TEXT, at: now, ip, ua: (req.headers.get("user-agent") || "").slice(0, 200), page: (f.page || req.headers.get("referer") || "").slice(0, 200) },
      history: [...prev?.history || [], { at: now, ev: "subscribe", source }].slice(-20)
    }), updated_at: now });
    const st = await getDoc("nlstate", "confirms") || {};
    const today = ymd(ilNow());
    const cn = st.day === today ? Number(st.n || 0) : 0;
    const sent = cn < 50 ? await sendConfirm(email, name, t, magnet) : false;
    if (sent) await db().upsert({ coll: "nlstate", id: "confirms", data: { day: today, n: cn + 1 }, updated_at: now });
    if (cn === 50 && !st.alerted) {
      await db().upsert({ coll: "nlstate", id: "confirms", data: { day: today, n: cn, alerted: true }, updated_at: now });
      await tg("\u26A0\uFE0F \u05D4\u05D2\u05E2\u05E0\u05D5 \u05DC-50 \u05D4\u05E8\u05E9\u05DE\u05D5\u05EA \u05D7\u05D3\u05E9\u05D5\u05EA \u05D4\u05D9\u05D5\u05DD. \u05D0\u05DD \u05D6\u05D4 \u05DC\u05D0 \u05E7\u05DE\u05E4\u05D9\u05D9\u05DF, \u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05DE\u05D9\u05E9\u05D4\u05D5 \u05DE\u05E0\u05E6\u05DC \u05D0\u05EA \u05D4\u05D8\u05D5\u05E4\u05E1. \u05D4\u05D4\u05E8\u05E9\u05DE\u05D5\u05EA \u05E0\u05E9\u05DE\u05E8\u05D5\u05EA \u05D5\u05DE\u05D9\u05D9\u05DC\u05D9 \u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D9\u05D9\u05E9\u05DC\u05D7\u05D5 \u05DE\u05D7\u05E8.");
    }
    await merge("subs", email, { confirmSentAt: sent ? now : null });
    if (!sent) await tg(`\u{1F4E9} \u05E0\u05E8\u05E9\u05DD/\u05D4 \u05D7\u05D3\u05E9/\u05D4 \u05DC\u05E8\u05E9\u05D9\u05DE\u05D4: ${name || ""} ${email}
\u05DE\u05E7\u05D5\u05E8: ${source}
\u05E9\u05D9\u05E8\u05D5\u05EA \u05D4\u05DE\u05D9\u05D9\u05DC\u05D9\u05DD \u05E2\u05D5\u05D3 \u05DC\u05D0 \u05DE\u05D7\u05D5\u05D1\u05E8, \u05D5\u05DC\u05DB\u05DF \u05DE\u05D9\u05D9\u05DC \u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D9\u05D9\u05E9\u05DC\u05D7 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05D1\u05E8\u05D2\u05E2 \u05E9\u05D9\u05D7\u05D5\u05D1\u05E8.`);
    return DONE;
  }
  async function sendConfirm(email, name, t, magnet) {
    if (!emailReady()) return false;
    const link = pub("confirm", t);
    const inner = `<p style="margin:0 0 14px">\u05E9\u05DC\u05D5\u05DD${name ? " " + esc(name) : ""},</p>
<p style="margin:0 0 14px">${magnet === "updates" ? "\u05D1\u05D9\u05E7\u05E9\u05EA \u05DC\u05D4\u05E6\u05D8\u05E8\u05E3 \u05DC\u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD \u05D4\u05DE\u05E9\u05E4\u05D8\u05D9\u05D9\u05DD \u05E9\u05DC \u05D4\u05DE\u05E9\u05E8\u05D3: \u05DE\u05D3\u05E8\u05D9\u05DB\u05D9\u05DD, \u05D4\u05E1\u05D1\u05E8\u05D9\u05DD \u05D5\u05E4\u05E1\u05D9\u05E7\u05D5\u05EA \u05D7\u05D3\u05E9\u05D5\u05EA." : `\u05D1\u05D9\u05E7\u05E9\u05EA \u05DC\u05E7\u05D1\u05DC \u05D0\u05EA "${esc(MAGNETS[magnet].title)}" \u05D5\u05DC\u05D4\u05E6\u05D8\u05E8\u05E3 \u05DC\u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD \u05E9\u05DC \u05D4\u05DE\u05E9\u05E8\u05D3.`} \u05DB\u05D3\u05D9 \u05E9\u05E0\u05D3\u05E2 \u05E9\u05D6\u05D4 \u05D1\u05D0\u05DE\u05EA \u05D0\u05EA/\u05D4, \u05E0\u05E9\u05D0\u05E8 \u05E8\u05E7 \u05DC\u05D0\u05E9\u05E8:</p>
<p style="margin:22px 0">${btn(link, magnet === "updates" ? "\u05DE\u05D0\u05E9\u05E8/\u05EA \u05D0\u05EA \u05D4\u05D4\u05E6\u05D8\u05E8\u05E4\u05D5\u05EA" : "\u05DE\u05D0\u05E9\u05E8/\u05EA, \u05E9\u05DC\u05D7\u05D5 \u05DC\u05D9 \u05D0\u05EA \u05D4\u05DE\u05D3\u05E8\u05D9\u05DA")}</p>
<p style="margin:0;color:${C.muted};font-size:14px">\u05D0\u05DD \u05DC\u05D0 \u05E0\u05E8\u05E9\u05DE\u05EA, \u05D0\u05E4\u05E9\u05E8 \u05E4\u05E9\u05D5\u05D8 \u05DC\u05D4\u05EA\u05E2\u05DC\u05DD \u05DE\u05D4\u05DE\u05D9\u05D9\u05DC \u05D5\u05DC\u05D0 \u05E0\u05E9\u05DC\u05D7 \u05D0\u05DC\u05D9\u05DA \u05D3\u05D1\u05E8.</p>`;
    const r = await sendEmails([{ to: email, subject: "\u05E0\u05E9\u05D0\u05E8 \u05E8\u05E7 \u05DC\u05D0\u05E9\u05E8 \u05D0\u05EA \u05D4\u05D4\u05E8\u05E9\u05DE\u05D4", html: shell(inner, t, "\u05DC\u05D7\u05D9\u05E6\u05D4 \u05D0\u05D7\u05EA \u05D5\u05D0\u05EA/\u05D4 \u05D1\u05E8\u05E9\u05D9\u05DE\u05D4", false), text: `\u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D4\u05E8\u05E9\u05DE\u05D4: ${link}`, t }]);
    return r.ok > 0;
  }
  async function sendWelcome(email, name, t, magnet, first = true) {
    if (!emailReady()) return false;
    const file2 = `${self()}?a=file&t=${t}&m=${magnet}`;
    const inner = `<p style="margin:0 0 14px">\u05E9\u05DC\u05D5\u05DD${name ? " " + esc(name) : ""},</p>
<p style="margin:0 0 14px">${magnet === "updates" ? `${first ? "\u05D1\u05E8\u05D5\u05DA/\u05D4 \u05D4\u05D1\u05D0/\u05D4 \u05DC\u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD \u05D4\u05DE\u05E9\u05E4\u05D8\u05D9\u05D9\u05DD \u05E9\u05DC \u05D4\u05DE\u05E9\u05E8\u05D3. " : ""}\u05DE\u05E2\u05DB\u05E9\u05D9\u05D5 \u05D9\u05D2\u05D9\u05E2\u05D5 \u05D0\u05DC\u05D9\u05DA \u05DE\u05D3\u05E8\u05D9\u05DB\u05D9\u05DD, \u05D4\u05E1\u05D1\u05E8\u05D9\u05DD \u05D5\u05E4\u05E1\u05D9\u05E7\u05D5\u05EA \u05D7\u05D3\u05E9\u05D5\u05EA \u05D1\u05EA\u05D7\u05D5\u05DE\u05D9\u05DD \u05E9\u05D1\u05D7\u05E8\u05EA, \u05D1\u05DC\u05D9 \u05D4\u05E6\u05E4\u05D4. \u05DB\u05DE\u05EA\u05E0\u05EA \u05D4\u05E6\u05D8\u05E8\u05E4\u05D5\u05EA, \u05D4\u05E0\u05D4 "${esc(MAGNETS[magnet].title)}":` : `${first ? "\u05EA\u05D5\u05D3\u05D4 \u05E9\u05D4\u05E6\u05D8\u05E8\u05E4\u05EA. " : ""}\u05D4\u05E0\u05D4 "${esc(MAGNETS[magnet].title)}":`}</p>
<p style="margin:22px 0">${btn(file2, "\u05DC\u05D4\u05D5\u05E8\u05D3\u05EA \u05D4\u05DE\u05D3\u05E8\u05D9\u05DA (PDF)")}</p>
<p style="margin:0 0 14px">\u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05D0\u05D9\u05E9\u05D9 \u05D5\u05EA\u05E7\u05E3 \u05D2\u05DD \u05D1\u05D4\u05DE\u05E9\u05DA. \u05E4\u05E2\u05DD \u05D1\u05D7\u05D5\u05D3\u05E9 \u05D9\u05D2\u05D9\u05E2 \u05DE\u05DE\u05E0\u05D9 \u05DE\u05D9\u05D9\u05DC \u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD \u05E2\u05DD \u05D9\u05D3\u05E2 \u05DE\u05E2\u05E9\u05D9 \u05D5\u05E4\u05E1\u05D9\u05E7\u05D4 \u05D7\u05D3\u05E9\u05D4, \u05D5\u05D0\u05E4\u05E9\u05E8 \u05DC\u05D4\u05E1\u05D9\u05E8 \u05D0\u05EA \u05E2\u05E6\u05DE\u05DA \u05D1\u05DB\u05DC \u05E2\u05EA \u05D1\u05E7\u05D9\u05E9\u05D5\u05E8 \u05E9\u05D1\u05EA\u05D7\u05EA\u05D9\u05EA.</p>
<p style="margin:18px 0 0">${esc(OFFICE.lawyer)}</p>`;
    const r = await sendEmails([{ to: email, subject: magnet === "updates" ? "\u05D1\u05E8\u05D5\u05DA/\u05D4 \u05D4\u05D1\u05D0/\u05D4 \u05DC\u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD \u05DE\u05D4\u05DE\u05E9\u05E8\u05D3" : `\u05D4\u05DE\u05D3\u05E8\u05D9\u05DA \u05E9\u05D1\u05D9\u05E7\u05E9\u05EA: ${MAGNETS[magnet].title}`, html: shell(inner, t, "\u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D4\u05D5\u05E8\u05D3\u05D4 \u05D1\u05E4\u05E0\u05D9\u05DD", false), text: `\u05DC\u05D4\u05D5\u05E8\u05D3\u05EA \u05D4\u05DE\u05D3\u05E8\u05D9\u05DA: ${file2}`, t }]);
    return r.ok > 0;
  }
  async function findByTok(t) {
    if (!/^[a-f0-9]{40}$/.test(t)) return null;
    const { data } = await db().select("id,data").eq("coll", "subs").eq("data->>tok", t).limit(1);
    return data && data[0];
  }
  async function confirm(req, t) {
    const row = await findByTok(t);
    if (!row || row.data.status === "test") return page("\u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05E3", "<p>\u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D5\u05E2\u05EA\u05E7 \u05D7\u05DC\u05E7\u05D9\u05EA. \u05D0\u05E4\u05E9\u05E8 \u05DC\u05D4\u05D9\u05E8\u05E9\u05DD \u05E9\u05D5\u05D1 \u05D1\u05D0\u05EA\u05E8.</p>", 404);
    const s = row.data, magnet = hasMagnet(s.magnet) ? s.magnet : "buyer-checklist";
    if (s.status !== "active" && req.method !== "POST") return page("\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D4\u05E8\u05E9\u05DE\u05D4", `<p>\u05DC\u05D7\u05D9\u05E6\u05D4 \u05D0\u05D7\u05EA \u05D5\u05D0\u05EA/\u05D4 \u05D1\u05E8\u05E9\u05D9\u05DE\u05D4, \u05D5\u05D4\u05DE\u05D3\u05E8\u05D9\u05DA \u05D9\u05D7\u05DB\u05D4 \u05DC\u05DA:</p><form method="post" action="${self()}?a=confirm&t=${t}"><button type="submit">\u05DE\u05D0\u05E9\u05E8/\u05EA \u05D0\u05EA \u05D4\u05D4\u05E8\u05E9\u05DE\u05D4</button></form>`);
    if (s.status !== "active") {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await merge("subs", row.id, { status: "active", confirmedAt: now, history: [...s.history || [], { at: now, ev: "confirm" }].slice(-20) });
      await sendWelcome(s.email, s.name, t, magnet);
      const { count } = await db().select("id", { count: "exact", head: true }).eq("coll", "subs").eq("data->>status", "active");
      await tg(`\u2705 \u05DE\u05E0\u05D5\u05D9/\u05D4 \u05D7\u05D3\u05E9/\u05D4 \u05D1\u05E8\u05E9\u05D9\u05DE\u05D4: ${s.name || ""} ${s.email}
\u05DE\u05E7\u05D5\u05E8: ${s.source || "website"} \xB7 \u05E1\u05D4\u05F4\u05DB \u05DE\u05E0\u05D5\u05D9\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD: ${count ?? "?"}`);
    }
    return page("\u05D4\u05D4\u05E8\u05E9\u05DE\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4, \u05EA\u05D5\u05D3\u05D4!", `<p>${magnet === "updates" ? "\u05D1\u05E8\u05D5\u05DA/\u05D4 \u05D4\u05D1\u05D0/\u05D4 \u05DC\u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD \u05DE\u05D4\u05DE\u05E9\u05E8\u05D3. \u05DE\u05EA\u05E0\u05EA \u05D4\u05D4\u05E6\u05D8\u05E8\u05E4\u05D5\u05EA \u05DE\u05D5\u05DB\u05E0\u05D4 \u05DC\u05D4\u05D5\u05E8\u05D3\u05D4:" : "\u05D4\u05DE\u05D3\u05E8\u05D9\u05DA \u05DE\u05D5\u05DB\u05DF \u05DC\u05D4\u05D5\u05E8\u05D3\u05D4:"}</p><p style="margin:22px 0"><a class="btn" href="${self()}?a=file&t=${t}&m=${magnet}">\u05DC\u05D4\u05D5\u05E8\u05D3\u05EA ${esc(MAGNETS[magnet].title)}</a></p>
<p>\u05E9\u05DC\u05D7\u05E0\u05D5 \u05D0\u05D5\u05EA\u05D5 \u05D2\u05DD \u05DC\u05DE\u05D9\u05D9\u05DC. \u05E4\u05E2\u05DD \u05D1\u05D7\u05D5\u05D3\u05E9 \u05D9\u05D2\u05D9\u05E2 \u05DE\u05DE\u05E0\u05D9 \u05E2\u05D3\u05DB\u05D5\u05DF \u05E7\u05E6\u05E8, \u05D5\u05D0\u05E4\u05E9\u05E8 \u05DC\u05D4\u05E1\u05D9\u05E8 \u05D0\u05EA \u05E2\u05E6\u05DE\u05DA \u05D1\u05DB\u05DC \u05E2\u05EA.</p><p><a href="${SITE}">\u05D7\u05D6\u05E8\u05D4 \u05DC\u05D0\u05EA\u05E8</a></p>`);
  }
  async function file(t, m) {
    const row = await findByTok(t);
    if (!row || row.data.status !== "active") return page("\u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05E3", "<p>\u05D4\u05D4\u05D5\u05E8\u05D3\u05D4 \u05D6\u05DE\u05D9\u05E0\u05D4 \u05D0\u05D7\u05E8\u05D9 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D4\u05E8\u05E9\u05DE\u05D4 \u05D1\u05DE\u05D9\u05D9\u05DC.</p>", 403);
    const mg = hasMagnet(m) ? MAGNETS[m] : hasMagnet(row.data.magnet) ? MAGNETS[row.data.magnet] : MAGNETS["buyer-checklist"];
    const { data } = await admin().storage.from("files").createSignedUrl(mg.path, 600, { download: mg.path.split("/").pop() });
    if (!data?.signedUrl) return page("\u05D4\u05E7\u05D5\u05D1\u05E5 \u05DC\u05D0 \u05D6\u05DE\u05D9\u05DF \u05DB\u05E8\u05D2\u05E2", "<p>\u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05D1\u05E2\u05D5\u05D3 \u05DB\u05DE\u05D4 \u05D3\u05E7\u05D5\u05EA.</p>", 503);
    await merge("subs", row.id, { downloads: (row.data.downloads || 0) + 1, lastDownload: (/* @__PURE__ */ new Date()).toISOString() });
    return new Response(null, { status: 302, headers: { location: data.signedUrl } });
  }
  async function unsub(req, t) {
    const row = await findByTok(t);
    if (req.method === "POST") {
      if (row && row.data.status !== "unsub") {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await merge("subs", row.id, { status: "unsub", unsubAt: now, history: [...row.data.history || [], { at: now, ev: "unsub" }].slice(-20) });
      }
      if ((req.headers.get("content-type") || "").includes("form") && !(await req.clone().text().catch(() => "")).includes("One-Click")) return page("\u05D4\u05D5\u05E1\u05E8\u05EA \u05DE\u05D4\u05E8\u05E9\u05D9\u05DE\u05D4", "<p>\u05DC\u05D0 \u05D9\u05D9\u05E9\u05DC\u05D7\u05D5 \u05D0\u05DC\u05D9\u05DA \u05D9\u05D5\u05EA\u05E8 \u05DE\u05D9\u05D9\u05DC\u05D9\u05DD \u05DE\u05D4\u05E8\u05E9\u05D9\u05DE\u05D4 \u05D4\u05D6\u05D5. \u05D0\u05DD \u05EA\u05E8\u05E6\u05D4/\u05D9 \u05DC\u05D7\u05D6\u05D5\u05E8, \u05D0\u05E4\u05E9\u05E8 \u05DC\u05D4\u05D9\u05E8\u05E9\u05DD \u05E9\u05D5\u05D1 \u05D1\u05D0\u05EA\u05E8.</p>");
      return new Response("ok", { headers: cors });
    }
    if (!row) return page("\u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05E3", "<p>\u05D0\u05DD \u05D1\u05E8\u05E6\u05D5\u05E0\u05DA \u05DC\u05D4\u05E1\u05D9\u05E8 \u05D0\u05EA \u05E2\u05E6\u05DE\u05DA, \u05D0\u05E4\u05E9\u05E8 \u05DC\u05D4\u05EA\u05E7\u05E9\u05E8 \u05DC\u05DE\u05E9\u05E8\u05D3 \u05D1\u05D8\u05DC\u05E4\u05D5\u05DF 09-8613413 \u05D5\u05E0\u05E1\u05D9\u05E8 \u05D0\u05D5\u05EA\u05DA \u05DE\u05D9\u05D3.</p>", 404);
    if (row.data.status === "unsub") return page("\u05DB\u05D1\u05E8 \u05D4\u05D5\u05E1\u05E8\u05EA", "<p>\u05D4\u05DB\u05EA\u05D5\u05D1\u05EA \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05EA \u05D1\u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05EA\u05E4\u05D5\u05E6\u05D4.</p>");
    return page("\u05D4\u05E1\u05E8\u05D4 \u05DE\u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05EA\u05E4\u05D5\u05E6\u05D4", `<p>\u05DC\u05D4\u05E1\u05D9\u05E8 \u05D0\u05EA ${esc(row.data.email)} \u05DE\u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD?</p><form method="post" action="${self()}?a=unsub&t=${t}"><input type="hidden" name="confirm" value="1"><button type="submit">\u05DB\u05DF, \u05D4\u05E1\u05D9\u05E8\u05D5 \u05D0\u05D5\u05EA\u05D9</button></form>`);
  }
  const clean = (s) => String(s ?? "").replace(DASH, (m) => /\s/.test(m) ? " - " : "-").trim();
  const strip = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  async function notifyIssue(id) {
    const issue = await getDoc("nl", id);
    if (!issue || !issue.content) return { error: "no issue" };
    if (!["draft", "held"].includes(issue.status)) return { skipped: "status " + issue.status };
    const j = issue.content;
    j.articles = (j.articles || []).filter((a) => a && /^https?:\/\//.test(a.url || "") && a.title).slice(0, 3);
    if (!j.subject) return { error: "empty draft" };
    for (const k of ["subject", "preheader", "intro", "tip", "signoff"]) j[k] = clean(j[k]);
    if (j.feature) {
      j.feature.title = clean(j.feature.title);
      j.feature.paras = (j.feature.paras || []).map(clean).filter(Boolean);
      j.feature.points = (j.feature.points || []).map(clean).filter(Boolean);
    }
    j.news = (j.news || []).filter((x) => x && x.title).map((x) => ({ title: clean(x.title), text: clean(x.text), url: /^https?:\/\//.test(x.url || "") ? x.url : "" }));
    j.articles = (j.articles || []).filter((a) => a && /^https?:\/\//.test(a.url || "") && a.title);
    if (!j.feature && !j.articles.length) return { error: "empty draft" };
    j.articles.forEach((a) => {
      a.title = clean(a.title);
      a.blurb = clean(a.blurb);
    });
    j.rulings = (j.rulings || []).filter((r) => r && /^https?:\/\//.test(r.url || "") && r.title).slice(0, 2).map((r) => ({ title: clean(r.title), court: clean(r.court), date: clean(r.date), url: r.url, what: clean(r.what), why: clean(r.why) }));
    if (j.qa) {
      j.qa.q = clean(j.qa.q);
      j.qa.a = clean(j.qa.a);
    }
    const flat = JSON.stringify(j);
    const flags = BANNED.test(flat) ? [`\u05E0\u05DE\u05E6\u05D0 \u05D1\u05D9\u05D8\u05D5\u05D9 \u05D0\u05E1\u05D5\u05E8: "${(flat.match(BANNED) || [""])[0]}"`] : [];
    const { count: active } = await db().select("id", { count: "exact", head: true }).eq("coll", "subs").eq("data->>status", "active");
    const approveTok = tok(), month = HE_MONTHS[ilNow().getMonth()];
    const subject = /^פרסומת:/.test(j.subject) ? j.subject : "\u05E4\u05E8\u05E1\u05D5\u05DE\u05EA: " + j.subject;
    await merge("nl", id, { status: flags.length ? "held" : "draft", subject, content: j, created: (/* @__PURE__ */ new Date()).toISOString(), approveTok, flags, audience: active || 0, sent: 0, failed: 0 });
    const nlLink = (a) => pub(a, approveTok);
    const cfg = await getDoc("settings", "growth") || {};
    await tg(
      `\u{1F4EC} \u05D4\u05E0\u05D9\u05D5\u05D6\u05DC\u05D8\u05E8 \u05E9\u05DC ${month} \u05DE\u05D5\u05DB\u05DF \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D5\u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E9\u05DC\u05DA

\u05E0\u05D5\u05E9\u05D0: ${subject}${j.feature?.title ? `
\u05D4\u05E0\u05D5\u05E9\u05D0 \u05E9\u05DC \u05D4\u05D7\u05D5\u05D3\u05E9: ${j.feature.title}` : ""}${j.rulings.length ? `
\u05E4\u05E1\u05D9\u05E7\u05D5\u05EA: ${j.rulings.map((r) => r.title).join(" \xB7 ")}` : ""}
\u05D9\u05D9\u05E9\u05DC\u05D7 \u05DC-${active || 0} \u05DE\u05E0\u05D5\u05D9\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD${flags.length ? `

\u26A0\uFE0F ${flags.join(", ")}. \u05E6\u05E8\u05D9\u05DA \u05DC\u05EA\u05E7\u05DF \u05DC\u05E4\u05E0\u05D9 \u05D4\u05D0\u05D9\u05E9\u05D5\u05E8.` : ""}

\u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05DC\u05D0 \u05D9\u05D5\u05E6\u05D0 \u05D1\u05DC\u05D9 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05E9\u05DC\u05DA. \u05E2\u05D5\u05D1\u05E8\u05D9\u05DD \u05E2\u05DC\u05D9\u05D5 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA \u05D4\u05DE\u05E9\u05E8\u05D3: \u05DB\u05E1\u05E4\u05D9\u05DD > \u05E9\u05D9\u05D5\u05D5\u05E7 > \u05E0\u05D9\u05D5\u05D6\u05DC\u05D8\u05E8. "\u05EA\u05E6\u05D5\u05D2\u05D4" \u05DB\u05D3\u05D9 \u05DC\u05E7\u05E8\u05D5\u05D0, "\u05E2\u05E8\u05D9\u05DB\u05D4" \u05DB\u05D3\u05D9 \u05DC\u05E9\u05E0\u05D5\u05EA, \u05D5"\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D5\u05E9\u05DC\u05D9\u05D7\u05D4" \u05DB\u05E9\u05D4\u05D5\u05D0 \u05DE\u05D5\u05DB\u05DF. \u05E2\u05D3 \u05E9\u05EA\u05D0\u05E9\u05E8, \u05D0\u05D6\u05DB\u05D9\u05E8 \u05DC\u05DA \u05DB\u05DC \u05D9\u05D5\u05DD.`,
      [[{ text: "\u{1F441} \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05DC\u05D0\u05D4", url: nlLink("nlview") }], [{ text: "\u2705 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05D5\u05E9\u05DC\u05D9\u05D7\u05D4", url: nlLink("nlok") }, { text: "\u2717 \u05DC\u05D0 \u05DC\u05E9\u05DC\u05D5\u05D7", url: nlLink("nlstop") }], [{ text: "\u{1F504} \u05DC\u05D1\u05E0\u05D5\u05EA \u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05D0\u05D7\u05E8", url: nlLink("nlredo") }]]
    );
    return { notified: id, audience: active || 0, flags };
  }
  function renderIssue(issue, t) {
    const j = issue.content;
    const P = (x) => `<p style="margin:0 0 14px">${esc(x)}</p>`;
    const H = (x) => `<div style="font-size:13px;color:${C.accent};font-weight:bold;letter-spacing:.02em;margin:0 0 8px">${esc(x)}</div>`;
    const f = j.feature;
    const feat = f && (f.paras || []).length ? `<div style="margin:6px 0 24px">${H("\u05D4\u05E0\u05D5\u05E9\u05D0 \u05E9\u05DC \u05D4\u05D7\u05D5\u05D3\u05E9")}<div style="font-size:21px;font-weight:bold;color:${C.ink};line-height:1.35;margin:0 0 12px">${esc(f.title)}</div>${f.paras.map(P).join("")}${(f.points || []).length ? `<div style="margin:16px 0 0;padding:16px 18px;background:${C.soft};border-radius:10px"><div style="font-weight:bold;margin:0 0 8px;color:${C.ink}">\u05DE\u05D4 \u05D1\u05D5\u05D3\u05E7\u05D9\u05DD \u05D1\u05E4\u05D5\u05E2\u05DC</div>${f.points.map((x) => `<div style="margin:0 0 8px">&#10003;&nbsp; ${esc(x)}</div>`).join("")}</div>` : ""}</div>` : "";
    const news = (j.news || []).length ? `<div style="margin:0 0 24px;padding-top:18px;border-top:1px solid ${C.border}">${H("\u05DE\u05D4 \u05D4\u05E9\u05EA\u05E0\u05D4 \u05D4\u05D7\u05D5\u05D3\u05E9")}${j.news.map((x) => `<div style="margin:0 0 14px"><div style="font-weight:bold;color:${C.ink}">${esc(x.title)}</div><div>${esc(x.text)}</div>${x.url ? `<a href="${esc(x.url)}" style="color:${C.accent};font-size:14px">\u05DC\u05DE\u05E7\u05D5\u05E8</a>` : ""}</div>`).join("")}</div>` : "";
    const rul = (j.rulings || []).length ? `<div style="margin:0 0 24px;padding-top:18px;border-top:1px solid ${C.border}">${H("\u05E4\u05E1\u05D9\u05E7\u05D4 \u05D7\u05D3\u05E9\u05D4, \u05D1\u05E9\u05E4\u05D4 \u05E4\u05E9\u05D5\u05D8\u05D4")}${j.rulings.map((r) => `<div style="margin:0 0 18px"><div style="font-weight:bold;color:${C.ink};font-size:17px">${esc(r.title)}</div><div style="font-size:13px;color:${C.muted};margin:2px 0 8px">${esc([r.court, r.date].filter(Boolean).join(" \xB7 "))}</div>${r.what ? `<div style="margin:0 0 8px"><b>\u05DE\u05D4 \u05E7\u05E8\u05D4:</b> ${esc(r.what)}</div>` : ""}<div style="margin:0 0 6px"><b>\u05DE\u05D4 \u05D6\u05D4 \u05D0\u05D5\u05DE\u05E8 \u05DC\u05DB\u05DD:</b> ${esc(r.why)}</div><a href="${esc(r.url)}" style="color:${C.accent};font-size:14px">\u05DC\u05E4\u05E1\u05E7 \u05D4\u05D3\u05D9\u05DF \u05D4\u05DE\u05DC\u05D0</a></div>`).join("")}</div>` : "";
    const qa = j.qa?.q ? `<div style="margin:0 0 24px;padding:16px 18px;background:${C.soft};border-right:4px solid ${C.accent};border-radius:8px">${H("\u05E9\u05D0\u05DC\u05D4 \u05DE\u05D4\u05E9\u05D8\u05D7")}<div style="font-weight:bold;margin-bottom:6px">${esc(j.qa.q)}</div><div>${esc(j.qa.a)}</div></div>` : "";
    const tip = j.tip ? `<div style="margin:0 0 24px;padding:14px 18px;border:1px dashed ${C.accent};border-radius:8px"><strong style="color:${C.ink}">\u05D8\u05D9\u05E4 \u05D4\u05D7\u05D5\u05D3\u05E9:</strong> ${esc(j.tip)}</div>` : "";
    const arts = (j.articles || []).length ? `<div style="margin:0 0 20px;padding-top:18px;border-top:1px solid ${C.border}">${H("\u05DC\u05D4\u05E8\u05D7\u05D1\u05D4 \u05D1\u05D0\u05EA\u05E8")}${j.articles.map((a) => `<div style="margin:0 0 10px"><a href="${esc(utm(a.url, issue.id || "nl"))}" style="color:${C.ink};font-weight:bold">${esc(a.title)}</a>${a.blurb ? `<div style="color:${C.muted};font-size:14px">${esc(a.blurb)}</div>` : ""}</div>`).join("")}</div>` : "";
    const contact = `<div style="margin:8px 0 0;padding:16px 18px;background:${C.ink};color:#fff;border-radius:10px"><div style="color:${C.gold};font-weight:bold;margin:0 0 6px">\u05D9\u05E9 \u05DC\u05DB\u05DD \u05E9\u05D0\u05DC\u05D4 \u05E2\u05DC \u05E2\u05E1\u05E7\u05D4 \u05D0\u05D5 \u05E2\u05DC \u05E0\u05DB\u05E1?</div><div>${esc(OFFICE.lawyer)} \xB7 \u05D8\u05DC\u05E4\u05D5\u05DF <a href="tel:${OFFICE.phone}" style="color:#fff">${OFFICE.phone}</a> \xB7 \u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4 <a href="https://wa.me/972${OFFICE.wa.replace(/\D/g, "").slice(1)}" style="color:#fff">${OFFICE.wa}</a></div><div style="font-size:14px;color:#cfcabe">${esc(OFFICE.address)} \xB7 <a href="${SITE}" style="color:#cfcabe">dabullaw.co.il</a></div><div style="font-size:12px;color:#a9a59c;margin-top:6px">\u05D6\u05D5 \u05DB\u05EA\u05D5\u05D1\u05EA \u05DC\u05E9\u05DC\u05D9\u05D7\u05D4 \u05D1\u05DC\u05D1\u05D3, \u05D5\u05DC\u05DB\u05DF \u05D0\u05D9\u05DF \u05DC\u05D4\u05E9\u05D9\u05D1 \u05DC\u05DE\u05D9\u05D9\u05DC \u05D4\u05D6\u05D4.</div></div>`;
    const inner = `${j.intro ? P(j.intro) : ""}${feat}${news}${rul}${qa}${tip}${arts}${j.signoff ? P(j.signoff) : ""}${contact}`;
    const html = shell(inner, t, j.preheader || "");
    const text = [
      j.intro,
      f ? `${f.title}

${(f.paras || []).join("\n\n")}${(f.points || []).length ? "\n\n\u05DE\u05D4 \u05D1\u05D5\u05D3\u05E7\u05D9\u05DD \u05D1\u05E4\u05D5\u05E2\u05DC:\n" + f.points.map((x) => "- " + x).join("\n") : ""}` : "",
      (j.news || []).length ? "\u05DE\u05D4 \u05D4\u05E9\u05EA\u05E0\u05D4 \u05D4\u05D7\u05D5\u05D3\u05E9:\n" + j.news.map((x) => `${x.title}: ${x.text}${x.url ? " " + x.url : ""}`).join("\n") : "",
      (j.rulings || []).map((r) => `\u05E4\u05E1\u05D9\u05E7\u05D4: ${r.title} (${[r.court, r.date].filter(Boolean).join(", ")})
${r.what ? "\u05DE\u05D4 \u05E7\u05E8\u05D4: " + r.what + "\n" : ""}\u05DE\u05D4 \u05D6\u05D4 \u05D0\u05D5\u05DE\u05E8 \u05DC\u05DB\u05DD: ${r.why}
${r.url}`).join("\n\n"),
      j.qa?.q ? `\u05E9\u05D0\u05DC\u05D4 \u05DE\u05D4\u05E9\u05D8\u05D7: ${j.qa.q}
${j.qa.a}` : "",
      j.tip ? `\u05D8\u05D9\u05E4 \u05D4\u05D7\u05D5\u05D3\u05E9: ${j.tip}` : "",
      (j.articles || []).map((a) => `${a.title}: ${a.url}`).join("\n"),
      j.signoff || "",
      `\u05DC\u05E9\u05D0\u05DC\u05D5\u05EA: ${OFFICE.lawyer}, \u05D8\u05DC\u05E4\u05D5\u05DF ${OFFICE.phone}, \u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4 ${OFFICE.wa}, ${OFFICE.address}. \u05D6\u05D5 \u05DB\u05EA\u05D5\u05D1\u05EA \u05DC\u05E9\u05DC\u05D9\u05D7\u05D4 \u05D1\u05DC\u05D1\u05D3.
\u05DC\u05D4\u05E1\u05E8\u05D4: ${pub("unsub", t)}`
    ].filter(Boolean).join("\n\n");
    return { html, text };
  }
  async function issueByTok(t) {
    if (!/^[a-f0-9]{40}$/.test(t)) return null;
    const { data } = await db().select("id,data").eq("coll", "nl").eq("data->>approveTok", t).limit(1);
    return data && data[0] ? { id: data[0].id, ...data[0].data } : null;
  }
  async function nlAction(req, a, t) {
    const issue = await issueByTok(t);
    if (!issue) return page("\u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05E3", "<p>\u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0.</p>", 404);
    if (a === "nlview") return new Response(renderIssue(issue, "preview" + "0".repeat(33)).html, { headers: { ...cors, "content-type": "text/html; charset=utf-8" } });
    const label = `"${esc(issue.subject)}"`;
    if (a === "nlok") {
      if (issue.status === "held") return page("\u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05DE\u05E2\u05D5\u05DB\u05D1", `<p>\u05D4\u05D1\u05D3\u05D9\u05E7\u05D4 \u05DE\u05E6\u05D0\u05D4 \u05D1\u05E2\u05D9\u05D4: ${esc((issue.flags || []).join(", "))}. \u05D4\u05D5\u05D0 \u05DC\u05D0 \u05D9\u05D9\u05E9\u05DC\u05D7 \u05D1\u05DE\u05E6\u05D1 \u05D4\u05D6\u05D4.</p>`);
      if (["approved", "sending", "sent"].includes(issue.status)) return page("\u05DB\u05D1\u05E8 \u05D0\u05D5\u05E9\u05E8", `<p>\u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF ${label} \u05DB\u05D1\u05E8 \u05D0\u05D5\u05E9\u05E8${issue.status === "sent" ? " \u05D5\u05E0\u05E9\u05DC\u05D7" : " \u05D5\u05E0\u05DE\u05E6\u05D0 \u05D1\u05E9\u05DC\u05D9\u05D7\u05D4"}.</p>`);
      if (issue.status === "stopped") return page("\u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05D1\u05D5\u05D8\u05DC", "<p>\u05D4\u05D5\u05D0 \u05DC\u05D0 \u05D9\u05D9\u05E9\u05DC\u05D7.</p>");
      if (req.method !== "POST") return page("\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E9\u05DC\u05D9\u05D7\u05EA \u05D4\u05E0\u05D9\u05D5\u05D6\u05DC\u05D8\u05E8", `<p>${label}</p><p>\u05D9\u05D9\u05E9\u05DC\u05D7 \u05DC\u05DB\u05DC \u05D4\u05DE\u05E0\u05D5\u05D9\u05D9\u05DD \u05D4\u05E4\u05E2\u05D9\u05DC\u05D9\u05DD (${issue.audience || 0}) \u05D1\u05E9\u05E2\u05D5\u05EA \u05D4\u05E2\u05D1\u05D5\u05D3\u05D4, \u05D1\u05DE\u05E0\u05D5\u05EA.</p>
<p><a href="${pub("nlview", t)}" target="_blank">\u05DC\u05EA\u05E6\u05D5\u05D2\u05D4 \u05D4\u05DE\u05DC\u05D0\u05D4</a></p><form method="post" action="${self()}?a=nlok&t=${t}"><button type="submit">\u2705 \u05DE\u05D0\u05E9\u05E8, \u05DC\u05E9\u05DC\u05D5\u05D7</button></form>`);
      await merge("nl", issue.id, { status: "approved", approvedAt: (/* @__PURE__ */ new Date()).toISOString() });
      await tg(`\u2705 \u05D0\u05D9\u05E9\u05E8\u05EA \u05D0\u05EA \u05D4\u05E0\u05D9\u05D5\u05D6\u05DC\u05D8\u05E8 ${issue.subject}. \u05D4\u05D5\u05D0 \u05D9\u05D5\u05E6\u05D0 \u05D1\u05E1\u05D1\u05D1 \u05D4\u05E9\u05DC\u05D9\u05D7\u05D4 \u05D4\u05E7\u05E8\u05D5\u05D1.`);
      return page("\u05D0\u05D5\u05E9\u05E8. \u05D4\u05E0\u05D9\u05D5\u05D6\u05DC\u05D8\u05E8 \u05D9\u05D5\u05E6\u05D0 \u05DC\u05D3\u05E8\u05DA", "<p>\u05D4\u05D5\u05D0 \u05D9\u05D9\u05E9\u05DC\u05D7 \u05D1\u05E1\u05D1\u05D1 \u05D4\u05E7\u05E8\u05D5\u05D1 \u05D1\u05E9\u05E2\u05D5\u05EA \u05D4\u05E2\u05D1\u05D5\u05D3\u05D4. \u05D1\u05E1\u05D9\u05D5\u05DD \u05EA\u05E7\u05D1\u05DC \u05E1\u05D9\u05DB\u05D5\u05DD \u05D1\u05D8\u05DC\u05D2\u05E8\u05DD.</p>");
    }
    if (a === "nlredo") {
      if (["approved", "sending", "sent"].includes(issue.status)) return page("\u05D0\u05D9 \u05D0\u05E4\u05E9\u05E8 \u05DC\u05D1\u05E0\u05D5\u05EA \u05DE\u05D7\u05D3\u05E9", "<p>\u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05DB\u05D1\u05E8 \u05D0\u05D5\u05E9\u05E8 \u05DC\u05E9\u05DC\u05D9\u05D7\u05D4.</p>");
      if (req.method !== "POST") return page("\u05DC\u05D1\u05E0\u05D5\u05EA \u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05D0\u05D7\u05E8?", `<p>${label} \u05D9\u05D5\u05D7\u05DC\u05E3 \u05D1\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05D7\u05D3\u05E9, \u05E9\u05D9\u05D2\u05D9\u05E2 \u05D0\u05DC\u05D9\u05DA \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D1\u05D8\u05DC\u05D2\u05E8\u05DD.</p><form method="post" action="${self()}?a=nlredo&t=${t}"><button type="submit">\u05DB\u05DF, \u05DC\u05D1\u05E0\u05D5\u05EA \u05DE\u05D7\u05D3\u05E9</button></form>`);
      await merge("nl", issue.id, { status: "stopped", approveTok: "x" + tok().slice(1), redoRequested: (/* @__PURE__ */ new Date()).toISOString() });
      await merge("nlstate", "redo", { at: (/* @__PURE__ */ new Date()).toISOString(), from: issue.id, done: false });
      return page("\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05D7\u05D3\u05E9 \u05D1\u05D3\u05E8\u05DA", "<p>\u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05D4\u05D6\u05D4 \u05D1\u05D5\u05D8\u05DC. \u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05D7\u05D3\u05E9 \u05D9\u05D9\u05DB\u05EA\u05D1 \u05D5\u05D9\u05D2\u05D9\u05E2 \u05D0\u05DC\u05D9\u05DA \u05DC\u05D8\u05DC\u05D2\u05E8\u05DD \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E2\u05D3 \u05DE\u05D7\u05E8 \u05D1\u05D1\u05D5\u05E7\u05E8.</p>");
    }
    if (a === "nlstop") {
      if (issue.status === "sent") return page("\u05DB\u05D1\u05E8 \u05E0\u05E9\u05DC\u05D7", "<p>\u05D0\u05D9 \u05D0\u05E4\u05E9\u05E8 \u05DC\u05D1\u05D8\u05DC \u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05E9\u05DB\u05D1\u05E8 \u05E0\u05E9\u05DC\u05D7.</p>");
      if (req.method !== "POST") return page("\u05D1\u05D9\u05D8\u05D5\u05DC \u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF", `<p>${label} \u05DC\u05D0 \u05D9\u05D9\u05E9\u05DC\u05D7. \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA?</p><form method="post" action="${self()}?a=nlstop&t=${t}"><button type="submit">\u05DB\u05DF, \u05DC\u05D1\u05D8\u05DC</button></form>`);
      await merge("nl", issue.id, { status: "stopped", stoppedAt: (/* @__PURE__ */ new Date()).toISOString() });
      return page("\u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05D1\u05D5\u05D8\u05DC", "<p>\u05D4\u05D5\u05D0 \u05DC\u05D0 \u05D9\u05D9\u05E9\u05DC\u05D7. \u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05D4\u05D1\u05D0 \u05D9\u05D9\u05D1\u05E0\u05D4 \u05D1\u05D7\u05D5\u05D3\u05E9 \u05D4\u05D1\u05D0.</p>");
    }
    return page("?", "", 400);
  }
  async function confirmBacklog() {
    if (!emailReady()) return 0;
    const pend = (await all("subs")).filter((s) => s.data.status === "pending" && !s.data.confirmSentAt && !s.data.test).slice(0, 50);
    let n = 0;
    for (const s of pend) if (await sendConfirm(s.data.email, s.data.name, s.data.tok, s.data.magnet || "buyer-checklist")) {
      n++;
      await merge("subs", s.id, { confirmSentAt: (/* @__PURE__ */ new Date()).toISOString() });
    }
    return n;
  }
  async function sendRound() {
    const backlog = await confirmBacklog();
    const h = ilNow(), dow = h.getDay(), hr = h.getHours();
    if (dow === 5 || dow === 6 || hr < 9 || hr >= 19) return { skipped: "outside hours", backlog };
    let { data } = await db().select("id,data").eq("coll", "nl").in("data->>status", ["approved", "sending"]).limit(1);
    if (!data || !data[0]) {
      const g = await getDoc("settings", "growth") || {}, hours = Number(g.newsletter?.autoApproveHours ?? 0);
      const { data: drafts } = await db().select("id,data").eq("coll", "nl").eq("data->>status", "draft").limit(3);
      const due = hours > 0 && g.newsletter?.autoSend === true ? (drafts || []).find((d) => d.data.approveTok && Date.now() - Date.parse(d.data.created) > hours * 36e5 && !(d.data.flags || []).length) : null;
      if (!due) return { skipped: "nothing approved" };
      await merge("nl", due.id, { status: "approved", approvedAt: (/* @__PURE__ */ new Date()).toISOString(), autoApproved: true });
      await tg(`\u{1F4EC} \u05D4\u05E0\u05D9\u05D5\u05D6\u05DC\u05D8\u05E8 "${due.data.subject}" \u05DC\u05D0 \u05E0\u05E2\u05E6\u05E8 \u05D1\u05DE\u05E9\u05DA ${hours} \u05E9\u05E2\u05D5\u05EA, \u05D5\u05DC\u05DB\u05DF \u05D0\u05D5\u05E9\u05E8 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05D5\u05D9\u05D5\u05E6\u05D0 \u05D1\u05E9\u05E2\u05D5\u05EA \u05D4\u05E2\u05D1\u05D5\u05D3\u05D4.`);
      data = [{ ...due, data: { ...due.data, status: "approved" } }];
    }
    const id = data[0].id, issue = { id, ...data[0].data };
    if (issue.status === "approved" && !issue.sent) {
      const hit = (JSON.stringify(issue.content || {}) + " " + (issue.subject || "")).match(BANNED);
      if (hit) {
        await merge("nl", id, { status: "held", flags: [`\u05E0\u05DE\u05E6\u05D0 \u05D1\u05D9\u05D8\u05D5\u05D9 \u05D0\u05E1\u05D5\u05E8: "${hit[0]}"`] });
        await tg(`\u26A0\uFE0F \u05D4\u05E0\u05D9\u05D5\u05D6\u05DC\u05D8\u05E8 "${issue.subject}" \u05E0\u05E2\u05E6\u05E8 \u05DC\u05E4\u05E0\u05D9 \u05D4\u05E9\u05DC\u05D9\u05D7\u05D4: \u05E0\u05DE\u05E6\u05D0 \u05D1\u05D9\u05D8\u05D5\u05D9 \u05D0\u05E1\u05D5\u05E8 "${hit[0]}". \u05D0\u05E4\u05E9\u05E8 \u05DC\u05EA\u05E7\u05DF \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA \u05D4\u05DE\u05E9\u05E8\u05D3 \u05D1"\u05E2\u05E8\u05D9\u05DB\u05D4" \u05D5\u05DC\u05D0\u05E9\u05E8 \u05E9\u05D5\u05D1.`);
        return { held: id };
      }
    }
    if (issue.lockAt && Date.now() - Date.parse(issue.lockAt) < 10 * 6e4) return { skipped: "another round is running" };
    await merge("nl", id, { lockAt: (/* @__PURE__ */ new Date()).toISOString() });
    if (!emailReady()) {
      if (!issue.waitNoted) {
        await merge("nl", id, { waitNoted: true });
        await tg("\u{1F4EC} \u05D4\u05E0\u05D9\u05D5\u05D6\u05DC\u05D8\u05E8 \u05DE\u05D0\u05D5\u05E9\u05E8 \u05D5\u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05D7\u05D9\u05D1\u05D5\u05E8 \u05E9\u05D9\u05E8\u05D5\u05EA \u05D4\u05DE\u05D9\u05D9\u05DC\u05D9\u05DD. \u05D4\u05D5\u05D0 \u05D9\u05D9\u05E6\u05D0 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05D1\u05E8\u05D2\u05E2 \u05E9\u05D9\u05D7\u05D5\u05D1\u05E8.");
      }
      return { skipped: "email service not connected" };
    }
    const cfg = await getDoc("settings", "growth") || {};
    const q = await quota(100);
    if (!q.take) {
      await merge("nl", id, { lockAt: null });
      return { skipped: "daily email quota used" };
    }
    const subs = (await all("subs")).filter((s) => s.data.status === "active" && s.data.lastIssue !== id).slice(0, q.take);
    if (!subs.length) {
      await merge("nl", id, { status: "sent", sentAt: (/* @__PURE__ */ new Date()).toISOString(), lockAt: null });
      const cfgN = cfg.newsletter || {};
      const featured = [...cfgN.featured || [], ...(issue.content.articles || []).map((a) => a.url)].slice(-60);
      await merge("settings", "growth", { newsletter: Object.assign({}, cfgN, { featured, faqUsed: [...cfgN.faqUsed || [], issue.faqId].filter(Boolean).slice(-60) }) });
      await tg(`\u{1F4EC} \u05D4\u05E0\u05D9\u05D5\u05D6\u05DC\u05D8\u05E8 "${issue.subject}" \u05E0\u05E9\u05DC\u05D7. \u05E0\u05E9\u05DC\u05D7\u05D5 ${issue.sent || 0}${issue.failed ? `, ${issue.failed} \u05E0\u05DB\u05E9\u05DC\u05D5` : ""}.`);
      return { done: id };
    }
    const msgs = subs.map((s) => {
      const r2 = renderIssue(issue, s.data.tok);
      return { to: s.data.email, subject: issue.subject, html: r2.html, text: r2.text, t: s.data.tok };
    });
    const r = await sendEmails(msgs);
    const at = (/* @__PURE__ */ new Date()).toISOString();
    for (const s of subs) {
      if (r.rejected.includes(s.data.email)) await merge("subs", s.id, { status: "bounced", bouncedAt: at });
      else if (!r.failed.length) await merge("subs", s.id, { lastIssue: id, lastSentAt: at, sends: (s.data.sends || 0) + 1 });
    }
    const fails = r.failed.length ? (issue.failRounds || 0) + 1 : 0;
    if (fails === 2) await tg("\u26A0\uFE0F \u05E9\u05DC\u05D9\u05D7\u05EA \u05D4\u05E0\u05D9\u05D5\u05D6\u05DC\u05D8\u05E8 \u05E0\u05DB\u05E9\u05DC\u05D4 \u05E4\u05E2\u05DE\u05D9\u05D9\u05DD \u05D1\u05E8\u05E6\u05E3. \u05D0\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05E9\u05D9\u05E8\u05D5\u05EA \u05D4\u05DE\u05D9\u05D9\u05DC\u05D9\u05DD, \u05D5\u05D4\u05E9\u05DC\u05D9\u05D7\u05D4 \u05EA\u05DE\u05E9\u05D9\u05DA \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05DB\u05E9\u05D6\u05D4 \u05D9\u05E1\u05EA\u05D3\u05E8.");
    const cur = await getDoc("nl", id);
    await merge("nl", id, { status: cur?.status === "stopped" ? "stopped" : "sending", sent: (issue.sent || 0) + r.ok, bounced: (issue.bounced || 0) + r.rejected.length, failRounds: fails, lockAt: null });
    return { sent: r.ok, rejected: r.rejected.length, failed: r.failed.length, backlog };
  }
  async function numbers(from, to) {
    const [deals, plans, clients, subs, jobs, budget, launch] = await Promise.all([all("deals"), all("plans"), all("clients"), all("subs"), all("artjob"), getDoc("budget", "main"), all("launch")]);
    const inRange = (d) => d && d >= from && d < to;
    const signed = deals.filter((d) => inRange(String(d.data.signDate || "").slice(0, 10)));
    const unpaid = deals.filter((d) => !d.data.feePaid && Number(d.data.fee) > 0 && !/בוטל/.test(String(d.data.status || "")));
    const inst = plans.flatMap((p) => (p.data.installments || []).map((i) => ({ ...i, name: p.data.name, area: p.data.area })));
    const dueIn = inst.filter((i) => inRange(i.due));
    const today = ymd(ilNow());
    const overdue = inst.filter((i) => i.due < today && i.status !== "paid");
    const leads = clients.filter((c) => inRange(String(c.data.created || "").slice(0, 10)));
    const subsNew = subs.filter((s) => s.data.status === "active" && inRange(String(s.data.confirmedAt || "").slice(0, 10)));
    const subsActive = subs.filter((s) => s.data.status === "active").length;
    const arts = jobs.filter((j) => ["scheduled", "published"].includes(j.data.status) && inRange(String(j.data.publishAt || "").slice(0, 10)));
    const fixed = (budget?.items || []).filter((x) => x.status === "active").reduce((s, x) => s + Number(x.monthly || 0), 0);
    const upcoming = launch.map((l) => l.data).filter((l) => l.status !== "done" && l.date >= today && l.date <= ymd(new Date(Date.now() + 8 * 864e5))).sort((a, b) => a.date.localeCompare(b.date));
    return { signed, unpaid, dueIn, overdue, leads, subsNew, subsActive, arts, fixed, budget, upcoming, deals, inst };
  }
  const sum = (a, f) => a.reduce((s, x) => s + (Number(f(x)) || 0), 0);
  async function weekly() {
    const now = ilNow(), to = ymd(new Date(now.getTime() + 864e5)), from = ymd(new Date(now.getTime() - 6 * 864e5));
    const m0 = `${ymd(now).slice(0, 7)}-01`;
    const w = await numbers(from, to), m = await numbers(m0, to);
    const nextWeek = await numbers(to, ymd(new Date(now.getTime() + 8 * 864e5)));
    const L = [`\u{1F4CA} \u05D3\u05D5\u05E4\u05E7 \u05E9\u05D1\u05D5\u05E2\u05D9 \xB7 ${ymd(now)}`, ""];
    L.push("\u{1F4B0} \u05DB\u05E1\u05E3");
    L.push(`\u2022 \u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05E9\u05E0\u05D7\u05EA\u05DE\u05D5 \u05D4\u05D7\u05D5\u05D3\u05E9: ${m.signed.length} (\u05E9\u05DB\u05F4\u05D8 ${nis(sum(m.signed, (d) => d.data.fee))})`);
    if (w.unpaid.length) L.push(`\u2022 \u05E9\u05DB\u05F4\u05D8 \u05E4\u05EA\u05D5\u05D7: ${w.unpaid.length} \u05EA\u05D9\u05E7\u05D9\u05DD, ${nis(sum(w.unpaid, (d) => d.data.fee))}. \u05D4\u05D5\u05D5\u05EA\u05D9\u05E7 \u05D1\u05D9\u05D5\u05EA\u05E8 \u05DE-${w.unpaid.map((d) => d.data.signDate || "").filter(Boolean).sort()[0] || "?"}`);
    L.push(`\u2022 \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9 \u05D4\u05E1\u05D3\u05E8\u05D9\u05DD \u05E9\u05E6\u05E4\u05D5\u05D9\u05D9\u05DD \u05D4\u05E9\u05D1\u05D5\u05E2: ${nextWeek.dueIn.length} (${nis(sum(nextWeek.dueIn, (i) => i.amount))})`);
    if (w.overdue.length) L.push(`\u2022 \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05E9\u05E2\u05D1\u05E8 \u05DE\u05D5\u05E2\u05D3\u05DD \u05D5\u05DC\u05D0 \u05E1\u05D5\u05DE\u05E0\u05D5 \u05DB\u05E9\u05D5\u05DC\u05DE\u05D5: ${w.overdue.length} (${nis(sum(w.overdue, (i) => i.amount))}): ${[...new Set(w.overdue.map((i) => i.name))].slice(0, 5).join(", ")}`);
    L.push("", "\u{1F4C8} \u05E6\u05DE\u05D9\u05D7\u05D4 (7 \u05D9\u05DE\u05D9\u05DD)");
    L.push(`\u2022 \u05E4\u05E0\u05D9\u05D5\u05EA \u05D7\u05D3\u05E9\u05D5\u05EA: ${w.leads.length}`);
    L.push(`\u2022 \u05DE\u05E0\u05D5\u05D9\u05D9\u05DD \u05D7\u05D3\u05E9\u05D9\u05DD \u05DC\u05E8\u05E9\u05D9\u05DE\u05D4: ${w.subsNew.length} \xB7 \u05E1\u05D4\u05F4\u05DB \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD: ${w.subsActive}`);
    L.push(`\u2022 \u05DE\u05D0\u05DE\u05E8\u05D9\u05DD \u05E9\u05E2\u05DC\u05D5 \u05DC\u05D0\u05EA\u05E8: ${w.arts.length}`);
    if (w.budget?.capMonthly) L.push("", `\u{1F9FE} \u05EA\u05E7\u05E6\u05D9\u05D1: \u05D4\u05D5\u05E6\u05D0\u05D5\u05EA \u05E7\u05D1\u05D5\u05E2\u05D5\u05EA ${nis(w.fixed)} \u05DC\u05D7\u05D5\u05D3\u05E9 \u05DE\u05EA\u05D5\u05DA \u05EA\u05E7\u05E8\u05D4 \u05E9\u05DC ${nis(w.budget.capMonthly)}`);
    if (w.upcoming.length) {
      L.push("", "\u{1F5D3} \u05D4\u05E9\u05D1\u05D5\u05E2 \u05D1\u05DC\u05D5\u05D7 \u05D4\u05D4\u05E9\u05E7\u05D4");
      w.upcoming.forEach((u) => L.push(`\u2022 ${u.date.slice(5).split("-").reverse().join(".")} ${u.title}${u.needsYou ? " (\u05E6\u05E8\u05D9\u05DA \u05D0\u05D5\u05EA\u05DA)" : ""}`));
    }
    await tg(L.join("\n"));
    return { ok: true };
  }
  async function monthly() {
    const now = ilNow();
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1), next = new Date(now.getFullYear(), now.getMonth(), 1), prevFirst = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const m = await numbers(ymd(first), ymd(next)), p = await numbers(ymd(prevFirst), ymd(first));
    const y0 = `${first.getFullYear()}-01-01`;
    const ytd = await numbers(y0, ymd(next));
    const fees = (x) => sum(x.signed, (d) => d.data.fee);
    const instPaid = (x) => sum(x.dueIn.filter((i) => i.status === "paid"), (i) => i.amount);
    const income = fees(m) + instPaid(m), incomePrev = fees(p) + instPaid(p), incomeYtd = fees(ytd) + instPaid(ytd);
    const target = Number(m.budget?.annualTarget || 87e4);
    const monthsGone = first.getMonth() + 1;
    const pace = incomeYtd / monthsGone * 12;
    const delta = incomePrev ? Math.round((income - incomePrev) / incomePrev * 100) : null;
    const L = [
      `\u{1F4D2} \u05D3\u05D5\u05D7 \u05D7\u05D5\u05D3\u05E9\u05D9 \xB7 ${HE_MONTHS[first.getMonth()]} ${first.getFullYear()}`,
      "",
      "\u{1F4B0} \u05D4\u05DB\u05E0\u05E1\u05D5\u05EA (\u05DC\u05E4\u05D9 \u05E9\u05DB\u05F4\u05D8 \u05E9\u05E0\u05E8\u05E9\u05DD \u05D1\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05E9\u05E0\u05D7\u05EA\u05DE\u05D5 + \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9 \u05D4\u05E1\u05D3\u05E8\u05D9\u05DD \u05E9\u05E1\u05D5\u05DE\u05E0\u05D5 \u05DB\u05E9\u05D5\u05DC\u05DE\u05D5)",
      `\u2022 \u05D4\u05D7\u05D5\u05D3\u05E9: ${nis(income)}${delta !== null ? ` (${delta >= 0 ? "+" : ""}${delta}% \u05DE\u05D5\u05DC \u05D4\u05D7\u05D5\u05D3\u05E9 \u05D4\u05E7\u05D5\u05D3\u05DD)` : ""}`,
      `\u2022 \u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05D7\u05D3\u05E9\u05D5\u05EA: ${m.signed.length} \xB7 \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9 \u05D4\u05E1\u05D3\u05E8\u05D9\u05DD \u05E9\u05E0\u05D2\u05D1\u05D5: ${nis(instPaid(m))} \u05DE\u05EA\u05D5\u05DA ${nis(sum(m.dueIn, (i) => i.amount))} \u05E9\u05D4\u05D9\u05D5 \u05E6\u05E4\u05D5\u05D9\u05D9\u05DD`,
      `\u2022 \u05DE\u05EA\u05D7\u05D9\u05DC\u05EA \u05D4\u05E9\u05E0\u05D4: ${nis(incomeYtd)} \xB7 \u05E7\u05E6\u05D1 \u05E9\u05E0\u05EA\u05D9: ${nis(pace)} \u05DE\u05D5\u05DC \u05D9\u05E2\u05D3 ${nis(target)} (${Math.round(pace / target * 100)}%)`,
      `\u2022 \u05E9\u05DB\u05F4\u05D8 \u05E4\u05EA\u05D5\u05D7 \u05DB\u05E8\u05D2\u05E2: ${m.unpaid.length} \u05EA\u05D9\u05E7\u05D9\u05DD, ${nis(sum(m.unpaid, (d) => d.data.fee))}`,
      `\u2022 \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05D1\u05D0\u05D9\u05D7\u05D5\u05E8: ${m.overdue.length} (${nis(sum(m.overdue, (i) => i.amount))})`,
      "",
      "\u{1F9FE} \u05D4\u05D5\u05E6\u05D0\u05D5\u05EA \u05E9\u05D9\u05D5\u05D5\u05E7 \u05D5\u05DB\u05DC\u05D9\u05DD",
      ...(m.budget?.items || []).filter((x) => x.status === "active").map((x) => `\u2022 ${x.name}: ${nis(x.monthly)}`),
      `\u2022 \u05E1\u05D4\u05F4\u05DB \u05E7\u05D1\u05D5\u05E2: ${nis(m.fixed)}${m.budget?.capMonthly ? ` \u05DE\u05EA\u05D5\u05DA \u05EA\u05E7\u05E8\u05D4 ${nis(m.budget.capMonthly)}` : ""}`,
      "",
      "\u{1F4C8} \u05E6\u05DE\u05D9\u05D7\u05D4",
      `\u2022 \u05E4\u05E0\u05D9\u05D5\u05EA \u05D7\u05D3\u05E9\u05D5\u05EA: ${m.leads.length} (\u05D7\u05D5\u05D3\u05E9 \u05E7\u05D5\u05D3\u05DD ${p.leads.length})`,
      `\u2022 \u05DE\u05E0\u05D5\u05D9\u05D9\u05DD \u05D7\u05D3\u05E9\u05D9\u05DD: ${m.subsNew.length} \xB7 \u05E1\u05D4\u05F4\u05DB \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD: ${m.subsActive}`,
      `\u2022 \u05DE\u05D0\u05DE\u05E8\u05D9\u05DD \u05E9\u05E2\u05DC\u05D5: ${m.arts.length}`,
      m.fixed && m.leads.length ? `\u2022 \u05E2\u05DC\u05D5\u05EA \u05DC\u05E4\u05E0\u05D9\u05D9\u05D4 (\u05D4\u05D5\u05E6\u05D0\u05D5\u05EA \u05E7\u05D1\u05D5\u05E2\u05D5\u05EA \u05D7\u05DC\u05E7\u05D9 \u05E4\u05E0\u05D9\u05D5\u05EA): ${nis(m.fixed / m.leads.length)}` : ""
    ].filter((x) => x !== "");
    await tg(L.join("\n"));
    await db().upsert({ coll: "reports", id: `m-${ymd(first).slice(0, 7)}`, data: { income, incomePrev, incomeYtd, pace, target, signed: m.signed.length, leads: m.leads.length, subsNew: m.subsNew.length, subsActive: m.subsActive, fixed: m.fixed, at: (/* @__PURE__ */ new Date()).toISOString() }, updated_at: (/* @__PURE__ */ new Date()).toISOString() });
    return { ok: true, income };
  }
  const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
  const b64 = (u) => {
    let s = "";
    for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode(...u.subarray(i, i + 32768));
    return btoa(s);
  };
  let fontCss = "";
  async function siteFonts() {
    if (fontCss) return fontCss;
    const w = [["Light", "300"], ["Regular", "normal"], ["Bold", "bold"]];
    const parts = await Promise.all(w.map(async ([n, wt]) => {
      const r = await fetch(`${SITE}/wp-content/uploads/2026/03/NotoSansHebrew-${n}.woff2`, { headers: { "user-agent": UA } });
      if (!r.ok) return "";
      return `@font-face{font-family:'Noto Local';font-style:normal;font-weight:${wt};font-display:block;src:url(data:font/woff2;base64,${b64(new Uint8Array(await r.arrayBuffer()))}) format('woff2')}`;
    }));
    return fontCss = parts.join("\n");
  }
  async function sitePreview(t, mode) {
    const st = await getDoc("nlstate", "sitepv") || {};
    if (!st.tok || t !== st.tok) return page("\u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05E3", "<p>\u05E7\u05D9\u05E9\u05D5\u05E8 \u05D4\u05EA\u05E6\u05D5\u05D2\u05D4 \u05D4\u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 \u05D4\u05D5\u05D7\u05DC\u05E3.</p>", 403);
    const { data: f } = await admin().from("app_files").select("body").eq("name", st.file || "nl-strip.html").maybeSingle();
    const r = await fetch(SITE + "/", { headers: { "user-agent": UA, accept: "text/html", "accept-language": "he-IL,he;q=0.9" } });
    let html = await r.text();
    const head = `<base href="${SITE}/"><meta name="robots" content="noindex"><style>${await siteFonts()}</style>`;
    html = html.replace(/<head([^>]*)>/i, `<head$1>${head}`);
    const focus = mode === "end" ? `<script>document.addEventListener('DOMContentLoaded',function(){var p=document.querySelector('[data-elementor-type="wp-page"]');if(!p)return;[].slice.call(p.children).slice(0,-1).forEach(function(e){e.style.display='none'});});<\/script>` : "";
    const strip2 = String(f?.body || "");
    const at = html.search(/<footer[^>]*data-elementor-type="footer"/i);
    html = at > 0 ? html.slice(0, at) + strip2 + focus + html.slice(at) : html.replace(/<\/body>/i, strip2 + focus + "</body>");
    return new Response(html, { headers: { ...cors, "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  }
  async function sitePreviewShots(b) {
    let st = await getDoc("nlstate", "sitepv") || {};
    if (!st.tok || b.newTok) {
      st = { ...st, tok: tok() };
      await merge("nlstate", "sitepv", { tok: st.tok, file: b.file || st.file || "nl-strip.html" });
    }
    const base = (env("PUBLIC_PAGE_BASE") || "https://dabullaw-glitch.github.io/dabul-office/portal.html").replace(/#.*$/, "");
    const v = Date.now().toString(36);
    const target = (mode) => `${base}#g=sitepv${mode}&t=${st.tok}&v=${v}`;
    const shots = {};
    const want = b.shots || [["desktop", 1366, 1500, "end"], ["mobile", 390, 2400, "end"]];
    for (const [name, vw, vh, mode] of want) {
      const u = `https://s0.wp.com/mshots/v1/${encodeURIComponent(target(mode === "end" ? "e" : ""))}?vpw=${vw}&vph=${vh}&w=${b.outW?.[name] || vw}&h=${Math.round(vh * ((b.outW?.[name] || vw) / vw))}`;
      let bytes = null, ct = "";
      for (let i = 0; i < 14 && !bytes; i++) {
        const r = await fetch(u, { redirect: "manual", headers: { "user-agent": UA } });
        ct = r.headers.get("content-type") || "";
        if (r.status === 200 && /image\/(jpeg|png)/.test(ct)) {
          const x = new Uint8Array(await r.arrayBuffer());
          if (x.length > 15e3) bytes = x;
        } else await r.body?.cancel();
        if (!bytes) await new Promise((res) => setTimeout(res, 6e3));
      }
      if (!bytes) {
        shots[name] = { ok: false, ct };
        continue;
      }
      const path = `previews/nl-strip-${name}-${v}.jpg`;
      await admin().storage.from("files").upload(path, bytes, { upsert: true, contentType: ct });
      shots[name] = { ok: true, path, size: bytes.length };
      if (b.telegram) {
        const token = env("TELEGRAM_BOT_TOKEN"), chat = env("TELEGRAM_CHAT_ID");
        const fd = new FormData();
        fd.append("chat_id", chat);
        fd.append("caption", name === "desktop" ? "\u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 \u05DE\u05D4\u05D0\u05EA\u05E8 (\u05DE\u05D7\u05E9\u05D1): \u05E8\u05E6\u05D5\u05E2\u05EA \u05D4\u05D4\u05E8\u05E9\u05DE\u05D4 \u05DC\u05E0\u05D9\u05D5\u05D6\u05DC\u05D8\u05E8 \u05DE\u05E2\u05DC \u05D4\u05EA\u05D7\u05EA\u05D9\u05EA. \u05E2\u05D5\u05D3 \u05DC\u05D0 \u05E0\u05E9\u05DE\u05E8 \u05D1\u05D0\u05EA\u05E8." : "\u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 \u05DE\u05D4\u05D0\u05EA\u05E8 (\u05D8\u05DC\u05E4\u05D5\u05DF). \u05E2\u05D5\u05D3 \u05DC\u05D0 \u05E0\u05E9\u05DE\u05E8 \u05D1\u05D0\u05EA\u05E8.");
        fd.append("document", new Blob([bytes], { type: ct }), `preview-${name}.jpg`);
        await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: "POST", body: fd }).catch(() => null);
      }
    }
    await merge("nlstate", "sitepv", { shots, at: (/* @__PURE__ */ new Date()).toISOString() });
    return { shots, link: target("") };
  }
  async function testIssue(b) {
    const issue = await getDoc("nl", String(b.id || ""));
    if (!issue?.content) return { error: "no issue" };
    const to = String(b.to || "");
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(to)) return { error: "bad to" };
    const { html, text } = renderIssue({ id: b.id, ...issue }, "preview" + "0".repeat(33));
    const subject = "[\u05D1\u05D3\u05D9\u05E7\u05D4] " + (issue.subject || issue.content.subject || "\u05E0\u05D9\u05D5\u05D6\u05DC\u05D8\u05E8");
    const r = await sendEmails([{ to, subject, html, text, t: "preview" + "0".repeat(33) }]);
    return { ...r, subject };
  }
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    await loadSecrets().catch(() => {
    });
    const url = new URL(req.url);
    const a = url.searchParams.get("a") || "", t = (url.searchParams.get("t") || "").replace(/[^a-f0-9]/g, "");
    try {
      if (a === "sub" && req.method === "POST") return await subscribe(req);
      if (a === "confirm") return await confirm(req, t);
      if (a === "file") return await file(t, url.searchParams.get("m") || "");
      if (a === "unsub") return await unsub(req, t);
      if (["nlok", "nlview", "nlstop", "nlredo"].includes(a)) return await nlAction(req, a, t);
      if (a === "sitepv" || a === "sitepve") return await sitePreview(t, a === "sitepve" ? "end" : "");
      const step = url.searchParams.get("step");
      if (!step) return json({ ok: false }, 404);
      const secret = env("CRON_SECRET");
      if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "unauthorized" }, 401);
      if (step === "nl-notify") return json(await notifyIssue(String(url.searchParams.get("id") || "").replace(/[^a-z0-9-]/gi, "")));
      if (step === "nl-send") return json(await sendRound());
      if (step === "sitepv-shot") return json(await sitePreviewShots(await req.json().catch(() => ({}))));
      if (step === "nl-test") return json(await testIssue(await req.json().catch(() => ({}))));
      if (step === "weekly") return json(await weekly());
      if (step === "monthly") return json(await monthly());
      if (step === "pull-file" && req.method === "POST") {
        const b = await req.json();
        const r = await fetch(String(b.url));
        if (!r.ok) return json({ ok: false, status: r.status });
        const bytes = new Uint8Array(await r.arrayBuffer());
        const { error } = await admin().storage.from("files").upload(String(b.path), bytes, { upsert: true, contentType: b.type || r.headers.get("content-type") || "application/octet-stream" });
        return json({ ok: !error, error: error?.message, size: bytes.length });
      }
      if (step === "put-file" && req.method === "POST") {
        const b = await req.json();
        const bytes = Uint8Array.from(atob(String(b.b64 || "")), (c) => c.charCodeAt(0));
        const { error } = await admin().storage.from("files").upload(String(b.path), bytes, { upsert: true, contentType: b.type || "application/pdf" });
        return json({ ok: !error, error: error?.message, size: bytes.length });
      }
      return json({ error: "step?" }, 400);
    } catch (e) {
      console.error(e);
      if (url.searchParams.get("step")) await tg("\u26A0\uFE0F \u05DE\u05E0\u05D5\u05E2 \u05D4\u05E6\u05DE\u05D9\u05D7\u05D4 \u05E0\u05EA\u05E7\u05DC \u05D1\u05E9\u05D2\u05D9\u05D0\u05D4: " + String(e.message || e).slice(0, 300));
      return a ? page("\u05DE\u05E9\u05D4\u05D5 \u05D4\u05E9\u05EA\u05D1\u05E9", "<p>\u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05D1\u05E2\u05D5\u05D3 \u05D3\u05E7\u05D4.</p>", 500) : json({ ok: false, error: String(e.message || e) }, 500);
    }
  });
}
export {
  start
};
