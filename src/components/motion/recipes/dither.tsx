"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils/cn";

/* -------------------------------------------------------------------------
   Dither
   ===========================================================================
   Fondo ambiental de motion-anything: onda procedural de ruido cuantizada con
   matriz Bayer — un halftone de imprenta animado. Monocroma (negro → gris):
   no hay neón ni halo, va directo a tinta/impresión. SIN GLOW.

   Por qué es protagonista aquí: es el telón de fondo del hero, no un adorno.
   Red de octavas, tramado Bayer 8×8, pixelSize 2 → píxeles grandes y
   tramado visible. Reacciona al puntero y congela en un frame estático bajo
   movimiento reducido. Sin WebGL, cae al color de fondo (ink).
   ------------------------------------------------------------------------- */

/* Fragment shader (GLSL ES 3.00). Verbatim de la receta `dither`. */
const FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
uniform float waveSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec3 waveColor;
uniform int enableMouseInteraction;
uniform float mouseRadius;
uniform float colorNum;
uniform float pixelSize;
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t){ return t*t*t*(t*(t*6.0-15.0)+10.0); }
float cnoise(vec2 P){
  vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz; vec4 iy = Pi.yyww; vec4 fx = Pf.xzxz; vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5; vec4 tx = floor(gx + 0.5); gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x); vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z); vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x)); float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z)); float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}
const int OCTAVES = 4;
float fbm(vec2 p){
  float value = 0.0; float amp = 1.0; float freq = waveFrequency;
  for (int i = 0; i < OCTAVES; i++){ value += amp * abs(cnoise(p)); p *= freq; amp *= waveAmplitude; }
  return value;
}
float pattern(vec2 p){ vec2 p2 = p - uTime * waveSpeed; return fbm(p + fbm(p2)); }
const float bayerMatrix8x8[64] = float[64](
  0.0/64.0, 48.0/64.0, 12.0/64.0, 60.0/64.0,  3.0/64.0, 51.0/64.0, 15.0/64.0, 63.0/64.0,
  32.0/64.0,16.0/64.0, 44.0/64.0, 28.0/64.0, 35.0/64.0,19.0/64.0, 47.0/64.0, 31.0/64.0,
  8.0/64.0, 56.0/64.0,  4.0/64.0, 52.0/64.0, 11.0/64.0,59.0/64.0,  7.0/64.0, 55.0/64.0,
  40.0/64.0,24.0/64.0, 36.0/64.0, 20.0/64.0, 43.0/64.0,27.0/64.0, 39.0/64.0, 23.0/64.0,
  2.0/64.0, 50.0/64.0, 14.0/64.0, 62.0/64.0,  1.0/64.0,49.0/64.0, 13.0/64.0, 61.0/64.0,
  34.0/64.0,18.0/64.0, 46.0/64.0, 30.0/64.0, 33.0/64.0,17.0/64.0, 45.0/64.0, 29.0/64.0,
  10.0/64.0,58.0/64.0,  6.0/64.0, 54.0/64.0,  9.0/64.0,57.0/64.0,  5.0/64.0, 53.0/64.0,
  42.0/64.0,26.0/64.0, 38.0/64.0, 22.0/64.0, 41.0/64.0,25.0/64.0, 37.0/64.0, 21.0/64.0
);
vec3 dither(vec2 uv, vec3 color){
  vec2 scaledCoord = floor(uv * uResolution / pixelSize);
  int x = int(mod(scaledCoord.x, 8.0)); int y = int(mod(scaledCoord.y, 8.0));
  float threshold = bayerMatrix8x8[y * 8 + x] - 0.25;
  float step = 1.0 / (colorNum - 1.0);
  color += threshold * step;
  float bias = 0.2;
  color = clamp(color - bias, 0.0, 1.0);
  return floor(color * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
}
void main(){
  vec2 uvScreen = gl_FragCoord.xy / uResolution;
  vec2 normalizedPixelSize = pixelSize / uResolution;
  vec2 uvPixel = normalizedPixelSize * floor(uvScreen / normalizedPixelSize);
  vec2 fragPix = uvPixel * uResolution;
  vec2 uv = fragPix / uResolution - 0.5;
  uv.x *= uResolution.x / uResolution.y;
  float f = pattern(uv);
  if (enableMouseInteraction == 1) {
    vec2 mouseNDC = uMouse - 0.5;
    mouseNDC.x *= uResolution.x / uResolution.y;
    float dist = length(uv - mouseNDC);
    float effect = 1.0 - smoothstep(0.0, mouseRadius, dist);
    f -= 0.5 * effect;
  }
  vec3 col = mix(vec3(0.0), waveColor, f);
  col = dither(uvScreen, col);
  fragColor = vec4(col, 1.0);
}`;

type ShaderUniforms = {
  waveSpeed: number;
  waveFrequency: number;
  waveAmplitude: number;
  waveColor: [number, number, number];
  enableMouseInteraction: number;
  mouseRadius: number;
  colorNum: number;
  pixelSize: number;
};

const UNIFORMS: ShaderUniforms = {
  waveSpeed: 0.07,
  waveFrequency: 3,
  waveAmplitude: 0.3,
  waveColor: [0.5, 0.5, 0.5],
  enableMouseInteraction: 1,
  mouseRadius: 1,
  colorNum: 4,
  pixelSize: 2,
};

/** Inicializa el WebGL shader en el contenedor y devuelve una limpieza. */
function runShader(el: HTMLDivElement): (() => void) | undefined {
  /* Guard contra doble-montaje (React Strict Mode). */
  if ((el as HTMLDivElement & { __dither?: true }).__dither) return undefined;
  (el as HTMLDivElement & { __dither?: true }).__dither = true;

  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:100%;height:100%;display:block";
  el.appendChild(canvas);

  const glCtx = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
  });

  if (!glCtx) {
    el.style.background = el.getAttribute("data-fallback") || "#0e0e0c";
    return () => {
      (el as HTMLDivElement & { __dither?: true }).__dither = undefined;
    };
  }

  /* Tras el guard enlaza el contexto no nulo; los closures de abajo lo ven
     como `WebGL2RenderingContext` (sin `| null`). */
  const gl = glCtx;

  const VERT = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;

  function compile(type: number, src: string): WebGLShader {
    const s = gl.createShader(type) as WebGLShader;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("[dither]", gl.getShaderInfoLog(s));
    }
    return s;
  }

  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("[dither] link", gl.getProgramInfoLog(program));
    el.style.background = el.getAttribute("data-fallback") || "#0e0e0c";
    return () => {
      (el as HTMLDivElement & { __dither?: true }).__dither = undefined;
    };
  }
  gl.useProgram(program);

  const pos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pos);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const lp = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(lp);
  gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);

  const uvb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 2, 0, 0, 2]), gl.STATIC_DRAW);
  const lu = gl.getAttribLocation(program, "uv");
  if (lu >= 0) {
    gl.enableVertexAttribArray(lu);
    gl.vertexAttribPointer(lu, 2, gl.FLOAT, false, 0, 0);
  }

  const U: Record<string, WebGLUniformLocation | null> = {};
  ["uTime", "uResolution", "uMouse"].forEach((n) => {
    U[n] = gl.getUniformLocation(program, n);
  });

  (Object.keys(UNIFORMS) as Array<keyof ShaderUniforms>).forEach((key) => {
    const loc = gl.getUniformLocation(program, key);
    const value = UNIFORMS[key];
    if (loc == null) return;
    if (key === "waveColor") gl.uniform3f(loc, ...(value as [number, number, number]));
    else if (key === "enableMouseInteraction") gl.uniform1i(loc, value as number);
    else gl.uniform1f(loc, value as number);
  });

  /* El puntero se alimenta por window para que funcione aunque el contenido
     (título, tarjeta) tape al shader — el rect del contenedor es a lo ancho
     del hero, así que no importa qué reciba el click. */
  const mouse: [number, number] = [0.5, 0.5];
  const onPointer = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    mouse[0] = (e.clientX - r.left) / r.width;
    mouse[1] = 1 - (e.clientY - r.top) / r.height;
  };
  window.addEventListener("pointermove", onPointer);

  let W = 1;
  let H = 1;
  const resize = () => {
    W = Math.max(1, el.offsetWidth || 600);
    H = Math.max(1, el.offsetHeight || 360);
    canvas.width = W;
    canvas.height = H;
    gl.viewport(0, 0, W, H);
  };
  window.addEventListener("resize", resize);
  resize();

  let raf = 0;
  const draw = (t: number) => {
    const time = reduced ? 2.0 : t * 0.001;
    if (U.uTime) gl.uniform1f(U.uTime, time);
    if (U.uResolution) gl.uniform2f(U.uResolution, W, H);
    if (U.uMouse) gl.uniform2f(U.uMouse, mouse[0], mouse[1]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduced) raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("resize", resize);
    (el as HTMLDivElement & { __dither?: true }).__dither = undefined;
  };
}

type DitherProps = {
  className?: string;
  /** Color de respaldo cuando no hay WebGL2. */
  fallback?: string;
};

export function Dither({ className, fallback = "#0e0e0c" }: DitherProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const cleanup = runShader(ref.current);
    return () => cleanup?.();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-fallback={fallback}
      className={cn("pointer-events-none", className)}
    />
  );
}
