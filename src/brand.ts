// One shared ZHY monogram mark for the interface and the printed archive label.
// Primary geometric Z->H->Y ribbon (y: 16..128, center x: 155) with signature
// RhineLab diagonal optical cut (2.75% gap aligned to settled boot frame 264).
const primaryPaths = `<path d="M18 27H95L66.6 63M55.2 77.4L24 117H108C119 117 125 111 125 100V16M185 16V128M216 16V48C216 68 230.5 82 249 82C267.5 82 282 68 282 48V16" fill="none" stroke="currentColor" stroke-width="22" stroke-linejoin="bevel"/>`;
const secondaryPaths = `<path d="M125 72H185" fill="none" stroke="currentColor" stroke-width="20"/><path d="M249 82V128" fill="none" stroke="currentColor" stroke-width="22"/>`;
const paths = `${primaryPaths}${secondaryPaths}`;
export const labelMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 310 145" color="#171713">${paths}</svg>`;
export const logo = `<svg viewBox="0 0 310 185" aria-label="Zhang Hengyu" role="img">${paths}<text x="165" y="174" text-anchor="middle" fill="currentColor" font-family="MiSans,sans-serif" font-size="16" font-weight="700" letter-spacing="22">ZHY·DESIGN</text></svg>`;
// Uncut primary Z->H->Y ribbon segments for the opening's moving draw/erase ends
// and traveling 2.75% optical cut (frames 229..486).
export const bootMarkSegments = [
  "M18 27H95L24 117H108C119 117 125 111 125 100V16",
  "M185 16V128",
  "M216 16V48C216 68 230.5 82 249 82C267.5 82 282 68 282 48V16",
] as const;
export const bootMarkContour = bootMarkSegments.join("");

// Personal identity in the original three-line terminal layout.
const analysisPositions = [2, 34, 65, 99, 131, 157];
export const brandHeading = `<h1>ZHANG HENGYU</h1><div>VISUAL COMMUNICATION</div><p><span class="brand-analysis" role="img" aria-label="DESIGN">${[..."DESIGN"].map((letter, i) => `<span aria-hidden="true" style="left:${analysisPositions[i]}px">${letter}</span>`).join("")}</span> <b>OS</b></p>`;
