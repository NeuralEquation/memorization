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
async function settings(field,value){
 if(await page.locator('#studyView').isHidden())await page.locator('[data-view="study"]').click();
 await page.locator('#filterBtn').click();
 if(field==='mode'||field==='unit')await page.locator('[data-'+field+'="'+value+'"]').click();else await page.locator('#'+field).selectOption(value);
 await page.locator('#applyFilters').click();
}
async function progressAction(id){await page.locator('[data-view="progress"]').click();if(id==='resetBtn')await page.locator('#resetBtn').locator('..').locator('summary').click();await page.locator('#'+id).click();}

await page.goto(url+"/?mode=practice");await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await page.waitForSelector('.prompt');
await run('initial shell, old bank isolation and offline preparation',async()=>{
 assert.match(await page.title(),/2学期中間/);assert.match(await page.locator('#scopeCount').textContent(),/238問/);assert.match(await page.locator('#offlineStatus').textContent(),/準備ができました/);
 assert.equal(await page.locator('.hint').count(),0);assert.equal(await page.locator('.question-body .source:visible').count(),0); // no answer/source hints before answering
 await page.evaluate(()=>localStorage.setItem('seikeiStudyProgressV2',JSON.stringify({stats:{ok:999},weak:{'old-question':999}})));
 await page.reload();assert.equal(await page.locator('#okCount').textContent(),'0');
});
await run('navigation keeps the active question and draft settings cancel without changing it',async()=>{
 const id=await page.evaluate(()=>state.current.id);await page.locator('#filterBtn').click();await page.locator('[data-mode="calc"]').click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>state.current.id),id);assert.equal(await page.evaluate(()=>state.mode),'all');
 for(const view of ['library','materials','progress','study']){await page.locator('[data-view="'+view+'"]').click();assert.ok(await page.locator('#'+view+'View').isVisible());}assert.equal(await page.evaluate(()=>state.current.id),id);
 await page.locator('[data-view="library"]').click();await page.locator('#searchInput').fill('地方');assert.ok(await page.locator('.mini-card').count()>0);await page.locator('.mini-card summary').first().click();assert.ok(await page.locator('.lesson-body').first().isVisible());await page.locator('[data-view="study"]').click();assert.equal(await page.evaluate(()=>state.current.id),id);
});
await run('mobile starts with the question, fixed navigation and usable settings at 320/360/390px',async()=>{
 for(const width of [320,360,390]){
  await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0));const pos=await page.locator('.question-card').boundingBox();assert.ok(pos.y<340,'question should start in first screen');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const nav=await page.locator('.main-nav').boundingBox();assert.ok(nav.y+nav.height<=845);assert.ok(nav.y>740);await page.locator('#filterBtn').click();assert.ok(await page.locator('#filterDialog').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#closeFilters').click();
 }
 await page.setViewportSize({width:1365,height:1000});
});
await run('changing views preserves typed answers, partial ordering and answered feedback',async()=>{
 await settings('mode','recall');await page.locator('#answerInput').fill('入力途中');const id=await page.evaluate(()=>state.current.id);await page.locator('[data-view="library"]').click();await page.locator('[data-view="study"]').click();assert.equal(await page.locator('#answerInput').inputValue(),'入力途中');assert.equal(await page.evaluate(()=>state.current.id),id);
 await settings('mode','order');await page.locator('[data-order]').first().click();const order=await page.locator('#orderList').textContent();await page.locator('[data-view="materials"]').click();await page.locator('[data-view="study"]').click();assert.equal(await page.locator('#orderList').textContent(),order);
 await page.locator('#unknown').click();const turns=await page.evaluate(()=>progress.turn);await page.locator('[data-view="progress"]').click();await page.locator('[data-view="study"]').click();assert.ok(await page.locator('#nextBtn').isVisible());assert.equal(await page.evaluate(()=>progress.turn),turns);
 // Isolated test context only: restore a clean baseline for subsequent exact counters.
 await page.evaluate(()=>{progress=C.empty(data.version);save();resetFilters();});
});
await run('all 238 question texts remain complete after presentation formatting',async()=>{
 const checked=await page.evaluate(()=>{const norm=t=>t.replace(/\s/g,'');for(const q of data.questions){state.current=q;state.locked=false;renderQuestion();const text=norm(document.querySelector('.question-body').textContent);for(const line of q.prompt.split('\n').filter(Boolean)){if(!text.includes(norm(line)))throw Error('Missing text: '+q.id);}}resetFilters();return data.questions.length;});assert.equal(checked,238);
});
await run('visual review of long questions, settings and all four views on phone/tablet/desktop',async()=>{
 await page.evaluate(()=>{state.current=data.questions.find(q=>q.id==='N08-A1');state.locked=false;renderQuestion();});
 for(const width of [390,768,1365]){
  await page.setViewportSize({width,height:width===390?844:1000});
  for(const view of ['study','library','materials','progress']){
   await page.locator('[data-view="'+view+'"]').click();await page.evaluate(()=>scrollTo(0,0));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+' '+view);
   if(width!==768)await page.screenshot({path:path.join(out,'layout-'+width+'-'+view+'.png'),fullPage:view==='study'});
  }
  await page.locator('[data-view="study"]').click();await page.locator('#filterBtn').click();if(width!==768)await page.screenshot({path:path.join(out,'layout-'+width+'-settings.png')});await page.keyboard.press('Escape');
 }
 await page.evaluate(()=>resetFilters());
});
await run('recall rejects fragments; feedback waits for next; reload preserves progress',async()=>{
 await settings('mode','recall');await page.locator('#answerInput').fill('あ');await page.locator('#answerForm button').click();
 assert.equal(await page.locator('#missCount').textContent(),'1');assert.ok(await page.locator('#nextBtn').isVisible());const prompt=await page.locator('.prompt').textContent();
 await page.waitForTimeout(2100);assert.equal(await page.locator('.prompt').textContent(),prompt);await page.reload();assert.equal(await page.locator('#missCount').textContent(),'1');
});
await run('weak-only, unknown, empty filter and full review',async()=>{
 await progressAction('weakBtn');assert.match(await page.locator('.prompt').textContent(),/.+/);await page.locator('#unknown').click();await page.locator('#nextBtn').click();
 await settings('mode','calc');await settings('importance','B');assert.match(await page.locator('#gameArea').textContent(),/該当する問題がありません/);
 await progressAction('reviewBtn');assert.ok(await page.locator('.prompt').isVisible());
});
await run('choice scoring and double-submit protection',async()=>{
 await settings('mode','choice');const q=await page.evaluate(()=>state.current);const before=await page.locator('#okCount').textContent();await page.locator(`[data-choice="${q.answer}"]`).click();
 assert.equal(Number(await page.locator('#okCount').textContent()),Number(before)+1);assert.ok(await page.locator('#feedback ul').isVisible());assert.equal(await page.locator('.question-body button:enabled').count(),0);
});
await run('judge needs verdict plus correction, including incorrect reason',async()=>{
 await settings('mode','judge');const q=await page.evaluate(()=>state.current),before=await page.locator('#okCount').textContent();
 await page.locator(`[data-judge="${q.answer}"]`).click();assert.equal(await page.locator('#okCount').textContent(),before);assert.equal(await page.locator('#nextBtn').count(),0);
 await page.locator('[data-correction="1"]').click();assert.match(await page.locator('#feedback').textContent(),/確認し直しましょう/);
 await page.locator('#nextBtn').click();const next=await page.evaluate(()=>state.current);await page.locator(`[data-judge="${next.answer}"]`).click();await page.locator('[data-correction="0"]').click();assert.match(await page.locator('#feedback').textContent(),/^正解/);
});
await run('order input and numeric calculation',async()=>{
 await settings('mode','order');const q=await page.evaluate(()=>state.current);for(const text of q.answer)await page.locator('[data-order]').getByText(text,{exact:true}).click();await page.locator('#submitOrder').click();assert.match(await page.locator('#feedback').textContent(),/^正解/);
 await settings('mode','calc');const calc=await page.evaluate(()=>state.current);await page.locator('#answerInput').fill(calc.answer);await page.locator('#answerForm button').click();assert.match(await page.locator('#feedback').textContent(),/^正解/);
});
await run('unit and importance filters, responsive 360px without horizontal overflow',async()=>{
 await progressAction('reviewBtn');await settings('importance','B');assert.equal(await page.evaluate(()=>state.current.importance),'B');await settings('importance','all');await settings('unit','地方自治');assert.equal(await page.evaluate(()=>state.current.unit),'地方自治');
 await page.setViewportSize({width:360,height:800});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});await page.locator('#unknown').click();assert.ok(await page.locator('#nextBtn').isVisible());
 await page.setViewportSize({width:1365,height:1000});await progressAction('reviewBtn');await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});await page.screenshot({path:path.join(out,'desktop-preview.png')});
});
await run('50-question round completes while delayed mistakes do not starve new questions',async()=>{
 await progressAction('reviewBtn');await page.locator('#startBtn').click();const seen=new Set();
 for(let i=0;i<50;i++){seen.add(await page.evaluate(()=>state.current.id));await page.locator('#unknown').click();await page.locator('#nextBtn').click();}
 assert.match(await page.locator('#gameArea').textContent(),/今回の50問が終了/);assert.ok(seen.size>=30,'new topics must remain reachable');
});
await run('offline reload plus print and coverage and missing assets',async()=>{
 await ctx.setOffline(true);await page.reload();assert.ok(await page.locator('.prompt').isVisible());await page.locator('#unknown').click();assert.ok(await page.locator('#nextBtn').isVisible());
 await page.goto(url+'/print-complete.html');assert.equal(await page.locator('.objective').count(),68);await page.goto(url+'/coverage.html');assert.equal(await page.locator('tbody tr').count(),180);
 const missing=await page.evaluate(async()=>{const r=await fetch('./not-a-real-module.js');return {status:r.status,type:r.headers.get('content-type')};});assert.equal(missing.status,503);assert.match(missing.type,/text\/plain/);
 await ctx.setOffline(false);await page.goto(url+"/?mode=practice");assert.equal(errors.length,0,errors.join('\n'));
});
await run('progress export, validated preview, cancel, restore, reload and undo',async()=>{
 const exported=await page.evaluate(()=>JSON.stringify(progress));const oldTurns=JSON.parse(exported).turn;
 await page.locator('#unknown').click();const before=await page.evaluate(()=>JSON.stringify(progress));
 await progressAction('importBtn');await page.locator('#progressFile').setInputFiles({name:'progress.json',mimeType:'application/json',buffer:Buffer.from(exported)});
 await page.waitForFunction(()=>!document.getElementById('applyImport').disabled);assert.equal(await page.evaluate(()=>progress.turn),oldTurns+1);assert.match(await page.locator('#importPreview').textContent(),/置き換え/);
 await page.locator('#cancelImport').click();assert.equal(await page.evaluate(()=>JSON.stringify(progress)),before);
 await progressAction('importBtn');await page.locator('#progressFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{')});await page.waitForFunction(()=>document.getElementById('importPreview').textContent.includes('中止'));assert.ok(await page.locator('#applyImport').isDisabled());assert.equal(await page.evaluate(()=>JSON.stringify(progress)),before);
 await page.locator('#progressFile').setInputFiles({name:'progress.json',mimeType:'application/json',buffer:Buffer.from(exported)});await page.waitForFunction(()=>!document.getElementById('applyImport').disabled);await page.locator('#applyImport').click();assert.equal(await page.evaluate(()=>JSON.stringify(progress)),exported);
 await page.reload();assert.equal(await page.evaluate(()=>progress.turn),oldTurns);await progressAction('importBtn');await page.locator('#undoImport').click();assert.equal(await page.evaluate(()=>JSON.stringify(progress)),before);await page.locator('#cancelImport').click();
});
await run('unmastered priority and mastered fallback agree with their visible status',async()=>{
 await page.evaluate(()=>{progress=C.empty(data.version);const set=data.questions.filter(q=>q.objective==='S01');for(const q of set){C.record(progress,q,true,1000);C.record(progress,q,true,1000+C.INTERVAL);}save();});
 await progressAction('reviewBtn');await settings('importance','B');await settings('unit','政治制度');await settings('studyFilter','unmastered');assert.equal(await page.evaluate(()=>state.current.objective),'S02');assert.match(await page.locator('#filterStatus').textContent(),/先に出題/);
 await page.evaluate(()=>{for(const q of data.questions.filter(q=>q.objective==='S02')){C.record(progress,q,true,1000);C.record(progress,q,true,1000+C.INTERVAL);}save();});await settings('studyFilter','all');await settings('studyFilter','unmastered');assert.match(await page.locator('#filterStatus').textContent(),/復習に切り替え/);assert.ok(await page.locator('.prompt').isVisible());await progressAction('reviewBtn');
});
await run('every new chart/table renders and grades at 360px, without leaking feedback',async()=>{
 await page.setViewportSize({width:360,height:800});
 for(const id of ['N27-D1','N29-D1','N31-D1','N31-D2','N31-D3','N32-D1','N08-A1']){
  await page.evaluate(id=>{state.current=data.questions.find(q=>q.id===id);state.locked=false;renderQuestion();},id);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id);
  assert.match(await page.locator('#feedback').textContent(),/^解答後/);const q=await page.evaluate(()=>state.current);assert.equal(await page.locator('[data-choice]').count(),4);await page.locator(`[data-choice="${q.answer}"]`).click();assert.match(await page.locator('#feedback').textContent(),/^正解/);
  if(id==='N31-D1')await page.screenshot({path:path.join(out,'mobile-data.png'),fullPage:true});
 }
 await page.setViewportSize({width:1365,height:1000});await progressAction('reviewBtn');
});
await run('short print is ten A4 sheets with no internal overflow',async()=>{
 await page.goto(url+'/print-short.html');await page.emulateMedia({media:'print'});assert.equal(await page.locator('.sheet').count(),10);
 const over=await page.locator('.sheet').evaluateAll(es=>es.map((e,i)=>({page:i+1,overflow:e.scrollHeight-e.clientHeight})).filter(x=>x.overflow>2));assert.deepEqual(over,[]);await page.emulateMedia({media:'screen'});await page.goto(url+"/?mode=practice");
});
await run('isolated reset clears new state while preserving old exam key',async()=>{
 page.once('dialog',dialog=>dialog.accept());await progressAction('resetBtn');assert.equal(await page.locator('#missCount').textContent(),'0');assert.equal(await page.locator('#weakCount').textContent(),'0');
 assert.ok(await page.evaluate(()=>localStorage.getItem('seikeiStudyProgressV2')));await page.reload();assert.equal(await page.locator('#okCount').textContent(),'0');
});
await ctx.close();
// Real service-worker upgrade in a separate origin, starting with a minimal old release.
await run('upgrade actual previous quest release and cache v6, preserve progress and unrelated cache',async()=>{
 let legacy=true;
 const {execFileSync}=require('node:child_process'),oldRef='dca248d3e3be30ca62a3062c239f285b0c983700';
 const oldFiles=new Map();for(const file of ['index.html','styles.css','quests.css','data/quests.js','quest-core.js','quest-app.js','reports/quest-coverage.json','manifest.webmanifest','icons/icon.svg','data/study-data.js','core.js','app.js','print.html','coverage.html','coverage.csv','data/coverage.json','data/coverage-atoms.json','reports/objective-delta.md','print-complete.html','print-short.html','sources.html','service-worker.js'])oldFiles.set('/'+file,execFileSync('git',['show',oldRef+':'+file],{cwd:root}));oldFiles.set('/',oldFiles.get('/index.html'));
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(legacy){res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':pathname.endsWith('.js')?'text/javascript':pathname.endsWith('.svg')?'image/svg+xml':pathname.endsWith('.json')||pathname.endsWith('.webmanifest')?'application/json':'text/html');if(oldFiles.has(pathname))res.end(oldFiles.get(pathname));else{res.statusCode=404;res.end('not found');}return;}
  const p=path.join(root,pathname==='/'?'index.html':pathname);try{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',p.endsWith('.css')?'text/css':p.endsWith('.js')?'text/javascript':p.endsWith('.json')?'application/json':p.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(p));}catch{res.statusCode=404;res.end('not found');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const upgrade=await browser.newContext(),p=await upgrade.newPage();try{
 await p.goto(base+"/?mode=practice");await p.waitForFunction(()=>!!navigator.serviceWorker.controller);await p.waitForSelector('.prompt');assert.match(await p.locator('#scopeCount').textContent(),/238問/);
 await p.locator('#unknown').click();await p.evaluate(()=>caches.open('unrelated-app-cache').then(c=>c.put('/keep',new Response('keep'))));
 legacy=false;await p.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
 await p.waitForFunction(async()=>!(await caches.keys()).includes('seikei-midterm-202610-6'));
 await p.reload();await p.waitForSelector('.prompt');assert.match(await p.locator('#scopeCount').textContent(),/238問/);assert.equal(await p.locator('#missCount').textContent(),'1');assert.ok((await p.evaluate(()=>caches.keys())).includes('unrelated-app-cache'));
 await upgrade.setOffline(true);await p.reload();await p.waitForSelector('.prompt');assert.equal(await p.locator('[data-view]').count(),5);assert.ok((await p.evaluate(()=>caches.keys())).includes('seikei-midterm-202610-7'));assert.match(await p.locator('.app-shell').evaluate(e=>getComputedStyle(e).display),/grid/);
 }finally{await upgrade.close();await new Promise(r=>server.close(r));}
});
fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:checks.length,checks,errors},null,2));
console.log('BROWSER CHECKS '+checks.length);
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
