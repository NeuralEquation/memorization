/* A separate learning record keeps ordinary drills and their backups unchanged. */
(function(){
  'use strict';
  const Q=window.QuestCore,cat=Q.catalog(window.STUDY_DATA,window.QUEST_DATA);
  const scope=new URL(location.href).searchParams.get('pilot');
  const KEY='seikei-quest-202610-v1'+(/^[a-z0-9-]{1,48}$/.test(scope||'')?'-pilot-'+scope:''),BEFORE=KEY+'-before-import',VIEW=KEY+'-screen';
  const e=id=>document.getElementById(id),escape=window.StudyCore?x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])):String;
  let p=Q.empty(),screen='map',minutes=10,message='',unreadable=null,readIssue='',pendingImport=null,importNonce=0;
  try{const raw=localStorage.getItem(KEY);if(raw){try{p=Q.restore(raw,cat);}catch(error){unreadable=raw;readIssue=error.message+' 元の保存データは残しています。下のバックアップから復元できます。';}}screen=localStorage.getItem(VIEW)==='play'&&p.session?'play':'map';minutes=p.session?.minutes||10;}catch{readIssue='このブラウザでは保存先を読み取れません。進捗を書き出して保管してください。';}
  function persist(){
    try{if(unreadable!==null){localStorage.setItem(KEY+'-unreadable',unreadable);unreadable=null;}localStorage.setItem(KEY,JSON.stringify(p));localStorage.setItem(VIEW,screen);message='クエストの進捗を保存しました';readIssue='';return true;}
    catch{message='この端末に保存できません。マップから進捗を書き出して保管してください。';document.querySelectorAll('.quest-save').forEach(el=>el.textContent=message);return false;}
  }
  function statusText(q){const s=Q.questStatus(p,q);return s.settled?'定着':s.cleared?'クリア':s.reached?'到達・復習あり':p.runs[q.id]&&!p.runs[q.id].done?'途中から':'未学習';}
  function saveLine(){return '<p class="quest-save" role="status">'+escape(message||'中断しても、この端末に続きが残ります')+'</p>';}
  function map(){
    importNonce++;pendingImport=null;
    const now=Date.now(),planned=Q.plan(p,cat,minutes,now),due=Q.dueQuestions(p,cat,now),weak=Q.dueQuestions(p,cat,now,true),cov=Q.coverageStatus(p,cat),first=Q.firstScore(p,cat);
    const completed=cat.source.quests.filter(q=>Q.questStatus(p,q).reached).length,settled=cat.source.quests.filter(q=>Q.questStatus(p,q).settled).length;
    const currentRun=Q.run(p),resume=currentRun&&!currentRun.done;
    const recommended=planned.ids.find(id=>id!=='@review'),q=cat.quests[recommended];
    const chapters=[...new Set(cat.source.quests.map(q=>q.chapter))];
    e('questContent').innerHTML=`
      <header class="page-head"><div><p class="eyebrow">QUEST LEARNING</p><h1>学んでから、挑戦しよう。</h1><p>言葉の意味から、例題の解き方まで。一つずつ授業を進めます。</p></div></header>
      ${readIssue?'<p class="quest-warning" role="alert">'+escape(readIssue)+'</p>':''}
      <div class="quest-dashboard">
        <section class="quest-start"><p class="eyebrow">今日の学習時間</p><div class="quest-time" role="group" aria-label="学習時間">${[10,30,60].map(m=>'<button data-qtime="'+m+'" aria-pressed="'+(m===minutes)+'">'+m+'<small>分</small></button>').join('')}</div>
          ${resume?'<div class="quest-resume"><b>続きが保存されています</b><p>'+escape(currentRun.questId?cat.quests[currentRun.questId].title:'間隔を空けた復習')+' · ステップ '+(currentRun.index+1)+' / '+currentRun.steps.length+'</p><button id="questResume" class="primary">続きから再開 →</button></div>':''}
          <p class="quest-recommend">${q?'次のおすすめ · '+q.id:'復習のタイミング'}</p><h2>${escape(q?q.title:due.length?'昨日の内容を思い出そう':'全範囲に到達しました')}</h2>
          <p>${escape(q?q.intro:'復習は最初の解説を見ずに答えます。24時間以上空けた自力正解を定着として記録します。')}</p>
          <p class="source">${planned.partialQuest?'1クエストを途中まで。'+minutes+'分を区切りに保存して中断できます。':planned.ids.filter(id=>id!=='@review').length+'クエスト · 目安'+planned.estimatedMinutes+'分'}${planned.reviewIds.length?' ＋ 復習'+planned.reviewIds.length+'問':''}<br>読む速さで前後します。時間による強制終了はありません。</p>
          <button id="questStartPlan" class="${resume?'':'primary'}" ${planned.ids.length?'':'disabled'}>${resume?'新しい時間コースを始める':'学習をはじめる →'}</button>
        </section>
        <aside class="quest-overview"><h2>ここまでの冒険</h2><div class="quest-totals"><div><strong>${completed}<small> / 37</small></strong><span>クエスト到達</span></div><div><strong>${settled}<small> / 37</small></strong><span>間隔を空けて定着</span></div></div><div class="progress-track"><span style="width:${completed/37*100}%"></span></div>
          <p class="source">問題集の対応演習<br>到達 ${cov.reached} / 180 · 定着 ${cov.settled} / 180</p>
          <p class="source">初回の自力正答 ${first.correct} / ${first.total}問<br>解説を開いた回答は自力正答に含めません。</p>
          <div class="action-stack"><button id="questDue" ${due.length?'':'disabled'}>時間を空けた復習 <b>${due.length}</b></button><button id="questWeak" ${weak.length?'':'disabled'}>弱点に再挑戦 <b>${weak.length}</b></button></div><p class="source">復習は1回最大8問。未学習の範囲を進めながら取り組めます。</p>
        </aside>
      </div>
      ${saveLine()}
      ${scope?'':'<details class="info-block"><summary>授業の理解度と時間を確かめる</summary><p>普段の進捗と分けて、学習前・直後・翌日の確認と、学習時間・つまずきを記録できます。氏名不要・自動送信なし。</p><a href="./pilot.html">実測ページを開く →</a></details>'}
      <section class="quest-map" aria-label="クエストマップ"><div class="quest-section-head"><h2>クエストマップ</h2><span>37クエスト · 68学習目標</span></div>
      ${chapters.map((chapter,chapterIndex)=>{const qs=cat.source.quests.filter(q=>q.chapter===chapter),n=qs.filter(q=>Q.questStatus(p,q).reached).length;return '<details class="quest-chapter" '+((q?.chapter||chapters[0])===chapter?'open':'')+'><summary><span class="quest-chapter-number">'+String(chapterIndex+1).padStart(2,'0')+'</span><strong>'+escape(chapter)+'</strong><span>'+n+' / '+qs.length+' 到達</span></summary><div class="quest-nodes">'+qs.map(item=>{
        const stat=Q.questStatus(p,item),missing=item.prerequisites.filter(id=>!p.reached[id]);
        return '<button class="quest-node '+(stat.settled?'is-settled':stat.reached?'is-reached':'')+'" data-quest="'+item.id+'"><span class="quest-node-number">'+(stat.settled?'✓':String(item.order).padStart(2,'0'))+'</span><span class="quest-node-content"><strong>'+escape(item.title)+'</strong><small>'+item.objectives.map(id=>escape(cat.study.objectives.find(o=>o.id===id).title)).join(' / ')+'</small><small>'+item.minutes+'分目安'+(missing.length?' · 先に '+missing.join('・')+' がおすすめ':'')+'</small></span><span class="quest-state">'+statusText(item)+'</span></button>';
      }).join('')+'</div></details>';}).join('')}</section>
      <details class="info-block"><summary>単元別の到達率</summary><div class="unit-progress">${[...new Set(cat.study.objectives.map(o=>o.unit))].map(unit=>{const os=cat.study.objectives.filter(o=>o.unit===unit),reached=os.filter(o=>cat.source.quests.some(q=>q.objectives.includes(o.id)&&Q.questStatus(p,q).reached)).length;return '<div class="unit-row"><b>'+escape(unit)+'</b><span>'+reached+' / '+os.length+'目標（'+Math.round(reached/os.length*100)+'%）</span></div>';}).join('')}</div></details>
      <details class="info-block"><summary>到達・クリア・定着のちがい</summary><ul class="quest-help-list"><li><b>到達</b>：解説と全問題を一通り学習。復習が残っていても次へ進めます。</li><li><b>クリア</b>：元の演習・基礎問題を自力で正解し、説明チェックも通過。</li><li><b>定着</b>：それらを24時間以上空けて再び自力で正解。説明の自己確認だけでは加点しません。</li></ul><p class="source">説明チェックは根拠選択と自己確認の組合せです。入力した説明文を自動採点するものではありません。以前の到達・クリア・定着は保持しています。追加授業は各クエストを選び直して読めます。</p><p class="source">授業を含む全範囲は約${cat.source.quests.reduce((n,q)=>n+q.minutes,0)}分、各クエスト${Math.min(...cat.source.quests.map(q=>q.minutes))}〜${Math.max(...cat.source.quests.map(q=>q.minutes))}分の設計目安です。読解と考える時間を含めて見直しましたが、初心者の実測値ではありません。休憩・追加復習は別にかかります。</p></details>
      <details class="info-block" id="questBackup"><summary>クエスト進捗を引き継ぐ</summary><p class="source">通常演習の記録とは別に保存します。別端末ではこのクエスト用JSONを読み込んでください。</p><div class="action-stack"><button id="questExport">クエスト進捗を書き出す</button><button id="questImportOpen">クエスト進捗を読み込む</button></div><section id="questImportPanel" hidden><label for="questFile">クエスト用JSON（2MB以下）</label><input id="questFile" type="file" accept=".json,application/json"><p id="questImportPreview" class="source" aria-live="polite">検査するまで現在の進捗は変更されません。</p><div class="action-stack"><button id="questImportApply" disabled>この内容で復元</button><button id="questImportUndo">復元前に戻す</button><button id="questImportCancel">閉じる</button></div></section></details>`;
    document.querySelectorAll('[data-qtime]').forEach(b=>b.onclick=()=>{minutes=Number(b.dataset.qtime);map();document.querySelector('[data-qtime="'+minutes+'"]').focus({preventScroll:true});});
    if(e('questResume'))e('questResume').onclick=()=>{screen='play';persist();render();};
    e('questStartPlan').onclick=()=>{if(Q.start(p,cat,minutes)){screen='play';persist();render();}};
    e('questDue').onclick=()=>beginReview(Q.dueQuestions(p,cat));
    e('questWeak').onclick=()=>beginReview(Q.dueQuestions(p,cat,Date.now(),true));
    document.querySelectorAll('[data-quest]').forEach(b=>b.onclick=()=>{Q.start(p,cat,minutes,Date.now(),b.dataset.quest);screen='play';persist();render();});
    backups();
  }
  function beginReview(ids){if(Q.startReview(p,cat,ids)){screen='play';persist();render();}}
  function phaseView(r,s){return r.questId?(s?.phase==='retry'?(cat.steps[r.steps[r.index+1]]?.phase||'boss'):s?.phase||'clear'):'review';}
  function play(){
    const r=Q.run(p);if(!r){screen='map';map();return;}
    const quest=cat.quests[r.questId],s=Q.current(p,cat),phase=phaseView(r,s),names={learn:'学ぶ',basic:'基礎確認',apply:'応用',boss:'本番形式',clear:'クリア'};
    e('questContent').innerHTML=`<div class="quest-play-head"><button id="questMapBack" class="ghost">← マップ</button><span>${quest?quest.id+' · '+escape(quest.chapter):'思い出す練習'}</span><button id="questPause">保存して中断</button></div><h1 class="quest-title">${escape(quest?.title||'時間を空けて、もう一度。')}</h1>
      ${quest?'<ol class="quest-flow" aria-label="学習の段階">'+Object.entries(names).map(([key,label],i)=>'<li class="'+(key===phase?'active':'')+'" '+(key===phase?'aria-current="step"':'')+'><span>'+(i+1)+'</span>'+label+'</li>').join('')+'</ol>':'<p class="source">解説を見ずに、前に学んだ内容を思い出しましょう。</p>'}
      <div class="quest-step-label"><span>${r.done?'このクエストの学習を保存しました':(s.phase==='retry'?'少し間を空けて、類題で確認 · ':'')+'ステップ '+(r.index+1)+' / '+r.steps.length}</span><span>${p.session.position+1} / ${p.session.ids.length}区間</span></div><div class="session-progress"><span style="width:${r.index/r.steps.length*100}%"></span></div><div id="questStage"></div>${saveLine()}`;
    e('questMapBack').onclick=pause;e('questPause').onclick=pause;
    if(r.done){result(r,quest);return;}
    if(s.kind==='lesson')lesson(s,r);else question(s,r);
  }
  function pause(){screen='map';persist();render();}
  function glossaryHTML(card){
    const text=JSON.stringify(card),terms=Object.entries(cat.glossary||{}).filter(([term])=>text.includes(term));
    return terms.length?'<details class="lesson-glossary"><summary>このページの言葉を確認（'+terms.length+'語）</summary><dl>'+terms.map(([term,meaning])=>'<dt>'+escape(term)+'</dt><dd>'+escape(meaning)+'</dd>').join('')+'</dl></details>':'';
  }
  function lessonHTML(c){
    return '<h2>'+escape(c.title)+'</h2>'+(c.term?'<div class="quest-term"><span>意味から覚えよう</span><strong>'+escape(c.term)+'</strong></div>':'')+
      (c.text?'<p class="quest-lead">'+escape(c.text)+'</p>':'')+
      (c.definitions?'<dl class="lesson-definitions">'+c.definitions.map(([t,d])=>'<dt>'+escape(t)+'</dt><dd>'+escape(d)+'</dd>').join('')+'</dl>':'')+
      (c.example?'<div class="quest-example"><b>具体的に考えると</b><p>'+escape(c.example)+'</p></div>':'')+
      (c.comparison?'<div class="lesson-table-wrap"><table class="lesson-table"><caption>何が違い、なぜ違う？</caption><thead><tr><th>比べる対象</th><th>仕組み・判定</th><th>理由・読み方</th></tr></thead><tbody>'+c.comparison.map(row=>'<tr>'+row.map(v=>'<td>'+escape(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'')+
      (c.prompt?'<div class="quest-example"><b>一緒に考える例題</b><p>'+escape(c.prompt)+'</p></div>':'')+
      ((c.table||c.charts)&&typeof questionData==='function'?questionData(c):'')+
      (c.steps?'<ol class="lesson-reasoning">'+c.steps.map(t=>'<li>'+escape(t)+'</li>').join('')+'</ol>':'')+
      (c.conclusion?'<p class="lesson-conclusion"><b>だから、こう考える</b><br>'+escape(c.conclusion)+'</p>':'')+
      (c.points?'<ul class="quest-learning-points">'+c.points.map(t=>'<li>'+escape(t)+'</li>').join('')+'</ul>':'')+
      (c.another?'<details class="lesson-another"><summary>別の例でもう一度</summary><p>'+escape(c.another)+'</p></details>':'')+glossaryHTML(c);
  }
  function lesson(s,r){
    const cards=s.cards||[s],page=r.draft.lessonPage||0,c=cards[page];
    e('questStage').innerHTML='<article class="quest-lesson"><p class="eyebrow">'+escape(s.phase==='learn'?'まず、意味から理解しよう':'本番の前に、判断の根拠を学ぼう')+'</p><p class="lesson-page">この授業の '+(page+1)+' / '+cards.length+' ページ</p>'+lessonHTML(c)+
      (c.recap?'<details class="lesson-another"><summary>要点だけ確認</summary><p>'+escape(c.recap)+'<br><b>'+escape(c.term)+'</b></p></details>':'')+
      '<details class="quest-source"><summary>根拠となる教材</summary><p>'+escape(s.source)+'</p></details><div class="lesson-controls"><button id="questLessonBack" '+(page?'':'disabled')+'>← 前のページ</button><button id="questContinue" class="primary">'+(page+1<cards.length?'理解して次へ →':'この授業を終えて進む →')+'</button></div></article>';
    e('questLessonBack').onclick=()=>{if(page){r.draft.lessonPage=page-1;persist();render();}};
    e('questContinue').onclick=()=>{Q.advance(p,cat);persist();render();};
  }
  function ensureOrder(r,q){const values=q.options||q.correctionOptions||q.items;if(values&&!r.draft.optionOrder){r.draft.optionOrder=values.map((_,i)=>i);for(let i=r.draft.optionOrder.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r.draft.optionOrder[i],r.draft.optionOrder[j]]=[r.draft.optionOrder[j],r.draft.optionOrder[i]];}persist();}return r.draft.optionOrder;}
  function promptHTML(q){
    if(q.statements)return '<p class="quest-prompt">'+escape(q.prompt.split('\n')[0])+'</p><ol class="quest-statements">'+q.statements.map((v,i)=>'<li><span>'+['ア','イ','ウ','エ'][i]+'</span><p>'+escape(v.text)+'</p></li>').join('')+'</ol>';
    return '<p class="quest-prompt">'+escape(q.prompt)+'</p>';
  }
  function question(s,r){
    const q=cat.questions[s.questionId],order=ensureOrder(r,q),done=!!r.response;
    const label=q.kind==='foundation'?'まずは、やさしい2択':s.phase==='retry'?'類題で確認':q.kind==='explain'?'理由を説明してみよう':s.phase==='boss'?'ボス問題 · 本番形式':'覚えたことを使ってみよう';
    const buttons=(options,attribute)=>order.map((i,n)=>`<button ${attribute}="${i}" ${done?'disabled':''}><span class="choice-number" aria-hidden="true">${n+1}</span><span>${escape(options[i])}</span></button>`).join('');
    let input='';
    if(q.type==='choice'||q.type==='compare')input='<div class="quest-choices">'+buttons(q.options,'data-qchoice')+'</div>';
    else if(q.type==='judge')input='<div class="quest-choices"><button data-qverdict="true" aria-pressed="'+(r.draft.verdict===true)+'" '+(done?'disabled':'')+'>正しい</button><button data-qverdict="false" aria-pressed="'+(r.draft.verdict===false)+'" '+(done?'disabled':'')+'>誤り</button></div>'+(typeof r.draft.verdict==='boolean'?'<section id="questCorrection"><h3>次に、根拠を選ぼう</h3><div class="quest-choices">'+buttons(q.correctionOptions,'data-qcorrection')+'</div></section>':'');
    else if(q.type==='order')input='<p class="source">先に起きるものから順に押してください。</p><div class="quest-choices">'+order.map(i=>'<button data-qorder="'+i+'" '+(done||(r.draft.order||[]).includes(q.items[i])?'disabled':'')+'>'+escape(q.items[i])+'</button>').join('')+'</div><ol id="questOrderList">'+(r.draft.order||[]).map(x=>'<li>'+escape(x)+'</li>').join('')+'</ol><div class="order-actions"><button id="questUndoOrder" '+(done?'disabled':'')+'>並べ直す</button><button id="questCheckOrder" class="primary" '+(done||(r.draft.order||[]).length!==q.items.length?'disabled':'')+'>答え合わせ</button></div>';
    else input='<form id="questAnswerForm" class="text-answer"><label class="sr-only" for="questAnswerInput">クエストの解答</label><input id="questAnswerInput" maxlength="2000" autocomplete="off" '+(q.type==='calc'&&q.formula?.kind!=='dhondt'?'inputmode="decimal"':'')+' value="'+escape(r.draft.text||'')+'" placeholder="答えを入力" '+(done?'disabled':'')+'><button class="primary" '+(done?'disabled':'')+'>答え合わせ</button></form>';
    e('questStage').innerHTML=`<article class="quest-question"><div class="quest-question-head"><span>${label}</span><small>${escape(q.id)}</small></div><div class="quest-question-body">${promptHTML(q)}${typeof questionData==='function'?questionData(q):''}
      ${q.kind==='explain'?'<div class="quest-explain"><label for="questExplanation">自分の言葉で、声に出すか1文を書いてみよう</label><textarea id="questExplanation" maxlength="2000" rows="2" placeholder="どうしてそうなる？（記入は任意）" '+(done?'disabled':'')+'>'+escape(r.draft.notes||'')+'</textarea><fieldset><legend>理由を説明できましたか？</legend><label><input type="radio" name="questSelf" value="yes" '+(r.draft.selfExplained===true?'checked':'')+' '+(done?'disabled':'')+'>説明できた</label><label><input type="radio" name="questSelf" value="no" '+(r.draft.selfExplained===false?'checked':'')+' '+(done?'disabled':'')+'>まだ難しい</label></fieldset><p class="source">次に正しい根拠を選びます。自己確認だけではクリアになりません。入力文の自動採点はしません。</p></div>':''}
      ${r.helped&&!done?'<aside class="quest-hint"><b>学び直してから挑戦しよう</b><p>'+escape(q.explanation)+'</p><p class="source">この回答は自力正答・定着には含めません。</p></aside>':''}
      ${input}${!done?'<div class="quest-question-tools"><button id="questHelp">学び直す</button><button id="questUnknown">まだわからない</button></div>':''}</div><div id="questFeedback" tabindex="-1" aria-live="polite"></div></article>`;
    if(q.kind==='explain'&&!done){document.querySelectorAll('[data-qchoice]').forEach(b=>b.disabled=typeof r.draft.selfExplained!=='boolean');e('questExplanation').oninput=ev=>{r.draft.notes=ev.target.value;persist();};document.querySelectorAll('[name="questSelf"]').forEach(x=>x.onchange=()=>{r.draft.selfExplained=x.value==='yes';persist();document.querySelectorAll('[data-qchoice]').forEach(b=>b.disabled=false);});}
    if(done){feedback(q,r);return;}
    const submit=value=>{if(Q.submit(p,cat,value,r.draft.selfExplained===true)){persist();question(s,r);e('questFeedback').focus({preventScroll:true});e('questFeedback').scrollIntoView({block:'start',behavior:'instant'});}};
    document.querySelectorAll('[data-qchoice]').forEach(b=>b.onclick=()=>submit(Number(b.dataset.qchoice)));
    document.querySelectorAll('[data-qverdict]').forEach(b=>b.onclick=()=>{r.draft.verdict=b.dataset.qverdict==='true';persist();question(s,r);e('questCorrection').scrollIntoView({block:'nearest'});});
    document.querySelectorAll('[data-qcorrection]').forEach(b=>b.onclick=()=>submit({verdict:r.draft.verdict,correction:Number(b.dataset.qcorrection)}));
    if(e('questAnswerForm')){e('questAnswerInput').oninput=ev=>{r.draft.text=ev.target.value;persist();};e('questAnswerForm').onsubmit=ev=>{ev.preventDefault();const v=e('questAnswerInput').value.trim();if(v)submit(v);};}
    if(q.type==='order'){
      document.querySelectorAll('[data-qorder]').forEach(b=>b.onclick=()=>{(r.draft.order||(r.draft.order=[])).push(q.items[Number(b.dataset.qorder)]);persist();question(s,r);});
      e('questUndoOrder').onclick=()=>{r.draft.order=[];persist();question(s,r);};e('questCheckOrder').onclick=()=>submit(r.draft.order);
    }
    e('questUnknown').onclick=()=>submit(null);e('questHelp').onclick=()=>{Q.hint(p);persist();question(s,r);document.querySelector('.quest-hint').scrollIntoView({block:'nearest'});};
  }
  function feedback(q,r){
    const response=r.response,correct=q.type==='judge'?(q.answer?'正しい':'誤り')+'／'+q.correctionOptions[q.correctionAnswer]:q.type==='order'?q.answer.join(' → '):['choice','compare'].includes(q.type)?q.options[q.answer]:q.answer;
    const title=response.credit?'正解！':response.ok?'答えは合っています':'ここで確認して、次へ進もう';
    e('questFeedback').className='quest-feedback '+(response.credit?'ok':'review');
    e('questFeedback').innerHTML='<h3>'+title+'</h3><p><b>正答：'+escape(correct)+'</b></p><p>'+escape(q.explanation)+'</p>'+(q.optionReasons?'<details><summary>それぞれの選択肢の理由</summary><ul>'+(q.options||q.correctionOptions).map((v,i)=>'<li>'+escape(v)+'：'+escape(q.optionReasons[i])+'</li>').join('')+'</ul></details>':'')+(!response.credit?'<p class="source">'+(response.helped?'学び直しとして保存しました。':q.kind==='explain'&&response.ok?'理由を自分で説明できるよう、復習に残します。':'一度で覚えなくて大丈夫。間を空けて確認します。')+'今は次の内容へ進めます。</p>':'')+'<details class="quest-source"><summary>根拠となる教材</summary><p>'+escape(q.source)+'</p></details><button id="questNext" class="primary quest-wide">次へ進む →</button>';
    const teaching=cat.teaching?.[q.baseId||q.id]||cat.teaching?.[q.basisIds?.[0]];
    if(teaching){
      const path=document.createElement('section');path.className='lesson-feedback-path';path.innerHTML='<h4>判断するまでの道筋</h4><ol class="lesson-reasoning">'+teaching.steps.map(t=>'<li>'+escape(t)+'</li>').join('')+'</ol>';
      if(!response.credit){const cards=teaching.lessonRefs.map(ref=>cat.steps[ref.stepId].cards.find(c=>c.id===ref.cardId));path.innerHTML+='<details class="lesson-reteach"><summary>授業から学び直す（定義・例題・判断の根拠）</summary>'+cards.map(c=>'<details class="lesson-review-card"><summary>'+escape(c.title)+'</summary>'+lessonHTML(c)+'</details>').join('')+'</details>';}
      e('questNext').before(path);
    }
    e('questNext').onclick=()=>{Q.advance(p,cat);persist();render();};
  }
  function result(r,quest){
    const status=quest?Q.questStatus(p,quest):null,remaining=quest?[...quest.questionIds,...quest.foundationIds,quest.explainId].filter(id=>!p.records[id]?.lastOK).length:0;
    e('questStage').innerHTML='<section class="quest-finish"><div class="quest-finish-mark">'+(status?.cleared?'✓':'旗')+'</div><p class="eyebrow">'+(quest?quest.id:'REVIEW')+' COMPLETE</p><h2>'+(!quest?'復習を保存しました':status.settled?'間隔を空けて定着！':status.cleared?'クエストクリア！':'この範囲に到達！')+'</h2><p>'+(!quest?'思い出した内容を記録しました。続けて未学習の範囲にも進みましょう。':remaining?remaining+'問を復習に残しました。足止めせず、次の範囲へ進めます。':'理由の確認までできました。時間を空けて再挑戦しましょう。')+'</p><p class="source">'+(quest?'到達と定着は別の記録です。24時間以上空けた自力正解で定着を確認します。':'同じ日の繰り返しだけでは定着には数えません。')+'</p><div class="action-stack"><button id="questNextRun" class="primary">'+(p.session.position+1<p.session.ids.length?'このコースを続ける →':'次の未学習範囲へ →')+'</button><button id="questFinishMap">マップを見る</button></div></section>';
    e('questFinishMap').onclick=pause;e('questNextRun').onclick=()=>{if(!Q.nextRun(p,cat)&&!Q.start(p,cat,minutes))screen='map';persist();render();};
  }
  function render(){if(screen==='play')play();else map();window.scrollTo({top:0,behavior:'instant'});}
  function backups(){
    e('questExport').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));a.href=url;a.download='seikei-quest-progress-202610.json';a.click();URL.revokeObjectURL(url);};
    e('questImportOpen').onclick=()=>{e('questImportPanel').hidden=false;};
    e('questImportCancel').onclick=()=>{importNonce++;pendingImport=null;e('questFile').value='';e('questImportApply').disabled=true;e('questImportPanel').hidden=true;};
    e('questFile').onchange=async ev=>{const request=++importNonce,file=ev.target.files[0];pendingImport=null;e('questImportApply').disabled=true;if(!file)return;try{if(file.size>2*1024*1024)throw Error('2MB以下のJSONを選んでください。');const raw=await file.text();if(request!==importNonce)return;pendingImport=Q.restore(raw,cat);e('questImportPreview').textContent='検査済み：'+Object.keys(pendingImport.reached).length+'クエスト到達・'+pendingImport.turn+'回答。適用するとクエスト進捗を置き換えます。通常演習の進捗には影響しません。';e('questImportApply').disabled=false;}catch(error){if(request!==importNonce)return;e('questImportPreview').textContent='読み込みを中止しました：'+error.message;}};
    e('questImportApply').onclick=()=>{if(!pendingImport)return;try{localStorage.setItem(BEFORE,JSON.stringify(p));localStorage.setItem(KEY,JSON.stringify(pendingImport));p=pendingImport;pendingImport=null;message='クエスト進捗を復元しました';screen='map';render();e('questBackup').open=true;}catch{e('questImportPreview').textContent='保存できないため復元を中止しました。現在の進捗は変更していません。';}};
    e('questImportUndo').onclick=()=>{try{const restored=Q.restore(localStorage.getItem(BEFORE),cat);localStorage.setItem(KEY,JSON.stringify(restored));p=restored;pendingImport=null;message='復元前のクエスト進捗に戻しました';screen='map';render();e('questBackup').open=true;}catch(error){e('questImportPreview').textContent='戻せませんでした：'+error.message;}};
  }
  window.QuestUI={show:render};
  // A new visitor sees a guided map, rather than an unexplained exam question.
  const requested=new URL(location.href).searchParams.get('mode');
  if(requested!=='practice')showView('quest');
})();
