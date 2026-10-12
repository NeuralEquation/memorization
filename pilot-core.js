(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PilotCore=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const VERSION='seikei-pilot-202610-v1',DAY=86400000;
 function questionIds(study,quest){return quest.objectives.flatMap(id=>{const qs=study.questions.filter(q=>q.objective===id),recall=qs.find(q=>q.type==='recall'),applied=qs.find(q=>q.table||q.charts||q.type==='calc')||qs.find(q=>q.statements)||qs.find(q=>q.type!=='recall');return [recall.id,applied.id];});}
 function empty(study,quest,runId,prior,now){return {version:VERSION,runId,questId:quest.id,revision:null,prior,createdAt:now,phase:'pre',questionIds:questionIds(study,quest),answers:{pre:[],post:[],delayed:[]},times:{},events:[],postCompletedAt:null,paused:false,rating:null,notes:'',learningComplete:false};}
 function context(s,now){const phase=s.phase;if(['pre','post','delayed'].includes(phase))return phase+':'+(s.questionIds[s.answers[phase].length]||'complete');return phase;}
 function addTime(s,key,ms){if(!Number.isFinite(ms)||ms<0||ms>60000)return false;s.times[key]=(s.times[key]||0)+ms;return true;}
 function answer(s,question,value,ok,confidence,reason,now){if(!['pre','post','delayed'].includes(s.phase)||s.questionIds[s.answers[s.phase].length]!==question.id)return false;if(![0,1,2,3].includes(confidence)||typeof reason!=='string'||reason.length>500)return false;s.answers[s.phase].push({id:question.id,value,ok:!!ok,confidence,reason,answeredAt:now});return true;}
 function canDelayed(s,now){return Number.isFinite(s.postCompletedAt)&&now-s.postCompletedAt>=DAY;}
 function results(s){const score=phase=>{const a=s.answers[phase];return {correct:a.filter(x=>x.ok).length,answered:a.length,total:s.questionIds.length,complete:a.length===s.questionIds.length};};const sum=prefix=>Object.entries(s.times).filter(([k])=>k.startsWith(prefix)).reduce((n,[,v])=>n+v,0);return {pre:score('pre'),post:score('post'),delayed:score('delayed'),lessonMs:sum('learn:lesson:'),questionMs:sum('learn:question:')+sum('learn:explain:'),learningMs:sum('learn:'),preMs:sum('pre:'),postMs:sum('post:'),delayedMs:sum('delayed:'),stuck:s.events.filter(e=>e.type==='stuck').length,interrupted:s.phase==='interrupted'};}
 function csv(s){const headers=['run_id','quest_id','revision','prior','phase','question_id','correct','confidence','reason','active_ms','event','note'];const rows=[];
  for(const phase of ['pre','post','delayed'])for(const a of s.answers[phase])rows.push([s.runId,s.questId,s.revision,s.prior,phase,a.id,a.ok?1:0,a.confidence,a.reason,Math.round(s.times[phase+':'+a.id]||0),'','']);
  for(const [key,ms] of Object.entries(s.times).filter(([k])=>k.startsWith('learn:')))rows.push([s.runId,s.questId,s.revision,s.prior,'learn',key,'','','',Math.round(ms),'','']);
  for(const e of s.events)rows.push([s.runId,s.questId,s.revision,s.prior,'event',e.context||'','','','','',e.type,e.note||'']);
  rows.push([s.runId,s.questId,s.revision,s.prior,'summary','','',s.rating??'','','','phase='+s.phase,s.notes||'']);
  const cell=v=>{let text=String(v??'');if(/^[\s]*[=+\-@]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};return '\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
 }
 function restore(raw,study,quests){let s;try{s=JSON.parse(raw);}catch{throw Error('実測記録を読み取れません。');}const quest=quests.find(q=>q.id===s?.questId);if(!quest||s.version!==VERSION||!/^[a-z0-9-]{1,48}$/.test(s.runId||'')||!['pre','learn','post','waiting','delayed','done','interrupted'].includes(s.phase)||!['none','terms','studied'].includes(s.prior)||JSON.stringify(s.questionIds)!==JSON.stringify(questionIds(study,quest)))throw Error('実測記録の版・単元を確認できません。');
  if(!s.answers||!s.times||!Array.isArray(s.events)||typeof s.paused!=='boolean'||typeof s.learningComplete!=='boolean'||typeof s.notes!=='string'||s.notes.length>1000||![null,1,2,3,4,5].includes(s.rating)||!Number.isFinite(s.createdAt)||s.postCompletedAt!==null&&!Number.isFinite(s.postCompletedAt))throw Error('実測記録の形式が不正です。');
  for(const phase of ['pre','post','delayed']){const a=s.answers[phase];if(!Array.isArray(a)||a.length>s.questionIds.length||a.some((x,i)=>x.id!==s.questionIds[i]||typeof x.ok!=='boolean'||![0,1,2,3].includes(x.confidence)||typeof x.reason!=='string'||x.reason.length>500))throw Error('回答記録が不正です。');}
  if(Object.values(s.times).some(x=>!Number.isFinite(x)||x<0)||s.events.length>10000)throw Error('時間記録が不正です。');return s;
 }
 return {VERSION,DAY,questionIds,empty,context,addTime,answer,canDelayed,results,csv,restore};
});
