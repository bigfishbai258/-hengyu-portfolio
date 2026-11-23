import * as THREE from 'three';
import { records } from './data';
import { assetUrl } from './asset-url';
import { fileAtCell, type ArchiveCell } from './archive-loop';

export type ArtworkLoadOptions = {
  compact?: boolean;
  onUpdate?: () => void;
};

type QueueItem = { index: number; src: string; fallback: string };

// A printed insert attached to the front of the original cassette. Shared atlas
// keeps the full moving archive array to one additional draw call.
export class ArchiveArtwork {
  private readonly columns = 4;
  private readonly rows = Math.ceil(records.length / this.columns);
  private cellWidth = 768;
  private cellHeight = 448;
  private texture?: THREE.CanvasTexture;
  private geometries: THREE.PlaneGeometry[] = [];
  private indices?: THREE.InstancedBufferAttribute;
  private array?: THREE.InstancedMesh;
  private printedMaterial?: THREE.MeshPhysicalMaterial;
  private imageCache = new Map<string, Promise<HTMLImageElement>>();
  private queue: QueueItem[] = [];
  private painted = new Set<number>();
  private disposed = false;

  async load(anisotropy: number, options: ArtworkLoadOptions = {}) {
    const compact = options.compact === true;
    this.disposed = false;
    this.painted.clear();
    this.cellWidth = compact ? 256 : 768;
    this.cellHeight = compact ? 150 : 448;
    const scaleFactor = this.cellWidth / 768;
    const canvas = document.createElement('canvas');
    canvas.width = this.columns * this.cellWidth;
    canvas.height = this.rows * this.cellHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e9e5dd';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.queue = [];
    records.forEach((record, index) => {
      const x = (index % this.columns) * this.cellWidth;
      const y = Math.floor(index / this.columns) * this.cellHeight;
      ctx.fillStyle = '#ece8df';
      ctx.fillRect(x, y, this.cellWidth, this.cellHeight);
      const firstImage = record.images[0];
      if (firstImage) {
        const base = firstImage.src.split('/').pop() ?? '';
        const thumbSrc = compact && base ? `works/thumbs/${base}` : firstImage.src;
        this.queue.push({ index, src: thumbSrc, fallback: firstImage.src });
      } else {
        ctx.fillStyle = '#22251f';
        ctx.font = `600 ${Math.round(64 * scaleFactor)}px MiSans, sans-serif`;
        ctx.fillText('张恒瑀', x + 55 * scaleFactor, y + 170 * scaleFactor);
        ctx.font = `${Math.round(24 * scaleFactor)}px MiSans, sans-serif`;
        ctx.fillText('VISUAL COMMUNICATION / DESIGN PORTFOLIO', x + 55 * scaleFactor, y + 230 * scaleFactor);
        ctx.fillText('3104221252@qq.com', x + 55 * scaleFactor, y + 315 * scaleFactor);
        this.painted.add(index);
      }
    });

    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = anisotropy;
    this.printedMaterial = new THREE.MeshPhysicalMaterial({
      map: this.texture,
      roughness: compact ? 0.8 : 0.72,
      metalness: 0,
      clearcoat: compact ? 0 : 0.15,
      clearcoatRoughness: 0.45,
      envMapIntensity: 0.3,
    });
    this.printedMaterial.name = 'Portfolio_Print';
    this.geometries = records.map((_, index) => {
      const geometry = this.plane();
      const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(
          i,
          ((index % this.columns) + uv.getX(i)) / this.columns,
          (this.rows - 1 - Math.floor(index / this.columns) + uv.getY(i)) / this.rows,
        );
      }
      return geometry;
    });

    const fetchImage = (src: string, bust = false) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = reject;
        const url = assetUrl(src);
        img.src = bust ? `${url}?r=${Date.now()}` : url;
      });

    const loadImage = (src: string, fallback: string) => {
      let request = this.imageCache.get(src);
      if (!request) {
        request = fetchImage(src)
          .catch(() => (fallback !== src ? fetchImage(fallback) : fetchImage(src, true)))
          .catch((err) => {
            this.imageCache.delete(src);
            throw err;
          });
        this.imageCache.set(src, request);
      }
      return request;
    };

    const concurrency = compact ? 3 : 4;
    const worker = async () => {
      while (this.queue.length > 0 && !this.disposed) {
        const item = this.queue.shift()!;
        if (this.painted.has(item.index)) continue;
        try {
          const img = await loadImage(item.src, item.fallback);
          if (this.disposed || !this.texture) return;
          const x = (item.index % this.columns) * this.cellWidth;
          const y = Math.floor(item.index / this.columns) * this.cellHeight;
          const gutter = Math.round(18 * scaleFactor);
          const slot = this.cellWidth - gutter * 2;
          const scale = Math.min(slot / img.width, (this.cellHeight - gutter * 2) / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.fillStyle = '#ece8df';
          ctx.fillRect(x, y, this.cellWidth, this.cellHeight);
          ctx.drawImage(img, x + gutter + (slot - w) / 2, y + (this.cellHeight - h) / 2, w, h);
          this.painted.add(item.index);
          this.texture.needsUpdate = true;
          options.onUpdate?.();
        } catch {
          // Keep the warm matte tile if decoding fails after fallback retry.
        }
      }
    };
    void Promise.all(Array.from({ length: concurrency }, worker));
  }
  private plane() { return new THREE.PlaneGeometry(4.05, 2.36).translate(0, 1.53, .259); }
  createMesh(index: number, independentGeometry = false) {
    const mesh = new THREE.Mesh(independentGeometry ? this.geometries[index].clone() : this.geometries[index], this.printedMaterial!.clone());
    mesh.name = 'portfolio-artwork'; mesh.userData.surface = 'Portfolio_Print';
    mesh.userData.assemblyPart = 'cover';
    return mesh;
  }
  select(mesh: THREE.Mesh, index: number) {
    mesh.geometry = this.geometries[index];
    // Move the actively selected record's cover to the front of the loading queue.
    const pos = this.queue.findIndex((item) => item.index === index);
    if (pos > 0) {
      const [picked] = this.queue.splice(pos, 1);
      this.queue.unshift(picked);
    }
  }
  createArray(matrix: THREE.InstancedBufferAttribute) {
    const geometry = this.plane(); const material = this.printedMaterial!.clone();
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute float portfolioIndex;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = (vMapUv + vec2(mod(portfolioIndex, ${this.columns}.0), ${this.rows - 1}.0 - floor(portfolioIndex / ${this.columns}.0))) / vec2(${this.columns}.0, ${this.rows}.0);\n#endif`);
    };
    material.customProgramCacheKey = () => 'portfolio-atlas-v1';
    this.array = new THREE.InstancedMesh(geometry, material, matrix.count);
    this.array.name = 'portfolio-array-artwork'; this.array.instanceMatrix = matrix;
    this.array.frustumCulled = false;
    this.indices = new THREE.InstancedBufferAttribute(new Float32Array(matrix.count), 1).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('portfolioIndex', this.indices);
    return this.array;
  }
  sync(cells: ArchiveCell[], matrix: THREE.InstancedBufferAttribute) {
    if (!this.array || !this.indices) return;
    this.array.instanceMatrix = matrix;
    if (this.indices.count < matrix.count) {
      this.indices = new THREE.InstancedBufferAttribute(new Float32Array(matrix.count), 1).setUsage(THREE.DynamicDrawUsage);
      this.array.geometry.setAttribute('portfolioIndex', this.indices);
    }
    let changed = false;
    cells.forEach((cell, i) => {const value = fileAtCell(cell); if (this.indices!.getX(i) !== value) {this.indices!.setX(i, value);changed = true;}});
    if (changed) this.indices.needsUpdate = true;
    this.array.count = cells.length;
  }
  dispose() {
    this.disposed = true;
    this.queue = [];
    this.texture?.dispose();
    this.printedMaterial?.dispose();
    this.geometries.forEach(g => g.dispose());
  }
}
