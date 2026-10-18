(()=>{
const U='https://jbsjjmmlqzxsuxgvvnfq.supabase.co',K='sb_publishable_fCFNPFfNZ28XTcOCjnngIA_jxlSLfmi',OWNER='fe944cb5-7ee7-471f-a6bd-4925501b6fa4';
const db=window.supabase?.createClient(U,K);if(!db)return;
const make=(tag,cls,label)=>{const e=document.createElement(tag);e.className=cls||'';if(label!==undefined)e.textContent=label;return e};
const notify=s=>{const e=make('div','tc-toast',s);document.body.append(e);setTimeout(()=>e.remove(),3200)};
let isOwner=false,editing=false;
const bar=make('div','tc-toolbar'),status=make('span','tc-status','');
const edit=make('button','tc-header-btn','✎ 편집'),login=make('button','tc-header-btn','관리자 로그인');
bar.append(status,edit,login);(document.querySelector('.head-inner')||document.body).append(bar);
function sync(){edit.hidden=!isOwner;login.textContent=isOwner?'로그아웃':'관리자 로그인';status.textContent=editing?'편집 중':'';document.body.classList.toggle('tc-editing',isOwner&&editing)}
async function auth(){const {data}=await db.auth.getUser();isOwner=data?.user?.id===OWNER;if(!isOwner)editing=false;sync()}
login.onclick=async()=>{if(isOwner){await db.auth.signOut();isOwner=false;editing=false;sync();return}
const email=prompt('개인 시네마테크 관리자 이메일');if(!email)return;
const password=prompt('비밀번호 (이메일 인증 링크로 로그인하려면 빈칸)');if(password===null)return;
const {error}=password?await db.auth.signInWithPassword({email,password}):await db.auth.signInWithOtp({email,options:{emailRedirectTo:location.href}});
if(error)notify(error.message);else{await auth();notify(isOwner?'관리자 로그인 완료':'이메일로 로그인 링크를 보냈어.')}};edit.onclick=()=>{editing=!editing;sync()};
const texts=[],cards=[];
document.querySelectorAll('.page').forEach(page=>{
const section=page.dataset.view||'main';let ti=0,ci=0;
page.querySelectorAll('h1,h2,h3,p,dd,dt,small,.hour,.overlay,.notice,.period,.sub,.money,.tag').forEach(node=>{
if(!node.textContent.trim()||Array.from(node.children).some(c=>c.tagName!=='BR'))return;
const key='text:'+section+':'+ti++;texts.push({key,node});
const button=make('button','tc-edit-trigger','✎');button.type='button';button.title='문장 편집';
node.insertAdjacentElement('afterend',button);
button.onclick=async ev=>{ev.stopPropagation();ev.preventDefault();if(!isOwner||!editing)return;
const value=prompt('문장 수정',node.textContent);if(value===null||value===node.textContent)return;
if(!value.trim()||value.length>3000){notify('1~3,000자로 입력해 줘.');return}
const {error}=await db.from('tokyo_edits').upsert({element_key:key,content:value,updated_at:new Date().toISOString()});
if(error)notify(error.message);else{node.textContent=value;notify('저장됐어.')}};
});
page.querySelectorAll('.event,.sidebox,.stay,.transport-option,.notice').forEach(node=>{
const key='card:'+section+':'+ci++;const toggle=make('button','tc-card-toggle','💬 코멘트 · 의견 보기');
toggle.type='button';const panel=make('div','tc-panel');panel.hidden=true;
toggle.onclick=ev=>{ev.preventDefault();ev.stopPropagation();panel.hidden=!panel.hidden};
if(node.tagName==='A'){const holder=make('div','tc-card-extras');holder.append(toggle,panel);node.after(holder)}
else node.append(toggle,panel);
cards.push({key,toggle,panel});
});
});
let comments=[],votes=[];
let voter=localStorage.getItem('tokyo26-voter');if(!voter){voter=crypto.randomUUID();localStorage.setItem('tokyo26-voter',voter)}
function draw(){
cards.forEach(card=>{
const c=comments.filter(x=>x.element_key===card.key),v=votes.filter(x=>x.element_key===card.key),mine=v.some(x=>x.voter_id===voter);
card.toggle.textContent='💬 코멘트 '+c.length+' · 의견 보기';card.panel.replaceChildren();
if(!c.length)card.panel.append(make('p','tc-placeholder','아직 코멘트가 없어. 첫 의견을 남겨줘!'));
c.forEach(x=>{
const box=make('div','tc-comment'),by=make('div','tc-by',x.nickname+' · '+new Date(x.created_at).toLocaleDateString('ko-KR'));
box.append(by,make('p','',x.content));card.panel.append(box);
if(isOwner){const del=make('button','tc-delete','삭제');by.append(del);del.onclick=async()=>{
if(!confirm('댓글을 삭제할까?'))return;const {error}=await db.from('tokyo_comments').delete().eq('id',x.id);
if(error)notify(error.message);else await reloadComments()}}});
const form=make('form','tc-comment-form'),field=make('textarea',''),submit=make('button','tc-submit','코멘트 등록');
field.placeholder='의견을 남겨줘!';field.required=true;field.maxLength=600;field.rows=2;submit.type='submit';
form.append(field,submit);card.panel.append(form);
form.onsubmit=async e=>{e.preventDefault();
let name=localStorage.getItem('tokyo26-name');if(!name){name=prompt('댓글에 표시할 이름 (24자 이내)')?.trim();if(!name)return;name=name.slice(0,24);localStorage.setItem('tokyo26-name',name)}
submit.disabled=true;
const {error}=await db.from('tokyo_comments').insert({element_key:card.key,nickname:name,content:field.value.trim()});
submit.disabled=false;if(error)notify(error.message);else{field.value='';await reloadComments()}};
const row=make('div','tc-votes');card.panel.append(row);
[['yes','👍 가고 싶어'],['maybe','🤔 고민'],['no','👎 패스']].forEach(([choice,label])=>{
const count=v.filter(x=>x.choice===choice).length,b=make('button','tc-vote'+(v.some(x=>x.voter_id===voter&&x.choice===choice)?' selected':''),label+' '+count);
b.type='button';b.disabled=mine;row.append(b);b.onclick=async()=>{
const {error}=await db.from('tokyo_votes').insert({element_key:card.key,voter_id:voter,choice});
if(error)notify(error.message);else await reloadVotes()}})}
)}
async function reloadComments(){const {data,error}=await db.from('tokyo_comments').select('*').order('created_at',{ascending:true}).limit(1500);if(error)notify('댓글 불러오기 실패');else{comments=data||[];draw()}}
async function reloadVotes(){const {data,error}=await db.from('tokyo_votes').select('element_key,voter_id,choice').limit(5000);if(!error){votes=data||[];draw()}}
db.auth.onAuthStateChange(()=>setTimeout(async()=>{await auth();draw()},0));
(async()=>{await auth();const {data}=await db.from('tokyo_edits').select('element_key,content');const m=new Map((data||[]).map(x=>[x.element_key,x.content]));texts.forEach(x=>{if(m.has(x.key))x.node.textContent=m.get(x.key)});
await Promise.all([reloadComments(),reloadVotes()]);})();
})();