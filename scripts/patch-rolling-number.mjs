import { readFile, writeFile, readdir } from "node:fs/promises";

const dir = "node_modules/@kitlangton/rolling-number/dist";

const prevLeftOriginal =
  "this.previousLeft=this.enhanced&&!this.reset?this.measurement.getBoundingClientRect().left:void 0";
const prevLeftPatched =
  'this.previousLeft=this.enhanced&&!this.reset?(this.host.ownerDocument.documentElement.dataset.forcedLandscape==="true"?this.measurement.getBoundingClientRect().top:this.measurement.getBoundingClientRect().left):void 0';

const measureUnpatched =
  'let s=e.width/i,o=e.height/r,h=parseFloat(n.getPropertyValue("--rn-blur"));this.blurIntensity=Number.isFinite(h)?Math.max(0,h):1,this.sizes.set(this.measurement,{width:i,height:r});let c=new Map;for(let[f,y]of this.measures){let M=y.getBoundingClientRect(),S={width:M.width/s,height:M.height/o};this.sizes.set(y,S),c.set(f,{...S,x:(M.left-e.left)/s,y:(M.top-e.top)/o})}let m=this.previousLeft===void 0?0:(this.previousLeft-e.left)/s';
const measureV1 =
  'let s=e.width/i,o=e.height/r,h=parseFloat(n.getPropertyValue("--rn-blur"));this.blurIntensity=Number.isFinite(h)?Math.max(0,h):1,this.sizes.set(this.measurement,{width:i,height:r});let c=new Map;for(let[f,y]of this.measures){let M=y.getBoundingClientRect(),S={width:parseFloat(t.getComputedStyle(y).width),height:parseFloat(t.getComputedStyle(y).height)};this.sizes.set(y,S),c.set(f,{...S,x:(M.left-e.left)/s,y:(M.top-e.top)/o})}let m=this.previousLeft===void 0?0:(this.previousLeft-e.left)/s';
const measureV2 =
  'let R=t.document.documentElement.dataset.forcedLandscape==="true",s=(R?e.height:e.width)/i,o=(R?e.width:e.height)/r,h=parseFloat(n.getPropertyValue("--rn-blur"));this.blurIntensity=Number.isFinite(h)?Math.max(0,h):1,this.sizes.set(this.measurement,{width:i,height:r});let c=new Map;for(let[f,y]of this.measures){let M=y.getBoundingClientRect(),S={width:parseFloat(t.getComputedStyle(y).width),height:parseFloat(t.getComputedStyle(y).height)};this.sizes.set(y,S),c.set(f,{...S,x:R?(M.top-e.top)/s:(M.left-e.left)/s,y:R?(e.right-M.right)/o:(M.top-e.top)/o})}let m=this.previousLeft===void 0?0:(R?this.previousLeft-e.top:this.previousLeft-e.left)/s';

let found = false;
for (const file of await readdir(dir)) {
  if (!file.endsWith(".js")) continue;
  const path = `${dir}/${file}`;
  let source = await readFile(path, "utf8");
  let changed = false;

  if (source.includes(prevLeftOriginal)) {
    source = source.replace(prevLeftOriginal, prevLeftPatched);
    changed = true;
  }
  if (source.includes(measureV2)) {
    found = true;
  } else if (source.includes(measureV1)) {
    source = source.replace(measureV1, measureV2);
    found = true;
    changed = true;
  } else if (source.includes(measureUnpatched)) {
    source = source.replace(measureUnpatched, measureV2);
    found = true;
    changed = true;
  }
  if (changed) {
    await writeFile(path, source);
    console.log("Patched rolling-number local glyph measurement (HUD + 90deg forced landscape).");
  }
}
if (!found) {
  throw Error(
    "Rolling Number measurement patch no longer matches. Review the dependency before upgrading.",
  );
}
