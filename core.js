(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.StudyCore=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const INTERVAL=10*60*1000;
  const normalize=x=>String(x).normalize('NFKC').trim().replace(/\s+/g,'').toLowerCase();
  function grade(q,value){
    if(['choice','compare'].includes(q.type))return Number.isInteger(value)&&value===q.answer;
    if(q.type==='judge')return !!value&&typeof value.verdict==='boolean'&&value.verdict===q.answer&&value.correction===q.correctionAnswer;
    if(q.type==='order')return Array.isArray(value)&&value.length===q.answer.length&&value.every((x,i)=>x===q.answer[i]);
    if(q.type==='calc'){
      const v=normalize(value);
      if(q.formula?.kind==='dhondt')return /^\d+,\d+,\d+$/.test(v)&&v===q.answer;
      return /^\d+(?:\.\d+)?$/.test(v)&&v===q.answer;
    }
    const v=normalize(value);return !!v&&[q.answer,...(q.aliases||[])].some(a=>normalize(a)===v);
  }
  function empty(version){return {version,records:{},stats:{ok:0,miss:0,streak:0},turn:0};}
  function read(raw,data){
    const p=empty(data.version);
    try{
      const s=JSON.parse(raw);if(!s||s.version!==data.version)return p;
      const ids=new Set(data.questions.map(q=>q.id));
      for(const [id,r] of Object.entries(s.records||{}))if(ids.has(id)&&r&&typeof r==='object'){
        const fields=['seen','correct','wrong','streak','spaced','lastCredit','lastSeen','dueTurn'];
        if(fields.every(k=>Number.isFinite(r[k])&&r[k]>=0)&&typeof r.lastOK==='boolean')p.records[id]=Object.fromEntries([...fields.map(k=>[k,r[k]]),['lastOK',r.lastOK]]);
      }
      for(const k of ['ok','miss','streak'])if(Number.isFinite(s.stats?.[k])&&s.stats[k]>=0)p.stats[k]=s.stats[k];
      if(Number.isSafeInteger(s.turn)&&s.turn>=0)p.turn=s.turn;
    }catch{}return p;
  }
  function record(p,q,ok,now=Date.now()){
    const r=p.records[q.id]||{seen:0,correct:0,wrong:0,streak:0,spaced:0,lastCredit:0,lastSeen:0,dueTurn:0,lastOK:false};
    p.turn++;r.seen++;r.lastSeen=now;r.lastOK=ok;
    if(ok){r.correct++;r.streak++;p.stats.ok++;p.stats.streak++;if(!r.spaced||now-r.lastCredit>=INTERVAL){r.spaced++;r.lastCredit=now;}}
    else{r.wrong++;r.streak=0;r.spaced=0;r.lastCredit=0;p.stats.miss++;p.stats.streak=0;}
    r.dueTurn=p.turn+(ok?6:3);p.records[q.id]=r;return r;
  }
  const mastered=(p,q)=>{const r=p.records[q.id];return !!r&&r.spaced>=2&&r.streak>=2;};
  const weak=(p,q)=>{const r=p.records[q.id];return !!r&&r.wrong>0&&!mastered(p,q);};
  function objectiveMastered(p,id,questions){const qs=questions.filter(q=>q.objective===id);return qs.some(q=>q.type==='recall'&&mastered(p,q))&&qs.filter(q=>q.type!=='recall'&&mastered(p,q)).length>=2;}
  function choose(pool,p,current,random=Math.random){
    if(!pool.length)return null;
    let options=pool.filter(q=>q.id!==current);if(!options.length)options=pool;
    const due=options.filter(q=>!p.records[q.id]||p.records[q.id].dueTurn<=p.turn);
    if(due.length)options=due;
    const ranked=options.map(q=>{const r=p.records[q.id];return {q,score:(!r?500:!r.lastOK?1000:!mastered(p,q)?200:0)+(q.importance==='A'?20:0)+random()*10};});
    ranked.sort((a,b)=>b.score-a.score);return ranked[0].q;
  }
  return {normalize,grade,empty,read,record,mastered,weak,objectiveMastered,choose,INTERVAL};
});
