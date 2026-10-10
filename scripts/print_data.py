import html
e=lambda x:html.escape(str(x))
def render(q):
    out=''
    if 'table' in q:
        t=q['table'];out='<p class="source">'+e(t['caption'])+'</p><table><tr>'+''.join('<th>'+e(h)+'</th>' for h in t['headers'])+'</tr>'+''.join('<tr>'+''.join('<td>'+e(x)+'</td>' for x in r)+'</tr>' for r in t['rows'])+'</table>'
    if 'charts' in q:
        out+='<div class="chart-grid">'
        for c in q['charts']:
            y=lambda v:160-v/c['max']*125
            out+='<figure><figcaption>'+e(c['title'])+'</figcaption><svg viewBox="0 0 340 200" role="img" aria-label="'+e(c['title'])+'"><path d="M40 25V160H320" fill="none" stroke="#666"/>'
            out+=''.join(f'<text x="2" y="{y(v)+4}">{v:g}</text>' for v in [0,c['max']/2,c['max']])
            out+='<polyline points="'+' '.join(f'{50+i*125},{y(v)}' for i,v in enumerate(c['values']))+'" fill="none" stroke="#126e67" stroke-width="3"/>'
            out+=''.join(f'<circle cx="{50+i*125}" cy="{y(v)}" r="4"/><text text-anchor="middle" x="{50+i*125}" y="{y(v)-10}">{v}</text><text text-anchor="middle" x="{50+i*125}" y="188">{e(c["labels"][i])}</text>' for i,v in enumerate(c['values']))+'</svg></figure>'
        out+='</div><p class="source">'+e(q['chartCaption'])+'</p>'
    return out
