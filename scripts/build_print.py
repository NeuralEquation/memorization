from pathlib import Path
import json,html
ROOT=Path(__file__).resolve().parents[1]
d=json.loads((ROOT/'data/study-data.js').read_text(encoding='utf-8').removeprefix('window.STUDY_DATA = ').rstrip(';\n'))
e=lambda x:html.escape(str(x))
def table(headers,rows):return '<table><thead><tr>'+''.join('<th>'+e(x)+'</th>' for x in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+e(x)+'</td>' for x in r)+'</tr>' for r in rows)+'</tbody></table>'
comparisons={
'政治制度':(['着眼点','議院内閣制','米国型大統領制'],[['存立の根拠','議会の信任','議会とは別に選ばれる大統領'],['不信任','内閣の存立に影響','通常の不信任制度はない'],['解散','制度上認められ得る','大統領は議会を解散しない']]),
'憲法・人権':(['区別','判断の基準','混同注意'],[['自由権／社会権','不当な介入からの自由／生活保障等のための積極的役割','信教は自由権、生存は社会権'],['婚姻時の氏／再婚禁止期間','民法750条／旧733条','夫婦の氏と待機期間は別問題'],['2016年／2024年','100日へ短縮／再婚禁止期間の廃止','昔の判例を現在の規則にしない'],['改正発議／国民投票','各院の総議員の2/3以上／有効投票総数の過半数','出席者・有権者総数を分母にしない']]),
'国会・内閣':(['制度','数・割合','条件・例外'],[['本会議の定足数','総議員の1/3以上','通常の議決は出席者の過半数'],['法律案の再可決','衆議院出席議員の2/3以上','参議院の60日不議決は自動成立ではない'],['予算・条約の優越','参議院の不議決30日','休会中を除く。両院不一致には協議会の手続'],['首相指名の優越','参議院の不議決10日','法律案の再可決要件を当てはめない'],['内閣不信任','10日以内の衆議院解散か総辞職','参議院の問責とは異なる'],['国務大臣','過半数は国会議員、全員は文民','総理は国会が指名し天皇が任命']]),
'地方自治':(['請求の種類','署名数・請求先','その後'],[['条例制定・改廃','1/50以上・首長','議会に付議。税等の条例は除外'],['事務の監査（直接請求）','1/50以上・監査委員','監査。住民監査請求の別制度と区別'],['議会解散／議員・首長解職','段階式・選挙管理委員会','署名だけでは決まらず、投票による判断'],['副知事等の解職','段階式・首長','議会で総議員2/3以上出席、出席者3/4以上の同意'],['地方交付税／国庫支出金','財源調整等／特定事業','一般財源／特定財源という違い']]),
'司法':(['区別','前者','後者'],[['最高裁長官／総理の指名','内閣が指名','国会が指名'],['控訴・上告／再審','通常の不服申立て','確定判決後に法定の理由でやり直し'],['裁判員／検察審査会','対象刑事裁判の第一審','不起訴処分の審査'],['違憲審査の権限／終審','下級裁判所も持つ','最高裁判所'],['消極主義／審査権なし','行使に慎重という立場','権限自体の否定。両者は違う']]),
'選挙':(['区別','内容','数字・判断'],[['衆議院／参議院','4年・解散あり／6年・解散なし','参議院は3年ごとに半数改選'],['選挙権／被選挙権','投票する／立候補する','18歳／衆25歳・参30歳'],['並立／併用','別々の配分／全体を比例得票に連動させ調整','二票制かどうかだけでは判断しない'],['ドント式／惜敗率','議席の配分／重複候補の順位等','得票÷1,2,3…／落選者票÷当選者票×100']])}
intro={
'政治制度':'政治制度は「誰が行政を担当するか」「議会とどう責任を取り合うか」で考えます。共和制・君主制という元首の分類と、議院内閣制・大統領制という執政の分類は別です。',
'憲法・人権':'憲法は国家の権力を制限し、人権を保障する基礎です。制度の比較では主権の所在を、改正では分母と手続を確認しましょう。家族法の問題は出題の基準日を先に確かめます。',
'国会・内閣':'国民が議員を選ぶ→国会が総理を指名する→総理が国務大臣を任命する、というつながりを先に理解します。議決条件の違いは、何を決めるのかによって整理します。',
'地方自治':'地方では首長も議会も住民が選びます。そのため内閣と国会の関係をそのまま移してはいけません。直接請求は「署名」「請求先」「最終決定方法」の三点で比較します。',
'司法':'裁判は法に基づいて紛争を解決し、権利を守る仕組みです。捜査→起訴するかの判断→第一審→不服申立て→確定、という順に、各制度が働く段階を位置付けます。',
'選挙':'票を議席に変える方法が違えば、同じ得票でも結果は変わります。得票率・投票率・惜敗率では分母が違います。計算の前に、何を比べる割合なのかを言葉で説明しましょう。'}
style='''@page{size:A4;margin:15mm 14mm 16mm}*{box-sizing:border-box}body{font-family:"Yu Gothic","Meiryo",sans-serif;color:#17212b;background:#eef2f6;margin:0;font-size:11pt;line-height:1.8}.page{max-width:210mm;margin:12mm auto;padding:16mm;background:white}h1{font-size:25pt;line-height:1.5}h2{font-size:19pt;border-bottom:3px solid #16776f;padding-bottom:3mm}h3{font-size:13pt;margin:5mm 0 2mm}p{margin:2mm 0}table{width:100%;border-collapse:collapse;font-size:9.5pt;margin:4mm 0}td,th{border:1px solid #afb9c3;padding:2mm;vertical-align:top}th{background:#e6f2f0}tr{break-inside:avoid}.source{font-size:8.5pt;color:#55636f}.notice{background:#fff6da;border:1px solid #c5a751;padding:4mm}.question{break-inside:avoid;margin:4mm 0;padding:3mm;border-bottom:1px solid #ccd4da}.options{font-size:10pt;line-height:1.7}.answer-space{height:10mm;border-bottom:1px dotted #aaa}.objective{break-inside:avoid}.toolbar{position:sticky;top:0;padding:10px;background:#fff;border-bottom:1px solid #ccd4da;display:flex;gap:16px;align-items:center}a{color:#12665f}button,select{padding:8px;font:inherit}li{margin:1mm 0}.answers p{font-size:10pt}.rubric{border-left:3px solid #16776f;padding-left:3mm}@media print{body{background:white}.page{margin:0;padding:0;max-width:none;break-before:page}.page:first-of-type{break-before:auto}.toolbar{display:none}.source{color:#444}a{color:inherit;text-decoration:none}body[data-part=study] .exercise,body[data-part=study] .answers,body[data-part=exercise] .study,body[data-part=exercise] .answers,body[data-part=answers] .study,body[data-part=answers] .exercise{display:none}}'''
out=['<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>政経 中間試験対策プリント</title><style>'+style+'</style><body data-part="all"><div class="toolbar"><a href="index.html">学習へ</a><label>印刷範囲 <select id="part"><option value="all">全冊</option><option value="study">解説・比較表</option><option value="exercise">問題のみ</option><option value="answers">解答・解説のみ</option></select></label><button id="printButton">A4で印刷・PDF保存</button></div>',
'<section class="page study"><p>2026年10月14日 試験開始</p><h1>政治・経済<br>2学期中間試験対策</h1><p>理解する → 何も見ずに答える → 理由を説明する</p><div class="notice"><b>授業資料確認済みの先行版 / 2026年10月10日</b><p>学習目標32件・独自演習108問。問題集原本・出版社解答冊子はこのPCに未提供です。180問の設問全体との完全照合は0問。訂正報告の9問は訂正された論点のみ扱います。</p><p>問題集で要求される全知識の網羅や、同等の学習効果を保証する版ではありません。<a href="coverage.html">180問対応監査</a>で未確認箇所を確認してください。</p></div><h2>使い方</h2><ol><li>解説と表を読んで、制度の目的と手続をつかむ。</li><li>問題冊子を開き、解説を隠して答える。正誤問題は必ず訂正または理由も書く。</li><li>解答冊子で、選ばなかった選択肢の誤りも確認する。</li><li>間違えた内容をアプリで復習する。10分以上空けた再正解と異なる判断問題も確認する。</li></ol><p>法令は2026年10月10日時点を基準に確認。歴史上の制度・判例は当時の条件で考えます。政党別の現在議席・連立の組合せやプリント10の細目は、問題集との対応・範囲が未確認のため出題していません。</p><h2>構成</h2><p>第1部：解説・比較表（S01〜S32）<br>第2部：確認問題（アプリと同じID）<br>第3部：解答・理由・誤答の検討</p></section>']
for unit in dict.fromkeys(o['unit'] for o in d['objectives']):
    out.append('<section class="page study"><h2>'+e(unit)+'</h2><p>'+e(intro[unit])+'</p>'+table(*comparisons[unit]))
    for o in [o for o in d['objectives'] if o['unit']==unit]:
        out.append('<article class="objective" id="'+o['id']+'"><h3>'+o['id']+' '+e(o['title'])+'</h3><p>'+e(o['lesson'])+'</p><p class="source">確認根拠：'+e(o['source'])+'</p></article>')
    if unit=='地方自治':out.append('<div class="rubric"><b>段階計算の例：有権者90万人</b><p>最初の40万は1/3、次の40万は1/6、残り10万は1/8。<br>400000÷3＋400000÷6＋100000÷8＝212500人。</p><p>途中の区間を個別に切り上げると誤る場合があります。必要最少数は最後に切り上げます。</p></div>')
    if unit=='選挙':out.append('<div class="rubric"><b>ドント式の例：A5200票、B3100票、C1700票、定数5</b>'+table(['除数','A','B','C'],[['1','5200','3100','1700'],['2','2600','1550','850'],['3','1733.33…','1033.33…','566.66…']])+'<p>上位5つはA5200、B3100、A2600、A1733.33…、C1700。配分はA3・B1・C1。単に得票率を四捨五入しません。</p></div>')
    out.append('</section>')
for unit in dict.fromkeys(o['unit'] for o in d['objectives']):
    out.append('<section class="page exercise"><h2>確認問題：'+e(unit)+'</h2><p>解説を見ずに解く。正誤では判断に加えて、正しい理由または誤文の訂正を書く。</p>')
    for q in [q for q in d['questions'] if q['unit']==unit]:
        out.append('<article class="question"><b>'+q['id']+'</b> '+e(q['prompt']))
        if q['type'] in ['choice','compare']:out.append('<div class="options">'+''.join('<p>'+str(i+1)+'. '+e(v)+'</p>' for i,v in enumerate(q['options']))+'</div>')
        if q['type']=='order':out.append('<p>'+e(' / '.join(reversed(q['items'])))+'</p>')
        out.append('<div class="answer-space"></div></article>')
    out.append('</section>')
for unit in dict.fromkeys(o['unit'] for o in d['objectives']):
    out.append('<section class="page answers"><h2>解答・解説：'+e(unit)+'</h2>')
    for q in [q for q in d['questions'] if q['unit']==unit]:
        answer=q['answer']
        if q['type'] in ['choice','compare']:answer=str(answer+1)+'. '+q['options'][answer]
        if q['type']=='judge':answer='正しい' if answer else '誤り'
        if q['type']=='order':answer=' → '.join(answer)
        out.append('<article class="question"><h3>'+q['id']+'　'+e(answer)+'</h3><p>'+e(q['explanation'])+'</p>')
        if q.get('options'):out.append('<p>'+' / '.join(str(i+1)+': '+e(r) for i,r in enumerate(q['optionReasons']))+'</p>')
        out.append('<p class="source">参照 '+q['objective']+' / '+e(q['source'])+'</p></article>')
    out.append('</section>')
out.append('<script>document.getElementById("part").onchange=e=>document.body.dataset.part=e.target.value;document.getElementById("printButton").onclick=()=>window.print();</script></body></html>')
(ROOT/'print.html').write_text(''.join(out),encoding='utf-8')
print('print.html generated')
