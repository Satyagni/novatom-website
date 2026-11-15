/**
 * GPU point-field shaders (WebGL2 / GLSL ES 3.00).
 *
 * One program draws the atoms (GL_POINTS) and the bonds (GL_LINES, same vertices,
 * uMode = 1). Every point knows its position in seven states, and the director picks
 * any PAIR of states (uA, uB) plus a mix (uM), so the field can morph between any two:
 *
 *   0  search space   loose cloud of candidate structures
 *   1  define         cloud projected onto the property envelope (a box)
 *   2  hypothesise    points gather into ~16 hypothesis clusters
 *   3  simulate       a funnel: candidates stream down, rejects fade, survivors reach the tip
 *   4  validate       uncertain points orbit an oracle ring, confident ones tighten
 *   5  crystal        survivors lock onto lattice sites, bonds appear
 *   6  orbits         three tilted rings around a nucleus
 *
 * On top of any state: phonon ripples (uRipple) travel through the structure like sonar,
 * dust (uDust) keeps the rejected candidates faintly alive, and a burst (uBurst) throws
 * the whole field outward for page transitions. Colours are derived from state
 * membership, never from a scroll scalar, so any pair blends cleanly.
 */

export const vertexShader = /* glsl */ `#version 300 es
precision highp float;
in vec3 position;
uniform mat4 uProj;
in vec4 aSeed;
in vec3 aLat0;
in vec3 aLat1;
in vec3 aLat2;
in float aClass;     // 0 reject, 1 uncertain, 2 confident
in vec3 aSpec;       // species (0 cation, 1 anion) in lattice slots 0,1,2
in vec3 aTxt;        // where this point sits when the points spell the wordmark (state 7)

uniform float uTime;
uniform float uA;
uniform float uB;
uniform float uM;
uniform float uIntro;
uniform float uPx;
uniform float uSize;
uniform float uVel;
uniform float uRotY;
uniform float uRotX;
uniform float uScale;
uniform float uLatR;
uniform vec2  uOffset;
uniform vec2  uMouse;
uniform float uMouseK;
uniform float uMatA;
uniform float uMatB;
uniform float uMatMix;
uniform float uRipple;
uniform float uDust;
uniform float uBurst;
uniform float uTwist;     // 1 while the name is dissolving into the crystal: vortex + scatter on the way
uniform vec2  uPar;       // pointer parallax only (the wordmark follows this, never the slow spin)
uniform vec3  uFg;
uniform vec3  uAmber;
uniform vec3  uCobalt;
uniform vec4  uClear;     // text-safe rectangle in NDC: x0 y0 x1 y1
uniform float uClearK;    // 0..1 how strongly points fade inside it
uniform float uMode;      // 0 points, 1 bond lines
uniform float uBondA;     // bond opacity for this draw

out vec3  vColor;
out float vAlpha;

vec3  gC;      // cloud position
vec4  gS;      // seed
float gT;      // time
vec3  gL0, gL1, gL2;

vec3 hash3(float n) {
  return fract(sin(vec3(n, n + 1.37, n + 2.91)) * vec3(43758.5453, 22578.1459, 19642.3490));
}

vec3 flow(vec3 p, float t) {
  return vec3(
    sin(p.y * 0.70 + t * 0.31) + sin(p.z * 1.30 - t * 0.23),
    sin(p.z * 0.80 + t * 0.27) + sin(p.x * 1.10 + t * 0.19),
    sin(p.x * 0.90 + t * 0.29) + sin(p.y * 1.20 - t * 0.17)
  );
}

mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }

float matSlot(float m) { return m > 2.5 ? 2.0 : (m > 1.5 ? 1.0 : 0.0); }
vec3  latSlot(float s) { return s < 0.5 ? gL0 : (s < 1.5 ? gL1 : gL2); }
float specSlot(float s) { return s < 0.5 ? aSpec.x : (s < 1.5 ? aSpec.y : aSpec.z); }

float matBlend() {
  return smoothstep(0.0, 1.0, clamp(uMatMix * 1.35 - gS.z * 0.35, 0.0, 1.0));
}

vec3 lattice() {
  vec3 a = latSlot(matSlot(uMatA));
  vec3 b = latSlot(matSlot(uMatB));
  vec3 p = mix(a, b, matBlend()) * uLatR;
  p += 0.02 * vec3(
    sin(gT * 1.9 + gS.x * 40.0),
    sin(gT * 1.7 + gS.y * 40.0),
    sin(gT * 2.1 + gS.z * 40.0));   // thermal motion
  return p;
}

// the loose cloud, with differential rotation so it reads as a slow galaxy
vec3 cloud() {
  float r = length(gC.xz);
  vec3 c = rotY(gT * 0.16 / (1.0 + r * 0.45)) * gC;
  return c + flow(gC * 0.55, gT) * 0.38;
}

float funnelU() {
  return fract(gS.y + gT * 0.05 * (0.65 + 0.7 * gS.z));
}

vec3 funnel() {
  float u = funnelU();
  float r = 4.4 * pow(1.0 - u, 1.15) + 0.1;
  float ang = gS.z * 6.2831853 + gT * 0.2 + u * 2.6;
  float rf = sqrt(gS.x);
  return vec3(cos(ang) * r * rf, 3.8 - u * 7.6, sin(ang) * r * rf * 0.7);
}

vec3 orbits() {
  if (gS.y < 0.14) {
    return normalize(gS.xzw * 2.0 - 1.0 + 1e-3) * (0.25 + 0.55 * gS.z) + flow(gC, gT) * 0.03;
  }
  float id = floor(gS.w * 2.999);
  float th = gS.x * 6.2831853 + gT * (0.32 + 0.1 * id) * (mod(id, 2.0) < 0.5 ? 1.0 : -1.0);
  float rad = 4.1 + 0.3 * id;
  vec3 v = vec3(cos(th) * rad, sin(th) * rad * 0.42, (gS.z - 0.5) * 0.2);
  float tilt = id < 0.5 ? 0.0 : (id < 1.5 ? 1.05 : -1.05);
  return rotZ(tilt) * rotX(1.1) * v;
}

// state 7: 70% of the points spell the name, 20% circle it on atomic orbits, 10% are far dust that gives depth
vec3 wordmark() {
  if (gS.y < 0.2) {
    float id = floor(gS.w * 2.999);
    float dir = mod(id, 2.0) < 0.5 ? 1.0 : -1.0;
    float th = gS.x * 6.2831853 + gT * (0.30 + 0.10 * id) * dir;
    vec3 v = vec3(cos(th) * 6.7, sin(th) * 3.1, (gS.z - 0.5) * 0.12);
    float roll = id < 0.5 ? 0.0 : (id < 1.5 ? 0.30 : -0.30);
    return rotZ(roll) * rotX(0.95) * v;
  }
  if (gS.y < 0.3) return cloud();
  return aTxt + flow(aTxt * 1.3, gT) * 0.016;
}

vec3 statePos(int k) {
  vec3 r;
  if (k <= 0) {
    r = cloud();
  } else if (k == 1) {
    vec3 h = vec3(6.0, 3.3, 3.3);
    float m = max(max(abs(gC.x) / h.x, abs(gC.y) / h.y), abs(gC.z) / h.z) + 1e-4;
    r = gC / m * (1.0 - 0.05 * gS.w) + flow(gC * 0.4, gT) * 0.05;
  } else if (k == 2) {
    float id = floor(gS.w * 16.0);
    vec3 centre = (hash3(id * 7.13) * 2.0 - 1.0) * vec3(6.6, 3.6, 3.0);
    r = centre + gC * 0.11 + flow(gC * 0.5 + id, gT) * 0.07;
  } else if (k == 3) {
    r = funnel();
  } else if (k == 4) {
    if (aClass < 0.5) {
      r = cloud();
    } else if (aClass < 1.5) {
      float a = gS.x * 6.2831853 + gT * 0.45;
      float rad = 3.4 + (gS.y - 0.5) * 0.5;
      r = vec3(cos(a) * rad, (gS.z - 0.5) * 0.35, sin(a) * rad * 0.85);
    } else {
      r = gL0 * uLatR * 0.55 + flow(gL0 * 3.0, gT) * 0.05;
    }
  } else if (k == 5) {
    r = aClass < 0.5 ? cloud() : lattice();
  } else if (k == 6) {
    r = aClass < 0.5 ? cloud() : orbits();
  } else {
    r = wordmark();
  }
  return r;
}

float stateSize(int k) {
  if (k <= 0) return 1.0;
  if (k == 1) return 0.95;
  if (k == 2) return 1.1;
  if (k == 3) return 0.95;
  if (k == 4) return aClass < 0.5 ? 0.8 : 1.35;
  if (k == 5) return aClass < 0.5 ? 0.8 : 1.3;
  if (k == 7) return 1.4;
  return aClass < 0.5 ? 0.8 : 1.1;
}

float stateAlpha(int k) {
  if (k == 3) return aClass < 0.5 ? 1.0 - smoothstep(0.25, 0.85, funnelU()) : 1.0;
  if (k == 7) return 1.0;
  if (k >= 4) return aClass < 0.5 ? uDust * 0.5 : 1.0;
  return 1.0;
}

float revealOf(int k, float fr) {
  return k == 3 ? fr : ((k >= 4 && k <= 6) ? 1.0 : 0.0);
}

void main() {
  gC = position;
  gS = aSeed;
  gT = uTime;
  gL0 = aLat0; gL1 = aLat1; gL2 = aLat2;

  int k0 = int(uA + 0.5);
  int k1 = int(uB + 0.5);
  float f = clamp(uM, 0.0, 1.0);
  float g = clamp((f - 0.16) / 0.68, 0.0, 1.0);          // dwell at both ends
  float fi = clamp(g * 1.5 - gS.z * 0.5, 0.0, 1.0);        // per-point stagger
  fi = fi * fi * (3.0 - 2.0 * fi);

  vec3 pA = statePos(k0);
  vec3 pB = k1 == k0 ? pA : statePos(k1);
  vec3 p = mix(pA, pB, fi);
  // the name does not slide into the crystal: it is pulled into a vortex, thrown wide, and falls back onto the lattice
  float bump = sin(3.14159265 * fi) * uTwist;
  if (bump > 0.0) {
    float r0 = length(p.xy);
    p = rotZ(bump * (4.6 / (1.0 + r0 * 0.32)) * (0.55 + 0.9 * gS.z)) * p;
    p = rotY(bump * 1.7 * (gS.y - 0.5)) * p;
    p += normalize(p + 1e-3) * bump * (0.3 + gS.w) * 2.4;
    p.z += bump * (gS.w - 0.5) * 3.0;
  }
  float size = mix(stateSize(k0), stateSize(k1), fi);
  float alpha = mix(stateAlpha(k0), stateAlpha(k1), fi);

  // ---- colours from state membership
  float fr = smoothstep(0.12, 0.34, funnelU());
  float revealed = mix(revealOf(k0, fr), revealOf(k1, fr), fi);
  float isL0 = step(4.5, float(k0)) * step(float(k0), 6.5);
  float isL1 = step(4.5, float(k1)) * step(float(k1), 6.5);
  float settled = mix(isL0, isL1, fi);
  float latW = mix(isL0, isL1, fi);
  float orb = mix(step(5.5, float(k0)) * step(float(k0), 6.5), step(5.5, float(k1)) * step(float(k1), 6.5), fi);
  float txtW = mix(step(6.5, float(k0)), step(6.5, float(k1)), fi);
  // groups inside the wordmark state
  float ringW = txtW * step(gS.y, 0.2);
  float dustW = txtW * step(0.2, gS.y) * step(gS.y, 0.3);
  float elec = step(0.985, gS.z) * ringW;                      // a few bright electrons on the orbits
  float sx = mix(-8.0, 8.0, fract(gT * 0.14));                   // a glint sweeps across the letters
  float glint = txtW * step(0.3, gS.y) * exp(-pow((aTxt.x - sx) / 0.9, 2.0));
  size *= (1.0 - 0.35 * ringW) * (1.0 + 2.2 * elec) * (1.0 + 0.8 * glint) * (1.0 - 0.45 * dustW);
  alpha *= (1.0 - 0.45 * ringW) * (1.0 - 0.6 * dustW);
  alpha += 0.8 * elec;
  float shimmer = txtW * (1.0 - ringW) * (1.0 - dustW);
  size *= 1.0 + 0.45 * shimmer * max(0.0, sin(aTxt.x * 1.5 - gT * 1.7 + aTxt.y * 0.8));
  alpha *= 1.0 - 0.28 * shimmer * (0.5 + 0.5 * sin(gT * 2.3 + gS.x * 60.0));

  float surv = step(0.5, aClass);
  vec3 cls;
  float clsAlpha = 1.0;
  if (aClass < 0.5) {
    cls = uFg;
    clsAlpha = mix(1.0, 0.5, revealed);
  } else if (aClass < 1.5) {
    cls = mix(uFg, mix(uAmber, uCobalt, settled), revealed);
  } else {
    cls = mix(uFg, uCobalt, revealed);
  }

  float blend = matBlend();
  float spec = mix(specSlot(matSlot(uMatA)), specSlot(matSlot(uMatB)), step(0.5, blend));
  float alloy = mix(step(abs(uMatA - 1.0), 0.5), step(abs(uMatB - 1.0), 0.5), step(0.5, blend));
  vec3 atom = spec > 0.5 ? uCobalt : uFg;
  if (spec < 0.5 && alloy > 0.5 && gS.w < 0.25) atom = uAmber;
  float w5 = latW * surv;
  vec3 col = mix(cls, atom, w5);

  float oid = floor(gS.w * 2.999);
  vec3 orbCol = gS.y < 0.14 ? uFg : (oid < 0.5 ? uCobalt : (oid < 1.5 ? uAmber : uFg));
  col = mix(col, orbCol, orb * surv);
  vec3 txtCol = gS.w < 0.1 ? uCobalt : uFg;                   // the wordmark: white with cobalt sparks
  txtCol = mix(txtCol, mix(uFg, uCobalt, 0.65), step(gS.y, 0.2)); // orbits lean cobalt
  col = mix(col, txtCol, txtW);
  col += glint * vec3(0.55, 0.7, 1.0);
  float sizeSpec = mix(1.0, spec > 0.5 ? 1.0 : 1.55, w5 * (1.0 - orb));

  // ---- phonon ripples: sonar rings travelling outward through whatever structure is on screen
  float rr = length(p);
  float wv = sin(rr * 2.3 - gT * 2.2);
  p += normalize(p + 1e-3) * wv * uRipple * 0.10 * (0.4 + 0.6 * gS.z);
  float glow = pow(max(0.0, wv), 10.0) * uRipple * exp(-rr * 0.10);
  col += glow * (uCobalt * 0.9 + vec3(0.25));
  size *= 1.0 + glow * 1.1;
  alpha += glow * 0.5;

  // ---- intro: points arrive from far away
  float ie = clamp(uIntro * 1.5 - mix(gS.x, clamp((aTxt.x + 6.0) / 12.0, 0.0, 1.0), txtW) * 0.5, 0.0, 1.0);
  ie = 1.0 - pow(1.0 - ie, 3.0);
  p = mix(p * 2.4 + (gS.zyx - 0.5) * 18.0, p, ie);
  alpha *= ie;

  // ---- page-transition burst: everything is thrown outward and falls back
  p += normalize(p + 1e-3) * uBurst * (2.0 + gS.z * 7.0);
  alpha *= 1.0 - uBurst * 0.35;

  // ---- global transform
  p *= uScale;
  float ry = mix(uRotY, uPar.x * 0.4, txtW);           // the wordmark stays face-on, whatever the clock says
  float rx = mix(0.1 + uRotX, uPar.y * 0.4, txtW);
  p = rotX(rx) * rotY(ry) * p;
  p.xy += uOffset;
  p.y += uVel * (0.35 + gS.z) * 0.9;

  vec2 d = p.xy - uMouse;
  float r2 = dot(d, d);
  float push = exp(-r2 / 3.2) * uMouseK;
  p.xy += normalize(d + 1e-4) * push * 1.1;
  p.z  += push * (gS.w - 0.5) * 1.6;

  vec4 mv = vec4(p.x, p.y, p.z - 18.0, 1.0);   // camera sits at z = 18
  float depth = max(-mv.z, 0.5);
  gl_Position = uProj * mv;
  if (-mv.z < 0.3) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }   // behind the camera: cull

  float fade = clamp(1.0 - (depth - 15.0) / 24.0, 0.25, 1.0);

  vec2 ndc = gl_Position.xy / gl_Position.w;
  float soft = 0.22;
  float inX = smoothstep(uClear.x - soft, uClear.x + soft, ndc.x) * (1.0 - smoothstep(uClear.z - soft, uClear.z + soft, ndc.x));
  float inY = smoothstep(uClear.y - soft, uClear.y + soft, ndc.y) * (1.0 - smoothstep(uClear.w - soft, uClear.w + soft, ndc.y));
  float clear = 1.0 - uClearK * 0.93 * inX * inY;
  clear *= 1.0 - 0.9 * smoothstep(0.80, 0.93, ndc.y);

  if (uMode > 0.5) {
    vColor = mix(uFg, uCobalt, 0.6);
    // bonds fade out early while a crystal dissolves, and in late while one forms
    float bf = 1.0;
    if (k0 >= 5 && k1 < 5) bf = 1.0 - smoothstep(0.0, 0.35, f);
    else if (k0 < 5 && k1 >= 5) bf = smoothstep(0.65, 1.0, f);
    else if (k0 == 7) bf = smoothstep(0.5, 0.84, f);
    vAlpha = uBondA * latW * surv * (1.0 - orb) * alpha * clear * fade * bf;
    return;
  }

  vAlpha = alpha * clsAlpha * fade * clear * mix(0.62, 1.0, txtW);
  vColor = col;

  float base = (0.75 + 1.25 * gS.z * gS.z * gS.z) * uSize * size * sizeSpec;
  gl_PointSize = clamp(base * uPx * (18.0 / depth), 1.0, 56.0);
}
`;

export const fragmentShader = /* glsl */ `#version 300 es
precision mediump float;
in vec3  vColor;
in float vAlpha;
uniform highp float uMode;
out vec4 fragColor;

void main() {
  float a = vAlpha;
  if (uMode < 0.5) {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = 1.0 - smoothstep(0.0, 0.55, d);
    float halo = pow(1.0 - clamp(d, 0.0, 1.0), 2.2);
    a *= core * 0.8 + halo * 0.45;          // bright core with a soft glow
  }
  if (a < 0.01) discard;
  fragColor = vec4(vColor * a, a);   // premultiplied, blended additively
}
`;
