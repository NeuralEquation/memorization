const path=require('node:path'),fs=require('node:fs');
let pw;try{pw=require('playwright');}catch{pw=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
(async()=>{const browser=await pw.chromium.launch(fs.existsSync(pw.chromium.executablePath())?{headless:true}:{headless:true,channel:'msedge'});try{
 for(const [html,name] of [['print-complete.html','seikei-midterm-202610-complete.pdf'],['print-short.html','seikei-midterm-202610-short.pdf']]){
  const p=await browser.newPage();await p.goto('http://127.0.0.1:8769/'+html);await p.emulateMedia({media:'print'});await p.evaluate(()=>document.fonts.ready);
  const dest=path.resolve('output/pdf',name);await p.pdf({path:dest,preferCSSPageSize:true,printBackground:true,displayHeaderFooter:html!=='print-short.html',headerTemplate:'<span></span>',footerTemplate:'<div style="width:100%;text-align:center;font-size:8px;color:#666">政経 2学期中間 2026-10-10 更新版　<span class="pageNumber"></span> / <span class="totalPages"></span></div>'});console.log(dest+' '+fs.statSync(dest).size+' bytes');await p.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
