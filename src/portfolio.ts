import { assetUrl } from './asset-url';
import { escapeHtml } from './html';
import type { ArchiveRecord } from './data';

export function portfolioOverview(r: ArchiveRecord) {
 const lead=r.category==='毕业设计'?'<div class="portfolio-brief"><b>项目负责人 · 张恒瑀</b><span>目标用户：设计行业从事人员</span><span>宣传先进工具的设计增效，鼓励学习并掌握先进工具。</span></div>':'';
 const intro=`<div class="panel-label">PROJECT OVERVIEW / 项目概述</div><p>${escapeHtml(r.abstract)}</p>${lead}`;
 const controls=`<div class="portfolio-links">${r.video?`<a href="${escapeHtml(r.video)}" target="_blank" rel="noopener">▷ 观看完整视频</a>`:''}<a href="${assetUrl('portfolio.pdf')}" target="_blank" rel="noopener">完整作品集 PDF</a>${r.images.length?'<button data-tab="history">查看作品图集</button>':'<a href="mailto:3104221252@qq.com">3104221252@qq.com</a>'}</div>`;
 return intro+controls+(r.images.length?`<div class="portfolio-preview">${r.images.slice(0,2).map((im,i)=>`<button data-art="${i}" aria-label="放大${escapeHtml(im.caption)}"><img src="${assetUrl(im.src)}" alt="${escapeHtml(im.caption)}"/><span>${escapeHtml(r.video?'扫码观看完整视频':im.caption)} <b>＋</b></span></button>`).join('')}</div>`:'<p>江苏师范大学科文学院 / 视觉传达设计<br>求职方向：平面视觉设计 / 设计师助理<br>期待进一步交流。</p>');
}
export function portfolioGallery(r: ArchiveRecord) {
 if(!r.images.length)return `<div class="panel-label">CONTACT / 联系方式</div><p>张恒瑀<br>江苏师范大学科文学院 / 视觉传达设计</p><div class="portfolio-links"><a href="mailto:3104221252@qq.com">3104221252@qq.com</a><a href="${assetUrl('portfolio.pdf')}" download="张恒瑀_设计师助理求职作品集.pdf">下载完整作品集</a></div>`;
 return `<div class="panel-label">WORK COLLECTION / ${r.images.length} 幅画面</div><div class="portfolio-gallery">${r.images.map((im,i)=>`<figure><button data-art="${i}" aria-label="放大${escapeHtml(im.caption)}"><img src="${assetUrl(im.src)}" alt="${escapeHtml(im.caption)}" loading="lazy"/></button><figcaption>${escapeHtml(r.video?'扫码观看完整视频':im.caption)} <button data-art="${i}">放大查看 ＋</button></figcaption></figure>`).join('')}</div>${r.video?`<div class="portfolio-links"><a href="${escapeHtml(r.video)}" target="_blank" rel="noopener">▷ 观看完整视频</a></div>`:''}`;
}

export function installArtworkViewer(record:()=>ArchiveRecord) {
 const viewer=document.createElement('dialog');viewer.id='artwork-viewer';viewer.setAttribute('aria-label','作品全屏查看器');
 viewer.innerHTML='<header><span id="art-caption"></span><div><button id="art-zoom">放大</button><a id="art-original" target="_blank" rel="noopener">打开原图</a><button id="art-close">关闭 ×</button></div></header><div class="art-stage"><img id="art-image" alt=""/></div><footer><button id="art-prev">上一张</button><span id="art-count"></span><button id="art-next">下一张</button></footer>';
 document.body.append(viewer);let index=0;let previous:HTMLElement|null=null;
 const q=<T extends HTMLElement>(s:string)=>viewer.querySelector<T>(s)!;
 const show=()=>{const r=record(),im=r.images[index];q<HTMLImageElement>('#art-image').src=assetUrl(im.src);q<HTMLImageElement>('#art-image').alt=im.caption;q('#art-caption').textContent=im.caption;q<HTMLAnchorElement>('#art-original').href=assetUrl(im.original||im.src);q('#art-count').textContent=`${index+1} / ${r.images.length}`;q('.art-stage').classList.remove('enlarged');q('#art-zoom').textContent='放大';q('#art-prev').hidden=q('#art-next').hidden=r.images.length<2;};
 const close=()=>{viewer.close();previous?.focus({preventScroll:true})};
 document.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLElement>('[data-art]');if(!button)return;index=Number(button.dataset.art);previous=button;show();viewer.showModal();});
 q('#art-close').onclick=close;
 q('#art-prev').onclick=()=>{index=(index-1+record().images.length)%record().images.length;show()};
 q('#art-next').onclick=()=>{index=(index+1)%record().images.length;show()};
 q('#art-zoom').onclick=()=>{const on=q('.art-stage').classList.toggle('enlarged');q('#art-zoom').textContent=on?'适应屏幕':'放大'};
 viewer.addEventListener('cancel',e=>{e.preventDefault();close()});
 viewer.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='ArrowLeft')q('#art-prev').click();if(e.key==='ArrowRight')q('#art-next').click();});
}
