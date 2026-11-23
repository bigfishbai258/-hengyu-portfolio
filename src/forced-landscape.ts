/** Coordinate helpers for CSS 90-degree clockwise forced-landscape mode on phones. */
export function isForcedLandscape(): boolean {
  return document.documentElement.dataset.forcedLandscape === "true";
}

export function visualRectSize(el: HTMLElement): { width: number; height: number } {
  const r = el.getBoundingClientRect();
  return isForcedLandscape()
    ? { width: r.height, height: r.width }
    : { width: r.width, height: r.height };
}

export function localPointer(
  el: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number; width: number; height: number } {
  const r = el.getBoundingClientRect();
  if (!isForcedLandscape()) {
    return { x: clientX - r.left, y: clientY - r.top, width: r.width, height: r.height };
  }
  // Viewport rotated 90deg clockwise: local +X maps to +screenY, local +Y maps to -screenX.
  return {
    x: clientY - r.top,
    y: r.right - clientX,
    width: r.height,
    height: r.width,
  };
}

export function logicalPoint(clientX: number, clientY: number): { x: number; y: number } {
  if (!isForcedLandscape()) return { x: clientX, y: clientY };
  return { x: clientY, y: window.innerWidth - clientX };
}

function wrapPointerEvent<T extends Event>(event: T): T {
  if (!isForcedLandscape() || !(event instanceof PointerEvent)) return event;
  const rx = event.clientY;
  const ry = window.innerWidth - event.clientX;
  const rpx = event.pageY;
  const rpy = window.innerWidth - event.pageX;
  return new Proxy(event, {
    get(target, prop) {
      if (prop === "clientX") return rx;
      if (prop === "clientY") return ry;
      if (prop === "pageX") return rpx;
      if (prop === "pageY") return rpy;
      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function wrapListenerMap(target: EventTarget) {
  const wrapped = new WeakMap<EventListenerOrEventListenerObject, EventListener>();
  const wrap = (listener: EventListenerOrEventListenerObject): EventListener => {
    let fn = wrapped.get(listener);
    if (!fn) {
      fn = (event: Event) => {
        const mapped = wrapPointerEvent(event);
        if (typeof listener === "function") listener.call(target, mapped);
        else listener.handleEvent(mapped);
      };
      wrapped.set(listener, fn);
    }
    return fn;
  };
  return { wrap };
}

/**
 * Wraps a canvas for Three.js OrbitControls so 1-finger orbit and 2-finger pan/zoom
 * follow the visual rotated orientation when forced-landscape mode is active.
 */
export function createRotatedControlElement(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const canvasMap = wrapListenerMap(canvas);
  const doc = canvas.ownerDocument;
  const docMap = wrapListenerMap(doc);
  const docProxy = new Proxy(doc, {
    get(target, prop) {
      if (prop === "addEventListener") {
        return (type: string, listener: EventListenerOrEventListenerObject | null, opts?: AddEventListenerOptions | boolean) => {
          if (!listener) return;
          target.addEventListener(type, type.startsWith("pointer") ? docMap.wrap(listener) : listener, opts);
        };
      }
      if (prop === "removeEventListener") {
        return (type: string, listener: EventListenerOrEventListenerObject | null, opts?: EventListenerOptions | boolean) => {
          if (!listener) return;
          target.removeEventListener(type, type.startsWith("pointer") ? docMap.wrap(listener) : listener, opts);
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return new Proxy(canvas, {
    get(target, prop) {
      if (prop === "ownerDocument") return docProxy;
      if (prop === "addEventListener") {
        return (type: string, listener: EventListenerOrEventListenerObject | null, opts?: AddEventListenerOptions | boolean) => {
          if (!listener) return;
          target.addEventListener(type, type.startsWith("pointer") ? canvasMap.wrap(listener) : listener, opts);
        };
      }
      if (prop === "removeEventListener") {
        return (type: string, listener: EventListenerOrEventListenerObject | null, opts?: EventListenerOptions | boolean) => {
          if (!listener) return;
          target.removeEventListener(type, type.startsWith("pointer") ? canvasMap.wrap(listener) : listener, opts);
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
