/* ===== 게임 엔진 (서버와 웹 공통) ===== */
const W=2400,H=1440;
const TEAM=[{name:'테크킹팀',c:'#D85A30',l:'#F5B8A0',d:'#712B13'},{name:'대니쌤팀',c:'#6A60D0',l:'#C9C4F2',d:'#26215C'}];
const ROLES={
 atk:{name:'공격수',limit:6,hat:'#E24B4A',reload:3,speed:178,desc:'새총 공격이 가장 빨라요',skills:[{key:'bomb',name:'폭탄 돌',cd:20,arm:1},{key:'tri',name:'세 갈래',cd:15,arm:1}]},
 rep:{name:'수리공',limit:4,hat:'#EF9F27',reload:5.5,speed:175,desc:'가까운 벽을 자동으로 고쳐요',skills:[{key:'fix',name:'긴급 보수',cd:25},{key:'steel',name:'강철 벽돌',cd:20}]},
 shd:{name:'방패병',limit:3,hat:'#888780',reload:5.5,speed:158,desc:'앞쪽에서 오는 돌을 막아요',skills:[{key:'big',name:'거대 방패',cd:20},{key:'reflect',name:'되받아치기',cd:40}]},
 sup:{name:'지원가',limit:2,hat:'#1D9E75',reload:5.5,speed:178,desc:'숲 속 적을 넓게 찾아내요',skills:[{key:'cheer',name:'응원 버프',cd:30},{key:'smoke',name:'연막탄',cd:30,arm:1}]}
};
const ROLE_KEYS=['atk','rep','shd','sup'];
const RIVERS=[{x:1120,y:0,w:160,h:200},{x:1120,y:288,w:160,h:232},{x:1120,y:920,w:160,h:232},{x:1120,y:1240,w:160,h:200}];
const BRIDGES=[{x:1072,y:200,w:256,h:88},{x:1072,y:1152,w:256,h:88}];
const FORESTS=[{x:440,y:72,w:320,h:220},{x:440,y:1148,w:320,h:220},{x:1640,y:72,w:320,h:220},{x:1640,y:1148,w:320,h:220}];
const SUPPLY=[[848,428],[848,1012],[1552,428],[1552,1012]];
const ZONE={x:1200,y:720,r:170};
const CROSS=[244,720,1196];
const MAXHP=5,FLAGHP=10,MAG=3,GAP=.35;
let G=null,units=[];
const clamp=(v,a,b)=>v<a?a:v>b?b:v,hyp=Math.hypot,rnd=Math.random;
function angDiff(a,b){let d=a-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d}
function inRect(x,y,r){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h}
function rectDist(x,y,r){const cx=clamp(x,r.x,r.x+r.w),cy=clamp(y,r.y,r.y+r.h);return hyp(x-cx,y-cy)}
const FXD={hit:.25,poof:.6,boom:.45,fix:.3,spark:.25,dust:.25};
function fx(k,x,y,c){G.fx.push({x,y,t:FXD[k]||.3,k,c});G.ev.push([k,Math.round(x),Math.round(y),c||0])}
function float(x,y,txt,c,uid){const v=uid==null?-1:uid;G.floats.push({x,y,txt,c,t:1.2,uid:v});G.ev.push(['f',Math.round(x),Math.round(y),txt,c,v])}
function news(txt,team){G.ev.push(['n',txt,team==null?-1:team])}
function nm(u){return u.name==='나'?'내가':u.name+' 선수가'}
function sfx(k,x,y,uid){G.ev.push(['s',Math.round(x),Math.round(y),k,uid==null?-1:uid])}

function buildWalls(){const out=[];const add=(team,x,y,w,h,kind)=>{if(team===1)x=W-x-w;out.push({team,x,y,w,h,hp:2,max:2,armor:0,alive:true,kind})};
 for(const t of [0,1]){for(let i=0;i<5;i++)add(t,340,440+i*120,40,80,'outer');for(let i=0;i<5;i++)add(t,220,560+i*64,32,64,'inner');for(let i=0;i<4;i++){add(t,i*63,528,63,32,'armT');add(t,i*63,880,63,32,'armB')}}return out}
function makeUnit(team,role,human,name,cid){return{id:0,team,role,human,name,cid:cid==null?-1:cid,x:0,y:0,r:14,hp:MAXHP,dead:0,reload:rnd(),ammo:MAG,reloading:false,cds:[rnd()*6,rnd()*6],face:team?Math.PI:0,armed:null,bigT:0,reflT:0,repT:0,inv:0,inForest:false,vis:[true,true],
 input:{mx:0,my:0,ch:false},chV:0,charging:false,st:{hit:0,blk:0,fix:0,def:0,flag:0,ast:0,out:0},
 ai:{t:rnd()*.3,lane:CROSS[Math.floor(rnd()*3)],off:(rnd()-.5)*500,wantCenter:rnd()<.4,gx:W/2,gy:H/2,target:null,cross:null,st:0,lx:0,ly:0,unT:0,ux:0,uy:0,ph:rnd()*6}}}
function spawn(u){u.x=(u.team?2120:296)+(rnd()-.5)*16;u.y=600+rnd()*240;u.hp=MAXHP;u.dead=0;u.reload=.5;u.ammo=MAG;u.reloading=false;u.armed=null;u.bigT=0;u.reflT=0;u.inv=2;u.chV=0;u.charging=false;u.ai.cross=null;u.face=u.team?Math.PI:0}
/* cfg = {teams:[[{role,name,cid}],[...]], time, practice} */
function startMatch(cfg){
 const T=cfg.time||300;
 G={time:T,dur:T,practice:!!cfg.practice,easy:!!cfg.easy,cd:cfg.countdown===false?0:3,flagNewsT:[0,0],paused:false,over:false,result:null,bricks:[40,40],brickT:0,buffT:[0,0],buffBy:[null,null],capPts:[0,0],destroyed:[0,0],flagDmg:[0,0],cap:0,owner:-1,
  projs:[],fx:[],smokes:[],floats:[],ev:[],blocks:buildWalls(),flags:[{team:0,x:120,y:720,hp:FLAGHP,max:FLAGHP,r:22},{team:1,x:2280,y:720,hp:FLAGHP,max:FLAGHP,r:22}],
  supplies:SUPPLY.map(([x,y])=>({x,y,item:null,t:4})),t:0};
 units=[];
 for(const t of [0,1]){const cnt={};for(const k in ROLES)cnt[k]=ROLES[k].limit;
  for(const h of (cfg.teams[t]||[]).slice(0,15)){if(!(cnt[h.role]>0))h.role=ROLE_KEYS.find(k=>cnt[k]>0);cnt[h.role]--;units.push(makeUnit(t,h.role,true,h.name,h.cid))}
  let n=1;if(cfg.fill!==false)for(const k of ROLE_KEYS)for(let i=0;i<cnt[k];i++)units.push(makeUnit(t,k,false,'봇'+(n++)))}
 units.forEach((u,i)=>{u.id=i;spawn(u)});
}

/* ---------- mechanics ---------- */
function rateMul(t){let m=1;if(G.buffT[t]>0)m*=.5;if(!G.practice&&G.time<60)m*=.6;return m}
function enemySmoke(u){return G.smokes.find(s=>s.team!==u.team&&hyp(u.x-s.x,u.y-s.y)<s.r)||null}
function setCd(u,i){u.cds[i]=ROLES[u.role].skills[i].cd}
function shoot(u,ang,frac){if(u.dead>0||u.reload>0||u.ammo<=0||G.projs.length>220)return false;
 const sm=enemySmoke(u);if(sm){u.reload=.5;if(sm.by)sm.by.st.ast++;if(u.human)float(u.x,u.y-30,'연막 속이라 못 쏴요','#fff',u.id);return false}
 if(!u.human&&G.practice&&!u.trainer)return false;
 const max=140+clamp(frac,0,1)*400,k=u.armed;u.face=ang;
 const mk=(a,kind)=>G.projs.push({x:u.x+Math.cos(a)*18,y:u.y+Math.sin(a)*18,vx:Math.cos(a)*720,vy:Math.sin(a)*720,team:u.team,o:u.id,dist:0,max,kind});
 if(k==='tri'){[-.2,0,.2].forEach(o=>mk(ang+o,'stone'));setCd(u,1)}else if(k==='bomb'){mk(ang,'bomb');setCd(u,0)}else if(k==='smoke'){mk(ang,'smoke');setCd(u,1)}else mk(ang,'stone');
 sfx(k==='bomb'?'bombshot':'shot',u.x,u.y,u.id);
 u.armed=null;u.ammo--;if(u.ammo>0)u.reload=GAP;else{u.reloading=true;u.reload=ROLES[u.role].reload*rateMul(u.team)}return true}
/* 조준 보조: 바라보는 방향 앞쪽의 적·벽·깃발로 살짝 맞춰 줌 */
function assistAim(u,ang,dist){let best=null,bs=1e9;const cone=.55;
 const consider=(x,y,w)=>{const dx=x-u.x,dy=y-u.y,d=hyp(dx,dy);if(d<30||d>560||d>dist+170)return;const a=Math.atan2(dy,dx),da=Math.abs(angDiff(a,ang));if(da>cone)return;const s=da*300+Math.abs(d-dist)*.3+w;if(s<bs){bs=s;best={x,y,a,d}}};
 for(const o of units)if(o.team!==u.team&&o.dead<=0&&o.vis[u.team])consider(o.x,o.y,0);
 for(const b of G.blocks)if(b.alive&&b.team!==u.team)consider(b.x+b.w/2,b.y+b.h/2,60);
 const f=G.flags[1-u.team];consider(f.x,f.y,-40);
 if(!best)return{ang,dist,tg:null};
 let nd=dist;if(Math.abs(best.d-dist)<170)nd=clamp(best.d+40,140,540);
 return{ang:best.a,dist:nd,tg:best}}
function useSkill(u,i){if(!u||u.dead>0||u.cds[i]>0||!G||G.over)return;const s=ROLES[u.role].skills[i],t=u.team;
 if(s.arm){u.armed=u.armed===s.key?null:s.key;return}
 sfx('skill',u.x,u.y,u.id);
 if(s.key==='fix'){let n=0;for(const b of G.blocks){if(b.team!==t||rectDist(u.x,u.y,b)>170)continue;if(!b.alive){if(G.bricks[t]<2||blocked(b))continue;b.alive=true;b.hp=0}while(b.hp<b.max&&G.bricks[t]>0){b.hp++;G.bricks[t]--;n++}}u.st.fix+=n;float(u.x,u.y-30,'긴급 보수 +'+n,'#9FE1CB')}
 else if(s.key==='steel'){G.blocks.filter(b=>b.team===t&&b.alive).sort((a,b)=>rectDist(u.x,u.y,a)-rectDist(u.x,u.y,b)).slice(0,5).forEach(b=>b.armor=2);float(u.x,u.y-30,'강철 벽돌','#ddd')}
 else if(s.key==='big'){u.bigT=5;float(u.x,u.y-30,'거대 방패','#fff')}
 else if(s.key==='reflect'){u.reflT=5;float(u.x,u.y-30,'되받아치기','#FAC775')}
 else if(s.key==='cheer'){G.buffT[t]=5;G.buffBy[t]=u;units.forEach(o=>{if(o.team===t&&o.role==='sup')o.cds[0]=s.cd});float(u.x,u.y-30,'응원 버프!','#FAC775');return}
 setCd(u,i)}
function blocked(b){return units.some(o=>o.dead<=0&&rectDist(o.x,o.y,b)<o.r)}
function credit(t){if(G.buffT[t]>0&&G.buffBy[t])G.buffBy[t].st.ast++}
function hitUnit(u,by,kx,ky){if(u.dead>0)return;if(u.inv>0){fx('spark',u.x,u.y,'#fff');return}
 u.hp--;u.inv=.8;if(kx!=null&&!u.frozen){u.x+=kx*12;u.y+=ky*12;collide(u)}fx('hit',u.x,u.y);sfx('hurt',u.x,u.y,u.id);if(by){by.st.hit++;credit(by.team);if(by.human&&by.st.hit%10===0)news(`${nm(by)} 돌을 ${by.st.hit}번 맞혔어요!`,by.team)}
 if(u.hp<=0){u.dead=5;u.st.out++;fx('poof',u.x,u.y);if(u.human)float(u.x,u.y-30,'아웃! 5초 뒤 부활','#fff',u.id)}}
function dmgBlock(b,n,by){while(n>0&&b.armor>0){b.armor--;n--}b.hp-=n;
 if(b.hp<=0&&b.alive){b.alive=false;b.hp=0;G.destroyed[1-b.team]++;if(by){by.st.blk++;credit(by.team);if(by.human)news(`${nm(by)} ${TEAM[b.team].name} 벽을 부쉈어요!`,by.team)}fx('poof',b.x+b.w/2,b.y+b.h/2);sfx('crack',b.x+b.w/2,b.y+b.h/2)}
 else sfx('thud',b.x+b.w/2,b.y+b.h/2)}
function dmgFlag(f,n,by){const d=Math.min(n,f.hp);f.hp-=d;G.flagDmg[1-f.team]+=d;if(by)by.st.flag+=d;if(G.t-G.flagNewsT[f.team]>8&&f.hp>0){G.flagNewsT[f.team]=G.t;news(`${TEAM[f.team].name} 깃발이 공격받고 있어요! (${f.hp}/${f.max})`,1-f.team)}float(f.x,f.y-34,'-'+d,'#fff');sfx('flag',f.x,f.y)}
function explode(p){const by=units[p.o];fx('boom',p.x,p.y);sfx('boom',p.x,p.y);const R=90;
 for(const b of G.blocks)if(b.alive&&b.team!==p.team&&rectDist(p.x,p.y,b)<R)dmgBlock(b,2,by);
 for(const u of units){if(u.team===p.team||u.dead>0)continue;const d=hyp(u.x-p.x,u.y-p.y);if(d<R)hitUnit(u,by,(u.x-p.x)/(d||1)*1.5,(u.y-p.y)/(d||1)*1.5)}
 for(const f of G.flags)if(f.team!==p.team&&hyp(f.x-p.x,f.y-p.y)<R+f.r)dmgFlag(f,2,by)}
function collide(u){u.x=clamp(u.x,u.r,W-u.r);u.y=clamp(u.y,u.r,H-u.r);for(const r of RIVERS)pushOut(u,r);for(const b of G.blocks)if(b.alive)pushOut(u,b)}
function pushOut(u,r){const cx=clamp(u.x,r.x,r.x+r.w),cy=clamp(u.y,r.y,r.y+r.h);const dx=u.x-cx,dy=u.y-cy,d2=dx*dx+dy*dy;if(d2>=u.r*u.r)return;
 if(d2===0){const l=u.x-r.x,ri=r.x+r.w-u.x,t=u.y-r.y,bt=r.y+r.h-u.y,m=Math.min(l,ri,t,bt);if(m===l)u.x=r.x-u.r;else if(m===ri)u.x=r.x+r.w+u.r;else if(m===t)u.y=r.y-u.r;else u.y=r.y+r.h+u.r}
 else{const d=Math.sqrt(d2);u.x=cx+dx/d*u.r;u.y=cy+dy/d*u.r}}
function move(u,mx,my,dt){const l=hyp(mx,my);if(l>1){mx/=l;my/=l}const sp=ROLES[u.role].speed*(enemySmoke(u)?.5:1);u.x+=mx*sp*dt;u.y+=my*sp*dt;collide(u);return l}
function humanStep(u,dt){const I=u.input||{};const mx=clamp(+I.mx||0,-1,1),my=clamp(+I.my||0,-1,1);move(u,mx,my,dt);if(mx||my)u.face=Math.atan2(my,mx);
 if(I.ch){u.charging=true;u.chV=Math.min(1,u.chV+dt/1.2)}
 else if(u.charging){u.charging=false;const A=assistAim(u,u.face,140+u.chV*400);if(!shoot(u,A.ang,(A.dist-140)/400)&&u.reloading)float(u.x,u.y-30,'장전 중!','#fff',u.id);u.chV=0}}

/* ---------- bots ---------- */
function nearestFoe(u,range){let best=null,bd=range;for(const o of units){if(o.team===u.team||o.dead>0||!o.vis[u.team])continue;const d=hyp(o.x-u.x,o.y-u.y);if(d<bd){bd=d;best=o}}return best}
function wallTarget(u,range){const f=G.flags[1-u.team];if(hyp(f.x-u.x,f.y-u.y)<range&&rnd()<.7)return{x:f.x,y:f.y};let best=null,bd=range;for(const b of G.blocks){if(!b.alive||b.team===u.team)continue;const d=rectDist(u.x,u.y,b);if(d<bd){bd=d;best=b}}return best?{x:best.x+best.w/2,y:best.y+best.h/2}:null}
function navigate(u,gx,gy){const ai=u.ai;
 if(Math.abs(gy-720)<170&&Math.abs(u.y-720)<170){ai.cross=null;return[gx,gy]}
 const sU=u.x<1200?0:1,sG=gx<1200?0:1,inC=u.x>1090&&u.x<1310;
 if(sU===sG&&!inC){ai.cross=null;return[gx,gy]}
 if(!ai.cross){if(sU===sG)return[gx,gy];let bi=0,bd=1e9;CROSS.forEach((cy,i)=>{const d=Math.abs(u.y-cy)+Math.abs(gy-cy);if(d<bd){bd=d;bi=i}});ai.cross={cy:CROSS[bi],ex:sU?1340:1060,xx:sU?1060:1340,stage:0}}
 const c=ai.cross;if(c.stage===0){if(hyp(u.x-c.ex,u.y-c.cy)<30)c.stage=1;else return[c.ex,c.cy]}
 if(Math.abs(u.x-c.xx)<30){ai.cross=null;return[gx,gy]}return[c.xx,c.cy]}
function decide(u){const ai=u.ai,t=u.team,dir=t?-1:1,foe=nearestFoe(u,520);ai.target=null;
 if(u.role==='atk'){
  if(ai.wantCenter&&G.owner!==t){ai.gx=ZONE.x+ai.off*.2;ai.gy=ZONE.y+ai.off*.25}
  else{const crossed=t?u.x<1120:u.x>1280,breach=G.blocks.filter(b=>b.team!==t&&b.alive&&b.kind==='outer').length<=3;ai.gx=t?(breach?520:640):(breach?1880:1760);ai.gy=crossed?720+ai.off*(breach?.3:.6):ai.lane}
  const w=wallTarget(u,500),fd=foe?hyp(foe.x-u.x,foe.y-u.y):1e9;
  if(foe&&(fd<220||(!w&&fd<340)||(w&&rnd()<.2))){ai.target=foe;if(u.cds[1]<=0&&!u.armed&&rnd()<.3)u.armed='tri'}
  else if(w){ai.target=w;if(u.cds[0]<=0&&!u.armed&&rnd()<.35)u.armed='bomb'}
 }else if(u.role==='rep'){
  let best=null,bd=1e9;for(const b of G.blocks){if(b.team!==t||(b.alive&&b.hp>=b.max))continue;const d=rectDist(u.x,u.y,b);if(d<bd){bd=d;best=b}}
  if(best){if(best.kind==='armT'){ai.gx=best.x+best.w/2;ai.gy=best.y-24}else if(best.kind==='armB'){ai.gx=best.x+best.w/2;ai.gy=best.y+best.h+24}else{ai.gx=best.x+best.w/2+dir*(best.w/2+24);ai.gy=best.y+best.h/2}}
  else{ai.gx=t?1960:440;ai.gy=720+ai.off*.7}
  if(foe)ai.target=foe;
  if(u.cds[0]<=0&&G.bricks[t]>4&&G.blocks.filter(b=>b.team===t&&(!b.alive||b.hp<b.max)&&rectDist(u.x,u.y,b)<170).length>=2)useSkill(u,0);
  if(u.cds[1]<=0&&units.some(o=>o.team!==t&&o.dead<=0&&Math.abs(o.x-(t?2040:360))<600))useSkill(u,1);
 }else if(u.role==='shd'){
  let al=null,bd=1e9;for(const o of units){if(o.team!==t||o.role!=='atk'||o.dead>0)continue;const d=hyp(o.x-u.x,o.y-u.y);if(d<bd){bd=d;al=o}}
  if(al){ai.gx=al.x+dir*45;ai.gy=al.y}else{ai.gx=t?1700:700;ai.gy=720}
  if(foe){u.face=Math.atan2(foe.y-u.y,foe.x-u.x);ai.target=foe;const d=hyp(foe.x-u.x,foe.y-u.y);if(u.cds[0]<=0&&d<400&&rnd()<.2)useSkill(u,0);if(u.cds[1]<=0&&d<350&&rnd()<.15)useSkill(u,1)}else u.face=t?Math.PI:0;
 }else{
  let cx=0,cy=0,n=0;for(const o of units)if(o.team===t&&o.role==='atk'&&o.dead<=0){cx+=o.x;cy+=o.y;n++}
  if(n){ai.gx=cx/n-dir*80;ai.gy=cy/n}else{ai.gx=ZONE.x-dir*200;ai.gy=ZONE.y}
  if(foe){ai.target=foe;const near=units.filter(o=>o.team===t&&o.dead<=0&&hyp(o.x-u.x,o.y-u.y)<400).length;if(u.cds[0]<=0&&G.buffT[t]<=0&&near>=3)useSkill(u,0);
   if(u.cds[1]<=0&&!u.armed&&units.filter(o=>o.team!==t&&o.dead<=0&&hyp(o.x-foe.x,o.y-foe.y)<160).length>=2)u.armed='smoke'}
 }}
function botThink(u,dt){if(u.frozen)return;const ai=u.ai;ai.t-=dt;if(ai.t<=0){ai.t=.25+rnd()*.15;decide(u)}
 const [gx,gy]=navigate(u,ai.gx,ai.gy);let dx=gx-u.x,dy=gy-u.y,d=hyp(dx,dy),mx=0,my=0;
 if(d>24){mx=dx/d;my=dy/d}else{mx=Math.cos(G.t+ai.ph)*.3;my=Math.sin(G.t*1.3+ai.ph)*.3}
 if(ai.target&&ai.target.team!==undefined){const s=Math.sin(G.t*2+ai.ph)*.6;mx+=-my*s;my+=mx*s}
 ai.st-=dt;if(ai.st<=0){ai.st=.8;if(hyp(u.x-ai.lx,u.y-ai.ly)<15&&d>40){ai.unT=.6;const a=rnd()*Math.PI*2;ai.ux=Math.cos(a);ai.uy=Math.sin(a)}ai.lx=u.x;ai.ly=u.y}
 if(ai.unT>0){ai.unT-=dt;mx=ai.ux;my=ai.uy}
 move(u,mx,my,dt);
 if(u.role!=='shd'&&(mx||my)&&!ai.target)u.face=Math.atan2(my,mx);
 const tg=ai.target;if(tg&&u.reload<=0&&!G.practice){if(tg.dead>0){ai.target=null;return}const dd=hyp(tg.x-u.x,tg.y-u.y);if(dd<540){const keep=u.face;const a=Math.atan2(tg.y-u.y,tg.x-u.x)+(rnd()-.5)*(tg.team===undefined?.12:.5)*(G.easy?1.8:1);if(shoot(u,a,clamp((dd+(tg.team===undefined?40:90)-140)/400,0,1))&&G.easy)u.reload*=1.6;if(u.role==='shd')u.face=keep}}}

/* ---------- update ---------- */
function update(dt){if(!G||G.over||G.paused)return;if(G.cd>0){G.cd-=dt;return}G.t+=dt;const prevT=G.time;if(!G.practice)G.time-=dt;if(prevT>=60&&G.time<60)news('피버 타임! 재장전이 빨라져요');
 for(const t of [0,1])G.buffT[t]=Math.max(0,G.buffT[t]-dt);G.brickT+=dt;if(G.brickT>=2){G.brickT=0;for(const t of [0,1])if(G.bricks[t]<60)G.bricks[t]++}
 for(const u of units)u.inForest=u.dead<=0&&FORESTS.some(f=>inRect(u.x,u.y,f));
 for(const o of units){for(const t of [0,1])o.vis[t]=o.team===t||!o.inForest||units.some(v=>v.team===t&&v.dead<=0&&hyp(v.x-o.x,v.y-o.y)<(v.role==='sup'?300:130))}
 for(const u of units){
  if(u.dead>0){u.dead-=dt;if(u.dead<=0)spawn(u);continue}
  u.reload-=dt;if(u.reloading&&u.reload<=0){u.reloading=false;u.ammo=MAG;if(u.human)sfx('load',u.x,u.y,u.id)}u.cds[0]=Math.max(0,u.cds[0]-dt);u.cds[1]=Math.max(0,u.cds[1]-dt);u.bigT-=dt;u.reflT-=dt;u.inv-=dt;
  if(u.human)humanStep(u,dt);else botThink(u,dt);
  if(u.role==='rep'){u.repT-=dt;if(u.repT<=0){let best=null,bd=110;for(const b of G.blocks){if(b.team!==u.team||(b.alive&&b.hp>=b.max))continue;const d=rectDist(u.x,u.y,b);if(d<bd){bd=d;best=b}}
   if(best&&G.bricks[u.team]>0&&!(!best.alive&&blocked(best))){if(!best.alive){best.alive=true;best.hp=0}best.hp++;u.st.fix++;if(u.human&&u.st.fix%10===0)news(`${nm(u)} 벽을 ${u.st.fix}칸 고쳤어요!`,u.team);G.bricks[u.team]--;u.repT=1.0;fx('fix',best.x+best.w/2,best.y+best.h/2);sfx('fix',best.x+best.w/2,best.y+best.h/2)}else u.repT=.3}}
 }
 for(let i=0;i<units.length;i++){const a=units[i];if(a.dead>0)continue;for(let j=i+1;j<units.length;j++){const b=units[j];if(b.dead>0)continue;const dx=b.x-a.x,dy=b.y-a.y,d=hyp(dx,dy);if(d>0&&d<26){const p=(26-d)/2;a.x-=dx/d*p;a.y-=dy/d*p;b.x+=dx/d*p;b.y+=dy/d*p}}}
 for(const u of units)if(u.dead<=0)collide(u);
 const steps=Math.max(2,Math.ceil(dt*720/8));
 for(const p of G.projs){const by=units[p.o];for(let s=0;s<steps&&!p.dead;s++){const st=dt/steps;p.x+=p.vx*st;p.y+=p.vy*st;p.dist+=720*st;
  if(p.kind==='smoke'){if(p.dist>=p.max){G.smokes.push({x:p.x,y:p.y,r:140,t:6,team:p.team,by});sfx('boom',p.x,p.y);p.dead=true}continue}
  for(const u of units){if(u.team===p.team||u.dead>0||u.role!=='shd')continue;const dx=p.x-u.x,dy=p.y-u.y,d=hyp(dx,dy),sr=u.bigT>0?52:32;
   if(d<sr+6&&d>sr-14&&Math.abs(angDiff(Math.atan2(dy,dx),u.face))<(u.bigT>0?1.25:.75)){
    u.st.def++;sfx('def',p.x,p.y,u.id);if(u.human&&u.st.def%10===0)news(`${nm(u)} 돌을 ${u.st.def}개 막았어요!`,u.team);
    if(u.reflT>0&&p.kind==='stone'){p.vx=Math.cos(u.face)*720;p.vy=Math.sin(u.face)*720;p.team=u.team;p.o=u.id;p.dist=0;p.max=450;fx('spark',p.x,p.y,'#FAC775')}
    else{p.dead=true;fx('spark',p.x,p.y,'#fff');if(u.human)float(u.x,u.y-34,'막음!','#fff',u.id)}break}}
  if(p.dead)break;
  for(const u of units){if(u.team===p.team||u.dead>0)continue;if(hyp(p.x-u.x,p.y-u.y)<u.r+4){if(p.kind==='bomb')explode(p);else hitUnit(u,units[p.o],p.vx/720,p.vy/720);p.dead=true;break}}
  if(p.dead)break;
  for(const b of G.blocks){if(!b.alive||b.team===p.team)continue;if(p.x>b.x-3&&p.x<b.x+b.w+3&&p.y>b.y-3&&p.y<b.y+b.h+3){if(p.kind==='bomb')explode(p);else dmgBlock(b,1,units[p.o]);p.dead=true;break}}
  if(p.dead)break;
  for(const f of G.flags){if(f.team!==p.team&&hyp(p.x-f.x,p.y-f.y)<f.r){if(p.kind==='bomb')explode(p);else dmgFlag(f,1,units[p.o]);p.dead=true;break}}
  if(p.dead)break;
  if(p.dist>=p.max||p.x<0||p.y<0||p.x>W||p.y>H){if(p.kind==='bomb')explode(p);else fx('dust',p.x,p.y);p.dead=true}}}
 G.projs=G.projs.filter(p=>!p.dead);
 G.smokes.forEach(s=>s.t-=dt);G.smokes=G.smokes.filter(s=>s.t>0);
 G.fx.forEach(f=>f.t-=dt);G.fx=G.fx.filter(f=>f.t>0);
 G.floats.forEach(f=>{f.t-=dt;f.y-=30*dt});G.floats=G.floats.filter(f=>f.t>0);
 for(const s of G.supplies){if(!s.item){s.t-=dt;if(s.t<=0)s.item=['brick','reset','heal'][Math.floor(rnd()*3)];continue}
  for(const u of units){if(u.dead>0||hyp(u.x-s.x,u.y-s.y)>34)continue;if(s.item==='brick'){G.bricks[u.team]+=8;float(s.x,s.y-20,'벽돌 +8','#FAC775')}else if(s.item==='reset'){u.cds=[0,0];u.ammo=MAG;u.reloading=false;u.reload=0;float(s.x,s.y-20,'스킬 초기화','#C9C4F2')}else{u.hp=MAXHP;float(s.x,s.y-20,'체력 회복','#9FE1CB')}sfx('pick',s.x,s.y,u.id);s.item=null;s.t=25;break}}
 const c=[0,0];for(const u of units)if(u.dead<=0&&hyp(u.x-ZONE.x,u.y-ZONE.y)<ZONE.r)c[u.team]++;
 G.cap=clamp(G.cap+(c[0]-c[1])*5*dt,-100,100);
 const po=G.owner;if(G.cap>=100)G.owner=0;else if(G.cap<=-100)G.owner=1;else if((G.owner===0&&G.cap<0)||(G.owner===1&&G.cap>0))G.owner=-1;if(G.owner!==po&&G.owner>=0&&G.owner!==G.annOwner){G.annOwner=G.owner;news(`${TEAM[G.owner].name}이 중앙 거점을 점령했어요!`,G.owner)}
 if(G.owner>=0)G.capPts[G.owner]+=dt;
 if(G.practice){for(const f of G.flags)if(f.hp<=0)f.hp=f.max;return}
 for(const f of G.flags)if(f.hp<=0)return endMatch(1-f.team,TEAM[f.team].name+' 깃발이 쓰러졌어요!');
 if(G.time<=0){const s0=score(0),s1=score(1);endMatch(s0===s1?-1:s0>s1?0:1,`시간 종료! 점수 ${s0} 대 ${s1}`)}}
function score(t){return Math.floor(G.capPts[t])+G.destroyed[t]*3+G.flagDmg[t]*3}
function endMatch(w,why){G.over=true;G.result={w,why};sfx('end',W/2,H/2)}
function computeMVP(){const pick=(role,fn,label)=>{let best=null,bv=-1;for(const u of units){if(u.role!==role)continue;const v=fn(u.st);if(v>bv){bv=v;best=u}}return best?{role,name:best.name,team:best.team,human:best.human,val:bv,label}:null};
 return[pick('atk',s=>s.hit+s.blk*2+s.flag*3,'공격 점수'),pick('rep',s=>s.fix,'고친 벽'),pick('shd',s=>s.def,'막은 돌'),pick('sup',s=>s.ast,'도움')].filter(Boolean)}

/* ===== 노트북 서버 ===== */
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');
const PORT=+(process.env.PORT||process.argv[2]||3000),ADMIN_PIN=process.env.PIN||'2580';
const HTML=fs.readFileSync(path.join(__dirname,'public','index.html'));
const clients=new Set(),players=new Map();
let nextCid=1,state='lobby',matchTime=300,lastEnd=null,tick=0;
function urls(){if(process.env.RENDER_EXTERNAL_URL)return[process.env.RENDER_EXTERNAL_URL.replace(/\/$/,'')];if(process.env.PUBLIC_URL)return[process.env.PUBLIC_URL.replace(/\/$/,'')];const out=[];for(const a of Object.values(os.networkInterfaces()))for(const i of a||[])if(i.family==='IPv4'&&!i.internal)out.push(`http://${i.address}:${PORT}`);return out.length?out:[`http://localhost:${PORT}`]}
const srv=http.createServer((req,res)=>{const u=req.url.split('?')[0];if(u==='/healthz'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');return}
 if(u==='/'||u==='/tv'||u==='/host'||u==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(HTML)}else{res.writeHead(404);res.end('not found')}});
srv.on('upgrade',(req,sock)=>{const key=req.headers['sec-websocket-key'];if(!key){sock.destroy();return}
 const acc=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
 sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+acc+'\r\n\r\n');
 sock.setNoDelay(true);const c={sock,buf:Buffer.alloc(0),mode:'student',player:null};clients.add(c);
 sock.on('data',d=>{try{onData(c,d)}catch(e){console.error(e)}});sock.on('close',()=>drop(c));sock.on('error',()=>drop(c));
 send(c,{t:'hello',state,pin:!!ADMIN_PIN})});
function onData(c,d){c.buf=Buffer.concat([c.buf,d]);
 for(;;){const b=c.buf;if(b.length<2)return;const op=b[0]&15,masked=b[1]&128;let len=b[1]&127,off=2;
  if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);off=4}else if(len===127){if(b.length<10)return;len=Number(b.readBigUInt64BE(2));off=10}
  const mOff=off;if(masked)off+=4;if(len>1e6){c.sock.destroy();return}if(b.length<off+len)return;
  let p=Buffer.from(b.subarray(off,off+len));if(masked){for(let i=0;i<p.length;i++)p[i]^=b[mOff+(i&3)]}c.buf=b.subarray(off+len);
  if(op===8){drop(c);try{c.sock.end()}catch(_){}return}
  if(op===9){rawSend(c,p,10);continue}
  if(op===1){let m;try{m=JSON.parse(p.toString('utf8'))}catch(_){continue}onMsg(c,m)}}}
function rawSend(c,data,op=1){const p=Buffer.isBuffer(data)?data:Buffer.from(data);let h;
 if(p.length<126)h=Buffer.from([128|op,p.length]);else if(p.length<65536){h=Buffer.alloc(4);h[0]=128|op;h[1]=126;h.writeUInt16BE(p.length,2)}else{h=Buffer.alloc(10);h[0]=128|op;h[1]=127;h.writeBigUInt64BE(BigInt(p.length),2)}
 try{c.sock.write(Buffer.concat([h,p]))}catch(_){}}
function send(c,o){rawSend(c,typeof o==='string'?o:JSON.stringify(o))}
function broadcast(o){const s=typeof o==='string'?o:JSON.stringify(o);for(const c of clients)rawSend(c,s)}
function lobbyMsg(){return{t:'lobby',state,time:matchTime,urls:urls(),players:[...players.values()].map(p=>({cid:p.cid,name:p.name,role:p.role,team:p.team,on:!!p.c}))}}
function broadcastLobby(){broadcast(lobbyMsg())}
function teamCount(t){let n=0;for(const p of players.values())if(p.team===t)n++;return n}
function roleFree(t,role,except){let n=0;for(const p of players.values())if(p.team===t&&p.role===role&&p!==except)n++;return ROLES[role]&&n<ROLES[role].limit}
function fixRole(p){if(!roleFree(p.team,p.role,p))p.role=ROLE_KEYS.find(k=>roleFree(p.team,k,p))||p.role}
function unitOf(p){return G&&units.find(u=>u.human&&u.cid===p.cid)}
function initMsg(){return{t:'init',time:G.dur,roster:units.map(u=>[u.team,ROLE_KEYS.indexOf(u.role),u.human?1:0,u.name,u.cid])}}
function begin(){const teams=[[],[]];for(const p of players.values())teams[p.team].push({role:p.role,name:p.name,cid:p.cid});
 startMatch({teams,time:matchTime});state='playing';tick=0;lastEnd=null;broadcast(initMsg());broadcastLobby();console.log(`경기 시작! 학생 ${players.size}명 + 봇 ${30-players.size}명`)}
function attach(p){let u=unitOf(p);
 if(!u){u=units.find(x=>!x.human&&x.team===p.team&&x.role===p.role)||units.find(x=>!x.human&&x.team===p.team)||units.find(x=>!x.human);if(!u)return;
  u.human=true;u.name=p.name;u.cid=p.cid;u.input={mx:0,my:0,ch:false};p.role=u.role;p.team=u.team;broadcast({t:'roster',i:u.id,h:1,n:u.name,c:u.cid})}
 if(p.c)send(p.c,initMsg())}
function toBot(p){const u=unitOf(p);if(!u)return;u.human=false;u.cid=-1;u.name='봇';broadcast({t:'roster',i:u.id,h:0,n:u.name,c:-1})}
function onMsg(c,m){const p=c.player;
 switch(m.t){
 case'view':c.mode=['tv','teacher','student'].includes(m.mode)?m.mode:'student';send(c,lobbyMsg());if(state!=='lobby'&&G)send(c,initMsg());if(state==='ended'&&lastEnd)send(c,lastEnd);break;
 case'join':{const name=String(m.name||'').trim().slice(0,10)||'학생',tk=String(m.token||'').slice(0,60)||crypto.randomUUID();let q=players.get(tk);
  if(q){if(q.c&&q.c!==c)q.c.player=null;q.c=c;q.name=name;q.gone=0}
  else{if(players.size>=30){send(c,{t:'err',msg:'자리가 꽉 찼어요 (최대 30명)'});return}
   let team=teamCount(0)<=teamCount(1)?0:1;if(teamCount(team)>=15)team=1-team;
   q={token:tk,cid:nextCid++,name,role:ROLES[m.role]?m.role:'atk',team,c,gone:0};fixRole(q);players.set(tk,q)}
  c.player=q;c.mode='student';send(c,{t:'you',cid:q.cid,team:q.team,role:q.role,name:q.name});
  if(state==='playing')attach(q);else{const u=unitOf(q);if(u){u.name=q.name}}
  broadcastLobby();break}
 case'role':if(p&&state!=='playing'&&ROLES[m.role]&&roleFree(p.team,m.role,p)){p.role=m.role;broadcastLobby()}break;
 case'in':if(p&&state==='playing'){const u=unitOf(p);if(u)u.input={mx:+m.mx||0,my:+m.my||0,ch:!!m.ch}}break;
 case'sk':if(p&&state==='playing'){const u=unitOf(p);if(u)useSkill(u,m.i?1:0)}break;
 case'admin':
  if(c.mode!=='teacher')return;if(ADMIN_PIN&&m.pin!==ADMIN_PIN){send(c,{t:'err',msg:'선생님 비밀번호가 달라요. 새로고침 후 다시 입력해 주세요.'});return}
  if(m.cmd==='start'&&state!=='playing'){if([180,300,420].includes(+m.time))matchTime=+m.time;begin()}
  else if(m.cmd==='pause'&&state==='playing')G.paused=true;
  else if(m.cmd==='resume'&&state==='playing')G.paused=false;
  else if(m.cmd==='stop'&&state==='playing'){G.paused=false;const s0=score(0),s1=score(1);endMatch(s0===s1?-1:s0>s1?0:1,`선생님이 경기를 끝냈어요. 점수 ${s0} 대 ${s1}`)}
  else if(m.cmd==='lobby'){state='lobby';G=null;units=[];broadcastLobby()}
  else if(m.cmd==='time'&&[180,300,420].includes(+m.time)){matchTime=+m.time;broadcastLobby()}
  else if(m.cmd==='shuffle'&&state!=='playing'){const arr=[...players.values()].sort(()=>Math.random()-.5);arr.forEach((q,i)=>{q.team=i%2});arr.forEach(fixRole);broadcastLobby()}
  else if(m.cmd==='team'&&state!=='playing'){const q=[...players.values()].find(x=>x.cid===+m.cid);if(q&&teamCount(1-q.team)<15){q.team=1-q.team;fixRole(q);broadcastLobby()}}
  else if(m.cmd==='kick'){const q=[...players.values()].find(x=>x.cid===+m.cid);if(q){if(state==='playing')toBot(q);players.delete(q.token);if(q.c){send(q.c,{t:'err',msg:'선생님이 대기실에서 내보냈어요.',kick:1});q.c.player=null}broadcastLobby()}}
  break;}}
function drop(c){if(!clients.has(c))return;clients.delete(c);const p=c.player;if(p&&p.c===c){p.c=null;p.gone=Date.now();broadcastLobby()}}
setInterval(()=>{const now=Date.now();let ch=false;for(const p of [...players.values()]){if(!p.c&&p.gone&&now-p.gone>15000){if(state==='playing')toBot(p);players.delete(p.token);ch=true}}if(ch)broadcastLobby()},2000);
function r1(v){return Math.round(Math.max(0,v)*10)/10}
function flush(){const ev=G.ev;G.ev=[];
 const u=units.map(u=>[Math.round(u.x),Math.round(u.y),Math.round(u.face*100),u.hp,(u.dead>0?1:0)|(u.inForest?2:0)|(u.inv>0?4:0)|(u.bigT>0?8:0)|(u.reflT>0?16:0)|(u.armed?32:0)|(u.vis[0]?64:0)|(u.vis[1]?128:0),u.dead>0?Math.ceil(u.dead):0]);
 const b=G.blocks.map(b=>b.alive?Math.min(9,Math.max(1,b.hp*3+b.armor+1)):0).join('');
 const p=[];for(const q of G.projs)p.push(Math.round(q.x),Math.round(q.y),Math.round(Math.atan2(q.vy,q.vx)*100),['stone','bomb','smoke'].indexOf(q.kind)*2+q.team,Math.round(clamp(q.dist/q.max,0,1)*100));
 const bl=[];for(const q of G.projs)if(q.kind==='bomb'){const r=Math.max(0,q.max-q.dist);bl.push(Math.round(q.x+q.vx/720*r),Math.round(q.y+q.vy/720*r))}
 const common=JSON.stringify({t:'s',tm:Math.round(G.time*10)/10,cd:G.cd>0?Math.round(G.cd*10)/10:0,bl,pz:G.paused?1:0,sc:[score(0),score(1)],fl:[G.flags[0].hp,G.flags[1].hp],ow:G.owner,cp:Math.round(G.cap),br:G.bricks,bf:[G.buffT[0]>0?1:0,G.buffT[1]>0?1:0],
  u,b,p,sm:G.smokes.map(s=>[Math.round(s.x),Math.round(s.y),s.team,Math.round(s.t*10)]),sp:G.supplies.map(s=>s.item?s.item[0]:'-').join(''),ev});
 for(const c of clients){if(c.sock.writableLength>262144)continue;const q=c.player,un=q&&unitOf(q);
  if(un)rawSend(c,'{"my":'+JSON.stringify({i:un.id,c:[r1(un.cds[0]),r1(un.cds[1])],r:un.reload>0?1:0,m:un.ammo,rl:un.reloading?1:0,a:un.armed,st:un.st})+','+common.slice(1));else rawSend(c,common)}}
setInterval(()=>{if(state!=='playing'||!G)return;update(1/30);tick++;
 if(G.over){flush();state='ended';lastEnd={t:'end',res:G.result,mvp:computeMVP(),sc:[score(0),score(1)]};broadcast(lastEnd);broadcastLobby();console.log('경기 끝:',G.result.why);return}
 if(tick%2===0&&(!G.paused||tick%16===0))flush()},1000/30);
srv.listen(PORT,'0.0.0.0',()=>{const U=urls();
 console.log('\n  테크킹 운동회 새총 대전 서버가 켜졌어요!\n');
 console.log('  학생 태블릿 접속 주소:');U.forEach(u=>console.log('     '+u));
 console.log('\n  TV(큰 화면):   '+U[0]+'/tv');console.log('  관리자 페이지: '+U[0]+'/host  (비밀번호 사용 중)');
 console.log('\n  끄려면 이 창에서 Ctrl+C 를 누르세요.\n')});
