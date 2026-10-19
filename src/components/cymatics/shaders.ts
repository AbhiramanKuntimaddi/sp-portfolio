/*
 * Chladni plate. A square plate vibrating in mode (n, m) has the displacement
 *   f(x, y) = cos(nπx)·cos(mπy) + s·cos(mπx)·cos(nπy)
 * Sand is thrown about where |f| is large and comes to rest on the nodal
 * lines where f = 0. The sim does exactly that: random kicks scaled by |f|,
 * plus a Newton step that slides each grain toward the nearest node.
 */
const PLATE = /* glsl */ `
const float PI = 3.14159265;
uniform float uN;
uniform float uM;
uniform float uS;

float plate(vec2 q) {
  return cos(uN * PI * q.x) * cos(uM * PI * q.y) + uS * cos(uM * PI * q.x) * cos(uN * PI * q.y);
}

vec2 plateGrad(vec2 q) {
  float nx = uN * PI * q.x, ny = uN * PI * q.y, mx = uM * PI * q.x, my = uM * PI * q.y;
  return vec2(
    -uN * PI * sin(nx) * cos(my) - uS * uM * PI * sin(mx) * cos(ny),
    -uM * PI * cos(nx) * sin(my) - uS * uN * PI * cos(mx) * sin(ny)
  );
}
`;

export const QUAD_VS = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const SIM_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
${PLATE}
uniform sampler2D uState;
uniform float uTime;
uniform float uDt;
uniform float uAspect;
uniform float uScale;
uniform float uEnergy;
uniform float uSettle;
uniform vec3 uPointer;
// Her name: per-grain target (xy) and whether this grain belongs to a letter (z).
uniform sampler2D uTargets;
uniform float uForm;
uniform float uScatter;
out vec4 outState;

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

void main() {
  vec4 st = texelFetch(uState, ivec2(gl_FragCoord.xy), 0);
  vec2 p = st.xy;
  float seed = st.z;

  vec2 q = p * uScale;
  float f = plate(q);
  float amp = abs(f) / (1.0 + abs(uS));
  vec2 g = plateGrad(q);
  float glen = length(g) + 1e-4;
  vec2 rnd = hash22(vec2(seed * 917.13 + uTime * 61.7, gl_FragCoord.x * 0.37 + gl_FragCoord.y * 1.91 + uTime * 13.1)) * 2.0 - 1.0;

  // The plate throws sand where it moves...
  vec2 v = rnd * amp * uEnergy * 0.03;
  // ...and it slides down to rest on the nodal lines.
  float dist = min(abs(f) / glen, 0.06) / uScale;
  v += -sign(f) * (g / glen) * dist * uSettle;
  // A faint tremor keeps the lines soft, like real powder.
  v += rnd * 0.0006;

  // The pointer is a fingertip on the plate: it pushes and scatters.
  vec2 d = p - uPointer.xy;
  float r = length(d);
  float touch = uPointer.z * smoothstep(0.32, 0.0, r);
  v += (d / (r + 1e-3)) * touch * 0.01 + rnd * touch * 0.018;

  // While forming, letter grains glide to their place in the name instead.
  vec4 tg = texelFetch(uTargets, ivec2(gl_FragCoord.xy), 0);
  float form = uForm * tg.z;
  if (form > 0.001) {
    vec2 pull = (tg.xy - p) * 0.085 + rnd * 0.0012;
    v = mix(v, pull, form);
  }

  // Released from the name, each grain first flies to its own home spot
  // spread across the whole plate, so the pattern fills the page again.
  if (uScatter > 0.001) {
    vec2 home = (hash22(vec2(seed * 311.7, seed * 83.3 + 7.1)) * 2.0 - 1.0) * vec2(uAspect, 1.0);
    vec2 fly = (home - p) * 0.07 + rnd * 0.002;
    v = mix(v, fly, uScatter);
  }

  p += v * uDt;

  vec2 lim = vec2(uAspect, 1.0) * 1.04;
  if (p.x > lim.x) p.x -= 2.0 * lim.x;
  if (p.x < -lim.x) p.x += 2.0 * lim.x;
  if (p.y > lim.y) p.y -= 2.0 * lim.y;
  if (p.y < -lim.y) p.y += 2.0 * lim.y;

  outState = vec4(p, seed, st.w);
}
`;

export const DRAW_VS = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
${PLATE}
uniform sampler2D uState;
uniform int uWidth;
uniform float uAspect;
uniform float uScale;
uniform float uSize;
uniform float uIntensity;
uniform sampler2D uTargets;
uniform float uForm;
out float vAlpha;
out float vGlint;

void main() {
  ivec2 c = ivec2(gl_VertexID % uWidth, gl_VertexID / uWidth);
  vec4 st = texelFetch(uState, c, 0);
  vec2 p = st.xy;
  float amp = abs(plate(p * uScale)) / (1.0 + abs(uS));
  // Grains at rest on a node glow; grains in flight are faint.
  vAlpha = (1.0 - 0.82 * smoothstep(0.02, 0.4, amp)) * uIntensity;
  // While her name is forming, only the letters show; a grain with no letter
  // yet (before the type is measured) stays hidden.
  float letter = texelFetch(uTargets, c, 0).z;
  vAlpha = mix(vAlpha, 0.85 * letter, uForm);
  vGlint = step(0.93, fract(st.z * 7.31));
  gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
  gl_PointSize = uSize * (0.65 + 0.7 * fract(st.z * 3.7));
}
`;

export const DRAW_FS = /* glsl */ `#version 300 es
precision highp float;
uniform vec3 uInk;
uniform vec3 uGlintInk;
in float vAlpha;
in float vGlint;
out vec4 outColor;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.05, d) * vAlpha * 0.55;
  vec3 col = mix(uInk, uGlintInk, vGlint);
  outColor = vec4(col * a, a);
}
`;
