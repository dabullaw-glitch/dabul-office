import asyncio,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for w,h,n in [(390,844,'m'),(1440,900,'d')]:
            pg=await b.new_page(viewport={'width':w,'height':h},device_scale_factor=1, reduced_motion='reduce')
            msgs=[]
            pg.on('console',lambda m: msgs.append(m.text) if m.type=='error' else None)
            pg.on('pageerror',lambda e: msgs.append(str(e)))
            await pg.goto('file:///home/claude/work/dabul-office/sites/teamofone/preview/index.html')
            await pg.wait_for_timeout(1500)
            await pg.evaluate("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'));document.querySelectorAll('[data-n]').forEach(e=>e.textContent=e.dataset.n)")
            sw=await pg.evaluate("document.documentElement.scrollWidth")
            await pg.screenshot(path=f'/tmp/to-{n}.png',full_page=True)
            print(n,'scrollWidth',sw,'errors',msgs[:5])
        await b.close()
asyncio.run(main())
