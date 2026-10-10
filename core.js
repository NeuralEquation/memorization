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
  function prioritize(pool,p,filter){
    if(filter!=='unmastered')return pool;
    const pending=pool.filter(q=>!mastered(p,q));
    return pending.length?pending:pool;
  }
  function restore(raw,data){
    let s;try{s=JSON.parse(raw);}catch{throw new Error('JSONとして読み込めません。');}
    const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
    const integer=x=>Number.isSafeInteger(x)&&x>=0;
    if(!object(s)||s.version!==data.version)throw new Error('今回の試験用の進捗JSONではありません。');
    if(!object(s.records)||!object(s.stats)||!integer(s.turn))throw new Error('進捗JSONの構造が不正です。');
    const ids=new Set(data.questions.map(q=>q.id));let seen=0,correct=0,wrong=0;
    for(const [id,r] of Object.entries(s.records)){
      if(!ids.has(id))throw new Error('現在の教材にない問題IDが含まれています。');
      if(!object(r)||!['seen','correct','wrong','streak','spaced','lastCredit','lastSeen','dueTurn'].every(k=>integer(r[k]))||typeof r.lastOK!=='boolean')throw new Error('問題ごとの履歴に不正な値があります。');
      if(r.seen===0||r.seen!==r.correct+r.wrong||r.streak>r.correct||r.spaced>r.correct||r.lastCredit>r.lastSeen||r.dueTurn>s.turn+6||(!r.lastOK&&(r.streak!==0||r.spaced!==0))||(r.lastOK&&(r.streak===0||r.spaced===0)))throw new Error('正誤回数・習得履歴の整合性を確認できません。');
      seen+=r.seen;correct+=r.correct;wrong+=r.wrong;
    }
    if(!['ok','miss','streak'].every(k=>integer(s.stats[k]))||seen!==s.turn||correct!==s.stats.ok||wrong!==s.stats.miss||s.stats.streak>s.stats.ok)throw new Error('合計と問題ごとの履歴が一致しません。');
    return read(raw,data);
  }
  function objectiveMastered(p,id,questions){const qs=questions.filter(q=>q.objective===id),required=qs.filter(q=>q.requiredForMastery);return qs.some(q=>q.type==='recall'&&mastered(p,q))&&(required.length?required.every(q=>mastered(p,q)):qs.filter(q=>q.type!=='recall'&&mastered(p,q)).length>=2);}
  function choose(pool,p,current,random=Math.random){
    if(!pool.length)return null;
    let options=pool.filter(q=>q.id!==current);if(!options.length)options=pool;
    const due=options.filter(q=>!p.records[q.id]||p.records[q.id].dueTurn<=p.turn);
    if(due.length)options=due;
    const ranked=options.map(q=>{const r=p.records[q.id];return {q,score:(!r?500:!r.lastOK?1000:!mastered(p,q)?200:0)+(q.importance==='A'?20:0)+random()*10};});
    ranked.sort((a,b)=>b.score-a.score);return ranked[0].q;
  }
  return {normalize,grade,empty,read,restore,prioritize,record,mastered,weak,objectiveMastered,choose,INTERVAL};
});
