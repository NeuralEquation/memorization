'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const Q=require('../quest-core.js'),C=require('../core.js'),box={window:{}};
for(const f of ['data/study-data.js','data/quests.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),box);
const study=JSON.parse(JSON.stringify(box.window.STUDY_DATA)),source=JSON.parse(JSON.stringify(box.window.QUEST_DATA)),L=source.lessons,cat=Q.catalog(study,source),authored=require('../scripts/quest_lessons.cjs');
const baseline='dca248d3e3be30ca62a3062c239f285b0c983700',oldFile=f=>execFileSync('git',['show',baseline+':'+f],{encoding:'utf8'});
const oldBox={window:{}};vm.runInNewContext(oldFile('data/quests.js'),oldBox);
const oldModule={exports:{}};vm.runInNewContext(oldFile('quest-core.js'),{module:oldModule,require:()=>C});
const oldQ=oldModule.exports,oldSource=JSON.parse(JSON.stringify(oldBox.window.QUEST_DATA)),oldCat=oldQ.catalog(study,oldSource);
const answer=q=>q.type==='judge'?{verdict:q.answer,correction:q.correctionAnswer}:q.answer;
test('all 238 questions and 218 decisions have specific teaching before their first exam encounter',()=>{
 assert.equal(Object.keys(L.questionTeaching).length,238);assert.equal(Object.keys(L.atomTeaching).length,218);
 for(const q of study.questions){const t=L.questionTeaching[q.id],sequence=cat.questSteps[t.questId],questionIndex=sequence.indexOf(q.id);assert.ok(questionIndex>0,q.id);
  assert.ok(t.lessonRefs.some(r=>!r.stepId.endsWith('-intro')),q.id+' must have question-specific knowledge');
  for(const r of t.lessonRefs){assert.ok(sequence.indexOf(r.stepId)<questionIndex,q.id+' taught too late');assert.ok(L.decks[r.stepId].some(c=>c.id===r.cardId));}
  assert.equal(t.basisExplanation,q.explanation);assert.ok(t.steps.length>=3);
  for(const id of q.atomIds||[])assert.ok(t.lessonRefs.some(r=>r.cardId===L.atomTeaching[id].cardId),id);
 }
 const atoms=JSON.parse(fs.readFileSync('data/coverage-atoms.json','utf8'));
 for(const [id,a] of Object.entries(atoms)){const t=L.atomTeaching[id],card=L.decks[t.stepId].find(c=>c.id===t.cardId);assert.ok(card.text.length>20);assert.ok(card.atomIds.includes(id));assert.ok(card.basisIds.includes(a.questionId));}
});
test('all S choice and correction alternatives teach their actual rationale before testing',()=>{
 for(const q of study.questions.filter(q=>q.objective.startsWith('S')&&['choice','judge'].includes(q.type))){
  const t=L.questionTeaching[q.id],text=JSON.stringify(t.lessonRefs.map(r=>L.decks[r.stepId].find(c=>c.id===r.cardId)));
  for(const reason of q.optionReasons)assert.ok(text.includes(reason),q.id+' missing '+reason);
 }
 for(const q of study.questions.filter(q=>q.table||q.charts||q.type==='calc'||q.type==='order')){const t=L.questionTeaching[q.id];assert.ok(t.lessonRefs.some(r=>L.decks[r.stepId].some(c=>c.id===r.cardId&&c.kind==='worked'&&c.basisIds?.includes(q.id))),q.id);}
});
test('37 individually authored lessons include causal explanations, reasoned comparisons and guided examples',()=>{
 assert.equal(Object.keys(authored).length,37);assert.equal(new Set(Object.values(authored).map(a=>a.context)).size,37);
 for(const [id,a] of Object.entries(authored)){assert.ok(a.context.length>=70,id);assert.ok(Object.keys(a.terms).length>=3,id);assert.ok(a.mechanism.length>=3,id);assert.ok(a.mechanism.every(p=>p.length>=50),id);assert.ok(a.comparison.length>=3,id);assert.ok(a.comparison.every(r=>r.length===3&&r[2].length>=8),id);assert.ok(a.worked.steps.length>=3&&a.worked.another.length>=30,id);assert.ok(a.pitfalls.length>=2,id);}
 for(const [id,terms] of Object.entries({Q01:['国会','首相','10日','不信任','弾劾'],Q04:['明治','主権','国会'],Q14:['60日','出席議員','総議員','3分の2'],Q25:['首長','議会','不信任'],Q31:['ドント','商','議席']})){const text=JSON.stringify(authored[id]);for(const t of terms)assert.ok(text.includes(t),id+' '+t);}
});
test('previous release backups retain every cursor and response, clear/settled status and pending retry',()=>{
 let p=oldQ.empty();let snapshots=0;
 for(const quest of oldSource.quests){oldQ.start(p,oldCat,10,1000,quest.id);
  while(oldQ.current(p,oldCat)){const s=oldQ.current(p,oldCat);if(s.kind!=='lesson')oldQ.submit(p,oldCat,answer(oldCat.questions[s.questionId]),true,1000);
   const raw=JSON.stringify(p),restored=Q.restore(raw,cat);assert.equal(JSON.stringify(restored),raw,quest.id+' '+s.id);snapshots++;oldQ.advance(p,oldCat,1000);
  }
 }
 for(const quest of oldSource.quests){oldQ.start(p,oldCat,10,1000+oldQ.DAY,quest.id);while(oldQ.current(p,oldCat)){const s=oldQ.current(p,oldCat);if(s.kind!=='lesson')oldQ.submit(p,oldCat,answer(oldCat.questions[s.questionId]),true,1000+oldQ.DAY);oldQ.advance(p,oldCat,1000+oldQ.DAY);}}
 const restored=Q.restore(JSON.stringify(p),cat);for(const quest of source.quests)assert.deepEqual(Q.questStatus(restored,quest),{reached:true,cleared:true,settled:true});assert.ok(snapshots>400);
 const wrong=oldQ.empty();oldQ.start(wrong,oldCat,10,1000,'Q01');while(oldQ.current(wrong,oldCat)?.kind==='lesson')oldQ.advance(wrong,oldCat,1000);oldQ.submit(wrong,oldCat,null,false,1000);assert.equal(JSON.stringify(Q.restore(JSON.stringify(wrong),cat)),JSON.stringify(wrong));assert.ok(wrong.pending.length);
});
test('new page navigation persists, rejects impossible pages, and odd review counts produce restorable plans',()=>{
 const p=Q.empty();Q.start(p,cat,10,1000,'Q01');Q.advance(p,cat,1000);assert.equal(Q.run(p).draft.lessonPage,1);assert.equal(Q.run(Q.restore(JSON.stringify(p),cat)).draft.lessonPage,1);
 for(const n of [-1,1.5,999]){const x=JSON.parse(JSON.stringify(p));Q.run(x).draft.lessonPage=n;assert.throws(()=>Q.restore(JSON.stringify(x),cat));}
 const old=oldQ.empty();oldQ.start(old,oldCat,10,1000,'Q01');while(oldQ.current(old,oldCat)?.kind==='lesson')oldQ.advance(old,oldCat,1000);oldQ.submit(old,oldCat,answer(oldCat.questions[oldQ.current(old,oldCat).questionId]),true,1000);oldQ.advance(old,oldCat,1000);
 const x=Q.restore(JSON.stringify(old),cat);Q.start(x,cat,10,1000+Q.DAY,'Q02');Q.start(x,cat,10,1000+Q.DAY);assert.equal(x.session.reviewIds.length,1);assert.ok(Number.isInteger(x.session.estimatedMinutes));assert.doesNotThrow(()=>Q.restore(JSON.stringify(x),cat));
});
test('238 questions, 180 mapping rows, grading core and print materials are unchanged after checkout newline normalization',()=>{
 for(const f of ['data/study-data.js','data/coverage.json','data/coverage-atoms.json','coverage.csv','core.js','app.js','print.html','print-complete.html','print-short.html'])assert.equal(fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'),oldFile(f).replace(/\r\n/g,'\n'),f);
 for(const f of ['output/pdf/seikei-midterm-202610.pdf','output/pdf/seikei-midterm-202610-complete.pdf','output/pdf/seikei-midterm-202610-short.pdf'])assert.ok(fs.readFileSync(f).equals(execFileSync('git',['show',baseline+':'+f],{maxBuffer:20*1024*1024})),f);
 assert.deepEqual(source.introQuestions,oldSource.introQuestions);assert.deepEqual(source.coverage,oldSource.coverage);
});
