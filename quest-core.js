(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./core.js'):root.StudyCore);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.QuestCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,C=>{
  'use strict';
  const DAY=24*60*60*1000,VERSION='2026-10-11.quest.1';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const integer=x=>Number.isSafeInteger(x)&&x>=0;
  const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  function signatureCount(n){return Math.ceil((Math.min(n,400000)*8+Math.min(Math.max(n-400000,0),400000)*4+Math.max(n-800000,0)*3)/24);}
  function variants(q,foundation){
    const shared={objective:q.objective,kind:'variant',baseId:q.id,source:q.source,basisIds:[q.id]};
    const make=(suffix,content)=>({...shared,id:'QR-'+q.id+suffix,...content});
    if(q.statements)return q.statements.map((s,i)=>make('-'+i,{type:'choice',prompt:'一文に分けて確認：\n'+s.text,options:['正しい','誤り'],answer:s.truth?0:1,explanation:s.reason,atomIds:q.atomIds?[q.atomIds[i]]:[]}));
    if(q.type==='calc'){
      const f=q.formula;let answer,prompt,explanation,formula;
      if(f.kind==='signatures'){
        const n=f.n+60000;answer=String(signatureCount(n));prompt=`有権者${n.toLocaleString('ja-JP')}人。議会解散請求の署名の最少数を、最後に切り上げて求める。`;
        explanation=`最初の40万人までを1/3、次の40万人までを1/6、80万人を超える部分を1/8として加える。最後に切り上げると${answer}人。`;formula={kind:f.kind,n};
      }else if(f.kind==='ordinance'){
        const n=f.n+30000;answer=String(Math.ceil(n/50));prompt=`有権者${n.toLocaleString('ja-JP')}人。直接請求の対象となる条例の制定請求に必要な署名の最少数は？`;
        explanation=`${n}÷50＝${answer}人。解散請求の段階式とは別。`;formula={kind:f.kind,n};
      }else if(f.kind==='dhondt'){
        answer='3,2,0';prompt='A党5400票、B党3300票、C党1300票。ドント式で5議席を配る。A,B,Cの順に半角カンマで答える。';
        explanation='上位の商はA5400、B3300、A2700、A1800、B1650。A3・B2・C0。境界に同点はない。';formula={kind:f.kind,votes:[5400,3300,1300],seats:5};
      }else if(f.kind==='ratio'){
        answer='75';prompt='落選者27000票、同じ区の当選者36000票。惜敗率を百分率の数字で答える。';explanation='27000÷36000×100＝75%。当選者票を分母にする。';formula={kind:f.kind,loser:27000,winner:36000};
      }else if(q.objective==='S19'){
        answer='18';prompt='総議員36人の地方議会で、副知事解職の議決に24人が出席。必要な同意の最少数は？';explanation='36×2/3＝24人で出席要件を満たす。同意は24×3/4＝18人。';formula={kind:'fraction',n:24,numerator:3,denominator:4};
      }else{
        answer='220';prompt='法律案の再可決で衆議院に330人が出席。必要な賛成の最少人数は？';explanation='出席議員330×2/3＝220人。総議員を分母にしない。';formula={kind:'fraction',n:330,numerator:2,denominator:3};
      }
      return [make('',{type:'calc',prompt,answer,explanation,formula})];
    }
    if(q.type==='order')return [make('',{type:'choice',prompt:'前後関係を分けて確認：次のうち、先に起きる・先に行うのはどちら？',options:q.answer.slice(0,2),answer:0,explanation:q.explanation})];
    if(q.type==='judge')return [make('',{type:'choice',prompt:'根拠を確認：\n「'+q.prompt+'」の正誤を説明する、正しい根拠はどれ？',options:[q.correctionOptions[q.correctionAnswer],q.correctionOptions[(q.correctionAnswer+1)%q.correctionOptions.length]],answer:0,explanation:q.explanation})];
    if(q.type==='recall')return [make('',{type:'choice',prompt:'言葉の意味を確認：\n'+q.prompt,options:foundation.options.slice(),answer:foundation.answer,explanation:q.explanation})];
    const other=q.options.findIndex((_,i)=>i!==q.answer);
    return [make('',{type:'choice',prompt:'二つの説明に絞って確認：\n'+q.prompt,options:[q.options[q.answer],q.options[other]],answer:0,explanation:q.explanation,...(q.table?{table:q.table}:{}),...(q.charts?{charts:q.charts,chartCaption:q.chartCaption}:{})})];
  }
  function catalog(study,source){
    if(source.version!==VERSION||source.baseVersion!==study.version)throw Error('教材の版が一致しません。オンラインで再読み込みしてください。');
    const cat={study,source,quests:Object.fromEntries(source.quests.map(q=>[q.id,q])),questions:{},steps:{},questSteps:{},variants:{}};
    for(const q of [...study.questions,...source.introQuestions])cat.questions[q.id]=q;
    for(const q of Object.values(cat.questions)){
      const vs=variants(q,cat.questions['QB-'+q.objective]);cat.variants[q.id]=vs.map(v=>v.id);
      for(const v of vs){cat.questions[v.id]=v;cat.steps[v.id]={id:v.id,kind:'question',phase:'retry',questionId:v.id};}
    }
    const put=(list,step)=>{if(cat.steps[step.id])throw Error('重複したステップ');cat.steps[step.id]=step;list.push(step.id);};
    for(const q of source.quests){
      const steps=[];
      put(steps,{id:q.id+'-intro',kind:'lesson',phase:'learn',title:q.title,text:q.intro,example:q.example,compare:q.compare,source:q.sources.join('／')});
      for(const id of q.objectives){
        const o=study.objectives.find(o=>o.id===id),r=study.questions.find(x=>x.objective===id&&x.type==='recall');
        put(steps,{id:q.id+'-term-'+id,kind:'lesson',phase:'learn',title:o.title,term:r.answer,text:r.prompt,points:o.points?[]:[o.lesson],source:o.source,objective:id});
      }
      for(const id of q.foundationIds)put(steps,{id,kind:'question',phase:'basic',questionId:id});
      for(const id of q.objectives){
        const o=study.objectives.find(o=>o.id===id);
        if(o.points)for(let i=0;i<o.points.length;i+=3)put(steps,{id:q.id+'-points-'+id+'-'+i,kind:'lesson',phase:'apply',title:o.title+'：応用の要点',points:o.points.slice(i,i+3),source:o.source,objective:id});
      }
      for(const id of q.application)put(steps,{id,kind:'question',phase:'apply',questionId:id});
      for(const id of q.boss)put(steps,{id,kind:'question',phase:'boss',questionId:id});
      put(steps,{id:q.explainId,kind:'explain',phase:'boss',questionId:q.explainId});
      cat.questSteps[q.id]=steps;
    }
    if(source.lessons){
      for(const [id,cards] of Object.entries(source.lessons.decks)){
        if(cat.steps[id]?.kind!=='lesson'||!cards.length)throw Error('授業ページが一致しません。');
        cat.steps[id].cards=cards;
      }
      cat.teaching=source.lessons.questionTeaching;cat.glossary=source.lessons.glossary;
    }
    return cat;
  }
  function empty(){return {version:VERSION,turn:0,records:{},lessons:{},reached:{},runs:{},pending:[],session:null};}
  const independent=r=>!!r&&r.lastOK&&r.independent>0;
  const settled=r=>independent(r)&&r.spaced>=2;
  function questStatus(p,q){
    const ids=[...q.questionIds,...q.foundationIds,q.explainId];
    const reached=!!p.reached[q.id],cleared=reached&&ids.every(id=>independent(p.records[id]));
    return {reached,cleared,settled:cleared&&ids.every(id=>settled(p.records[id]))};
  }
  function coverageStatus(p,cat){
    return cat.source.coverage.reduce((out,r)=>{if(r.questionIds.every(id=>p.records[id]?.attempts>0))out.reached++;if(r.questionIds.every(id=>settled(p.records[id])))out.settled++;return out;},{reached:0,settled:0,total:cat.source.coverage.length});
  }
  function dueQuestions(p,cat,now=Date.now(),weakOnly=false){
    return Object.entries(p.records).filter(([id,r])=>cat.questions[id].kind!=='variant'&&(weakOnly?!r.lastOK:now-r.lastSeen>=(settled(r)?3*DAY:DAY))).sort((a,b)=>Number(a[1].lastOK)-Number(b[1].lastOK)||a[1].lastSeen-b[1].lastSeen).map(([id])=>id);
  }
  function plan(p,cat,minutes,now=Date.now()){
    if(![10,30,60].includes(minutes))throw Error('学習時間を選んでください。');
    const reviewIds=dueQuestions(p,cat,now).slice(0,Math.min(6,minutes/5));
    const budget=minutes-1-reviewIds.length*.5;let used=0,partialQuest=false;
    const ids=[];
    for(const q of cat.source.quests){if(p.reached[q.id])continue;if(used+q.minutes>budget){if(!ids.length){ids.push(q.id);used=Math.max(1,budget);partialQuest=true;}break;}ids.push(q.id);used+=q.minutes;}
    if(reviewIds.length)ids.splice(Math.min(1,ids.length),0,'@review');
    return {minutes,ids,reviewIds,estimatedMinutes:Math.ceil(used+reviewIds.length*.5),partialQuest};
  }
  function newRun(cat,id){return {questId:id,steps:cat.questSteps[id].slice(),index:0,response:null,draft:{},helped:false,retries:0,done:false};}
  function run(p){if(!p.session)return null;const id=p.session.ids[p.session.position];return id==='@review'?p.session.reviewRun:p.runs[id]||null;}
  function current(p,cat){const r=run(p);return r&&!r.done?cat.steps[r.steps[r.index]]:null;}
  function enter(p,cat){
    const id=p.session.ids[p.session.position];
    if(id==='@review')p.session.reviewRun={questId:null,steps:p.session.reviewIds.slice(),index:0,response:null,draft:{},helped:false,retries:0,done:false};
    else if(!p.runs[id]||p.runs[id].done)p.runs[id]=newRun(cat,id);
  }
  function start(p,cat,minutes,now=Date.now(),questId=null){
    if(![10,30,60].includes(minutes))throw Error('学習時間を選んでください');
    if(questId&&!cat.quests[questId])throw Error('不明なクエスト');
    const selected=questId?{minutes,ids:[questId],reviewIds:[],estimatedMinutes:cat.quests[questId].minutes}:plan(p,cat,minutes,now);
    if(!selected.ids.length)return false;
    p.session={...selected,position:0,startedAt:now,reviewRun:null};enter(p,cat);return true;
  }
  function startReview(p,cat,ids,now=Date.now()){
    const valid=[...new Set(ids)].filter(id=>cat.questions[id]&&cat.questions[id].kind!=='variant'&&p.records[id]);
    if(!valid.length)return false;
    p.session={minutes:10,ids:['@review'],reviewIds:valid.slice(0,8),estimatedMinutes:Math.ceil(Math.min(valid.length,8)*.5),position:0,startedAt:now,reviewRun:null};enter(p,cat);return true;
  }
  function record(p,id,ok,credit,now){
    const r=p.records[id]||{attempts:0,correct:0,independent:0,firstOK:credit,firstSeen:now,lastSeen:now,lastOK:false,spaced:0,lastCredit:0};
    r.attempts++;r.correct+=Number(ok);r.independent+=Number(credit);r.lastSeen=now;r.lastOK=credit;p.turn++;
    if(credit){if(!r.spaced||now-r.lastCredit>=DAY){r.spaced++;r.lastCredit=now;}}
    else{r.spaced=0;r.lastCredit=0;}
    p.records[id]=r;
  }
  function chooseVariant(cat,q,value){
    const ids=cat.variants[q.id];
    if(q.statements&&Number.isInteger(value)&&q.patterns?.[value]){
      const i=q.statements.findIndex((s,i)=>s.truth!==q.patterns[value][i]);return ids[Math.max(0,i)];
    }
    return ids[0];
  }
  function submit(p,cat,value,selfExplained=false,now=Date.now()){
    const r=run(p),s=current(p,cat);if(!r||r.response||!s||s.kind==='lesson')return false;
    const q=cat.questions[s.questionId],ok=value!==null&&C.grade(q,value),credit=ok&&!r.helped&&(q.kind!=='explain'||selfExplained===true);
    record(p,q.id,ok,credit,now);
    r.response={stepId:s.id,value:clone(value),ok,credit,selfExplained:selfExplained===true,helped:r.helped,at:now};
    if(credit)p.pending=p.pending.filter(x=>x.baseId!==q.id);
    else if(q.kind!=='variant'&&!p.pending.some(x=>x.baseId===q.id))p.pending.push({baseId:q.id,questionId:chooseVariant(cat,q,value),dueTurn:p.turn+3,scheduledAt:now});
    return true;
  }
  function advance(p,cat,now=Date.now()){
    const r=run(p),s=current(p,cat);if(!r||!s)return false;
    if(s.kind==='lesson'){
      const page=r.draft.lessonPage||0;
      if(s.cards&&page+1<s.cards.length){r.draft.lessonPage=page+1;return true;}
      p.lessons[s.id]=now;
    }else if(!r.response)return false;
    r.index++;r.response=null;r.draft={};r.helped=false;
    // At most two decomposed retries per quest. Three intervening answers are required.
    // The remaining weak points stay available for later quests and next-day review.
    const upcoming=cat.steps[r.steps[r.index]];
    if(r.questId&&r.retries<2&&upcoming&&['apply','boss'].includes(upcoming.phase)){
      const i=p.pending.findIndex(x=>x.dueTurn<=p.turn&&x.baseId!==s.questionId);
      if(i>=0){const [retry]=p.pending.splice(i,1);r.steps.splice(r.index,0,retry.questionId);r.retries++;}
    }
    if(r.index===r.steps.length){r.done=true;if(r.questId)p.reached[r.questId]=p.reached[r.questId]||now;}
    return true;
  }
  function nextRun(p,cat){if(!run(p)?.done||p.session.position+1>=p.session.ids.length)return false;p.session.position++;enter(p,cat);return true;}
  function hint(p){const r=run(p);if(r&&!r.response)r.helped=true;}
  function firstScore(p,cat){const rs=Object.entries(p.records).filter(([id])=>cat.questions[id].kind!=='variant');return {correct:rs.filter(([,r])=>r.firstOK).length,total:rs.length};}
  function restore(raw,cat){
    let p;try{p=JSON.parse(raw);}catch{throw Error('JSONとして読み込めません。');}
    const bad=()=>{throw Error('クエスト進捗の整合性を確認できません。');};
    if(!object(p)||p.version!==VERSION)throw Error('今回のクエスト用の進捗ではありません。');
    if(!integer(p.turn)||!object(p.records)||!object(p.lessons)||!object(p.reached)||!object(p.runs)||!Array.isArray(p.pending)||p.pending.length>cat.source.introQuestions.length+cat.study.questions.length)bad();
    let turns=0;
    for(const [id,r] of Object.entries(p.records)){
      if(!cat.questions[id]||!object(r)||!['attempts','correct','independent','firstSeen','lastSeen','spaced','lastCredit'].every(k=>integer(r[k]))||typeof r.firstOK!=='boolean'||typeof r.lastOK!=='boolean')bad();
      if(!r.attempts||r.correct>r.attempts||r.independent>r.correct||r.spaced>r.independent||r.firstSeen>r.lastSeen||r.lastCredit>r.lastSeen||r.firstOK&&!r.independent||r.lastOK&&(!r.spaced||!r.independent)||!r.lastOK&&(r.spaced||r.lastCredit))bad();
      turns+=r.attempts;
    }
    if(turns!==p.turn)bad();
    for(const [id,time] of Object.entries(p.lessons))if(cat.steps[id]?.kind!=='lesson'||!integer(time))bad();
    for(const [id,time] of Object.entries(p.reached))if(!cat.quests[id]||!integer(time)||!cat.questSteps[id].every(s=>cat.steps[s].kind==='lesson'?p.lessons[s]!==undefined:!!p.records[s]))bad();
    if(new Set(p.pending.map(x=>x.baseId)).size!==p.pending.length)bad();
    for(const x of p.pending)if(!object(x)||!cat.variants[x.baseId]?.includes(x.questionId)||!p.records[x.baseId]||!integer(x.dueTurn)||x.dueTurn>p.turn+3||!integer(x.scheduledAt))bad();
    const checkRun=(r,id)=>{
      if(!object(r)||r.questId!==id||!Array.isArray(r.steps)||r.steps.length>80||!r.steps.every(s=>cat.steps[s])||!integer(r.index)||r.index>r.steps.length||typeof r.done!=='boolean'||r.done!==(r.index===r.steps.length)||typeof r.helped!=='boolean'||!integer(r.retries)||r.retries>2||!object(r.draft))bad();
      if(id){if(r.steps.filter(s=>cat.steps[s].phase!=='retry').join('|')!==cat.questSteps[id].join('|')||r.steps.filter(s=>cat.steps[s].phase==='retry').length!==r.retries)bad();}
      else if(r.steps.some(s=>cat.steps[s].kind==='lesson'||cat.steps[s].phase==='retry'))bad();
      for(const key of Object.keys(r.draft))if(!['text','order','verdict','selfExplained','notes','optionOrder','lessonPage'].includes(key))bad();
      if(r.draft.text!==undefined&&(typeof r.draft.text!=='string'||r.draft.text.length>2000))bad();
      if(r.draft.notes!==undefined&&(typeof r.draft.notes!=='string'||r.draft.notes.length>2000))bad();
      const step=cat.steps[r.steps[r.index]],q=step?.questionId&&cat.questions[step.questionId];
      if(r.draft.lessonPage!==undefined&&(!integer(r.draft.lessonPage)||step?.kind!=='lesson'||r.draft.lessonPage>=(step.cards?.length||1)))bad();
      if(r.draft.order!==undefined&&(!q?.items||!Array.isArray(r.draft.order)||r.draft.order.length>q.items.length||new Set(r.draft.order).size!==r.draft.order.length||!r.draft.order.every(x=>q.items.includes(x))))bad();
      if(r.draft.verdict!==undefined&&typeof r.draft.verdict!=='boolean')bad();
      if(r.draft.selfExplained!==undefined&&typeof r.draft.selfExplained!=='boolean')bad();
      if(r.draft.optionOrder!==undefined){const values=q?.options||q?.correctionOptions||q?.items;if(!values||!Array.isArray(r.draft.optionOrder)||r.draft.optionOrder.length!==values.length||new Set(r.draft.optionOrder).size!==values.length||!r.draft.optionOrder.every(i=>integer(i)&&i<values.length))bad();}
      if(r.response!==null){
        const v=r.response;if(!object(v)||!q||v.stepId!==step.id||!integer(v.at)||typeof v.ok!=='boolean'||typeof v.credit!=='boolean'||typeof v.helped!=='boolean'||typeof v.selfExplained!=='boolean'||v.ok!==(v.value!==null&&C.grade(q,v.value))||v.credit!==(v.ok&&!v.helped&&(q.kind!=='explain'||v.selfExplained))||!p.records[q.id]||p.records[q.id].lastSeen<v.at)bad();
      }
      // A cursor cannot skip unanswered lessons/questions. Restored draft answers remain ungraded.
      for(const s of r.steps.slice(0,r.index))if(cat.steps[s].kind==='lesson'?p.lessons[s]===undefined:!p.records[s])bad();
    };
    for(const [id,r] of Object.entries(p.runs)){if(!cat.quests[id])bad();checkRun(r,id);}
    if(p.session!==null){const s=p.session;if(!object(s)||![10,30,60].includes(s.minutes)||!Array.isArray(s.ids)||!s.ids.length||s.ids.length>38||new Set(s.ids).size!==s.ids.length||!s.ids.every(id=>id==='@review'||cat.quests[id])||!integer(s.position)||s.position>=s.ids.length||!integer(s.startedAt)||!integer(s.estimatedMinutes)||!Array.isArray(s.reviewIds)||s.reviewIds.length>8||!s.reviewIds.every(id=>cat.questions[id]&&cat.questions[id].kind!=='variant')||!run(p))bad();if(s.reviewRun!==null){checkRun(s.reviewRun,null);if(s.reviewRun.steps.join('|')!==s.reviewIds.join('|'))bad();}}
    return clone(p);
  }
  return {DAY,VERSION,catalog,empty,signatureCount,questStatus,coverageStatus,dueQuestions,plan,run,current,start,startReview,submit,advance,nextRun,hint,firstScore,restore,settled};
});
