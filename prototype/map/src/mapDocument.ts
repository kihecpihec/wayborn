import { pixelRendererSource } from "./pixelRenderer";
import { tileEngineSource } from "./tileEngine";

const style = `
html,body,#map{height:100%;margin:0;background:#e4eadc} .leaflet-container{font-family:system-ui,sans-serif}.leaflet-control-attribution{font-size:11px!important}.hero{width:28px;height:35px;filter:drop-shadow(0 2px 2px rgba(20,28,48,.3))}.halo{background:#ffcc4355;border:2px solid #eeb839;border-radius:50%}.leaflet-control-zoom{border:1px solid rgba(20,28,48,.1)!important;box-shadow:none!important;border-radius:10px!important;overflow:hidden}.leaflet-control-zoom a{color:#141c30!important;background:#fcfbf8!important}.leaflet-control-zoom a:hover{background:#f4f2ec!important}.leaflet-bottom.leaflet-left{top:110px;bottom:auto}.leaflet-bottom.leaflet-right{bottom:12px}#error{position:absolute;top:45%;left:10%;right:10%;z-index:1000;background:#fcfbf8;padding:16px;border:1px solid rgba(20,28,48,.1);border-radius:12px;color:#141c30;font:14px system-ui;display:none}
.pixel-tile{image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:none}
#pixel-status{position:absolute;left:12px;top:190px;z-index:1000;display:none;max-width:60%;background:#fcfbf8;color:#141c30;border:1px solid rgba(20,28,48,.1);border-radius:8px;padding:8px 12px;font:500 11px/1.4 system-ui,sans-serif;font-variant-numeric:tabular-nums;pointer-events:none}
`;

/*
 * Early boot (before Leaflet loads): start the tile worker so the TileJSON, the
 * IndexedDB open and the worker's own startup overlap the Leaflet download.
 * The worker is a Blob made from the renderer + engine scripts of this page;
 * if Workers are unavailable (or fail to start) the same engine runs on the
 * main thread.
 */
const backendBoot = String.raw`
(function(){
const GLUE="var eng=WaybornEngine.create();self.onmessage=function(e){var m=e.data;(m.op==='detail'?eng.detail(m.cx,m.cy):eng.draw(m)).then(function(r){self.postMessage({t:'ok',id:m.id,r:r},r.data?[r.data.buffer]:[])},function(err){self.postMessage({t:'err',id:m.id,msg:String(err&&err.message||err)})})};self.postMessage({t:'ready'});";
const pending=new Map();let seq=0,worker=null,local=null,ready=false,timer=0;
function useLocal(){
  if(local)return;clearTimeout(timer);local=WaybornEngine.create();
  if(worker){try{worker.terminate()}catch(e){}worker=null}
  const p=[...pending.values()];pending.clear();p.forEach(j=>(j.req.op==='detail'?local.detail(j.req.cx,j.req.cy):local.draw(j.req)).then(j.res,j.rej));
}
try{
  const src=document.getElementById('wb-renderer').textContent+'\n'+document.getElementById('wb-engine').textContent+'\n'+GLUE;
  worker=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));
  worker.onmessage=e=>{const m=e.data;if(m.t==='ready'){ready=true;clearTimeout(timer);return}
    const j=pending.get(m.id);if(!j)return;pending.delete(m.id);if(m.t==='ok')j.res(m.r);else j.rej(new Error(m.msg))};
  worker.onerror=()=>useLocal();
  timer=setTimeout(()=>{if(!ready)useLocal()},4000);
}catch(e){useLocal()}
function call(msg){
  if(local)return msg.op==='detail'?local.detail(msg.cx,msg.cy):local.draw(msg);
  return new Promise((res,rej)=>{const id=++seq;pending.set(id,{req:msg,res,rej});worker.postMessage(Object.assign({id},msg))});
}
window.wbBackend={
  mode:()=>local?'main thread':'worker',
  draw(req){return call({op:'draw',z:req.z,x:req.x,y:req.y,pass:req.pass})},
  detail(cx,cy){return call({op:'detail',cx,cy})}
};
})();
`;

/*
 * Pixel mode controller. Leaflet keeps panning/zooming and the hero marker; an
 * L.GridLayer of 256 px canvases (one per display tile, on Leaflet's own tile
 * grid) shows WaybornPixel output above the raster tiles, which stay underneath
 * until a pixel tile arrives. Tiles are drawn by the worker; finished tiles live
 * in a memory LRU. Panning only creates the newly visible tiles.
 */
const pixelController = String.raw`
const S=3,TS=256,MINZ=16,MAXZ=19,CAP=300,TWO_PASS=false,FLIGHT=4;
map.createPane('pixel').style.zIndex=350;
const statusEl=document.getElementById('pixel-status');
function status(t){statusEl.textContent=t||'';statusEl.style.display=t?'block':'none'}
const perf=window.wbPerf={firstGround:null,firstFull:null,tiles:[],fails:0,backend:'',detail:[],detailFails:0};
const lru=new Map();            // 'z/x/y' -> {pass:1|2, cv, aw, ah, ax0, ay0}
const live=new Map();           // 'z/x/y' -> Set of tile canvases on screen
const jobs=new Map();           // 'z/x/y'+pass -> job
const msAcc=new Map();          // 'z/x/y' -> render ms so far (ground + objects)
const stats={drawn:0,hits:0,sumMs:0,retries:0,cells:0};
const dJobs=new Map(),dReady=new Set();let dFlight=0;const DFLIGHT=2;
let pixelOn=false,inflight=0,ahead=[],pathPts=[],planTimer=0,statTimer=0;
function lruGet(k){const e=lru.get(k);if(e){lru.delete(k);lru.set(k,e)}return e}
function lruSet(k,e){lru.delete(k);lru.set(k,e);while(lru.size>CAP)lru.delete(lru.keys().next().value)}
function paint(c,e){const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,TS,TS);x.drawImage(e.cv,S*e.ax0-TS*c._x,S*e.ay0-TS*c._y,e.aw*S,e.ah*S);if(c._done){const d=c._done;c._done=null;d(null,c)}}
function showStatus(){statTimer=0;
  if(!pixelOn){status('');return}
  if(map.getZoom()<MINZ){status('Overview map · zoom in for pixel detail');return}
  const n=stats.drawn;
  if(!n&&stats.retries){status('Pixel map unavailable · showing standard map · retrying');return}
  status(n ? '' : 'Loading pixel map · standard map remains available')}

function soonStatus(){if(!statTimer)statTimer=setTimeout(showStatus,150)}

const PixelGrid=L.GridLayer.extend({
  createTile(coords,done){
    const c=document.createElement('canvas');c.width=c.height=TS;c.className='pixel-tile';
    const key=coords.z+'/'+coords.x+'/'+coords.y;c._k=key;c._x=coords.x;c._y=coords.y;c._done=done;
    let set=live.get(key);if(!set)live.set(key,set=new Set());set.add(c);
    const e=lruGet(key);
    if(e){setTimeout(()=>paint(c,e),0);if(e.pass===2){stats.hits++;soonStatus()}}
    needDetail(cellsOf(coords.z,coords.x,coords.y),0);
    want(coords.z,coords.x,coords.y,true,0);
    return c;
  }
});
const pixelGrid=new PixelGrid({pane:'pixel',tileSize:TS,minZoom:MINZ,maxZoom:MAXZ,keepBuffer:1,updateWhenIdle:false,
  attribution:'&copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> · <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>'});
pixelGrid.on('tileunload',e=>{const c=e.tile,set=live.get(c._k);if(set){set.delete(c);if(!set.size)live.delete(c._k)}});

function targetZoom(){return map._animatingZoom&&map._animateToZoom!==undefined?map._animateToZoom:map.getZoom()}
function visible(){const z=map.getZoom(),b=map.getPixelBounds();return{z,x0:Math.floor(b.min.x/TS),x1:Math.floor((b.max.x-1)/TS),y0:Math.floor(b.min.y/TS),y1:Math.floor((b.max.y-1)/TS)}}
function inRange(j){const v=visible();if(j.z!==v.z&&j.z!==targetZoom())return false;if(j.z!==v.z)return true;
  if(j.x>=v.x0-2&&j.x<=v.x1+2&&j.y>=v.y0-2&&j.y<=v.y1+2)return true;
  return ahead.some(a=>a[0]===j.x&&a[1]===j.y)}

/* A tile is wanted at priority 0 (visible, ground), 1 (visible, objects) or 2 (prefetch). Never aborted by panning. */
function want(z,x,y,full,prio,redo){
  const key=z+'/'+x+'/'+y,e=lru.get(key);
  if(!redo&&e&&(e.pass===2||(!full&&e.pass>=1)))return;
  const pass=(!e&&TWO_PASS&&prio<2)?'g':'f',jk=key+pass,old=jobs.get(jk);
  if(old){if(prio<old.prio)old.prio=prio;return}
  jobs.set(jk,{jk,key,z,x,y,pass,prio,tries:0,at:0,running:false});
  pump();
}
function pump(){
  if(!pixelOn)return;
  while(inflight<FLIGHT){
    let best=null;const t=Date.now();
    for(const j of jobs.values()){if(j.running)continue;if(!inRange(j)){jobs.delete(j.jk);continue}if(j.at>t)continue;if(!best||j.prio<best.prio)best=j}
    if(!best)break;run(best);
  }
}
async function run(j){
  j.running=true;inflight++;
  try{const r=await wbBackend.draw({z:j.z,x:j.x,y:j.y,pass:j.pass});done(j,r);if(jobs.get(j.jk)===j)jobs.delete(j.jk)}
  catch(err){
    j.running=false;j.tries++;perf.fails++;stats.retries++;
    j.at=Date.now()+Math.min(10000,400*Math.pow(2,j.tries));setTimeout(pump,j.at-Date.now()+20);
    const set=live.get(j.key);if(set)set.forEach(c=>{if(c._done){const d=c._done;c._done=null;d(err,c)}});   // raster tile stays visible; the job keeps retrying
    soonStatus();
  }finally{inflight--;pump()}
}
function done(j,r){
  const cv=document.createElement('canvas');cv.width=r.aw;cv.height=r.ah;
  cv.getContext('2d').putImageData(new ImageData(r.data instanceof Uint8ClampedArray?r.data:new Uint8ClampedArray(r.data),r.aw,r.ah),0,0);
  const e={pass:j.pass==='g'?1:2,cv,aw:r.aw,ah:r.ah,ax0:r.ax0,ay0:r.ay0,det:!!r.detail},prev=lru.get(j.key);
  if(!prev||prev.pass<=e.pass||(e.det&&!prev.det))lruSet(j.key,e);
  const acc=(msAcc.get(j.key)||0)+r.ms;msAcc.set(j.key,acc);if(msAcc.size>1000)msAcc.delete(msAcc.keys().next().value);
  perf.tiles.push({k:j.key,pass:j.pass,ms:r.ms,at:performance.now()});
  const now=performance.now();if(perf.firstGround===null)perf.firstGround=now;if(e.pass===2&&perf.firstFull===null)perf.firstFull=now;
  if(e.pass===2){stats.drawn++;stats.sumMs+=acc;msAcc.delete(j.key)}
  const set=live.get(j.key);if(set)set.forEach(c=>paint(c,e));
  if(j.pass==='g'&&inRange(j))want(j.z,j.x,j.y,true,1);
  if(!r.detail&&r.missing&&r.missing.length){
    if(r.missing.every(c=>dReady.has(c[0]+'/'+c[1]))){r.missing.forEach(c=>dReady.delete(c[0]+'/'+c[1]));}   // the engine lost a cell it had: fetch again
    if(j.prio<2)needDetail(r.missing,0);   // the prefetch ring only draws what is on hand; its detail is fetched when it scrolls into view
  }
  soonStatus();
}

/* Detail cells (z16 tiles of OSM trees, small paths, land use): fetched in the background, at most 2 at a time,
   retried with backoff, never blocking a tile. When a cell lands the tiles it touches are redrawn. */
function cellsOf(z,x,y){return WaybornPixel.sourceTiles(z,WaybornPixel.tileRect(x,y),WaybornPixel.DETAIL_Z)}
function needDetail(cells,prio){
  cells.forEach(c=>{const k=c[0]+'/'+c[1];if(dReady.has(k))return;const j=dJobs.get(k);if(j){if(prio<j.prio)j.prio=prio;return}dJobs.set(k,{k,x:c[0],y:c[1],prio,tries:0,at:0,running:false})});
  dpump();
}
function dpump(){
  if(!pixelOn)return;
  while(dFlight<DFLIGHT){
    let best=null;const t=Date.now();
    for(const j of dJobs.values()){if(j.running||j.at>t)continue;if(!best||j.prio<best.prio)best=j}
    if(!best)break;drun(best);
  }
}
async function drun(j){
  j.running=true;dFlight++;const t0=performance.now();
  try{await wbBackend.detail(j.x,j.y);dJobs.delete(j.k);dReady.add(j.k);perf.detail.push({k:j.k,ms:performance.now()-t0,at:performance.now()});stats.cells++;refreshDetail()}
  catch(err){j.running=false;j.tries++;perf.detailFails++;j.at=Date.now()+Math.min(60000,4000*Math.pow(2,j.tries-1));setTimeout(dpump,j.at-Date.now()+20)}
  finally{dFlight--;dpump();soonStatus()}
}
function refreshDetail(){
  for(const [key,e] of [...lru]){
    if(e.det)continue;
    const p=key.split('/').map(Number),cells=cellsOf(p[0],p[1],p[2]);
    if(!cells.every(c=>dReady.has(c[0]+'/'+c[1])))continue;
    if(live.has(key))want(p[0],p[1],p[2],true,0,true);else lru.delete(key);
  }
}

/* Prefetch one ring beyond the view, plus 3 tiles ahead along the walking direction of the last GPS fixes. */
function plan(){
  planTimer=0;if(!pixelOn||map.getZoom()<MINZ)return;
  const v=visible(),n=pathPts.length;ahead=[];
  if(n>=2){
    const a=map.project(pathPts[Math.max(0,n-4)],v.z),b=map.project(pathPts[n-1],v.z),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    if(len>8)for(let k=1;k<=3;k++){const t=[Math.floor((b.x+dx/len*TS*k)/TS),Math.floor((b.y+dy/len*TS*k)/TS)];if(!ahead.some(q=>q[0]===t[0]&&q[1]===t[1]))ahead.push(t)}
  }
  for(let y=v.y0;y<=v.y1;y++)for(let x=v.x0;x<=v.x1;x++)if(live.has(v.z+'/'+x+'/'+y))want(v.z,x,y,true,0);   // a job dropped mid-zoom-animation is asked again
  for(let y=v.y0-1;y<=v.y1+1;y++)for(let x=v.x0-1;x<=v.x1+1;x++)if(x<v.x0||x>v.x1||y<v.y0||y>v.y1)want(v.z,x,y,true,2);
  ahead.forEach(t=>{want(v.z,t[0],t[1],true,2);needDetail(cellsOf(v.z,t[0],t[1]),1)});
}
function soonPlan(){if(!planTimer)planTimer=setTimeout(plan,120)}

function setPixel(on){on=!!on;if(on===pixelOn)return;pixelOn=on;
  if(on){pixelGrid.addTo(map);showStatus();soonPlan();pump();dpump()}
  else{map.removeLayer(pixelGrid);jobs.clear();ahead=[];status('')}}
map.on('moveend',soonPlan);
map.on('zoomend',()=>{showStatus();soonPlan()});
`;

export const mapDocument = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>${style}</style></head><body><div id="map"></div><div id="pixel-status"></div><div id="error">Map could not load. Check your internet connection and reload.</div><script id="wb-renderer">${pixelRendererSource}</script><script id="wb-engine">${tileEngineSource}</script><script>${backendBoot}</script><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
if(!window.L){document.getElementById('error').style.display='block'}else{
const map=L.map('map',{zoomControl:false}).setView([46.0514,14.506],17);
map.attributionControl.setPrefix(false);
L.control.zoom({position:'bottomleft'}).addTo(map);
const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'}).addTo(map);
let failures=0; tiles.on('tileerror',()=>{if(++failures>5)document.getElementById('error').style.display='block'});tiles.on('tileload',()=>{failures=0;document.getElementById('error').style.display='none'});
${pixelController}
window.wbPerf.backend=wbBackend.mode();setPixel(true);
const icon=L.divIcon({className:'',iconSize:[28,35],iconAnchor:[14,30],html:'<svg class="hero" viewBox="0 0 16 20" shape-rendering="crispEdges"><path fill="#182641" d="M4 0h8v2h2v9h-2v2h2v5h-3v2H9v-3H7v3H4v-2H2v-5h2v-2H2V2h2z"/><path fill="#ffcc43" d="M4 2h8v3H4z"/><path fill="#f6d69a" d="M4 5h8v6H4z"/><path fill="#182641" d="M5 6h1v2H5zm5 0h1v2h-1z"/><path fill="#65cba3" d="M4 12h8v4H4z"/><path fill="#ffcc43" d="M6 14h4v2H6z"/></svg>'});
const halo=L.circleMarker([46.0514,14.506],{radius:25,color:'#e2ac28',weight:2,fillColor:'#ffcc43',fillOpacity:.2});
const marker=L.marker([46.0514,14.506],{icon});
const route=L.polyline([],{color:'#248a65',weight:5,dashArray:'2 10',lineCap:'square'}).addTo(map);
let following=true,last=null,nonce=-1;map.on('dragstart',()=>{following=false});
function update(data){if(!data||data.type!=='wayborn-location')return;
setPixel(data.pixel);
const recentered=data.recenter!==nonce;
if(recentered){following=true;nonce=data.recenter}
const moved=data.point&&(!last||last[0]!==data.point.latitude||last[1]!==data.point.longitude);
if(data.point){last=[data.point.latitude,data.point.longitude];if(!map.hasLayer(marker)){halo.addTo(map);marker.addTo(map)}marker.setLatLng(last);halo.setLatLng(last);if(following&&(moved||recentered))map.panTo(last,{animate:true})}else{map.removeLayer(marker);map.removeLayer(halo)}
pathPts=data.path.map(p=>[p.latitude,p.longitude]);route.setLatLngs(pathPts);if(pixelOn)soonPlan();}
window.updateWayborn=update;window.addEventListener('message',e=>{try{update(typeof e.data==='string'?JSON.parse(e.data):e.data)}catch{}});
window.addEventListener('resize',()=>map.invalidateSize());
}
</script></body></html>`;
