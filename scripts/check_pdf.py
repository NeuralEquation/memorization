from pathlib import Path
import fitz,json,hashlib,re
from PIL import Image,ImageOps,ImageDraw
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'test-results/pdf-review';out.mkdir(parents=True,exist_ok=True)
data=json.loads((ROOT/'data/study-data.js').read_text(encoding='utf-8').removeprefix('window.STUDY_DATA = ').rstrip(';\n'))
report={}
for name in ['complete','short']:
    doc=fitz.open(ROOT/f'output/pdf/seikei-midterm-202610-{name}.pdf');texts=[p.get_text() for p in doc];images=[]
    blank=[];outside=[]
    for i,p in enumerate(doc):
        if len(texts[i].strip())<25:blank.append(i+1)
        for b in p.get_text('blocks'):
            if b[0]<0 or b[1]<0 or b[2]>p.rect.width+1 or b[3]>p.rect.height+1:outside.append(i+1)
        pix=p.get_pixmap(matrix=fitz.Matrix(1.1,1.1));image=Image.frombytes('RGB',[pix.width,pix.height],pix.samples);image.save(out/f'{name}-{i+1:03}.png')
        thumb=ImageOps.contain(image,(270,382));tile=Image.new('RGB',(290,410),'#cbd3d9');tile.paste(thumb,((290-thumb.width)//2,20));ImageDraw.Draw(tile).text((8,4),f'{name} {i+1}',fill='black');images.append(tile)
    for start in range(0,len(images),16):
        group=images[start:start+16];montage=Image.new('RGB',(290*4,410*((len(group)+3)//4)),'#dbe1e5')
        for j,img in enumerate(group):montage.paste(img,((j%4)*290,(j//4)*410))
        montage.save(out/f'{name}-montage-{start//16+1:02}.png')
    full='\n'.join(texts)
    missing=[]
    if name=='complete':
        missing=[q['id'] for q in data['questions'] if len(re.findall(re.escape(q['id'])+r'(?![\w-])',full))<2]
        assert not missing,missing
    else:assert len(doc)==10
    assert not blank and not outside,(blank,outside)
    report[name]=dict(pages=len(doc),a4=all(abs(p.rect.width-595.28)<1 and abs(p.rect.height-841.89)<1 for p in doc),blankPages=blank,outsidePages=outside,missingQuestionIds=missing)
old=ROOT/'output/pdf/seikei-midterm-202610.pdf';digest=hashlib.sha256(old.read_bytes()).hexdigest();assert digest.upper()=='4B513431F4D6D8C6B98DD0935B4453444FD897ADB14FAFB11C21A02C98E47131'
report['preserved60PagePdf']=dict(sha256=digest,pages=len(fitz.open(old)))
(ROOT/'test-results/pdf-checks.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report))
