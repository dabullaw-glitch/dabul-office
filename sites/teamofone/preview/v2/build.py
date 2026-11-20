import base64,json,re,os
s=open('src.html',encoding='utf-8').read()
def uri(n): return 'data:image/webp;base64,'+base64.b64encode(open(f'img/{n}.webp','rb').read()).decode()
I={
'pen':'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
'film':'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/>',
'check':'<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/><path d="M8 11l2 2 4-4"/>',
'cal':'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>',
'chat':'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
'mic':'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
'star':'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
'brush':'<path d="M9.5 14.5l-4 4a2 2 0 0 0 2.8 2.8l4-4"/><path d="M14 4l6 6-7 7-6-6z"/>',
}
s=re.sub(r'\{\{i-(\w+)\}\}',lambda m:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+I[m.group(1)]+'</svg>',s)
names=set(re.findall(r'\{\{([a-z0-9-]+)\}\}',s))
js=set(re.findall(r"\['([a-z0-9]+)','",s.split('var W1=')[1].split('var IMG')[0]))
s=s.replace('{{IMGMAP}}',json.dumps({n:uri(n) for n in sorted(js)}))
for n in names: s=s.replace('{{'+n+'}}',uri(n))
assert '{{' not in s
for w in ['—','–','הכי','מומחה','חינם']: print(w,s.count(w))
open('index.html','w',encoding='utf-8').write(s); print(len(s)//1024,'KB')
