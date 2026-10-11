'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Q=require('../quest-core.js'),C=require('../core.js'),box={window:{}};
for(const file of ['data/study-data.js','data/quests.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),box);
const study=JSON.parse(JSON.stringify(box.window.STUDY_DATA)),source=JSON.parse(JSON.stringify(box.window.QUEST_DATA)),cat=Q.catalog(study,source);
const answer=q=>q.type==='judge'?{verdict:q.answer,correction:q.correctionAnswer}:q.answer;
function finish(p,id,now=1000,ok=true){Q.start(p,cat,10,now,id);let guard=0;while(Q.current(p,cat)){assert.ok(guard++<100);const s=Q.current(p,cat);if(s.kind!=='lesson')Q.submit(p,cat,ok?answer(cat.questions[s.questionId]):null,true,now);Q.advance(p,cat,now);}return p;}
test('37 dependency-ordered quests cover exactly 68 objectives, 238 existing questions, 218 atoms, 180 rows',()=>{
 assert.equal(source.quests.length,37);assert.equal(new Set(source.quests.flatMap(q=>q.objectives)).size,68);assert.equal(source.quests.flatMap(q=>q.objectives).length,68);
 const ids=source.quests.flatMap(q=>q.questionIds);assert.equal(ids.length,238);assert.equal(new Set(ids).size,238);assert.deepEqual(ids.slice().sort(),study.questions.map(q=>q.id).sort());
 assert.equal(new Set(source.quests.flatMap(q=>q.atomIds)).size,218);assert.equal(source.coverage.length,180);
 const original=JSON.parse(fs.readFileSync('data/coverage.json','utf8'));
 source.coverage.forEach((r,i)=>{assert.equal(r.page,original[i].page);assert.equal(r.number,original[i].number);assert.deepEqual(r.questionIds,original[i].appIds);assert.deepEqual(r.atomIds,original[i].skills);for(const id of r.questionIds)assert.ok(r.questIds.some(q=>cat.quests[q].questionIds.includes(id)));});
 for(const q of source.quests){assert.ok(q.minutes>=5&&q.minutes<=8);assert.ok(q.boss.length);for(const dep of q.prerequisites)assert.ok(cat.quests[dep].order<q.order);}
});
test('every quest starts with teaching and foundation before original applied/boss questions',()=>{
 for(const q of source.quests){const steps=cat.questSteps[q.id].map(id=>cat.steps[id]);assert.equal(steps[0].kind,'lesson');const phases=['learn','basic','apply','boss'];let rank=0;for(const s of steps){assert.ok(phases.indexOf(s.phase)>=rank);rank=phases.indexOf(s.phase);}
  assert.ok(steps.filter(s=>s.phase==='basic').every(s=>cat.questions[s.questionId].kind==='foundation'));assert.equal(steps.at(-1).kind,'explain');assert.ok(q.intro&&q.example&&q.compare);
 }
});
test('all 105 introductory questions have explicit existing source links and unique accepted choices',()=>{
 assert.equal(source.introQuestions.length,105);
 for(const q of source.introQuestions){assert.ok(q.source);assert.ok(q.basisIds.length);assert.ok(q.basisIds.every(id=>study.questions.some(x=>x.id===id)));assert.equal(new Set(q.options).size,2);assert.equal(q.options.filter((_,i)=>C.grade(q,i)).length,1);}
 for(const q of source.introQuestions.filter(q=>q.kind==='foundation')){const original=cat.questions[q.basisIds[0]];assert.equal(q.prompt,original.prompt);assert.equal(q.options[q.answer],original.answer);assert.equal(q.explanation,original.explanation);}
});
test('decomposed combination retries match the exact mistaken statement and its explanation',()=>{
 const q=cat.questions['N08-A1'];for(let i=0;i<q.statements.length;i++){const v=cat.questions['QR-'+q.id+'-'+i];assert.equal(v.options[v.answer],q.statements[i].truth?'正しい':'誤り');assert.equal(v.explanation,q.statements[i].reason);assert.deepEqual(v.atomIds,[q.atomIds[i]]);}
});
test('new numeric variants independently reproduce signature/fraction/ratio/dhondt results',()=>{
 assert.equal(Q.signatureCount(360000),120000);assert.equal(Q.signatureCount(760000),193334);assert.equal(Q.signatureCount(960000),220000);
 const expected={'S18-C1':'120000','S18-C2':'193334','S18-C3':'220000','S17-C1':'3000','S10-C1':'220','S19-C1':'18','S31-C1':'3,2,0','S32-C1':'75'};
 for(const [id,value] of Object.entries(expected))assert.equal(cat.questions['QR-'+id].answer,value);
 const values=[5400,3300,1300],ordered=values.flatMap((v,i)=>[1,2,3,4,5].map(d=>({i,n:v/d}))).sort((a,b)=>b.n-a.n);assert.ok(ordered[4].n>ordered[5].n);const seats=[0,0,0];ordered.slice(0,5).forEach(x=>seats[x.i]++);assert.equal(seats.join(','),'3,2,0');
});
test('10/30/60-minute plans prefer unvisited prerequisites and stay within the estimated budget',()=>{
 const p=Q.empty();for(const m of [10,30,60]){const plan=Q.plan(p,cat,m,1000);assert.equal(plan.ids[0],'Q01');assert.ok(plan.estimatedMinutes<=m);assert.ok(plan.ids.length>0);}
 finish(p,'Q01');assert.equal(Q.plan(p,cat,10,1001).ids[0],'Q02');
});
test('incorrect first pass reaches the end without an endless retry loop, but does not clear',()=>{
 const p=finish(Q.empty(),'Q01',1000,false),status=Q.questStatus(p,cat.quests.Q01);assert.equal(status.reached,true);assert.equal(status.cleared,false);assert.equal(status.settled,false);assert.ok(p.runs.Q01.retries<=2);assert.ok(p.pending.length>0);assert.equal(Q.plan(p,cat,10,1001).ids[0],'Q02');
});
test('a retry is delayed by at least three other answers and capped at two per quest',()=>{
 const p=Q.empty();Q.start(p,cat,10,1000,'Q01');let firstWrong=0,inserted=0;
 while(Q.current(p,cat)){const s=Q.current(p,cat);if(s.kind!=='lesson'){if(s.phase==='retry'){inserted++;assert.ok(p.turn-firstWrong>=3);}Q.submit(p,cat,null,false,1000);if(!firstWrong)firstWrong=p.turn;}Q.advance(p,cat,1000);}
 assert.ok(inserted>0&&inserted<=2);assert.equal(new Set(p.pending.map(x=>x.baseId)).size,p.pending.length);
});
test('double submit and premature advance cannot earn credit or skip a question',()=>{
 const p=Q.empty();Q.start(p,cat,10,1000,'Q01');while(Q.current(p,cat).kind==='lesson')Q.advance(p,cat,1000);assert.equal(Q.advance(p,cat),false);const q=cat.questions[Q.current(p,cat).questionId];assert.equal(Q.submit(p,cat,answer(q),true,1000),true);const before=p.turn;assert.equal(Q.submit(p,cat,answer(q),true,1001),false);assert.equal(p.turn,before);
});
test('clear requires original questions and explanation evidence, not a self-rating alone',()=>{
 const p=finish(Q.empty(),'Q01');assert.deepEqual(Q.questStatus(p,cat.quests.Q01),{reached:true,cleared:true,settled:false});
 const clone=JSON.parse(JSON.stringify(p));clone.records['QE-Q01'].lastOK=false;assert.equal(Q.questStatus(clone,cat.quests.Q01).cleared,false);
 const before=Q.empty();Q.start(before,cat,10,1000,'Q01');while(Q.current(before,cat)){const s=Q.current(before,cat);if(s.kind!=='lesson')Q.submit(before,cat,answer(cat.questions[s.questionId]),false,1000);Q.advance(before,cat,1000);}assert.equal(Q.questStatus(before,cat.quests.Q01).cleared,false);
});
test('hints do not count as independent first success or spaced mastery',()=>{
 const p=Q.empty();Q.start(p,cat,10,1000,'Q01');while(Q.current(p,cat).kind==='lesson')Q.advance(p,cat,1000);const q=cat.questions[Q.current(p,cat).questionId];Q.hint(p);Q.submit(p,cat,answer(q),true,1000);assert.equal(p.records[q.id].correct,1);assert.equal(p.records[q.id].independent,0);assert.equal(p.records[q.id].firstOK,false);assert.equal(p.records[q.id].spaced,0);
});
test('same-day repetition is arrival/clear, 24-hour spaced retrieval is settlement',()=>{
 const p=finish(Q.empty(),'Q01');finish(p,'Q01',2000);assert.equal(Q.questStatus(p,cat.quests.Q01).settled,false);finish(p,'Q01',1000+Q.DAY);assert.equal(Q.questStatus(p,cat.quests.Q01).settled,true);
 assert.equal(Q.dueQuestions(p,cat,1000+2*Q.DAY).length,0);assert.ok(Q.dueQuestions(p,cat,1000+4*Q.DAY).length>0);
});
test('next-day review uses original questions and does not repeat the tutorial first',()=>{
 const p=finish(Q.empty(),'Q01');const ids=Q.dueQuestions(p,cat,1000+Q.DAY);assert.ok(ids.length>0);assert.ok(ids.every(id=>cat.questions[id].kind!=='variant'));Q.startReview(p,cat,ids,1000+Q.DAY);assert.notEqual(Q.current(p,cat).kind,'lesson');
});
test('all 37 quests run to completion and preserve every lesson/question cursor through JSON reload',()=>{
 let p=Q.empty();for(const q of source.quests){Q.start(p,cat,10,1000,q.id);while(Q.current(p,cat)){const s=Q.current(p,cat);if(s.kind!=='lesson')Q.submit(p,cat,answer(cat.questions[s.questionId]),true,1000);p=Q.restore(JSON.stringify(p),cat);Q.advance(p,cat,1000);p=Q.restore(JSON.stringify(p),cat);}}
 assert.equal(source.quests.filter(q=>Q.questStatus(p,q).cleared).length,37);assert.deepEqual(Q.coverageStatus(p,cat),{reached:180,settled:0,total:180});assert.equal(study.questions.filter(q=>p.records[q.id]).length,238);
});
test('paused quests survive selecting another quest and resume their own cursor',()=>{
 const p=Q.empty();Q.start(p,cat,10,1000,'Q01');Q.advance(p,cat,1000);const index=p.runs.Q01.index;Q.start(p,cat,10,1000,'Q02');Q.advance(p,cat,1000);Q.start(p,cat,10,1000,'Q01');assert.equal(Q.run(p).index,index);assert.doesNotThrow(()=>Q.restore(JSON.stringify(p),cat));
});
test('malformed backups, foreign IDs, invalid counters and skipped lessons are rejected',()=>{
 assert.throws(()=>Q.restore('{',cat));const p=finish(Q.empty(),'Q01');for(const mutate of [x=>x.version='other',x=>x.turn++,x=>x.records['unknown']=x.records['S01-R'],x=>x.records['S01-R'].spaced=99,x=>x.runs.Q01.steps.push('unknown'),x=>delete x.lessons['Q01-intro']]){const v=JSON.parse(JSON.stringify(p));mutate(v);assert.throws(()=>Q.restore(JSON.stringify(v),cat));}
});
