'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../core.js'),box={window:{}};vm.runInNewContext(fs.readFileSync('data/study-data.js','utf8'),box);const d=JSON.parse(JSON.stringify(box.window.STUDY_DATA));
const qs=d.questions;const coverage=JSON.parse(fs.readFileSync('data/coverage.json','utf8'));
test('schema, IDs, references and all three core tasks per objective',()=>{
 assert.equal(qs.length,108);assert.equal(d.objectives.length,32);assert.equal(new Set(qs.map(q=>q.id)).size,qs.length);
 const objs=new Set(d.objectives.map(o=>o.id));const printable=fs.readFileSync('print.html','utf8');
 for(const q of qs){assert.ok(objs.has(q.objective));for(const f of ['prompt','source','explanation','basis'])assert.ok(q[f]?.length>0,q.id+':'+f);assert.equal(q.status,'reviewed');assert.ok(printable.includes(q.id));
  if(['choice','compare','judge'].includes(q.type)){const options=q.options||q.correctionOptions;assert.equal(options.length,4);assert.equal(new Set(options.map(C.normalize)).size,4,q.id);assert.equal(q.optionReasons.length,4);}
 }
 for(const id of objs){assert.ok(qs.some(q=>q.objective===id&&q.type==='recall'));assert.ok(qs.filter(q=>q.objective===id&&q.type!=='recall').length>=2);assert.ok(printable.includes('id="'+id+'"'));}
});
test('180 coverage rows honest, partial only for the nine corrected questions',()=>{
 assert.equal(coverage.length,180);assert.equal(new Set(coverage.map(r=>r.page+':'+r.number)).size,180);
 assert.equal(coverage.filter(r=>r.status==='partial').length,9);assert.equal(coverage.filter(r=>r.status==='unreviewed').length,171);assert.equal(coverage.filter(r=>r.status==='verified').length,0);
 for(const r of coverage)for(const id of r.appIds)assert.ok(qs.some(q=>q.id===id));
 const expected=['38:8','40:22','43:4-3','51:7','58:17','60:地方8','61:地方10','71:12','74:7'];assert.deepEqual(coverage.filter(r=>r.status==='partial').map(r=>r.page+':'+r.number),expected);
 const path='private/政経_問題集180問_出版社解答照合済み.json';if(fs.existsSync(path)){const official=JSON.parse(fs.readFileSync(path,'utf8')).official_answers;assert.equal(Object.keys(official).length,42);for(const r of coverage)assert.ok(official[r.page]?.[r.number]);const answers=[2,2,3,3,3,2,7,1,1];expected.forEach((k,i)=>{const [p,n]=k.split(':');assert.equal(Number(official[p][n]),answers[i]);});}
});
test('strict recall and numeric grading rejects short fragments and embellished answers',()=>{
 const q=qs.find(q=>q.id==='S21-R');assert.ok(C.grade(q,'　地方交付税　'));assert.ok(!C.grade(q,'交付税'));assert.ok(!C.grade(q,'地方交付税ではない'));assert.ok(!C.grade(q,''));
 const num=qs.find(q=>q.id==='S18-C3');assert.ok(C.grade(num,'２１２５００'));for(const x of ['212500人','21','212500または300000','212,500'])assert.ok(!C.grade(num,x));
});
test('one accepted option index, judge requires verdict and correct reason, order is strict',()=>{
 for(const q of qs.filter(q=>['choice','compare'].includes(q.type)))assert.equal(q.options.filter((o,i)=>C.grade(q,i)).length,1,q.id);
 for(const q of qs.filter(q=>q.type==='judge')){assert.ok(C.grade(q,{verdict:q.answer,correction:0}));assert.ok(!C.grade(q,{verdict:q.answer,correction:1}));assert.ok(!C.grade(q,{verdict:!q.answer,correction:0}));assert.ok(!C.grade(q,q.answer));}
 for(const q of qs.filter(q=>q.type==='order')){assert.ok(C.grade(q,q.answer));assert.ok(!C.grade(q,q.answer.slice().reverse()));assert.ok(!C.grade(q,q.answer.slice(1)));}
});
test('independent arithmetic for signatures, fractions, ratio and proportional seats',()=>{
 for(const q of qs.filter(q=>q.formula)){const f=q.formula;let result;
  if(f.kind==='signatures'){// exact integer numerator over common denominator 24
   result=Math.ceil((Math.min(f.n,400000)*8+Math.max(0,Math.min(f.n-400000,400000))*4+Math.max(0,f.n-800000)*3)/24);
  }else if(f.kind==='ordinance')result=Math.ceil(f.n/50);
  else if(f.kind==='fraction')result=Math.ceil(f.n*f.numerator/f.denominator);
  else if(f.kind==='ratio')result=f.loser/f.winner*100;
  else{let all=[];for(let party=0;party<f.votes.length;party++)for(let divisor=1;divisor<=f.seats;divisor++)all.push({party,value:f.votes[party]/divisor});all.sort((a,b)=>b.value-a.value);assert.notEqual(all[f.seats-1].value,all[f.seats].value);const counts=f.votes.map(()=>0);all.slice(0,f.seats).forEach(x=>counts[x.party]++);result=counts.join(',');}
  assert.equal(String(result),q.answer,q.id);
 }
});
test('mastery needs recall plus two distinct applied questions and spaced re-success',()=>{
 const p=C.empty(d.version),same=qs.filter(q=>q.objective==='S01'),now=1000000;
 for(const q of same){C.record(p,q,true,now);C.record(p,q,true,now+1000);}assert.ok(!C.objectiveMastered(p,'S01',qs));
 C.record(p,same[0],true,now+C.INTERVAL);assert.ok(!C.objectiveMastered(p,'S01',qs));
 for(const q of same.slice(1))C.record(p,q,true,now+C.INTERVAL);assert.ok(C.objectiveMastered(p,'S01',qs));
 C.record(p,same[1],false,now+C.INTERVAL+1);assert.ok(!C.objectiveMastered(p,'S01',qs));assert.ok(C.weak(p,same[1]));
});
test('progress validation, corrupted storage and cross-exam isolation',()=>{
 const p=C.empty(d.version);C.record(p,qs[0],false,100);assert.deepEqual(C.read(JSON.stringify(p),d),p);assert.deepEqual(C.read('{',d),C.empty(d.version));
 assert.deepEqual(C.read(JSON.stringify({...p,version:'old'}),d),C.empty(d.version));
 const evil={...p,records:{unknown:p.records[qs[0].id],[qs[0].id]:{...p.records[qs[0].id],seen:-1}}};assert.deepEqual(C.read(JSON.stringify(evil),d).records,{});
});
test('selection avoids immediate repeats, prioritizes errors only after delay, handles empty pool',()=>{
 const p=C.empty(d.version);C.record(p,qs[0],false,1);assert.notEqual(C.choose(qs.slice(0,4),p,qs[0].id,()=>0).id,qs[0].id);
 p.turn+=3;assert.equal(C.choose(qs.slice(0,4),p,null,()=>0).id,qs[0].id);assert.equal(C.choose([],p,null),null);assert.equal(C.choose([qs[0]],p,qs[0].id).id,qs[0].id);
});
test('old bank removed, no pre-answer hints, release cache includes every local runtime asset',()=>{
 const shell=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('app.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8');
 for(const word of ['baseCards','extraCards','masteryCards','advancedJudgeStatements','j-imf','UNCTAD'])assert.ok(!shell.includes(word));
 assert.ok(!app.includes('setTimeout(next'));assert.ok(!app.includes('seikeiStudyProgressV2'));assert.ok(!app.includes('seikeiWeakMap'));
 for(const a of ['data/study-data.js','app.js','core.js','print.html','coverage.html','sources.html'])assert.ok(sw.includes(a));
 assert.ok(!sw.includes('keys.filter(key => key !== CACHE_NAME)'));assert.ok(sw.includes("key.startsWith('seikei-midterm-202610-')"));assert.ok(!sw.includes('catch(() => caches.match'));
});
