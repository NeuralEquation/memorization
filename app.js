'use strict';
const data=window.STUDY_DATA, C=window.StudyCore;
const KEY='seikei-midterm-202610-v1';
const $=id=>document.getElementById(id);
const esc=x=>String(x).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
let progress;
try{progress=C.read(localStorage.getItem(KEY),data);}catch{progress=C.empty(data.version);}
const state={mode:'all',unit:'all',importance:'all',filter:'all',current:null,locked:false,order:[],batch:null,answered:0,cycle:[]};
const labels={all:'形式を組み合わせる',recall:'1問1答',choice:'4択・制度比較',judge:'正誤と誤文訂正',order:'時系列',calc:'計算'};
function shuffle(xs){const out=xs.slice();for(let i=out.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(progress));$('saveStatus').textContent='進捗をこの端末に保存しました';}catch{$('saveStatus').textContent='保存できません。ブラウザの保存設定を確認してください（演習は続行できます）。';}}
function pool(){return data.questions.filter(q=>(state.unit==='all'||q.unit===state.unit)&&(state.importance==='all'||q.importance===state.importance)&&(state.mode==='all'||(state.mode==='choice'?['choice','compare'].includes(q.type):q.type===state.mode))&&(state.filter==='all'||(state.filter==='weak'?C.weak(progress,q):!C.mastered(progress,q))));}
function stats(){
 $('okCount').textContent=progress.stats.ok;$('missCount').textContent=progress.stats.miss;$('streakCount').textContent=progress.stats.streak;
 $('weakCount').textContent=data.questions.filter(q=>C.weak(progress,q)).length;
 $('learnedCount').textContent=data.objectives.filter(o=>C.objectiveMastered(progress,o.id,data.questions)).length+'/'+data.objectives.length;
 $('scopeCount').textContent=`収録 ${data.questions.length}問 / 学習目標 ${data.objectives.length}件。問題集の設問全体の照合 0/180。`;
}
function next(reset=false){
 if(reset){state.batch=null;state.answered=0;state.cycle=[];}
 if(state.batch&&state.answered>=state.batch){$('gameArea').className='arena';$('gameArea').innerHTML='<section><h2>今回の50問が終了しました</h2><p>解説を読んで、時間を空けて同じ内容を解き直してください。</p><button id="again">続ける</button></section>';$('again').onclick=()=>next(true);return;}
 const p=pool();state.cycle=state.cycle.filter(id=>p.some(q=>q.id===id));
 let fresh=p.filter(q=>!state.cycle.includes(q.id));
 const dueWrong=p.filter(q=>{const r=progress.records[q.id];return r&&!r.lastOK&&r.dueTurn<=progress.turn&&q.id!==state.current?.id;});
 if(!fresh.length){state.cycle=[];fresh=p;}
 // Mix delayed errors with fresh work so repeated mistakes cannot starve new topics.
 const q=C.choose(dueWrong.length&&progress.turn%4===0?dueWrong:fresh,progress,state.current?.id);
 state.current=q;state.locked=false;state.order=[];
 if(!q){$('gameArea').className='arena';$('gameArea').innerHTML='<section><h2>該当する問題がありません</h2><p>弱点がない場合や、選んだ条件で未習得問題がない場合は、全範囲復習へ切り替えてください。</p></section>';stats();return;}
 state.cycle.push(q.id);renderQuestion();stats();
}
function renderQuestion(){
 const q=state.current;let input='';
 if(['choice','compare'].includes(q.type))input='<div class="choices">'+shuffle(q.options.map((text,i)=>({text,i}))).map(o=>`<button data-choice="${o.i}">${esc(o.text)}</button>`).join('')+'</div>';
 else if(q.type==='judge')input='<div class="choices"><button data-judge="true">正しい</button><button data-judge="false">誤り</button></div>';
 else if(q.type==='order')input='<p>古いもの・先に起きるものから順に押してください。</p><div class="choices">'+shuffle(q.items).map((v,i)=>`<button data-order="${i}">${esc(v)}</button>`).join('')+'</div><ol id="orderList"></ol><button id="undo">並べ直す</button><button class="primary" id="submitOrder">判定</button>';
 else input='<form id="answerForm" class="text-answer"><input id="answerInput" aria-label="解答" autocomplete="off" placeholder="解答を入力"><button class="primary">判定</button></form>';
 $('gameArea').className='arena';$('gameArea').innerHTML=`<section class="question-card"><div class="question-top"><span class="badge ${q.importance.toLowerCase()}">重要度${q.importance}</span><span class="badge">${esc(q.unit)}</span></div><div class="question-body"><p class="prompt-label">${esc(labels[q.type]||'制度・条件の比較')} / ${q.id}</p><p class="prompt">${esc(q.prompt)}</p>${input}<p><button id="unknown">わからない</button></p></div><div id="feedback" class="feedback" aria-live="polite">解答後に理由と根拠を確認できます。</div></section><aside class="right-panel"><div class="meter"><b>学習の進め方</b><p>語句・判断を組み合わせて練習します。判断の根拠も自分で説明してから回答してください。</p><p>同じ問題を10分以上空けて2回正解し、同一目標の語句と判断問題2問で条件を満たすと「習得」と表示します。</p><p>習得表示は試験成績や問題集全体の網羅を保証しません。</p></div></aside>`;
 document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>answer(Number(b.dataset.choice)));
 document.querySelectorAll('[data-judge]').forEach(b=>b.onclick=()=>{
  state.judgeVerdict=b.dataset.judge==='true';
  document.querySelectorAll('[data-judge]').forEach(x=>{x.classList.toggle('selected',x===b);});
  let box=$('correctionBox');if(!box){box=document.createElement('section');box.id='correctionBox';b.closest('.choices').after(box);}
  box.innerHTML='<p>続いて、根拠や訂正に使える正しい説明を一つ選ぶ（両方で採点）。</p><div class="choices">'+shuffle(q.correctionOptions.map((text,i)=>({text,i}))).map(o=>`<button data-correction="${o.i}">${esc(o.text)}</button>`).join('')+'</div>';
  document.querySelectorAll('[data-correction]').forEach(x=>x.onclick=()=>answer({verdict:state.judgeVerdict,correction:Number(x.dataset.correction)}));
 });
 $('unknown').onclick=()=>answer(null);
 if($('answerForm'))$('answerForm').onsubmit=e=>{e.preventDefault();if($('answerInput').value.trim())answer($('answerInput').value);};
 if(q.type==='order'){
  document.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>{state.order.push(b.textContent);b.disabled=true;$('orderList').innerHTML=state.order.map(t=>'<li>'+esc(t)+'</li>').join('');});
  $('undo').onclick=()=>{state.order=[];document.querySelectorAll('[data-order]').forEach(b=>b.disabled=false);$('orderList').innerHTML='';};
  $('submitOrder').onclick=()=>{if(state.order.length===q.items.length)answer(state.order);};
 }
}
function answer(value){
 if(state.locked)return;const q=state.current;state.locked=true;const ok=value!==null&&C.grade(q,value);C.record(progress,q,ok);state.answered++;save();stats();
 document.querySelectorAll('.question-body button,.question-body input').forEach(b=>b.disabled=true);
 let correct=q.type==='order'?q.answer.join(' → '):q.type==='judge'?(q.answer?'正しい':'誤り'):['choice','compare'].includes(q.type)?q.options[q.answer]:q.answer;
 $('feedback').className='feedback '+(ok?'ok':'bad');
 $('feedback').innerHTML=`<b>${ok?'正解':'確認し直しましょう'}</b><p>正答：${esc(correct)}</p><p>${esc(q.explanation)}</p>${q.optionReasons?'<ul>'+(q.options||q.correctionOptions).map((o,i)=>`<li>${esc(o)}：${esc(q.optionReasons[i])}</li>`).join('')+'</ul>':''}<p class="source">根拠：${esc(q.source)}</p><p><a href="print.html#${q.objective}" target="_blank" rel="noopener">印刷教材の解説へ</a></p><button id="nextBtn" class="primary">次へ</button>`;
 $('nextBtn').onclick=()=>next();
}
function deck(){
 state.locked=true;$('gameArea').className='deck-view';const term=$('searchInput').value.trim();
 $('gameArea').innerHTML=data.objectives.filter(o=>(state.unit==='all'||state.unit===o.unit)&&(!term||[o.title,o.lesson,o.id].join(' ').includes(term))).map(o=>`<article class="mini-card"><h3>${o.id} ${esc(o.title)}</h3><p>${esc(o.lesson)}</p><p class="source">${esc(o.source)}</p><a href="print.html#${o.id}" target="_blank" rel="noopener">印刷教材</a></article>`).join('')||'<p>該当する解説がありません。</p>';
}
function controls(){
 $('modeGrid').innerHTML=Object.entries(labels).map(([id,name])=>`<button data-mode="${id}" class="${state.mode===id?'selected':''}">${name}</button>`).join('');
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;controls();next(true);});
 $('stageGrid').innerHTML=['all',...new Set(data.objectives.map(o=>o.unit))].map(id=>`<button data-unit="${id}" class="${state.unit===id?'selected':''}">${id==='all'?'全単元':esc(id)}</button>`).join('');
 document.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>{state.unit=b.dataset.unit;controls();next(true);});
}
function resetFilters(){state.mode='all';state.unit='all';state.importance='all';state.filter='all';$('importance').value='all';$('studyFilter').value='all';controls();next(true);}
controls();stats();next(true);
$('startBtn').onclick=()=>{state.batch=50;state.answered=0;state.cycle=[];next();};
$('weakBtn').onclick=()=>{state.filter='weak';$('studyFilter').value='weak';next(true);};
$('reviewBtn').onclick=resetFilters;
$('resetBtn').onclick=()=>{if(confirm('今回の試験用の正誤履歴・弱点・習得状態をリセットしますか？')){progress=C.empty(data.version);save();next(true);}};
$('deckBtn').onclick=deck;$('searchInput').oninput=deck;
$('importance').onchange=e=>{state.importance=e.target.value;next(true);};
$('studyFilter').onchange=e=>{state.filter=e.target.value;next(true);};
$('exportBtn').onclick=()=>{const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(progress,null,2)],{type:'application/json'}));a.href=url;a.download='seikei-progress-202610.json';a.click();URL.revokeObjectURL(url);};
const media=matchMedia('(min-width:901px)');function panels(){for(const id of ['modePanel','stagePanel'])$(id).open=media.matches;}panels();media.addEventListener('change',panels);
if('serviceWorker' in navigator){
 let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!reloading){reloading=true;location.reload();}});
 navigator.serviceWorker.register('./service-worker.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('offlineStatus').textContent='オフライン学習の準備ができました';}).catch(()=>{$('offlineStatus').textContent='オフライン準備に失敗しました。オンラインで再読み込みしてください。';});
}
