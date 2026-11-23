import { bootMotion } from "./boot-motion";
import { bootMarkSegments } from "./brand";
import { themeAmount } from "./theme-ui";
import { BootLettering } from "./boot-lettering";

const ns = "http://www.w3.org/2000/svg";
const arc = (r: number, start: number, sweep: number, x = 960, y = 540) => {
  const point = (a: number) => `${x + Math.cos(a) * r},${y + Math.sin(a) * r}`;
  if (sweep >= Math.PI * 1.999)
    return `M${point(start)}A${r},${r} 0 1 1 ${point(start + Math.PI)}A${r},${r} 0 1 1 ${point(start + Math.PI * 2)}`;
  return `M${point(start)}A${r},${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${point(start + sweep)}`;
};

export class BootSequence {
  private nodes: Map<string, HTMLElement> = new Map();
  private contours: { el: SVGPathElement; a: number; b: number }[];
  private letters: SVGTextElement;
  private crossbar: SVGPathElement;
  private stem: SVGPathElement;
  private brandLines: HTMLElement[];
  private scanPaths: SVGPathElement[];
  private orbitDots: SVGCircleElement[];
  private core: SVGCircleElement;
  private satellites: SVGCircleElement[];
  private caps: SVGCircleElement[];
  private companyInk: HTMLElement[];
  private poweredHTML: string;
  private accessLettering: BootLettering;
  private authLettering: BootLettering;
  constructor(private stage: HTMLElement) {
    [
      ".access-text",
      ".boot-logo",
      ".auth-status",
      "#auth-message",
      ".scan",
      ".scan > span",
      ".welcome",
      ".welcome-heading",
      ".welcome-panel",
      ".welcome-company",
      ".welcome-highlight",
      ".welcome-database",
      ".welcome-logo",
      ".brand",
      ".powered",
      "#boot-background",
      ".boot-background svg",
      ".boot-white",
    ].forEach((s) => this.nodes.set(s, stage.querySelector<HTMLElement>(s)!));
    const mark = stage.querySelector<SVGSVGElement>(".boot-logo svg")!;
    this.letters = mark.querySelector("text")!;
    mark.querySelectorAll("path").forEach((node) => node.remove());
    const fallbackLengths = [387.071, 112, 170.5];
    const rawContours = bootMarkSegments.map((d) => {
      const el = document.createElementNS(ns, "path");
      el.setAttribute("d", d);
      el.setAttribute("fill", "none");
      el.setAttribute("stroke", "currentColor");
      el.setAttribute("stroke-width", "22");
      el.setAttribute("stroke-linejoin", "bevel");
      mark.insertBefore(el, this.letters);
      return el;
    });
    const lengths = rawContours.map(
      (el, i) => el.getTotalLength() || fallbackLengths[i],
    );
    const totalLength = lengths.reduce((sum, len) => sum + len, 0);
    let cursor = 0;
    this.contours = rawContours.map((el, i) => {
      const a = cursor / totalLength;
      cursor += lengths[i];
      const b = cursor / totalLength;
      el.setAttribute("pathLength", "1");
      return { el, a, b };
    });
    this.crossbar = document.createElementNS(ns, "path");
    this.crossbar.setAttribute("fill", "none");
    this.crossbar.setAttribute("stroke", "currentColor");
    this.crossbar.setAttribute("stroke-width", "20");
    this.stem = document.createElementNS(ns, "path");
    this.stem.setAttribute("d", "M-23 0H23");
    this.stem.setAttribute("fill", "none");
    this.stem.setAttribute("stroke", "currentColor");
    this.stem.setAttribute("stroke-width", "22");
    mark.insertBefore(this.crossbar, this.letters);
    mark.insertBefore(this.stem, this.letters);
    this.letters.setAttribute("text-anchor", "start");
    this.letters.setAttribute("x", "20");
    this.brandLines = Array.from(
      stage.querySelector(".brand")!.children,
    ) as HTMLElement[];
    this.scanPaths = Array.from(
      stage.querySelectorAll<SVGPathElement>(".scan path"),
    );
    this.orbitDots = Array.from(
      stage.querySelectorAll<SVGCircleElement>(".scan .orbit-dot"),
    );
    this.core = stage.querySelector(".scan .scan-core")!;
    this.core.setAttribute("cx", "959.5");
    this.core.setAttribute("cy", "539.5");
    this.satellites = Array.from({ length: 6 }, () => {
      const dot = document.createElementNS(ns, "circle");
      dot.classList.add("satellite-dot");
      dot.setAttribute("fill", "#080a08");
      dot.setAttribute("stroke", "none");
      // Draw beneath the core so its large flashes naturally cover the orbit.
      this.core.parentElement!.insertBefore(dot, this.core);
      return dot;
    });
    this.caps = ["#080a08", "#fff"].map((fill) => {
      const cap = document.createElementNS(ns, "circle");
      cap.setAttribute("fill", fill);
      cap.setAttribute("stroke", "none");
      this.core.parentElement!.appendChild(cap);
      return cap;
    });
    this.companyInk = Array.from(
      stage.querySelectorAll<HTMLElement>(".welcome-company strong"),
    );
    this.companyInk.forEach((el) => {
      const ink = document.createElement("span");
      ink.textContent = el.textContent;
      el.replaceChildren(ink);
    });
    this.poweredHTML = this.el(".powered").innerHTML;
    new BootLettering(this.brandLines[0], ["brand"]).setText("ZHANG HENGYU");
    // Bind after collecting the original ring paths. Phrase artwork also has
    // SVG paths, and must never be included in the scan's animated geometry.
    this.accessLettering = new BootLettering(this.el(".access-text"), ["access"]);
    this.authLettering = new BootLettering(this.el("#auth-message"), [
      "identity", "request", "processing", "processingGlitch",
    ]);
    for (const [selector, key, text] of [
      [".scan > span", "permission", "PORTFOLIO READY"],
      [".welcome-heading", "welcome", "WELCOME TO"],
      [".welcome-database", "database", "DESIGN PORTFOLIO"],
    ] as const) new BootLettering(this.el(selector), [key]).setText(text);
    this.companyInk.forEach((el) =>
      new BootLettering(el.querySelector("span")!, ["company"]).setText("ZHANG HENGYU."),
    );
  }
  private el(selector: string) {
    return this.nodes.get(selector)!;
  }
  private opacity(selector: string, value: number | boolean) {
    this.el(selector).style.opacity = String(Number(value));
  }
  update(time: number) {
    const s = bootMotion(time),
      t = s.t;
    this.stage.dataset.bootFrame = String(s.f);
    this.accessLettering.setText(s.access);
    this.opacity(".access-text", s.accessOpacity);
    this.opacity(".boot-logo", s.logoOpacity);
    this.el(".boot-logo").style.transform =
      `translate(${s.logo.offsetX}px, 1px)`;
    this.renderLogoContours(
      s.logo.start,
      s.logo.length,
      s.logo.strokeWidth * (22 / 26),
    );
    // Preserve the SVG text node once each revealed letter is in place. Replacing
    // it every frame invalidates glyph rasterization under the moving HUD.
    if (this.letters.textContent !== s.logoLetters)
      this.letters.textContent = s.logoLetters;
    this.crossbar.style.opacity = this.stem.style.opacity =
      s.logo.symbolScale > 0 ? "1" : "0";
    const crossbarWidth =
      15 + ((s.logo.minusWidth - 15) / (46 - 15)) * (60 - 15);
    this.crossbar.setAttribute(
      "d",
      `M${-crossbarWidth / 2} 0h${crossbarWidth}`,
    );
    this.crossbar.setAttribute(
      "transform",
      `translate(155 72) scale(${s.logo.symbolScale})`,
    );
    const travel = (155 - s.logo.plusX) / (155 - 72.6);
    const stemX = 155 + (249 - 155) * travel;
    const stemY = 72 + (105 - 72) * travel;
    this.stem.setAttribute(
      "transform",
      `translate(${stemX} ${stemY}) rotate(${s.logo.plusAngle}) scale(${s.logo.symbolScale})`,
    );
    this.opacity(".auth-status", s.authOpacity);
    this.authLettering.setText(s.auth);
    this.opacity(".brand", 1);
    this.el(".brand").style.transform = "none";
    this.brandLines.forEach((node, i) => {
      node.style.opacity = String(s.brand[i].opacity);
      node.style.transform = `translateX(${s.brand[i].x}px)`;
    });
    this.opacity(".powered", s.poweredLetters > 0);
    this.el(".powered").style.clipPath =
      `inset(0 ${100 * (1 - s.poweredLetters / 19)}% 0 0)`;
    this.opacity(".scan", s.scanVisible);
    if (s.scanVisible) this.renderScan(s);
    this.opacity(".welcome", s.welcomeVisible ? s.welcomeOpacity : 0);
    this.el(".welcome").style.transform = `scale(${s.welcomeScale})`;
    this.el(".welcome").style.filter =
      `blur(${s.exitBlur}px) invert(${s.exit * 0.22}) sepia(${s.exit}) saturate(${1 + s.exit * 5}) hue-rotate(${s.exit * 115}deg)`;
    this.opacity(".welcome-panel", s.welcomePanel);
    this.opacity(".welcome-heading", 1);
    this.el(".welcome-heading").style.color =
      themeAmount > .0001 ? "var(--theme-ink)" : `rgb(${255 * (1 - s.welcomeInk)} ${255 * (1 - s.welcomeInk)} ${255 * (1 - s.welcomeInk)})`;
    this.opacity(".welcome-company", s.companyVisible);
    this.el(".welcome-company").style.opacity = String(
      s.companyVisible ? (s.companyMask ? 0.65 : 1) : 0,
    );
    this.companyInk[1].querySelector("span")!.style.opacity = s.companyMask
      ? ".06"
      : "1";
    this.el(".welcome-highlight").style.clipPath =
      `inset(0 ${100 * (1 - s.highlight)}% 0 0)`;
    this.opacity(".welcome-database", s.databaseOpacity);
    this.opacity(".welcome-logo", s.welcomeLogo);
    this.opacity("#boot-background", s.backgroundOpacity);
    this.opacity(".boot-white", s.white);
    this.el(".boot-background svg").style.transform =
      `translate(${Math.sin(t * 0.16) * 18}px, ${-(t - 6) * 5}px) scale(1.08)`;
    return s;
  }
  private renderLogoContours(
    start: number,
    length: number,
    strokeWidth: number,
  ) {
    const sw = String(strokeWidth);
    if (length <= 0.0001) {
      for (const seg of this.contours) {
        seg.el.style.opacity = "0";
        seg.el.setAttribute("stroke-width", sw);
      }
      return;
    }
    const u0 = ((start % 1) + 1) % 1;
    const u1 = u0 + length;
    const visible: [number, number][] =
      length >= 0.9999
        ? [[0, 1]]
        : u1 <= 1
          ? [[u0, u1]]
          : [
              [0, u1 - 1],
              [u0, 1],
            ];
    for (const seg of this.contours) {
      seg.el.setAttribute("stroke-width", sw);
      const span = seg.b - seg.a;
      const parts: [number, number][] = [];
      for (const [v0, v1] of visible) {
        const lo = Math.max(seg.a, v0);
        const hi = Math.min(seg.b, v1);
        if (hi > lo + 1e-6)
          parts.push([(lo - seg.a) / span, (hi - seg.a) / span]);
      }
      if (parts.length === 0) {
        seg.el.style.opacity = "0";
      } else if (parts.length === 1) {
        const [p0, p1] = parts[0];
        seg.el.style.opacity = "1";
        if (p0 <= 1e-5 && p1 >= 1 - 1e-5) {
          seg.el.style.strokeDasharray = "none";
          seg.el.style.strokeDashoffset = "0";
        } else {
          seg.el.style.strokeDasharray = `${p1 - p0} 2`;
          seg.el.style.strokeDashoffset = String(-p0);
        }
      } else {
        const [[, p1], [p2]] = parts;
        seg.el.style.opacity = "1";
        seg.el.style.strokeDasharray = `${p1} ${p2 - p1} ${1 - p2} 2`;
        seg.el.style.strokeDashoffset = "0";
      }
    }
  }
  private renderScan(s: ReturnType<typeof bootMotion>) {
    const { scan } = s,
      r = scan.radius;
    const group = this.scanPaths[0].parentElement!;
    group.setAttribute(
      "transform",
      `translate(960 540) scale(${s.ringScale}) translate(-960 -540)`,
    );
    group.style.opacity = String(s.ringOpacity);
    group.style.filter = `blur(${s.ringBlur}px)`;
    this.scanPaths[0].setAttribute(
      "d",
      arc(r, scan.outerStart, scan.outerSweep),
    );
    this.scanPaths[0].setAttribute("stroke-width", "2.4");
    this.scanPaths[1].setAttribute(
      "d",
      arc(scan.whiteRadius, scan.whiteStart, scan.whiteSweep),
    );
    this.scanPaths[1].setAttribute("stroke-width", "4");
    const inner = scan.innerStart;
    this.scanPaths[2].setAttribute(
      "d",
      arc(scan.innerRadius, inner, scan.innerSweep),
    );
    this.scanPaths[3].setAttribute(
      "d",
      arc(scan.innerRadius, inner + Math.PI, scan.innerSweep),
    );
    s.scanOrbit.sides.forEach((side, i) => {
      this.scanPaths[i + 4].setAttribute(
        "d",
        arc(side.radius, side.start, side.sweep, side.x, side.y),
      );
      this.scanPaths[i + 4].style.opacity = s.scanOrbit.sideVisible ? "1" : "0";
    });
    s.scanOrbit.satellites.forEach((point, i) => {
      const dot = this.satellites[i];
      dot.setAttribute("cx", String(point.x));
      dot.setAttribute("cy", String(point.y));
      dot.setAttribute("r", String(point.radius));
    });
    this.core.style.opacity = s.ornament ? "1" : "0";
    this.core.setAttribute("r", String(s.coreRadius));
    const orbit = scan.orbit;
    this.orbitDots.forEach((dot, i) => {
      dot.setAttribute(
        "cx",
        String(960 + Math.cos(orbit + i * Math.PI) * scan.orbitRadius),
      );
      dot.setAttribute(
        "cy",
        String(540 + Math.sin(orbit + i * Math.PI) * scan.orbitRadius),
      );
      dot.setAttribute("r", String(scan.dotRadius));
    });
    this.caps.forEach((cap, i) => {
      const angle = i ? scan.whiteStart : scan.outerStart + scan.outerSweep;
      const radius = i ? scan.whiteRadius : r;
      cap.setAttribute("cx", String(960 + Math.cos(angle) * radius));
      cap.setAttribute("cy", String(540 + Math.sin(angle) * radius));
      cap.setAttribute("r", String(i ? scan.whiteCap : scan.blackCap));
    });
    this.opacity(".scan > span", s.permissionOpacity);
    this.el(".scan > span").style.letterSpacing = `${s.scanTracking}px`;
    this.el(".scan > span").style.setProperty("--boot-phrase-tracking", `${s.scanTracking}px`);
    this.el(".scan > span").style.fontSize = `${s.scanFont}px`;
  }
  reset() {
    // Restore shared corner branding when skipping at any intermediate frame.
    [".brand", ".powered"].forEach((key) =>
      this.el(key).removeAttribute("style"),
    );
    this.brandLines.forEach((node) => node.removeAttribute("style"));
    this.el(".powered").innerHTML = this.poweredHTML;
    this.opacity("#boot-background", 0);
  }
}
