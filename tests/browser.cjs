// Development-only browser integration tests; never uses the user's normal profile.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http');
let pw;try{pw=require('playwright');}catch{pw=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results');fs.mkdirSync(out,{recursive:true});
const url=process.env.TEST_URL||'http://127.0.0.1:8769';const checks=[];
async function run(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
(async()=>{
const exe=pw.chromium.executablePath();const browser=await pw.chromium.launch(fs.existsSync(exe)?{headless:true}:{headless:true,channel:'msedge'});
try{
const ctx=await browser.newContext({viewport:{width:1365,height:1000}}),page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await page.waitForSelector('.prompt');
await run('initial shell, old bank isolation and offline preparation',async()=>{
 assert.match(await page.title(),/2学期中間/);assert.match(await page.locator('#scopeCount').textContent(),/108問/);assert.match(await page.locator('#offlineStatus').textContent(),/準備ができました/);
 assert.equal(await page.locator('.hint').count(),0);assert.equal(await page.locator('.source:visible').count(),1); // importance note only
 await page.evaluate(()=>localStorage.setItem('seikeiStudyProgressV2',JSON.stringify({stats:{ok:999},weak:{'old-question':999}})));
 await page.reload();assert.equal(await page.locator('#okCount').textContent(),'0');
});
await run('recall rejects fragments; feedback waits for next; reload preserves progress',async()=>{
 await page.locator('[data-mode="recall"]').click();await page.locator('#answerInput').fill('あ');await page.locator('#answerForm button').click();
 assert.equal(await page.locator('#missCount').textContent(),'1');assert.ok(await page.locator('#nextBtn').isVisible());const prompt=await page.locator('.prompt').textContent();
 await page.waitForTimeout(2100);assert.equal(await page.locator('.prompt').textContent(),prompt);await page.reload();assert.equal(await page.locator('#missCount').textContent(),'1');
});
await run('weak-only, unknown, empty filter and full review',async()=>{
 await page.locator('#weakBtn').click();assert.match(await page.locator('.prompt').textContent(),/.+/);await page.locator('#unknown').click();await page.locator('#nextBtn').click();
 await page.locator('[data-mode="calc"]').click();await page.locator('#importance').selectOption('B');assert.match(await page.locator('#gameArea').textContent(),/該当する問題がありません/);
 await page.locator('#reviewBtn').click();assert.ok(await page.locator('.prompt').isVisible());
});
await run('choice scoring and double-submit protection',async()=>{
 await page.locator('[data-mode="choice"]').click();const q=await page.evaluate(()=>state.current);const before=await page.locator('#okCount').textContent();await page.locator(`[data-choice="${q.answer}"]`).click();
 assert.equal(Number(await page.locator('#okCount').textContent()),Number(before)+1);assert.ok(await page.locator('#feedback ul').isVisible());assert.equal(await page.locator('.question-body button:enabled').count(),0);
});
await run('judge needs verdict plus correction, including incorrect reason',async()=>{
 await page.locator('[data-mode="judge"]').click();const q=await page.evaluate(()=>state.current),before=await page.locator('#okCount').textContent();
 await page.locator(`[data-judge="${q.answer}"]`).click();assert.equal(await page.locator('#okCount').textContent(),before);assert.equal(await page.locator('#nextBtn').count(),0);
 await page.locator('[data-correction="1"]').click();assert.match(await page.locator('#feedback').textContent(),/確認し直しましょう/);
 await page.locator('#nextBtn').click();const next=await page.evaluate(()=>state.current);await page.locator(`[data-judge="${next.answer}"]`).click();await page.locator('[data-correction="0"]').click();assert.match(await page.locator('#feedback').textContent(),/^正解/);
});
await run('order input and numeric calculation',async()=>{
 await page.locator('[data-mode="order"]').click();const q=await page.evaluate(()=>state.current);for(const text of q.answer)await page.locator('[data-order]').getByText(text,{exact:true}).click();await page.locator('#submitOrder').click();assert.match(await page.locator('#feedback').textContent(),/^正解/);
 await page.locator('[data-mode="calc"]').click();const calc=await page.evaluate(()=>state.current);await page.locator('#answerInput').fill(calc.answer);await page.locator('#answerForm button').click();assert.match(await page.locator('#feedback').textContent(),/^正解/);
});
await run('unit and importance filters, responsive 360px without horizontal overflow',async()=>{
 await page.locator('#reviewBtn').click();await page.locator('#importance').selectOption('B');assert.equal(await page.evaluate(()=>state.current.importance),'B');await page.locator('#importance').selectOption('all');await page.locator('[data-unit="地方自治"]').click();assert.equal(await page.evaluate(()=>state.current.unit),'地方自治');
 await page.setViewportSize({width:360,height:800});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});await page.locator('#unknown').click();assert.ok(await page.locator('#nextBtn').isVisible());
 await page.setViewportSize({width:1365,height:1000});await page.locator('#reviewBtn').click();await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});await page.screenshot({path:path.join(out,'desktop-preview.png')});
});
await run('50-question round completes while delayed mistakes do not starve new questions',async()=>{
 await page.locator('#reviewBtn').click();await page.locator('#startBtn').click();const seen=new Set();
 for(let i=0;i<50;i++){seen.add(await page.evaluate(()=>state.current.id));await page.locator('#unknown').click();await page.locator('#nextBtn').click();}
 assert.match(await page.locator('#gameArea').textContent(),/今回の50問が終了/);assert.ok(seen.size>=30,'new topics must remain reachable');
});
await run('offline reload plus print and coverage and missing assets',async()=>{
 await ctx.setOffline(true);await page.reload();assert.ok(await page.locator('.prompt').isVisible());await page.locator('#unknown').click();assert.ok(await page.locator('#nextBtn').isVisible());
 await page.goto(url+'/print.html');assert.equal(await page.locator('.objective').count(),32);await page.goto(url+'/coverage.html');assert.equal(await page.locator('tbody tr').count(),180);
 const missing=await page.evaluate(async()=>{const r=await fetch('./not-a-real-module.js');return {status:r.status,type:r.headers.get('content-type')};});assert.equal(missing.status,503);assert.match(missing.type,/text\/plain/);
 await ctx.setOffline(false);await page.goto(url);assert.equal(errors.length,0,errors.join('\n'));
});
await run('isolated reset clears new state while preserving old exam key',async()=>{
 page.once('dialog',dialog=>dialog.accept());await page.locator('#resetBtn').click();assert.equal(await page.locator('#missCount').textContent(),'0');assert.equal(await page.locator('#weakCount').textContent(),'0');
 assert.ok(await page.evaluate(()=>localStorage.getItem('seikeiStudyProgressV2')));await page.reload();assert.equal(await page.locator('#okCount').textContent(),'0');
});
await run('A4 print export and text references',async()=>{
 const p=await ctx.newPage();await p.goto(url+'/print.html');await p.emulateMedia({media:'print'});
 fs.mkdirSync(path.join(root,'output/pdf'),{recursive:true});await p.pdf({path:path.join(root,'output/pdf/seikei-midterm-202610.pdf'),preferCSSPageSize:true,printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="width:100%;text-align:center;font-size:8px;color:#666">政経 2学期中間 2026-10-10　<span class="pageNumber"></span> / <span class="totalPages"></span></div>'});await p.close();
});
await ctx.close();
// Real service-worker upgrade in a separate origin, starting with a minimal old release.
await run('upgrade old worker cache atomically and preserve unrelated cache',async()=>{
 let legacy=true;
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(legacy){res.setHeader('Content-Type',pathname.endsWith('.js')?'text/javascript':'text/html');res.end(pathname==='/service-worker.js'?`const C='seikei-study-v2';self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html'])));self.skipWaiting()});self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)))});`:`<p>OLD EXAM</p><script>navigator.serviceWorker.register('./service-worker.js')</script>`);return;}
  const p=path.join(root,pathname==='/'?'index.html':pathname);try{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.json')?'application/json':p.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(p));}catch{res.statusCode=404;res.end('not found');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const upgrade=await browser.newContext(),p=await upgrade.newPage();try{
 await p.goto(base);await p.waitForFunction(()=>!!navigator.serviceWorker.controller);await p.evaluate(()=>caches.open('unrelated-app-cache').then(c=>c.put('/keep',new Response('keep'))));
 legacy=false;await p.evaluate(async()=>{const changed=new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(true),{once:true}));const reg=await navigator.serviceWorker.getRegistration();await reg.update();await changed;});
 await p.waitForFunction(async()=>!(await caches.keys()).includes('seikei-study-v2'));
 await p.reload();await p.waitForSelector('.prompt');assert.match(await p.title(),/2学期中間/);assert.ok((await p.evaluate(()=>caches.keys())).includes('unrelated-app-cache'));
 await upgrade.setOffline(true);await p.reload();await p.waitForSelector('.prompt');
 }finally{await upgrade.close();await new Promise(r=>server.close(r));}
});
fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:checks.length,checks,errors},null,2));
console.log('BROWSER CHECKS '+checks.length);
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
