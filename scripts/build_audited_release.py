"""Publish authored requirements and cases; never publish original keys or scans."""
import csv,html,json
from audited_material import expand,applications,audits,BASELINE,APPLICATIONS

def publish(root,objectives,questions):
    new,qs,atoms=expand()
    for o in new:o['baselineObjectives']=BASELINE[o['id']]
    objectives.extend(new);questions.extend(qs);questions.extend(applications(objectives))
    # The existing exercises keep their IDs and meanings, so stored progress survives.
    data=dict(version='2026-10-10.1',release='2026-10-10.4',examDate='2026-10-14',
      coverage=dict(total=180,verified=180,partial=0,unreviewed=0,reason='問題文・全選択肢・出版社解説を画像で確認し、要求する判断と独自演習を作成者が照合。学習効果や第三者監査を保証しない。'),objectives=objectives,questions=questions)
    keypath=root/'private/政経_問題集180問_出版社解答照合済み.json'
    if not keypath.exists():raise RuntimeError('Publisher-checked private key is required to rebuild the audit.')
    key=json.loads(keypath.read_text(encoding='utf-8'))
    official=key['official_answers'];identities={(int(p),n) for p,items in official.items() for n in items}
    authored={(a['page'],a['number']) for a in audits}
    assert len(audits)==180 and len(authored)==180
    assert identities==authored,dict(missing=sorted(identities-authored),extra=sorted(authored-identities))
    questionIds={q['id'] for q in questions};rows=[]
    byIdentity={(a['page'],a['number']):a for a in audits}
    for p,items in official.items():
      for n in items:
        a=byIdentity[int(p),n];skills=a['skills'];assert all(s in atoms for s in skills)
        ids=list(dict.fromkeys([atoms[s]['questionId'] for s in skills]+APPLICATIONS.get((int(p),n),[])))
        assert all(i in questionIds for i in ids)
        sections=list(dict.fromkeys([atoms[s]['section'] for s in skills]+[q['objective'] for q in questions if q['id'] in ids]))
        rows.append(dict(page=int(p),number=n,learning='／'.join(atoms[s]['knowledge'] for s in skills),
          reasoning=a['process'],skills=skills,appIds=ids,printSections=sections,status='verified',
          baselineObjectives=list(dict.fromkeys(x for section in sections for x in (BASELINE[section] if section in BASELINE else [section]))),
          evidence=dict(workbook=f'原本p.{p} 問{n}（問題文・全選択肢・図表）',answerImages=key['answer_photo_sources'][p],key='出版社照合済み180問JSON'),
          note='作成者による原文→要求判断→独自演習の照合。正答番号は出版社照合済みJSONを基準に原本確認。原文・正答番号は非公開。'))
    out=root/'data';out.mkdir(exist_ok=True)
    (out/'study-data.js').write_text('window.STUDY_DATA = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
    (out/'coverage.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
    (out/'coverage-atoms.json').write_text(json.dumps(atoms,ensure_ascii=False,indent=2),encoding='utf-8')
    headers=['問題集ページ','問題番号','必要な学習内容','必要な判断過程','アプリの対応問題ID','印刷教材の対応箇所','検証状態','要求ID','旧32目標との対応','確認記録','注記']
    values=lambda r:[r['page'],r['number'],r['learning'],r['reasoning'],';'.join(r['appIds']),';'.join('print-complete.html#'+s for s in r['printSections']),r['status'],';'.join(r['skills']),';'.join(r['baselineObjectives']) or '旧目標にない範囲',r['evidence']['workbook']+' / '+str(r['evidence']['answerImages']),r['note']]
    with (root/'coverage.csv').open('w',encoding='utf-8-sig',newline='') as f:
      w=csv.writer(f);w.writerow(headers);w.writerows(values(r) for r in rows)
    esc=lambda x:html.escape(str(x))
    (root/'coverage.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>180問対応監査</title><style>body{font-family:Meiryo,sans-serif;margin:24px;line-height:1.6}table{border-collapse:collapse;font-size:12px}td,th{border:1px solid #aaa;padding:8px;min-width:80px;vertical-align:top}th{background:#eee}td:nth-child(3){min-width:400px}tr{break-inside:avoid}@media print{@page{size:A4 landscape;margin:10mm}}</style><h1>問題集180問の対応監査</h1><p>要求判断の対応確認：180/180（作成者による照合）。部分対応0・未確認0。54枚の問題集と28枚の解答画像を読み、全選択肢に必要な区別・図表の読み方を抽出しました。用語一致だけでなく、下記の判断過程を演習IDへ結び付けています。独立した第三者監査や学習効果の同等性を示す数値ではありません。</p><p><a href="coverage.csv">CSV</a> / <a href="index.html">学習へ</a> / <a href="print-complete.html">更新版教材</a> / <a href="reports/objective-delta.md">旧32目標との差分</a></p><table><thead><tr>'+''.join('<th>'+esc(s)+'</th>' for s in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+esc(v)+'</td>' for v in values(r))+'</tr>' for r in rows)+'</tbody></table></html>',encoding='utf-8')
    report=['# 旧32学習目標との照合・追加範囲','', '元の32目標・108問のIDと採点基準を保ち、原設問の要求判断に不足していた36単元を追加しました。既存目標との重複は比較対象であり、その存在だけで全選択肢への対応とはしていません。','', '|追加ID・内容|旧目標|追加した知識・判断|','|---|---|---|']
    for o in new:
      report.append('|'+o['id']+' '+o['title']+'|'+(', '.join(BASELINE[o['id']]) or '該当なし')+'|'+o['lesson'].replace('|','／')+'|')
    (root/'reports/objective-delta.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
    return data
