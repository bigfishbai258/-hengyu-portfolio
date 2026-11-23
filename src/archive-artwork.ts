import * as THREE from 'three';
import { records } from './data';
import { assetUrl } from './asset-url';
import { fileAtCell, type ArchiveCell } from './archive-loop';

// A printed insert attached to the front of the original cassette. Shared atlas
// keeps the full moving archive array to one additional draw call.
export class ArchiveArtwork {
  private readonly columns = 4;
  private readonly rows = Math.ceil(records.length / this.columns);
  private readonly width = 768;
  private readonly height = 448;
  private texture?: THREE.CanvasTexture;
  private geometries: THREE.PlaneGeometry[] = [];
  private indices?: THREE.InstancedBufferAttribute;
  private array?: THREE.InstancedMesh;
  private printedMaterial?: THREE.MeshPhysicalMaterial;
  private imageCache = new Map<string, Promise<HTMLImageElement>>();

  async load(anisotropy: number) {
    const canvas = document.createElement('canvas');
    canvas.width = this.columns * this.width;
    canvas.height = this.rows * this.height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e9e5dd'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await Promise.all(records.map(async (record, index) => {
      const images = await Promise.all(record.images.slice(0, 1).map(image => {
        let request = this.imageCache.get(image.src);
        if (!request) {
          request = new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image(); img.onload = () => resolve(img); img.onerror = reject;
            img.src = assetUrl(image.src);
          });
          this.imageCache.set(image.src, request);
        }
        return request;
      }));
      const x = index % this.columns * this.width, y = Math.floor(index / this.columns) * this.height;
      ctx.fillStyle = '#ece8df'; ctx.fillRect(x, y, this.width, this.height);
      if (images.length) {
        const gutter = 18, slot = (this.width - gutter * (images.length + 1)) / images.length;
        images.forEach((img, i) => {
          const scale = Math.min(slot / img.width, (this.height - 36) / img.height);
          const w = img.width * scale, h = img.height * scale;
          ctx.drawImage(img, x + gutter + i * (slot + gutter) + (slot - w) / 2, y + (this.height - h) / 2, w, h);
        });
      } else {
        ctx.fillStyle = '#22251f'; ctx.font = '600 64px MiSans, sans-serif';
        ctx.fillText('张恒瑀', x + 55, y + 170);
        ctx.font = '24px MiSans, sans-serif';
        ctx.fillText('VISUAL COMMUNICATION / DESIGN PORTFOLIO', x + 55, y + 230);
        ctx.fillText('3104221252@qq.com', x + 55, y + 315);
      }
    }));
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = anisotropy;
    this.printedMaterial = new THREE.MeshPhysicalMaterial({map: this.texture, roughness: .72, metalness: 0, clearcoat: .15, clearcoatRoughness: .45, envMapIntensity: .3});
    this.printedMaterial.name = 'Portfolio_Print';
    this.geometries = records.map((_, index) => {
      const geometry = this.plane(); const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, (index % this.columns + uv.getX(i)) / this.columns,
          (this.rows - 1 - Math.floor(index / this.columns) + uv.getY(i)) / this.rows);
      }
      return geometry;
    });
  }
  private plane() { return new THREE.PlaneGeometry(4.05, 2.36).translate(0, 1.53, .259); }
  createMesh(index: number, independentGeometry = false) {
    const mesh = new THREE.Mesh(independentGeometry ? this.geometries[index].clone() : this.geometries[index], this.printedMaterial!.clone());
    mesh.name = 'portfolio-artwork'; mesh.userData.surface = 'Portfolio_Print';
    mesh.userData.assemblyPart = 'cover';
    return mesh;
  }
  select(mesh: THREE.Mesh, index: number) { mesh.geometry = this.geometries[index]; }
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
  dispose() { this.texture?.dispose(); this.printedMaterial?.dispose(); this.geometries.forEach(g => g.dispose()); }
}
