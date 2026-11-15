/**
 * How much WebGL this device starts with.
 *
 * Everyone gets the same scene and the same design. We no longer guess quality from a GPU's
 * name: every desktop, software-rendered browsers included, starts at the full scene, and the
 * frame-time governor in field.js steps it down only if the page genuinely stutters.
 * Phones start lighter because 40,000 glowing points is more than a phone should be asked
 * to draw, but they get the same crystal, bonds, ripples and transitions.
 *
 * Returns null only when WebGL2 itself is unavailable, or ?tier=off is forced for testing.
 */
const SOFTWARE = /swiftshader|llvmpipe|software|basic render|microsoft basic|mesa offscreen/i;

const PRESETS = {
  high: { name: 'high', count: 40000, latCount: 6000, fps: 60, bonds: true },
  mid: { name: 'mid', count: 22000, latCount: 4500, fps: 60, bonds: true },
  // software rendering: the same full scene, drawn at half rate so the CPU stays cool
  soft: { name: 'soft', count: 40000, latCount: 6000, fps: 30, bonds: true },
  low: { name: 'low', count: 14000, latCount: 3500, fps: 30, bonds: true },
};

export function detectTier() {
  // ?tier=off|low|mid|high forces a budget, used by the performance tests
  const forced = new URLSearchParams(location.search).get('tier');
  if (forced === 'off') return null;
  const dpr = window.devicePixelRatio || 1;
  if (forced && PRESETS[forced]) {
    return { ...PRESETS[forced], dprMax: Math.min(dpr, forced === 'high' ? 1.5 : 1.25), renderer: 'forced' };
  }

  let renderer = '';
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  } catch {
    return null;
  }

  if (SOFTWARE.test(renderer)) return { ...PRESETS.soft, dprMax: 1, software: true, renderer };

  const mobile = innerWidth <= 820 || matchMedia('(pointer: coarse)').matches;
  const weak = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 4) <= 2;
  if (mobile || weak) return { ...PRESETS.low, dprMax: Math.min(dpr, 1.25), renderer };
  return { ...PRESETS.high, dprMax: Math.min(dpr, 1.5), renderer };
}
