(function(){
const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
let threeP=null;const getThree=()=>threeP||(threeP=import(THREE_URL));
const P=Math.PI,s=Math.sin,pw=Math.pow;
const sm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

function rng(seed){return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};}
function canvasTex(T,w,h,draw,color){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;if(color)t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
function makeTex(T){
  const r=rng(7);
  return {
    dimple:canvasTex(T,512,512,(x,w,h)=>{x.fillStyle='#888';x.fillRect(0,0,w,h);for(let i=0;i<7000;i++){x.fillStyle='rgba(40,40,40,'+(0.15+r()*0.25)+')';x.beginPath();x.arc(r()*w,r()*h,0.8+r()*1.8,0,7);x.fill();}}),
    fuzz:canvasTex(T,256,256,(x,w,h)=>{const d=x.createImageData(w,h);for(let i=0;i<d.data.length;i+=4){const v=100+r()*110;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}x.putImageData(d,0,0);}),
    seeds:canvasTex(T,512,512,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#b80f1c');g.addColorStop(0.8,'#d81e2a');g.addColorStop(1,'#e8503a');x.fillStyle=g;x.fillRect(0,0,w,h);const cols=20,rows=12;for(let j=1;j<rows;j++)for(let i=0;i<cols;i++){const cx=(i+(j%2?0.5:0))/cols*w,cy=j/rows*h;x.fillStyle='rgba(90,0,10,0.55)';x.beginPath();x.ellipse(cx,cy,6,8,0,0,7);x.fill();x.fillStyle='#f3d672';x.beginPath();x.ellipse(cx,cy,2.6,4,0,0,7);x.fill();}},true),
    stripes:canvasTex(T,512,512,(x,w,h)=>{x.fillStyle='#a9d16e';x.fillRect(0,0,w,h);const n=14;for(let k=0;k<n;k++){for(let pass=0;pass<4;pass++){x.strokeStyle=pass?'rgba(38,82,28,0.5)':'#2c5a1f';x.lineWidth=pass?22+pass*4:20;x.beginPath();for(let y=0;y<=h;y+=8){const xx=(k+0.5)/n*w+Math.sin(y*0.04+k*1.7)*7+(r()-0.5)*(pass?6:2);y?x.lineTo(xx,y):x.moveTo(xx,y);}x.stroke();}}},true),
    net:canvasTex(T,512,512,(x,w,h)=>{x.fillStyle='#b9a466';x.fillRect(0,0,w,h);x.strokeStyle='#efe4c2';x.lineCap='round';for(let i=0;i<2600;i++){x.lineWidth=1+r()*1.6;const a=r()*P*2,l=6+r()*18,X=r()*w,Y=r()*h;x.beginPath();x.moveTo(X,Y);x.quadraticCurveTo(X+Math.cos(a+0.6)*l*0.6,Y+Math.sin(a+0.6)*l*0.6,X+Math.cos(a)*l,Y+Math.sin(a)*l);x.stroke();}},true)
  };
}
function fixSeam(g){g.computeVertexNormals();const p=g.attributes.position,n=g.attributes.normal,m={};for(let i=0;i<p.count;i++){const k=p.getX(i).toFixed(3)+','+p.getY(i).toFixed(3)+','+p.getZ(i).toFixed(3);(m[k]||(m[k]=[0,0,0,[]]));m[k][0]+=n.getX(i);m[k][1]+=n.getY(i);m[k][2]+=n.getZ(i);m[k][3].push(i);}for(const k in m){const v=m[k],l=Math.hypot(v[0],v[1],v[2])||1;v[3].forEach(i=>n.setXYZ(i,v[0]/l,v[1]/l,v[2]/l));}n.needsUpdate=true;return g;}
function lathe(T,f,h,seg=72,n=72){const pts=[];for(let i=0;i<=n;i++){const t=i/n;pts.push(new T.Vector2(Math.max(f(t),0),t*h));}const g=new T.LatheGeometry(pts,seg);g.translate(0,-h/2,0);return g;}
function each(g,fn){const p=g.attributes.position;for(let i=0;i<p.count;i++){const v=fn(p.getX(i),p.getY(i),p.getZ(i));p.setXYZ(i,v[0],v[1],v[2]);}p.needsUpdate=true;return g;}
const lobe=(g,n,a)=>each(g,(x,y,z)=>{const k=1+a*Math.cos(n*Math.atan2(z,x));return[x*k,y,z*k];});
const bend=(g,k)=>each(g,(x,y,z)=>[x+k*y*y,y,z]);
function vcol(T,g,fn){const p=g.attributes.position;g.computeBoundingBox();const b=g.boundingBox,c=[],col=new T.Color();for(let i=0;i<p.count;i++){const t=(p.getY(i)-b.min.y)/(b.max.y-b.min.y);col.set(fn(t));c.push(col.r,col.g,col.b);}g.setAttribute('color',new T.Float32BufferAttribute(c,3));return g;}
function mixC(T,a,b,t){return new T.Color(a).lerp(new T.Color(b),Math.min(1,Math.max(0,t))).getHex();}

function build(T,tx,name){
  const M=o=>new T.MeshPhysicalMaterial(Object.assign({roughness:0.5},o));
  const G=new T.Group();
  const add=(geo,mat,pos,rot)=>{const m=new T.Mesh(geo,mat);if(pos)m.position.set(...pos);if(rot){m.rotation.order='YZX';m.rotation.set(...rot);}G.add(m);return m;};
  const sph=(r,sx=1,sy=1,sz=1)=>new T.SphereGeometry(r,96,64).scale(sx,sy,sz);
  const stemM=M({color:0x5b4a2a,roughness:0.8});
  const leafM=M({color:0x3f8f36,roughness:0.5,clearcoat:0.3,side:T.DoubleSide});
  const stem=(y,len=0.25,r=0.03,tilt=0.2)=>add(new T.CylinderGeometry(r*0.8,r,len,12).translate(0,len/2,0),stemM,[0,y,0],[0,0,tilt]);
  const leaf=(y,len=0.45,ang=0.4)=>add(sph(0.5,len,0.02,len*0.42).translate(len*0.5,0,0),leafM,[0.02,y,0],[0.3,ang,-0.5]);
  const calyx=(y,n,len,wid,droop,mat)=>{for(let i=0;i<n;i++)add(sph(0.5,len,0.03,wid).translate(len*0.45,0,0),mat||leafM,[0,y,0],[0,i/n*P*2,-droop]);};
  const pile=(geo,mat,pts)=>pts.forEach(p=>add(geo,mat,[p[0],p[1],p[2]],[p[3],p[4],p[5]]));
  const PILE=[[0,0,0,0,0,0],[0.32,0,0.08,0.4,1,0.2],[-0.3,0,0.12,-0.3,2,-0.2],[0.12,0,-0.3,0.2,0.5,0.1],[-0.14,0,0.34,0.1,2.5,0.3],[0.05,0.18,0.05,0.8,1.3,0.6],[0.36,0,-0.24,0.3,0.2,-0.4],[-0.34,0,-0.2,0.5,1.8,0.2],[0.2,0.16,0.22,1.1,0.7,-0.6]];
  let lay=0;
  switch(name){
    case 'poppy seed':pile(sph(0.13,1.1,0.85,0.9),M({color:0x3d4352,roughness:0.6}),PILE);break;
    case 'sesame seed':pile(lathe(T,t=>0.14*pw(s(P*t),0.8)*(1-0.45*t),0.42).scale(1,1,0.4).rotateX(P/2),M({color:0xeee0bf,roughness:0.55,sheen:0.5}),PILE.slice(0,7));break;
    case 'lentil':pile(sph(0.2,1,0.38,1),M({color:0xd5843c,roughness:0.5,clearcoat:0.2}),PILE.slice(0,7));break;
    case 'blueberry':add(sph(0.5,1,0.86,1),M({color:0x2c3a6e,roughness:0.55,sheen:1,sheenColor:new T.Color(0x9aa8d8),sheenRoughness:0.6}));add(new T.TorusGeometry(0.09,0.035,12,5),M({color:0x1c2038,roughness:0.8}),[0,0.42,0],[P/2,0,0]);break;
    case 'kidney bean':{const g=sph(0.5,1.5,0.72,0.78);each(g,(x,y,z)=>[x,y-0.22*x*x,z]);add(fixSeam(g),M({color:0x7a1c24,roughness:0.28,clearcoat:0.9}));break;}
    case 'cherry':{add(sph(0.45,1,0.9,1),M({color:0x9a0c1c,roughness:0.2,clearcoat:1}));const c=new T.QuadraticBezierCurve3(new T.Vector3(0,0.3,0),new T.Vector3(0.1,0.9,0),new T.Vector3(0.38,1.2,0));add(new T.TubeGeometry(c,24,0.025,8),M({color:0x5d6b2a,roughness:0.6}));break;}
    case 'grape':add(sph(0.45,0.88,1,0.88),M({color:0x5e2650,roughness:0.35,clearcoat:0.4,sheen:0.8,sheenColor:new T.Color(0xb9a3c9)}));stem(0.42,0.12,0.025,0);break;
    case 'strawberry':{const g=lathe(T,t=>0.55*pw(t,0.55)*pw(s(P*(0.5+0.5*t)),0.35),1.15);add(g,M({map:tx.seeds,bumpMap:tx.seeds,bumpScale:1.5,roughness:0.35,clearcoat:0.5}));calyx(0.53,8,0.34,0.11,0.35);stem(0.53,0.16,0.035,0);break;}
    case 'fig':{const g=vcol(T,lathe(T,t=>0.55*pw(s(P*t),0.75)*(1-0.5*sm(0.45,1,t)),1.15),t=>mixC(T,0x5a2346,0x6f6a3a,sm(0.55,1,t)));add(g,M({vertexColors:true,roughness:0.5,sheen:0.6,sheenColor:new T.Color(0x9b7aa0)}));stem(0.55,0.14,0.04,0.1);break;}
    case 'lime':add(sph(0.5,1,0.94,0.94),M({color:0x5c9a2c,bumpMap:tx.dimple,bumpScale:1.2,roughness:0.35,clearcoat:0.6}));add(sph(0.06,1,0.6,1),M({color:0x7c8a3a}),[0,0.47,0]);break;
    case 'kiwi':add(sph(0.5,1,0.82,0.82),M({color:0x7f5f37,bumpMap:tx.fuzz,bumpScale:3,roughness:0.95,sheen:1,sheenColor:new T.Color(0xb59a6c),sheenRoughness:0.8}));break;
    case 'pea pod':{const g=lathe(T,t=>0.21*pw(s(P*t),0.45)*(1+0.14*Math.abs(s(P*t*5))),2).scale(1,1,0.72);bend(g,0.14);add(fixSeam(g),M({color:0x67a834,roughness:0.4,clearcoat:0.5}));lay=P/2;break;}
    case 'apple':{const g=lathe(T,t=>0.56*pw(s(P*t),0.6)*(1-0.12*t),1);lobe(g,5,0.02);vcol(T,g,t=>mixC(T,0xd6542c,0xa5121f,sm(0,0.6,t)));add(fixSeam(g),M({vertexColors:true,roughness:0.3,clearcoat:0.8}));stem(0.46,0.24,0.025,0.25);leaf(0.62,0.4,0.6);break;}
    case 'lemon':add(fixSeam(lathe(T,t=>0.48*pw(s(P*t),0.6),1.45)),M({color:0xf1c51a,bumpMap:tx.dimple,bumpScale:1.4,roughness:0.4,clearcoat:0.5}));lay=P/2;break;
    case 'orange':add(sph(0.5),M({color:0xef861a,bumpMap:tx.dimple,bumpScale:1.6,roughness:0.42,clearcoat:0.35}));add(sph(0.06,1,0.5,1),M({color:0x6d6a2a}),[0,0.49,0]);break;
    case 'avocado':add(fixSeam(lathe(T,t=>0.52*pw(s(P*t),0.6)*(1-0.32*sm(0.4,1,t)),1.4)),M({color:0x2c3a1c,bumpMap:tx.fuzz,bumpScale:4,roughness:0.75,clearcoat:0.2}));stem(0.68,0.08,0.04,0);break;
    case 'pear':{const g=vcol(T,lathe(T,t=>0.55*pw(s(P*t),0.55)*(1-0.5*sm(0.35,0.85,t)),1.5),t=>mixC(T,0xc9b638,0x98ad35,t));add(fixSeam(g),M({vertexColors:true,roughness:0.45,clearcoat:0.3,bumpMap:tx.dimple,bumpScale:0.4}));stem(0.72,0.28,0.028,0.35);break;}
    case 'bell pepper':{const g=lathe(T,t=>0.55*pw(s(P*t),0.35)*(1-0.15*t),1.15);lobe(g,4,0.09);add(fixSeam(g),M({color:0xd51a1a,roughness:0.15,clearcoat:1}));add(new T.CylinderGeometry(0.1,0.13,0.08,16),M({color:0x3c7a2a,roughness:0.5}),[0,0.56,0]);stem(0.58,0.22,0.05,0.3).material=M({color:0x4a7f2c,roughness:0.5});break;}
    case 'tomato':{const g=lathe(T,t=>0.56*pw(s(P*t),0.5),0.85);lobe(g,6,0.035);add(fixSeam(g),M({color:0xdf2a1c,roughness:0.2,clearcoat:1}));calyx(0.42,6,0.26,0.07,0.25,M({color:0x3f7f2c,roughness:0.6}));stem(0.42,0.1,0.025,0).material=M({color:0x3f7f2c});break;}
    case 'carrot':{const g=lathe(T,t=>0.25*pw(t,0.9)*pw(s(P*(0.5+0.5*t)),0.2)*(1+0.025*s(t*70)),2.2);vcol(T,g,t=>mixC(T,0xe0661a,0xf28a24,t));add(fixSeam(g),M({vertexColors:true,roughness:0.6}));const lm=M({color:0x4c9a34,roughness:0.6});for(let i=0;i<5;i++)add(new T.CylinderGeometry(0.012,0.02,0.6,6).translate(0,0.3,0),lm,[0,1.08,0],[0,i*1.25,(i-2)*0.18]);lay=-P/2+0.25;break;}
    case 'banana':{const g=lathe(T,t=>0.2*pw(s(P*t),0.45)*(t>0.94?0.7:1),2.3,7);bend(g,0.28);vcol(T,g,t=>t<0.03?0x4a3218:t>0.95?0x6b5a28:mixC(T,0xf3cf2a,0xb9c43a,sm(0.75,0.95,t)));add(fixSeam(g),M({vertexColors:true,roughness:0.45,clearcoat:0.3}));lay=P/2;break;}
    case 'cucumber':{const g=lathe(T,t=>0.27*pw(s(P*t),0.3),2.4);bend(g,0.05);add(fixSeam(g),M({color:0x2d5c22,bumpMap:tx.dimple,bumpScale:2,roughness:0.4,clearcoat:0.6}));lay=P/2;break;}
    case 'eggplant':{const g=lathe(T,t=>0.5*pw(s(P*t),0.55)*(1-0.48*sm(0.2,1,t)),2);bend(g,0.08);add(fixSeam(g),M({color:0x351434,roughness:0.15,clearcoat:1}));const cm=M({color:0x5a7a2e,roughness:0.6});calyx(0.92,5,0.32,0.14,1.1,cm);stem(0.95,0.3,0.05,0.2).material=cm;lay=1.15;break;}
    case 'napa cabbage':{const g=lathe(T,t=>0.5*pw(s(P*t),0.45)*(0.75+0.3*t),2);lobe(g,9,0.045);vcol(T,g,t=>t<0.55?mixC(T,0xf2efd6,0xe5edb5,t/0.55):mixC(T,0xe5edb5,0x8fbd5c,(t-0.55)/0.45));add(fixSeam(g),M({vertexColors:true,roughness:0.55,clearcoat:0.2,bumpMap:tx.fuzz,bumpScale:0.6}));lay=1.25;break;}
    case 'cantaloupe':add(sph(0.5,1,0.94,1),M({map:tx.net,bumpMap:tx.net,bumpScale:3,roughness:0.85}));break;
    case 'mini watermelon':add(sph(0.5,1,1.15,1),M({map:tx.stripes,roughness:0.3,clearcoat:0.7}));lay=P/2;break;
    default:return null;
  }
  G.rotation.z=lay;
  const wrap=new T.Group();wrap.add(G);
  const box=new T.Box3().setFromObject(wrap),size=box.getSize(new T.Vector3()),k=1.55/Math.max(size.x,size.y,size.z);
  wrap.scale.setScalar(k);const c=box.getCenter(new T.Vector3());wrap.position.set(-c.x*k,-box.min.y*k,-c.z*k);
  wrap.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const pivot=new T.Group();pivot.add(wrap);return pivot;
}

class FruitStage extends HTMLElement{
  static get observedAttributes(){return['fruit'];}
  constructor(){super();this._fruit=null;this.cache={};this.anims=[];}
  get fruit(){return this._fruit;}
  set fruit(v){v=v||'';if(v===this._fruit)return;this._fruit=v;this.swap();}
  attributeChangedCallback(n,o,v){if(n==='fruit')this.fruit=v;}
  connectedCallback(){
    this.style.display='block';this.style.width='100%';this.style.height='100%';this.style.position='relative';
    if(this.renderer){this.loop();return;}
    getThree().then(T=>{this.T=T;this.init();}).catch(e=>console.warn('3D load failed',e));
  }
  disconnectedCallback(){cancelAnimationFrame(this.raf);this.raf=0;if(this.ro)this.ro.disconnect();}
  init(){
    const T=this.T;
    const r=this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
    r.setPixelRatio(Math.min(devicePixelRatio,2));r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.05;
    r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;
    r.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';
    this.appendChild(r.domElement);
    const sc=this.scene=new T.Scene();
    const room=new T.Scene();room.add(new T.Mesh(new T.BoxGeometry(12,12,12),new T.MeshBasicMaterial({color:0x6a6670,side:T.BackSide})));
    const panel=(w,h,pos,int)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(int,int,int),side:T.DoubleSide}));m.position.set(...pos);m.lookAt(0,0,0);room.add(m);};
    panel(5,3,[-3,4,3],6);panel(3,6,[5,1,0],3);panel(6,2,[0,5.5,-3],3);panel(3,3,[0,-1,5],1.5);
    const pm=new T.PMREMGenerator(r);sc.environment=pm.fromScene(room,0.04).texture;sc.environmentIntensity=0.9;
    sc.add(new T.HemisphereLight(0xfff6ee,0xe8dce8,0.6));
    const key=new T.DirectionalLight(0xfff3e6,2.2);key.position.set(-2.5,5,3);key.castShadow=true;
    key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-2,right:2,top:2,bottom:-2,near:0.5,far:15});key.shadow.radius=6;key.shadow.bias=-0.0005;sc.add(key);
    const rim=new T.DirectionalLight(0xe9e4ff,1.2);rim.position.set(3,2.5,-3);sc.add(rim);
    const ground=new T.Mesh(new T.PlaneGeometry(12,12),new T.ShadowMaterial({opacity:0.16}));ground.rotation.x=-P/2;ground.receiveShadow=true;sc.add(ground);
    this.cam=new T.PerspectiveCamera(28,1,0.1,50);this.cam.position.set(0,1.5,5.4);this.cam.lookAt(0,0.72,0);
    this.tx=makeTex(T);
    this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(this);this.resize();
    this.swap();this.loop();
  }
  resize(){const w=this.clientWidth||1,h=this.clientHeight||1;this.renderer.setSize(w,h,false);this.cam.aspect=w/h;this.cam.updateProjectionMatrix();}
  get(name){if(!(name in this.cache))this.cache[name]=build(this.T,this.tx,name);return this.cache[name];}
  swap(){
    if(!this.scene)return;
    const now=performance.now();
    if(this.cur){const o=this.cur;this.anims=this.anims.filter(a=>a.obj!==o);this.anims.push({obj:o,from:o.scale.x,to:0,t0:now,d:200,ease:t=>t*t,done:()=>this.scene.remove(o)});}
    const n=this._fruit?this.get(this._fruit):null;this.cur=n;
    if(n){this.anims=this.anims.filter(a=>a.obj!==n);n.scale.setScalar(0.001);this.scene.add(n);this.anims.push({obj:n,from:0.55,to:1,t0:now+90,d:460,ease:t=>1+2.2*pw(t-1,3)+1.2*pw(t-1,2)});}
  }
  loop(){
    if(this.raf)return;
    const tick=()=>{
      this.raf=requestAnimationFrame(tick);
      const now=performance.now();
      this.anims=this.anims.filter(a=>{const t=Math.min(1,Math.max(0,(now-a.t0)/a.d));if(now<a.t0)return true;a.obj.scale.setScalar(Math.max(0.001,a.from+(a.to-a.from)*a.ease(t)));if(t>=1){a.done&&a.done();return false;}return true;});
      if(this.cur){this.cur.rotation.y=now*0.00035;this.cur.position.y=0.03*Math.sin(now*0.0018)+0.03;}
      this.renderer.render(this.scene,this.cam);
    };tick();
  }
}
if(!customElements.get('fruit-stage'))customElements.define('fruit-stage',FruitStage);
})();
