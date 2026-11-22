import * as THREE from 'three';
import {createArchiveLighting} from './rhine/archive-lighting';
import {idleWave, smooth} from './rhine/motion';
// RhineLabUI's studio lighting and quiet archive motion are retained.
// The cassette faces and layout are redesigned around the actual portfolio.
export function createScene(host,projects,asset,openProject,initialReduced){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor(0x000000,0);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
 host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();createArchiveLighting(renderer,scene,'refined');
 const camera=new THREE.PerspectiveCamera(32,1,.1,100);camera.position.set(8,10,13);camera.lookAt(0,0,0);
 const group=new THREE.Group();scene.add(group);group.rotation.y=-.13;
 const loader=new THREE.TextureLoader(),raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(4,4);
 let reduced=initialReduced,visible=true,inView=true,hover=-1,time=0,down=null,last=performance.now();
 const cards=[]; const picks=[0,5,3,8,2,4,7,6,11];
 const baseMat=new THREE.MeshPhysicalMaterial({color:0xe5e8df,metalness:.1,roughness:.3,transparent:true,opacity:.72,clearcoat:1,side:THREE.DoubleSide});
 const edgeMat=new THREE.LineBasicMaterial({color:0xa1ad91,transparent:true,opacity:.55});
 const geometries={base:new THREE.BoxGeometry(2.28,.14,3.15),face:new THREE.PlaneGeometry(1.87,2.63)};
 picks.forEach((pi,i)=>{
  const p=projects[pi],g=new THREE.Group(),col=i%3,row=Math.floor(i/3);
  g.position.set((col-1)*2.75,0,(row-1)*3.65);g.userData={id:p.id,index:i};
  const base=new THREE.Mesh(geometries.base,baseMat);g.add(base);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometries.base),edgeMat);g.add(edges);
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(2.08,2.95),new THREE.MeshBasicMaterial({color:0xf3f3e9}));plate.rotation.x=-Math.PI/2;plate.position.y=.08;g.add(plate);
  loader.load(asset(p.cover),texture=>{
   texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   const ratio=texture.image.width/texture.image.height,w=Math.min(1.85,2.61*ratio),h=w/ratio;
   const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
   face.rotation.x=-Math.PI/2;face.position.y=.09;g.add(face);
  });
  const cover=new THREE.Mesh(new THREE.BoxGeometry(2.22,.025,3.07),new THREE.MeshPhysicalMaterial({color:0xe5efd7,roughness:.09,metalness:.05,transparent:true,opacity:.12,clearcoat:1,depthWrite:false}));cover.position.y=.15;g.add(cover);
  const tab=new THREE.Mesh(new THREE.BoxGeometry(.3,.04,.12),new THREE.MeshStandardMaterial({color:pi===0?0xa87540:0xabb598,roughness:.4}));tab.position.set(.72,.14,-1.49);g.add(tab);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=52;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#555f4a';ctx.font='22px monospace';ctx.fillText(`ZHY / ${String(pi+1).padStart(2,'0')}   DESIGN ARCHIVE`,12,34);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(1.82,.18),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));label.rotation.x=-Math.PI/2;label.position.set(0,.105,1.42);g.add(label);
  for(const x of [-.99,.99])for(const z of [-1.39,1.39]){const screw=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.035,8),new THREE.MeshStandardMaterial({color:0x919a86,metalness:.7,roughness:.3}));screw.position.set(x,.11,z);g.add(screw)}
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d');const grad=sc.createRadialGradient(64,64,10,64,64,64);grad.addColorStop(0,'rgba(60,70,50,.24)');grad.addColorStop(1,'rgba(60,70,50,0)');sc.fillStyle=grad;sc.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.8,4.8),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(g.position.x+.35,-.5,g.position.z+.4);group.add(shadow);
  cards.push(g);group.add(g);
 });
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=w/h<1.1?40:32;camera.updateProjectionMatrix()}
 new ResizeObserver(resize).observe(host);resize();
 host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1)});
 host.addEventListener('pointerleave',()=>{mouse.set(4,4);hover=-1});
 host.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
 host.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<8&&hover>=0)openProject(cards[hover].userData.id);down=null});
 const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting});observer.observe(host);
 function render(now){requestAnimationFrame(render);const dt=Math.min((now-last)/1000,.05);last=now;if(!visible||!inView||document.hidden)return;if(!reduced)time+=dt;
  raycaster.setFromCamera(mouse,camera);const hits=raycaster.intersectObjects(cards,true);hover=-1;if(hits.length){let node=hits[0].object;while(node&&node.userData.index===undefined)node=node.parent;if(node)hover=node.userData.index}
  host.style.cursor=hover>=0?'pointer':'default';
  cards.forEach((g,i)=>{const target=i===hover?.48:0;g.position.y=THREE.MathUtils.lerp(g.position.y,target+(reduced?0:idleWave(Math.floor(i/3),i%3,time)*.6),reduced?1:dt*6);});
  if(!reduced){group.rotation.y=THREE.MathUtils.lerp(group.rotation.y,-.13+(Math.abs(mouse.x)<1?mouse.x*.025:0),dt*2)}
  renderer.render(scene,camera);
 }
 requestAnimationFrame(render);host.classList.add('scene-ready');
 return {setReduced(v){reduced=v},setVisible(v){visible=v}};
}
