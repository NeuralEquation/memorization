from pathlib import Path
p=Path(__file__).resolve().parents[1]/'index.html'
s=p.read_text(encoding='utf-8')
if 'const baseCards' not in s: raise SystemExit('Already migrated')
s=s[:s.index('  <script>')]+'''  <script src="./data/study-data.js"></script>
  <script src="./core.js"></script>
  <script src="./app.js"></script>
</body></html>
'''
s=s.replace('<title>政経暗記</title>','<title>政経 2学期中間 2026年10月</title>')
s=s.replace('政経の暗記カードと正誤問題','2026年10月14日試験向け・確認済み論点の独自演習')
s=s.replace('<header>','''<header><h1>政経 2学期中間</h1><p>試験開始：2026年10月14日</p>
<div class="notice"><b>資料確認済みの先行版</b><p id="scopeCount"></p>
<p>問題集原本と出版社解答冊子はこのPCに未提供です。180問の完全網羅は未確認。訂正報告の9問は訂正論点だけを扱います。</p>
<a href="print.html">印刷教材・問題・解説</a> / <a href="coverage.html">180問対応監査</a> / <a href="sources.html">資料と法令の確認状況</a></div>
<p id="offlineStatus" role="status">オフライン準備中</p><p id="saveStatus" role="status">今回の試験の進捗をこの端末に保存します</p>''')
s=s.replace('<span>既習</span>','<span>目標習得</span>').replace('<summary>MODE</summary>','<summary>出題形式</summary>').replace('<summary>STAGE</summary>','<summary>学習単元</summary>')
s=s.replace('<div class="action-stack">','''<label for="studyFilter">出題対象</label><select id="studyFilter"><option value="all">収録全問</option><option value="unmastered">未習得を優先</option><option value="weak">間違えた問題</option></select>
<label for="importance">重要度</label><select id="importance"><option value="all">すべて</option><option value="A">重要度A</option><option value="B">重要度B</option></select>
<p class="source">先行版の収録内容はすべて重要度Aです。</p><div class="action-stack">''')
s=s.replace('<button class="ghost" id="resetBtn">リセット</button>','''<button id="reviewBtn">全範囲復習</button><button id="exportBtn">進捗のバックアップ</button><button class="ghost" id="resetBtn">今回の進捗をリセット</button>''')
s=s.replace('placeholder="用語を検索"','placeholder="解説を検索（解説一覧に切り替わります）"').replace('>カード一覧<','>解説一覧<')
s=s.replace('</style>','''.notice{background:#fff7df;border:1px solid #d9ba61;border-radius:8px;padding:12px;line-height:1.7}.notice p{margin:6px 0}h1{font-size:25px}.source,#offlineStatus,#saveStatus{font-size:12px;color:#526170;line-height:1.6}select{font:inherit;max-width:100%;width:100%;padding:10px;margin:6px 0 12px}label{display:block}.prompt{font-size:clamp(21px,2.3vw,28px);line-height:1.6}input{min-width:0}.feedback{overflow-wrap:anywhere}.main{min-width:0}a{color:#0b6059}button:focus-visible,a:focus-visible{outline:3px solid #167a73;outline-offset:3px}@media(max-width:560px){.text-answer{grid-template-columns:1fr}.badge{white-space:normal}.prompt{font-size:22px}}
  </style>''')
p.write_text(s,encoding='utf-8')
