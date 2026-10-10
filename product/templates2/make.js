// Builds the five office sample documents (drafts for Yakir's approval).
process.chdir(__dirname);
(async () => {
  for (const m of ['rent', 'will', 'handover', 'docslist', 'letter']) { await require('./' + m)(); console.log('ok', m); }
})().catch((e) => { console.error(e); process.exit(1); });
