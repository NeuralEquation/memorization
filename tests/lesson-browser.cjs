// A separate temporary browser profile; no user storage is read or modified.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let pw;try{pw=require('playwright');}catch{pw=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const url=process.env.TEST_URL||'http://127.0.0.1:8769',out=path.resolve('test-results'),key='seikei-quest-202610-v1';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await pw.chromium.launch({channel:'msedge',headless:true});try{
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[],visited=[],screenshots=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const state=()=>page.evaluate(key=>{const p=JSON.parse(localStorage.getItem(key)),cat=QuestCore.catalog(STUDY_DATA,QUEST_DATA),s=QuestCore.current(p,cat),r=QuestCore.run(p);return {s,r,q:s&&cat.questions[s.questionId],c:s?.kind==='lesson'?s.cards[r.draft.lessonPage||0]:null};},key);
 const answer=async q=>{if(q.kind==='explain')await page.locator('[name=questSelf][value=yes]').check();if(['choice','compare'].includes(q.type))await page.locator('[data-qchoice="'+q.answer+'"]').click();else if(q.type==='judge'){await page.locator('[data-qverdict="'+q.answer+'"]').click();await page.locator('[data-qcorrection="'+q.correctionAnswer+'"]').click();}else if(q.type==='order'){for(const text of q.answer)await page.locator('[data-qorder]').getByText(text,{exact:true}).click();await page.locator('#questCheckOrder').click();}else{await page.locator('#questAnswerInput').fill(String(q.answer));await page.locator('#questAnswerForm button').click();}};
 for(let n=1;n<=37;n++){const id='Q'+String(n).padStart(2,'0');await page.locator('[data-quest="'+id+'"]').click();let count=0;
  while(true){const {s,r,q,c}=await state();if(r.done)break;assert.ok(count++<120,id);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id+' page overflow');
   if(c){assert.equal(await page.locator('.quest-lesson h2').textContent(),c.title);visited.push({quest:id,card:c.id});
    if(['Q01','Q04','Q14','Q25','Q31'].includes(id)&&c.kind==='worked'&&!screenshots.includes(id)){await page.screenshot({path:path.join(out,'lesson-'+id+'-390.png'),fullPage:true});screenshots.push(id);
     const before=c.id;await page.locator('#questLessonBack').click();await page.locator('#questContinue').click();assert.equal((await state()).c.id,before);
     await page.locator('#questPause').click();await page.reload();await page.locator('#questResume').click();assert.equal((await state()).c.id,before);
     if(id==='Q14'){await page.setViewportSize({width:1365,height:1000});await page.screenshot({path:path.join(out,'lesson-Q14-1365.png'),fullPage:true});await page.setViewportSize({width:390,height:844});}
    }
    await page.locator('#questContinue').click();
   }else{await answer(q);if(q.id==='S01-J'){assert.ok(await page.locator('.lesson-feedback-path').isVisible());}await page.locator('#questNext').click();}
  }
  assert.match(await page.locator('.quest-finish h2').textContent(),/クリア/);await page.locator('#questFinishMap').click();console.log('PASS '+id+' all lesson pages and correct UI answers');
 }
 assert.equal(new Set(visited.map(v=>v.card)).size,await page.evaluate(()=>Object.values(QUEST_DATA.lessons.decks).reduce((n,c)=>n+c.length,0)));
 await page.locator('[data-quest=Q14]').evaluate(el=>{el.closest('details').open=true;});await page.locator('[data-quest=Q14]').click();await ctx.setOffline(true);await page.reload();assert.ok(await page.locator('.quest-lesson').isVisible());await page.locator('#questContinue').click();assert.equal((await state()).r.draft.lessonPage,1);await ctx.setOffline(false);
 // A wrong answer offers individually expandable teaching and the actual rationale.
 while((await state()).c)await page.locator('#questContinue').click();await page.locator('#questUnknown').click();await page.locator('.lesson-reteach > summary').click();assert.ok(await page.locator('.lesson-review-card > summary').count()>0);await page.locator('.lesson-review-card > summary').first().click();assert.ok(await page.locator('.lesson-review-card[open] h2').isVisible());
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'lesson-browser-results.json'),JSON.stringify({quests:37,lessonPages:visited.length,screenshots,errors,checks:['all lesson pages rendered on mobile','all original/intro answers through UI','priority lesson back/pause/reload','desktop Q14','offline lesson advance','wrong answer expandable reteaching']},null,2));console.log('LESSON BROWSER 37 QUESTS '+visited.length+' PAGES');await ctx.close();
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
