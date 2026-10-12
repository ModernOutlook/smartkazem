import json,re
from pathlib import Path
from sentence_transformers import SentenceTransformer,util
S=Path('content/emergence-2.js'); T=Path('translations/emergence-2.json'); M=Path('docs/emergence-2-paragraph-manifest.json')
def srcs(t):
 v=re.findall(r'paragraphs:\"((?:\\.|[^\"])*)\"',t)
 if len(v)!=11: raise RuntimeError(f'expected 11 source strings, got {len(v)}')
 return [{'number':20+i,'lines':[x.strip() for x in json.loads('"'+r+'"').splitlines() if x.strip()]} for i,r in enumerate(v)]
def sentences(t):
 out=[]; st=0; terms=set('.!?؟。！？'); cjk=set('。！？'); close=set('»”’\"\'”)]}')
 i=0
 while i<len(t):
  ch=t[i]
  if ch not in terms: i+=1; continue
  while i+1<len(t) and t[i+1] in '.!?…！？': i+=1
  j=i+1
  while j<len(t) and t[j] in close: j+=1
  if ch in cjk or j>=len(t) or t[j].isspace():
   while j<len(t) and t[j].isspace(): j+=1
   p=t[st:j].strip()
   if p: out.append(p)
   st=j; i=j
  else: i+=1
 p=t[st:].strip()
 if p: out.append(p)
 return out
def align(lines,pars,model,ep,lang):
 trg=[s for p in pars for s in sentences(p)]; m,n=len(lines),len(trg)
 e=model.encode(lines+trg,convert_to_tensor=True,normalize_embeddings=True); sim=util.cos_sim(e[:m],e[m:]).cpu().numpy()
 neg=-10**9; dp=[[neg]*(n+1) for _ in range(m+1)]; bk=[[None]*(n+1) for _ in range(m+1)]; dp[0][0]=0
 for i in range(m):
  sl=len(re.sub(r'\s+','',lines[i]))
  for j in range(n):
   if dp[i][j]<=neg/2: continue
   for k in range(1,min(16,n-j)+1):
    q=float(sim[i,j:j+k].mean()); tl=sum(len(re.sub(r'\s+','',x)) for x in trg[j:j+k]); penalty=1.0 if sl<=20 and tl>80 else 0.0
    val=dp[i][j]+q-.055*(k-1)-penalty
    if val>dp[i+1][j+k]: dp[i+1][j+k]=val; bk[i+1][j+k]=(j,k,q)
 if bk[m][n] is None: raise RuntimeError(f'Episode {ep} {lang}: no complete alignment source={m} target={n}')
 g=[None]*m; j=n
 for i in range(m,0,-1): g[i-1]=bk[i][j]; j=g[i-1][0]
 out=[]; rows=[]
 for i,(a,k,q) in enumerate(g):
  text=' '.join(trg[a:a+k]).strip(); sl=len(re.sub(r'\s+','',lines[i])); tl=len(re.sub(r'\s+','',text)); exc=sl<=20 and tl<=80 and q>=.05
  if q<.18 and not exc: raise RuntimeError(f'Episode {ep} {lang}: weak alignment line {i+1}: {q:.3f} source_len={sl} target_len={tl}')
  out.append(text); rows.append({'index':i+1,'translationSentenceStart':a+1,'translationSentenceEnd':a+k,'similarity':round(q,4),'confidenceException':exc and q<.18})
 return out,rows
def main():
 data=json.loads(T.read_text(encoding='utf8')); model=SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2'); man={'schema':3,'rule':'one non-empty Persian source line = one translation paragraph','method':'monotonic multilingual semantic alignment of existing translation sentences; no generated or reordered text','episodes':[]}
 for ep in srcs(S.read_text(encoding='utf8')):
  row=next(x for x in data['episodes'] if x['number']==ep['number']); a={}; d={}
  for lang in ('en','ar','zh'):
   a[lang],d[lang]=align(ep['lines'],row['paragraphs'][lang],model,ep['number'],lang)
  row['paragraphs'].update(a); man['episodes'].append({'number':ep['number'],'sourceParagraphCount':len(ep['lines']),'paragraphs':[{'index':i+1,'fa':ep['lines'][i],'en':a['en'][i],'ar':a['ar'][i],'zh':a['zh'][i],'alignment':{'en':d['en'][i],'ar':d['ar'][i],'zh':d['zh'][i]}} for i in range(len(ep['lines']))]}); print(f"Episode {ep['number']}: FA={len(ep['lines'])} EN={len(a['en'])} AR={len(a['ar'])} ZH={len(a['zh'])}")
 T.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8'); M.write_text(json.dumps(man,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if __name__=='__main__': main()
