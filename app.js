'use strict';
const data=window.STUDY_DATA, C=window.StudyCore;
const KEY='seikei-midterm-202610-v1';
const $=id=>document.getElementById(id);
const esc=x=>String(x).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
let progress;
try{progress=C.read(localStorage.getItem(KEY),data);}catch{progress=C.empty(data.version);}
const state={mode:'all',unit:'all',importance:'all',filter:'all',current:null,locked:false,order:[],batch:null,answered:0,cycle:[]};
const labels={all:'形式を組み合わせる',recall:'1問1答',choice:'4択・制度比較',judge:'正誤と誤文訂正',order:'時系列',calc:'計算'};
let activeView='study',draftFilters=null;
const viewScroll={};
function showView(view){
 viewScroll[activeView]=scrollY;activeView=view;
 for(const name of ['study','library','materials','progress'])$(name+'View').hidden=name!==view;
 document.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 if(view==='library')deck();if(view==='progress')stats();
 window.scrollTo({top:viewScroll[view]||0,behavior:'instant'});
}
function filterPreview(){
 const f=draftFilters||state,base=pool(f);
 $('filterStatus').textContent=f.filter==='unmastered'?(base.some(q=>!C.mastered(progress,q))?'未習得の問題を先に出題します。条件内の未習得がなくなったら習得済みを復習します。':'条件内の問題はすべて習得済みです。習得済みの復習に切り替えています。'):f.filter==='weak'?'間違えた履歴があり、まだ習得していない問題だけを出題します。':'選択した単元・形式・重要度の全問から出題します。';
 $('filterMatch').textContent='この条件に該当：'+base.length+'問';
}
function studyHUD(){
 const filterNames={all:'収録全問',unmastered:'未習得優先',weak:'弱点を復習'};
 $('filterSummary').innerHTML=[state.unit==='all'?'全単元':state.unit,state.mode==='all'?'形式ミックス':labels[state.mode],filterNames[state.filter],...(state.importance==='all'?[]:['重要度'+state.importance])].map(s=>'<span>'+esc(s)+'</span>').join('');
 $('sessionLabel').textContent=state.batch?'50問チャレンジ · '+Math.min(state.answered,state.batch)+' / 50問 回答済み':'語句と判断を、じっくり身につけよう';
 $('sessionProgress').hidden=!state.batch;$('sessionFill').style.width=(state.batch?Math.min(100,state.answered/state.batch*100):0)+'%';
 $('sessionStats').textContent='正解 '+progress.stats.ok+' · ミス '+progress.stats.miss+' · 連続正解 '+progress.stats.streak;
 filterPreview();
}
function shuffle(xs){const out=xs.slice();for(let i=out.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(progress));$('saveStatus').textContent='進捗をこの端末に保存しました';}catch{$('saveStatus').textContent='保存できません。ブラウザの保存設定を確認してください（演習は続行できます）。';}}
function pool(f=state){return data.questions.filter(q=>(f.unit==='all'||q.unit===f.unit)&&(f.importance==='all'||q.importance===f.importance)&&(f.mode==='all'||(f.mode==='choice'?['choice','compare'].includes(q.type):q.type===f.mode))&&(f.filter!=='weak'||C.weak(progress,q)));}
function stats(){
 $('okCount').textContent=progress.stats.ok;$('missCount').textContent=progress.stats.miss;$('streakCount').textContent=progress.stats.streak;
 $('weakCount').textContent=data.questions.filter(q=>C.weak(progress,q)).length;
 $('learnedCount').textContent=data.objectives.filter(o=>C.objectiveMastered(progress,o.id,data.questions)).length+'/'+data.objectives.length;
 $('scopeCount').textContent=`収録 ${data.questions.length}問 / 学習目標 ${data.objectives.length}件。問題集の要求判断の対応確認 ${data.coverage.verified}/${data.coverage.total}（作成者照合）。`;
 const mastered=data.objectives.filter(o=>C.objectiveMastered(progress,o.id,data.questions)).length;
 $('masteryHeadline').textContent=mastered+' / '+data.objectives.length+' テーマを習得';
 $('masteryCaption').textContent='語句と判断の両方を練習して、理解を確かなものに。';$('masteryFill').style.width=mastered/data.objectives.length*100+'%';
 $('unitProgress').innerHTML=[...new Set(data.objectives.map(o=>o.unit))].map(unit=>{const os=data.objectives.filter(o=>o.unit===unit),n=os.filter(o=>C.objectiveMastered(progress,o.id,data.questions)).length;return '<div class="unit-row"><b>'+esc(unit)+'</b><span>'+n+' / '+os.length+' テーマ</span></div>';}).join('');
 studyHUD();
}
function next(reset=false){
 if(reset){state.batch=null;state.answered=0;state.cycle=[];}
 if(state.batch&&state.answered>=state.batch){$('gameArea').className='arena';$('gameArea').innerHTML='<section class="empty-state"><p class="eyebrow">SESSION COMPLETE</p><h2>今回の50問が終了しました</h2><p>おつかれさまでした。進捗を確認し、時間を空けて復習しましょう。</p><button id="again" class="primary">続ける</button><button id="seeProgress">進捗を見る</button></section>';$('again').onclick=()=>next(true);$('seeProgress').onclick=()=>showView('progress');stats();window.scrollTo({top:0,behavior:'instant'});return;}
 const base=pool(),p=C.prioritize(base,progress,state.filter);state.cycle=state.cycle.filter(id=>p.some(q=>q.id===id));
 let fresh=p.filter(q=>!state.cycle.includes(q.id));
 const dueWrong=p.filter(q=>{const r=progress.records[q.id];return r&&!r.lastOK&&r.dueTurn<=progress.turn&&q.id!==state.current?.id;});
 if(!fresh.length){state.cycle=[];fresh=p;}
 // Mix delayed errors with fresh work so repeated mistakes cannot starve new topics.
 const q=C.choose(dueWrong.length&&progress.turn%4===0?dueWrong:fresh,progress,state.current?.id);
 state.current=q;state.locked=false;state.order=[];
 if(!q){$('gameArea').className='arena';$('gameArea').innerHTML='<section class="empty-state"><h2>該当する問題がありません</h2><p>選んだ単元・形式・重要度に問題がないか、弱点の条件に該当しません。</p><button id="changeFilters">出題設定を変える</button><button id="allQuestions" class="primary">全範囲を復習する</button></section>';$('changeFilters').onclick=openFilters;$('allQuestions').onclick=resetFilters;stats();return;}
 state.cycle.push(q.id);renderQuestion();stats();if(activeView==='study')window.scrollTo({top:0,behavior:'instant'});
}
function questionData(q){
 let out='';
 if(q.table)out+='<div class="data-table"><table><caption>'+esc(q.table.caption)+'</caption><thead><tr>'+q.table.headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+q.table.rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 if(q.charts){out+='<div class="chart-grid">'+q.charts.map(c=>{
  const x=i=>50+i*125,y=v=>160-v/c.max*125;
  const desc=c.labels.map((l,i)=>l+'：'+c.values[i]).join('、');
  return '<figure><figcaption>'+esc(c.title)+'</figcaption><svg viewBox="0 0 340 200" role="img" aria-label="'+esc(c.title+' '+desc)+'"><path d="M40 25V160H320" fill="none" stroke="#657580"/>'+[0,c.max/2,c.max].map(v=>'<text x="2" y="'+(y(v)+4)+'">'+v+'</text>').join('')+'<polyline points="'+c.values.map((v,i)=>x(i)+','+y(v)).join(' ')+'" fill="none" stroke="#126e67" stroke-width="3"/>'+c.values.map((v,i)=>'<circle cx="'+x(i)+'" cy="'+y(v)+'" r="4" fill="#126e67"/><text text-anchor="middle" x="'+x(i)+'" y="'+(y(v)-10)+'">'+v+'</text><text text-anchor="middle" x="'+x(i)+'" y="188">'+esc(c.labels[i])+'</text>').join('')+'</svg></figure>';
 }).join('')+'</div><p class="data-caption">'+esc(q.chartCaption)+'</p>';}
 return out;
}
function renderQuestion(){
 const q=state.current;let input='';
 if(['choice','compare'].includes(q.type))input='<div class="choices">'+shuffle(q.options.map((text,i)=>({text,i}))).map((o,n)=>`<button data-choice="${o.i}"><span class="choice-number" aria-hidden="true">${n+1}</span><span>${esc(o.text)}</span></button>`).join('')+'</div>';
 else if(q.type==='judge')input='<div class="choices"><button data-judge="true">正しい</button><button data-judge="false">誤り</button></div>';
 else if(q.type==='order')input='<p>古いもの・先に起きるものから順に押してください。</p><div class="choices">'+shuffle(q.items).map((v,i)=>`<button data-order="${i}">${esc(v)}</button>`).join('')+'</div><ol id="orderList"></ol><div class="order-actions"><button id="undo">並べ直す</button><button class="primary" id="submitOrder">判定</button></div>';
 else input='<form id="answerForm" class="text-answer"><input id="answerInput" aria-label="解答" autocomplete="off" placeholder="解答を入力"><button class="primary">判定</button></form>';
 let prompt=esc(q.prompt);
 if(q.format==='combination'){
  const lines=q.prompt.split('\n'),start=lines.findIndex(t=>/^[アイウエオ][\s　]/.test(t));
  if(start>=0)prompt=esc(lines.slice(0,start).join('\n'))+'</p><ol class="statement-list">'+lines.slice(start).filter(Boolean).map(t=>{const m=t.match(/^([アイウエオ])[\s　]+(.*)$/);return m?'<li><span class="statement-mark">'+m[1]+'</span><span>'+esc(m[2])+'</span></li>':'<li>'+esc(t)+'</li>';}).join('')+'</ol><p class="sr-only">正誤の組合せを選んでください';
 }
 $('gameArea').className='arena';$('gameArea').innerHTML=`<section class="question-card"><div class="question-top"><div class="question-meta"><span class="badge">${esc(q.unit)}</span><span class="badge ${q.importance.toLowerCase()}">重要度${q.importance}</span></div><span class="question-index">${q.id}</span></div><div class="question-body"><p class="prompt-label">${esc(q.format==='combination'?'複数文の正誤組合せ':labels[q.type]||'制度・条件の比較')}</p><p class="prompt">${prompt}</p>${questionData(q)}<p class="answer-label">${q.type==='order'?'順番を選んで回答':q.type==='judge'?'正誤を選び、次に根拠を選んで回答':['choice','compare'].includes(q.type)?'正しい答えを1つ選択':'答えを入力して回答'}</p>${input}<div class="answer-tools"><button id="unknown">わからない · 解説を見る</button></div></div><div id="feedback" class="feedback waiting" aria-live="polite" tabindex="-1">解答後に理由と根拠を確認できます。</div></section>`;
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
 if(['choice','compare'].includes(q.type))document.querySelectorAll('[data-choice]').forEach(b=>{b.classList.toggle('correct',Number(b.dataset.choice)===q.answer);b.classList.toggle('wrong',Number(b.dataset.choice)===value&&value!==q.answer);});
 let correct=q.type==='order'?q.answer.join(' → '):q.type==='judge'?(q.answer?'正しい':'誤り'):['choice','compare'].includes(q.type)?q.options[q.answer]:q.answer;
 $('feedback').className='feedback '+(ok?'ok':'bad');
 $('feedback').innerHTML=`<b>${ok?'正解':'確認し直しましょう'}</b><p class="answer-result">正答：${esc(correct)}</p><p>${esc(q.explanation)}</p>${q.optionReasons?'<ul>'+(q.options||q.correctionOptions).map((o,i)=>`<li>${esc(o)}：${esc(q.optionReasons[i])}</li>`).join('')+'</ul>':''}<p class="source">根拠：${esc(q.source)}</p><div class="feedback-actions"><a href="print-complete.html#${q.objective}" target="_blank" rel="noopener">教材で詳しく読む ↗</a><button id="nextBtn" class="primary">次の問題へ →</button></div>`;
 $('nextBtn').onclick=()=>next();
 $('feedback').focus({preventScroll:true});$('feedback').scrollIntoView({block:'start',behavior:'instant'});
}
function deck(){
 const term=$('searchInput').value.trim(),unit=$('libraryUnit').value;
 const os=data.objectives.filter(o=>(unit==='all'||unit===o.unit)&&(!term||[o.title,o.lesson,...(o.points||[]),o.id].join(' ').includes(term)));
 $('libraryCount').textContent=os.length+'テーマ';
 $('libraryArea').innerHTML=os.map(o=>`<details class="mini-card"><summary><div><small>${esc(o.unit)} · ${o.id}</small><strong>${esc(o.title)}</strong></div></summary><div class="lesson-body">${o.points?'<ul>'+o.points.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul>':'<p>'+esc(o.lesson)+'</p>'}<p class="source">${esc(o.source)}</p><a href="print-complete.html#${o.id}" target="_blank" rel="noopener">教材で詳しく読む ↗</a></div></details>`).join('')||'<p class="empty-state">該当する解説がありません。別のキーワードで検索してください。</p>';
}
function controls(){
 const f=draftFilters||state;
 $('modeGrid').innerHTML=Object.entries(labels).map(([id,name])=>`<button data-mode="${id}" aria-pressed="${f.mode===id}">${name}</button>`).join('');
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{f.mode=b.dataset.mode;controls();filterPreview();document.querySelector('[data-mode="'+f.mode+'"]').focus();});
 $('stageGrid').innerHTML=['all',...new Set(data.objectives.map(o=>o.unit))].map(id=>`<button data-unit="${id}" aria-pressed="${f.unit===id}">${id==='all'?'全単元':esc(id)}</button>`).join('');
 document.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>{f.unit=b.dataset.unit;controls();filterPreview();document.querySelector('[data-unit="'+f.unit+'"]').focus();});
}
function openFilters(){
 draftFilters={mode:state.mode,unit:state.unit,importance:state.importance,filter:state.filter};
 $('importance').value=draftFilters.importance;$('studyFilter').value=draftFilters.filter;controls();filterPreview();$('filterDialog').showModal();
}
function closeFilters(){draftFilters=null;$('filterDialog').close();controls();filterPreview();}
function resetFilters(){state.mode='all';state.unit='all';state.importance='all';state.filter='all';$('importance').value='all';$('studyFilter').value='all';controls();next(true);}
controls();stats();next(true);
$('startBtn').onclick=()=>{state.batch=50;state.answered=0;state.cycle=[];next();};
$('weakBtn').onclick=()=>{state.filter='weak';$('studyFilter').value='weak';showView('study');next(true);};
$('reviewBtn').onclick=()=>{showView('study');resetFilters();};
$('resetBtn').onclick=()=>{if(confirm('今回の試験用の正誤履歴・弱点・習得状態をリセットしますか？')){progress=C.empty(data.version);save();next(true);}};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
$('searchInput').oninput=deck;
$('libraryUnit').innerHTML=['all',...new Set(data.objectives.map(o=>o.unit))].map(u=>'<option value="'+esc(u)+'">'+esc(u==='all'?'すべての単元':u)+'</option>').join('');
$('libraryUnit').onchange=deck;
$('filterBtn').onclick=openFilters;$('closeFilters').onclick=closeFilters;
$('filterDialog').addEventListener('cancel',e=>{e.preventDefault();closeFilters();});
$('applyFilters').onclick=()=>{Object.assign(state,draftFilters);closeFilters();next(true);};
$('importance').onchange=e=>{if(draftFilters){draftFilters.importance=e.target.value;filterPreview();}};
$('studyFilter').onchange=e=>{if(draftFilters){draftFilters.filter=e.target.value;filterPreview();}};
$('exportBtn').onclick=()=>{const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(progress,null,2)],{type:'application/json'}));a.href=url;a.download='seikei-progress-202610.json';a.click();URL.revokeObjectURL(url);};
const BEFORE_IMPORT=KEY+'-before-import';let pendingImport=null,importRequest=0;
function refreshUndo(){try{$('undoImport').disabled=!localStorage.getItem(BEFORE_IMPORT);}catch{$('undoImport').disabled=true;}}
function clearImport(){importRequest++;pendingImport=null;$('progressFile').value='';$('applyImport').disabled=true;$('importPreview').textContent='JSONを選ぶと内容を検査します。まだ進捗は変更されません。';}
$('importBtn').onclick=()=>{$('importPanel').hidden=!$('importPanel').hidden;refreshUndo();};
$('cancelImport').onclick=()=>{clearImport();$('importPanel').hidden=true;};
$('progressFile').onchange=async e=>{
 const request=++importRequest,file=e.target.files[0];pendingImport=null;$('applyImport').disabled=true;if(!file)return;
 try{
  if(file.size>2*1024*1024)throw new Error('2MB以下の進捗JSONを選んでください。');
  const raw=await file.text();if(request!==importRequest)return;
  const p=C.restore(raw,data);pendingImport=p;
  $('importPreview').textContent=`${file.name}：回答${p.turn}回・正解${p.stats.ok}回・ミス${p.stats.miss}回・目標習得${data.objectives.filter(o=>C.objectiveMastered(p,o.id,data.questions)).length}/${data.objectives.length}。適用すると現在の進捗を置き換えます。復元前の進捗もこの端末に退避します。`;
  $('applyImport').disabled=false;
 }catch(error){if(request!==importRequest)return;$('importPreview').textContent='読み込みを中止しました：'+error.message;}
};
$('applyImport').onclick=()=>{
 if(!pendingImport)return;
 try{
  localStorage.setItem(BEFORE_IMPORT,JSON.stringify(progress));
  localStorage.setItem(KEY,JSON.stringify(pendingImport));
  progress=pendingImport;clearImport();next(true);refreshUndo();
  $('importPreview').textContent='進捗を復元しました。「復元前に戻す」で直前の進捗に戻せます。';$('saveStatus').textContent='読み込んだ進捗をこの端末に保存しました';
 }catch{$('importPreview').textContent='保存できなかったため復元を中止しました。現在の進捗は変更していません。';refreshUndo();}
};
$('undoImport').onclick=()=>{
 try{const previous=C.restore(localStorage.getItem(BEFORE_IMPORT),data);localStorage.setItem(KEY,JSON.stringify(previous));progress=previous;clearImport();next(true);$('importPreview').textContent='復元前の進捗に戻しました。';$('saveStatus').textContent='復元前の進捗をこの端末に保存しました';}
 catch(error){$('importPreview').textContent='戻せませんでした：'+error.message;}
};
refreshUndo();
// Keep filter groups expanded inside the dedicated settings dialog at every size.
if('serviceWorker' in navigator){
 let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!reloading){reloading=true;location.reload();}});
 navigator.serviceWorker.register('./service-worker.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('offlineStatus').textContent='オフライン学習の準備ができました';$('materialsOffline').textContent='オフライン学習の準備ができました。教材HTMLもオフラインで読めます。PDFは端末に保存してください。';}).catch(()=>{$('offlineStatus').textContent='オフライン準備に失敗しました。オンラインで再読み込みしてください。';$('materialsOffline').textContent=$('offlineStatus').textContent;});
}
