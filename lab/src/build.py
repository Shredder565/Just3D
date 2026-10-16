import re,sys,os
here=os.path.dirname(os.path.abspath(__file__))
def rd(n):return open(os.path.join(here,n),encoding='utf-8').read()
def build(mode,out):
    os.makedirs(os.path.dirname(os.path.abspath(out)),exist_ok=True)
    sh=rd('shell.html')
    other='ai' if mode=='trace' else 'trace'
    sh=re.sub(r'<!--ONLY:%s-->.*?<!--/ONLY-->'%other,'',sh,flags=re.S)
    sh=re.sub(r'<!--/?ONLY(:\w+)?-->','',sh)
    title={'trace':'Just3D Trace','ai':'Just3D AI'}[mode]
    sub={'trace':'Model sheet outlines to a quad model. Works fully offline in this page.','ai':'Model sheet to an AI service to a 3D mesh to a quad model.'}[mode]
    js=rd('app1.js')+'\n'+rd('app2.js')+'\n'+rd('app5.js')+'\n'+rd('app6.js')+'\n'+rd('app7.js')+'\n'+(rd('app4.js')+'\n' if mode=='ai' else '')+rd('app3.js')
    html=sh.replace('{{TITLE}}',title).replace('{{MODE}}',mode).replace('{{SUB}}',sub).replace('{{SCRIPT}}',js.replace('</script>','<\\/script>'))
    open(out,'w',encoding='utf-8').write(html);print(out,len(html))
b=sys.argv[1] if len(sys.argv)>1 else '.'
build('trace',os.path.join(b,'just3d-trace.html'));build('ai',os.path.join(b,'just3d-ai.html'))
