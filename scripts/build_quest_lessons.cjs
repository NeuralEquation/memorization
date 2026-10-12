'use strict';
const authored=require('./quest_lessons.cjs'),common=require('./quest_glossary.cjs');
const fixes={
 'N01.2':'「英国民は選挙の瞬間だけ自由」という代表制批判はルソーの主張として読む。モンテスキューの権力分立論とは論点が違う。',
 'N06.6':'憲法改正の国民投票には最低投票率の条件はない。18歳以上が投票でき、有効投票総数の過半数の賛成が必要。国会の発議の3分の2と混同しない。',
 'N09.4':'人権保障の歴史は、18〜19世紀の自由権を中心とする保障から、20世紀の社会権の保障へと拡大した。社会権の後に初めて自由権が生まれたという順序ではない。',
 'N18.3':'情報公開法の行政文書の開示は何人も請求でき、不開示への不服申立てや訴訟も可能。「知る権利」という名称が条文にあるかと、制度を利用できるかは別。',
 'N18.7':'小説「宴のあと」の事件では東京地裁がプライバシー侵害を認めた。企業データ削除の最高裁判決ではない。自己の私生活情報の保護は憲法13条の幸福追求権を根拠に考える。',
 'N22.3':'国会改革は政務次官を廃止して副大臣・大臣政務官を設けた。経済財政諮問会議は財務省でなく内閣府。行政委員会の中立性を弱めることが改革の目的ではない。',
 'N22.5':'行政委員会は戦後に導入された。政治的中立性と専門性のため、規則を定める準立法や専門的判断をする準司法の機能を持つ。公正取引委員会・中央労働委員会等が例。',
 'N23.6':'最高裁裁判官の国民審査は、任命後初の衆院総選挙と、その後10年経過後初の総選挙で行う。罷免したい人に×を記入し白紙は罷免意思なし。罷免の判断は投票者を基準とし、全有権者を分母としない。'
};
const sentences=text=>text.match(/[^。！？]+[。！？]?/g)||[text];
function split(text,max=260){const out=[];let s='';for(const line of sentences(text)){if(s&&s.length+line.length>max){out.push(s);s='';}s+=line;}if(s)out.push(s);return out;}
function reasoning(q){
 if(q.statements)return ['選択肢の組合せを先に推測せず、文を一つずつ切り離す。',...q.statements.map((s,i)=>['ア','イ','ウ','エ'][i]+'：'+(s.truth?'正しい。':'誤り。')+s.reason),'各文の判定を元の順番に並べ、全て一致する組合せを一つ選ぶ。'];
 if(q.type==='calc'){
  const f=q.formula;
  if(f.kind==='signatures'){const parts=[Math.min(f.n,400000),Math.min(Math.max(f.n-400000,0),400000),Math.max(f.n-800000,0)];return ['対象は人口でなく有権者'+f.n.toLocaleString('ja-JP')+'人。議会解散なので段階式を使う。','人数を「'+parts.join('人・')+'人」の区間に分け、順に1/3・1/6・1/8を掛ける。',q.explanation,'途中で丸めず、合計の最後に一度だけ切り上げる。最低署名数なので切り捨てない。'];}
  if(f.kind==='dhondt')return ['まず配る議席数を確かめ、全党の票を1、2、3…で割る。','各党で別々に順位を付けず、全党の商を一つの順位にする。',q.explanation,'各党に入った個数を数え、合計が定数と一致するか確かめる。'];
  if(f.kind==='ratio')return ['惜敗率なので分母は全投票数でなく同じ区の当選者票。','落選者票÷当選者票で、勝者に対する比を求める。',q.explanation,'100を掛けた百分率か、0〜1の比かを区別して答える。'];
  if(f.kind==='ordinance')return ['条例制定の直接請求なので、解散の段階式ではなく有権者の1/50。',q.explanation,'請求先は首長。その後は議会が審議し、署名だけで条例成立にはならない。'];
  return [q.objective==='S19'?'副知事解職では、まず総議員の2/3以上が出席するかを確認する。':'法律案の再可決なので、通常議決や改憲発議と条件を分ける。',q.objective==='S19'?'同意数は総議員でなく出席議員の3/4以上。':'賛成数の分母は総議員でなく出席議員。割合は2/3以上。',q.explanation];
 }
 if(q.type==='order')return ['出来事の名称を、提案・決定・発表・実施等の段階や時点に分ける。',q.explanation,'この条件では「'+q.answer.join(' → ')+'」。似た名称でも別の出来事へ年を移さない。'];
 if(q.type==='judge')return ['文の主語、対象、期間、分母、例外を確認する。','この文は'+(q.answer?'正しい。':'誤り。')+q.correctionOptions[q.correctionAnswer],q.explanation,...q.correctionOptions.map((o,i)=>'「'+o+'」：'+(i===q.correctionAnswer?'採用する。':'採用しない。')+q.optionReasons[i])];
 if(q.type==='recall')return ['説明がどの対象・働きを指すかを確認する。','ここで求める語句・数値は「'+q.answer+'」。',q.explanation];
 return [q.table||q.charts?'資料の単位・行と列・縦軸の意味を最初に確認する。':'設問が尋ねる主体・目的・条件を先に確認する。',q.explanation,...q.options.map((o,i)=>'「'+o+'」：'+(i===q.answer?'採用する。':'採用しない。')+(q.optionReasons?.[i]||'設問の条件と正しい根拠を照合する。'))];
}
module.exports=function buildLessons(study,quests,atoms){
 const decks={},questionTeaching={},atomTeaching={},glossary={...common},review=[];
 // Full labels are useful as headings; their components are also available inline.
 for(const lesson of Object.values(authored))for(const [term,meaning] of Object.entries(lesson.terms)){
  if(!glossary[term])glossary[term]=meaning;
  for(const part of term.split(/[／・]/).filter(x=>x.length>1))if(!glossary[part])glossary[part]=meaning;
 }
 const put=(step,cards)=>{decks[step]=cards.map((c,i)=>({id:step+'-page-'+(i+1),...c}));return decks[step];};
 for(const quest of quests){
  const a=authored[quest.id];if(!a)throw Error('Missing authored lesson '+quest.id);
  const intro=[{kind:'concept',title:'そもそも、何を学ぶ？',text:a.context,example:quest.example}];
  quest.intro=a.context;
  quest.example=a.worked.prompt+' '+a.worked.answer;
  quest.compare=a.comparison.map(row=>row.join('：')).join('。');
  const terms=Object.entries(a.terms);
  for(let i=0;i<terms.length;i+=2)intro.push({kind:'definition',title:'最初の言葉を理解する',definitions:terms.slice(i,i+2)});
  a.mechanism.forEach((text,i)=>intro.push({kind:'mechanism',title:'仕組みを理由から理解する '+(i+1),text}));
  intro.push({kind:'comparison',title:'違いには理由がある',comparison:a.comparison});
  // The example is walked through before independent questions, one task at a time.
  intro.push({kind:'worked',title:'例題を一緒に解こう',prompt:a.worked.prompt,steps:a.worked.steps,conclusion:a.worked.answer,another:a.worked.another});
  intro.push({kind:'pitfall',title:'どこで間違えやすい？',points:a.pitfalls});
  put(quest.id+'-intro',intro);
  for(const id of quest.objectives){
   const objective=study.objectives.find(o=>o.id===id),qs=study.questions.filter(q=>q.objective===id),recall=qs.find(q=>q.type==='recall');
   const def=glossary[recall.answer]||Object.entries(a.terms).find(([k])=>k.includes(recall.answer))?.[1];
   const cards=[{kind:'definition',title:objective.title+'：自分で言えるかな',term:recall.answer,text:def||(objective.points?objective.points[0]:objective.lesson),recap:recall.prompt,basisIds:[recall.id]}];
   if(!objective.points){
    split(objective.lesson).forEach(text=>cards.push({kind:'rule',title:objective.title+'：条件を確かめる',text,basisIds:qs.map(q=>q.id)}));
    // Four-option errors are taught as corrected contrasts, never as unlabelled facts.
    const choice=qs.find(q=>q.type==='choice');
    if(choice)for(let i=0;i<choice.options.length;i+=2)cards.push({kind:'contrast',title:'この説明なら、どこが違う？',comparison:choice.options.slice(i,i+2).map((x,n)=>[x,i+n===choice.answer?'正しい理解':'誤りの例',choice.optionReasons[i+n]]),basisIds:[choice.id]});
    for(const q of qs.filter(q=>q.type!=='recall'&&q.type!=='choice')){
     if(q.type==='judge')for(let i=0;i<q.correctionOptions.length;i+=2)cards.push({kind:'contrast',title:'条件と例外を理由から比べる',comparison:q.correctionOptions.slice(i,i+2).map((x,n)=>[x,i+n===q.correctionAnswer?'採用する根拠':'誤りの根拠',q.optionReasons[i+n]]),basisIds:[q.id]});
     else cards.push({kind:'worked',title:'数字・順序を一緒に確かめる',prompt:q.prompt,steps:reasoning(q),conclusion:Array.isArray(q.answer)?q.answer.join(' → '):q.answer,basisIds:[q.id]});
    }
   }
   put(quest.id+'-term-'+id,cards);
   if(objective.points)for(let i=0;i<objective.points.length;i+=3){
    const step=quest.id+'-points-'+id+'-'+i,entries=Object.entries(atoms).filter(([,v])=>v.section===id).slice(i,i+3);
    const facts=entries.map(([atomId,v])=>({kind:'rule',title:objective.title+'：判断の根拠',text:fixes[atomId]||v.knowledge,atomIds:[atomId],basisIds:[v.questionId]}));
    const result=put(step,facts);entries.forEach(([atomId],n)=>atomTeaching[atomId]={stepId:step,cardId:result[n].id,objective:id,questId:quest.id});
   }
   // Applied data exercises have no atom ledger entries. Teach their own complete
   // calculation/reading path before the exam, including rejected alternatives.
   const extra=qs.filter(q=>q.table||q.charts||q.type==='compare'||objective.points&&['order','calc'].includes(q.type));
   for(const q of extra){
    const step=objective.points?quest.id+'-points-'+id+'-'+(Math.floor((objective.points.length-1)/3)*3):quest.id+'-term-'+id;
    const deck=decks[step];deck.push({id:step+'-case-'+q.id,kind:'worked',title:'資料の読み方を実演',prompt:q.prompt,table:q.table,charts:q.charts,chartCaption:q.chartCaption,steps:reasoning(q),basisIds:[q.id]});
   }
   const related=[quest.id+'-intro',quest.id+'-term-'+id,...Object.keys(decks).filter(s=>s.startsWith(quest.id+'-points-'+id+'-'))];
   for(const q of qs){
    const specifics=q.atomIds?.map(a=>atomTeaching[a]).filter(Boolean)||[];
    const caseCards=related.flatMap(stepId=>decks[stepId].filter(c=>c.basisIds?.includes(q.id)||c.atomIds?.some(id=>q.atomIds?.includes(id))).map(c=>({stepId,cardId:c.id})));
    questionTeaching[q.id]={questId:quest.id,objective:id,lessonRefs:[...decks[quest.id+'-intro'].map(c=>({stepId:quest.id+'-intro',cardId:c.id})),...caseCards,...specifics.map(s=>({stepId:s.stepId,cardId:s.cardId}))].filter((x,i,all)=>all.findIndex(y=>y.cardId===x.cardId)===i),steps:reasoning(q),basisExplanation:q.explanation,source:q.source};
   }
  }
  const cards=Object.entries(decks).filter(([s])=>s.startsWith(quest.id+'-')).flatMap(([,cards])=>cards);
  const visible=value=>typeof value==='string'?value.length:Array.isArray(value)?value.reduce((n,v)=>n+visible(v),0):value&&typeof value==='object'?Object.entries(value).reduce((n,[key,v])=>n+(['id','kind','basisIds','atomIds','another'].includes(key)?0:visible(v)),0):0;
  const chars=cards.reduce((n,c)=>n+visible(c),0);
  // Conservative reading estimate: 350 Japanese characters/minute + thinking
  // and 40–90 seconds per original question. It is a design estimate, not timing.
  quest.minutes=Math.ceil(chars/350+quest.questionIds.reduce((n,id)=>{const q=study.questions.find(q=>q.id===id);return n+(q.table||q.charts?1.5:q.type==='recall'?.45:q.type==='calc'||q.type==='order'?1.25:.8);},0)+quest.foundationIds.length*.4+1);
  quest.lessonPages=cards.length;
  review.push({questId:quest.id,objectives:quest.objectives,authoredPages:intro.length,lessonPages:cards.length,readingCharacters:chars,definedTerms:terms.map(([t])=>t),workedExamples:1+cards.filter(c=>c.kind==='worked'&&c.basisIds).length,comparisonRows:a.comparison.length,misconceptions:a.pitfalls.length,minutes:quest.minutes});
 }
 if(Object.keys(questionTeaching).length!==238||Object.keys(atomTeaching).length!==218)throw Error('Incomplete lesson coverage');
 return {decks,questionTeaching,atomTeaching,glossary,review,revision:'2026-10-12.lessons.3'};
};
