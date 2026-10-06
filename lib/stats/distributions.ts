/**
 * Double-precision probability distributions for the on-device engine.
 *
 * These replace the Abramowitz–Stegun 26.2.17 CDF (~1e-7 absolute error) used
 * by the original prototype. The algorithms are the same ones R's `nmath`
 * library uses and agree with `scipy.stats` to ~1e-15 for the normal and
 * ~1e-12 for Student's t (see tests/stats.parity.test.ts):
 *
 *  - Normal CDF:      W. J. Cody (1969), rational Chebyshev approximations.
 *  - Normal quantile: M. J. Wichura (1988), Algorithm AS 241 (PPND16).
 *  - Student's t:     regularized incomplete beta via Lentz's continued fraction.
 */

const SQRT_32 = 5.656854249492380195206754896838;
const ONE_OVER_SQRT_2PI = 0.398942280401432677939946059934;
const EPS = Number.EPSILON;

// Cody's coefficients ---------------------------------------------------------
const A = [
  2.2352520354606839287, 161.02823106855587881, 1067.6894854603709582, 18154.981253343561249,
  0.065682337918207449113,
] as const;
const B = [47.20258190468824187, 976.09855173777669322, 10260.932208618978205, 45507.789335026729956] as const;
const C = [
  0.39894151208813466764, 8.8831497943883759412, 93.506656132177855979, 597.27027639480026226,
  2494.5375852903726711, 6848.1904505362823326, 11602.651437647350124, 9842.7148383839780218,
  1.0765576773720192317e-8,
] as const;
const D = [
  22.266688044328115691, 235.38790178262499861, 1519.377599407554805, 6485.558298266760755,
  18615.571640885098091, 34900.952721145977266, 38912.003286093271411, 19685.429676859990727,
] as const;
const P = [
  0.21589853405795699, 0.1274011611602473639, 0.022235277870649807, 0.001421619193227893466,
  2.9112874951168792e-5, 0.02307344176494017303,
] as const;
const Q = [
  1.28426009614491121, 0.468238212480865118, 0.0659881378689285515, 0.00378239633202758244,
  7.29751555083966205e-5,
] as const;

/** Returns `[Φ(x), 1 − Φ(x)]`, each accurate in its own tail. */
function normalBothTails(x: number): [number, number] {
  if (Number.isNaN(x)) return [NaN, NaN];
  if (x === Infinity) return [1, 0];
  if (x === -Infinity) return [0, 1];

  const y = Math.abs(x);
  let cum: number;
  let ccum: number;

  if (y <= 0.67448975) {
    let xnum = 0;
    let xden = 0;
    if (y > EPS) {
      const xsq = x * x;
      xnum = A[4] * xsq;
      xden = xsq;
      for (let i = 0; i < 3; i++) {
        xnum = (xnum + A[i]!) * xsq;
        xden = (xden + B[i]!) * xsq;
      }
    }
    const temp = (x * (xnum + A[3])) / (xden + B[3]);
    return [0.5 + temp, 0.5 - temp];
  }

  let temp: number;
  if (y <= SQRT_32) {
    let xnum = C[8] * y;
    let xden = y;
    for (let i = 0; i < 7; i++) {
      xnum = (xnum + C[i]!) * y;
      xden = (xden + D[i]!) * y;
    }
    temp = (xnum + C[7]) / (xden + D[7]);
  } else {
    const xsq = 1 / (x * x);
    let xnum = P[5] * xsq;
    let xden = xsq;
    for (let i = 0; i < 4; i++) {
      xnum = (xnum + P[i]!) * xsq;
      xden = (xden + Q[i]!) * xsq;
    }
    temp = (xsq * (xnum + P[4])) / (xden + Q[4]);
    temp = (ONE_OVER_SQRT_2PI - temp) / y;
  }

  // Split exp(-y²/2) to avoid cancellation (Cody's "do_del").
  const xsq = Math.trunc(y * 16) / 16;
  const del = (y - xsq) * (y + xsq);
  cum = Math.exp(-xsq * xsq * 0.5) * Math.exp(-del * 0.5) * temp;
  ccum = 1 - cum;
  if (x > 0) [cum, ccum] = [ccum, cum];
  return [cum, ccum];
}

/** Standard normal cumulative distribution function Φ(x). */
export function normCdf(x: number, mean = 0, sd = 1): number {
  return normalBothTails((x - mean) / sd)[0];
}

/** Standard normal survival function 1 − Φ(x), exact in the far upper tail. */
export function normSf(x: number, mean = 0, sd = 1): number {
  return normalBothTails((x - mean) / sd)[1];
}

/** Normal probability density function. */
export function normPdf(x: number, mean = 0, sd = 1): number {
  if (sd <= 0) return NaN;
  const z = (x - mean) / sd;
  return (ONE_OVER_SQRT_2PI / sd) * Math.exp(-0.5 * z * z);
}

/** Normal quantile function Φ⁻¹(p) — Wichura's AS 241, ~1e-16 relative error. */
export function normPpf(p: number, mean = 0, sd = 1): number {
  if (Number.isNaN(p) || p < 0 || p > 1) return NaN;
  if (p === 0) return -Infinity;
  if (p === 1) return Infinity;

  const q = p - 0.5;
  let val: number;

  if (Math.abs(q) <= 0.425) {
    const r = 0.180625 - q * q;
    val =
      (q *
        (((((((r * 2509.0809287301226727 + 33430.575583588128105) * r + 67265.770927008700853) * r +
          45921.953931549871457) *
          r +
          13731.693765509461125) *
          r +
          1971.5909503065514427) *
          r +
          133.14166789178437745) *
          r +
          3.387132872796366608)) /
      (((((((r * 5226.495278852545925 + 28729.085735721942674) * r + 39307.89580009271061) * r +
        21213.794301586595867) *
        r +
        5394.1960214247511077) *
        r +
        687.1870074920579083) *
        r +
        42.313330701600911252) *
        r +
        1);
    return mean + sd * val;
  }

  let r = Math.sqrt(-Math.log(q < 0 ? p : 1 - p));
  if (r <= 5) {
    r -= 1.6;
    val =
      (((((((r * 7.7454501427834140764e-4 + 0.0227238449892691845833) * r + 0.24178072517745061177) * r +
        1.27045825245236838258) *
        r +
        3.64784832476320460504) *
        r +
        5.7694972214606914055) *
        r +
        4.6303378461565452959) *
        r +
        1.42343711074968357734) /
      (((((((r * 1.05075007164441684324e-9 + 5.475938084995344946e-4) * r + 0.0151986665636164571966) * r +
        0.14810397642748007459) *
        r +
        0.68976733498510000455) *
        r +
        1.6763848301838038494) *
        r +
        2.05319162663775882187) *
        r +
        1);
  } else {
    r -= 5;
    val =
      (((((((r * 2.01033439929228813265e-7 + 2.71155556874348757815e-5) * r + 0.0012426609473880784386) * r +
        0.026532189526576123093) *
        r +
        0.29656057182850489123) *
        r +
        1.7848265399172913358) *
        r +
        5.4637849111641143699) *
        r +
        6.6579046435011037772) /
      (((((((r * 2.04426310338993978564e-15 + 1.4215117583164458887e-7) * r + 1.8463183175100546818e-5) * r +
        7.868691311456132591e-4) *
        r +
        0.0148753612908506148525) *
        r +
        0.13692988092273580531) *
        r +
        0.59983220655588793769) *
        r +
        1);
  }
  if (q < 0) val = -val;
  return mean + sd * val;
}

// Gamma / Beta ----------------------------------------------------------------

const LANCZOS_G = 7;
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
] as const;

/** ln Γ(x) for x > 0 (Lanczos, g = 7). */
export function logGamma(x: number): number {
  if (x < 0.5) {
    // Reflection formula.
    return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - logGamma(1 - x);
  }
  const z = x - 1;
  let a = LANCZOS[0];
  const t = z + LANCZOS_G + 0.5;
  for (let i = 1; i < LANCZOS.length; i++) a += LANCZOS[i]! / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Continued fraction for the incomplete beta function (modified Lentz). */
function betaContinuedFraction(x: number, a: number, b: number): number {
  const MAX_ITER = 500;
  const TINY = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return h;
}

/** Stirling-series remainder δ(x) = lnΓ(x) − [(x − ½)ln x − x + ½ln 2π], for x ≥ 10. */
function stirlingCorrection(x: number): number {
  const x2 = 1 / (x * x);
  return (1 / 12 - x2 * (1 / 360 - x2 * (1 / 1260 - x2 * (1 / 1680 - x2 / 1188)))) / x;
}

/**
 * ln B(a, b). For large arguments the naive lnΓ(a) + lnΓ(b) − lnΓ(a + b) loses
 * digits to cancellation (e.g. Welch df ≈ 50 000), so the Stirling form is used.
 */
export function logBeta(a: number, b: number): number {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (hi < 10) return logGamma(a) + logGamma(b) - logGamma(a + b);
  if (lo >= 10) {
    const corr = stirlingCorrection(lo) + stirlingCorrection(hi) - stirlingCorrection(lo + hi);
    return -0.5 * Math.log(hi) + 0.5 * Math.log(2 * Math.PI) + corr + (lo - 0.5) * Math.log(lo / (lo + hi)) + hi * Math.log1p(-lo / (lo + hi));
  }
  // lo < 10 ≤ hi: lnΓ(hi) − lnΓ(hi + lo) via the Stirling form.
  const corr = stirlingCorrection(hi) - stirlingCorrection(hi + lo);
  return logGamma(lo) + corr - lo * Math.log(hi) + lo - (hi + lo - 0.5) * Math.log1p(lo / hi);
}

/**
 * Regularized incomplete beta function I_x(a, b).
 * `y` = 1 − x may be supplied when it can be computed without cancellation.
 */
export function regularizedIncompleteBeta(x: number, a: number, b: number, y = 1 - x): number {
  if (x <= 0) return 0;
  if (y <= 0) return 1;
  const front = Math.exp(a * Math.log(x) + b * Math.log(y) - logBeta(a, b));
  if (x < (a + 1) / (a + b + 2)) return (front * betaContinuedFraction(x, a, b)) / a;
  return 1 - (front * betaContinuedFraction(y, b, a)) / b;
}

// Student's t -------------------------------------------------------------------

/** Student's t survival function P(T > t). */
export function tSf(t: number, df: number): number {
  if (Number.isNaN(t) || !(df > 0)) return NaN;
  if (!Number.isFinite(df)) return normSf(t);
  if (t === Infinity) return 0;
  if (t === -Infinity) return 1;
  const t2 = t * t;
  const tail = 0.5 * regularizedIncompleteBeta(df / (df + t2), df / 2, 0.5, t2 / (df + t2));
  return t > 0 ? tail : 1 - tail;
}

/** Student's t cumulative distribution function P(T ≤ t). */
export function tCdf(t: number, df: number): number {
  return tSf(-t, df);
}

/** Student's t density. */
export function tPdf(t: number, df: number): number {
  const lnC = -logBeta(df / 2, 0.5) - 0.5 * Math.log(df);
  return Math.exp(lnC - ((df + 1) / 2) * Math.log1p((t * t) / df));
}

/** Student's t quantile via safeguarded Newton iterations on the CDF. */
export function tPpf(p: number, df: number): number {
  if (Number.isNaN(p) || p < 0 || p > 1 || !(df > 0)) return NaN;
  if (p === 0) return -Infinity;
  if (p === 1) return Infinity;
  if (p === 0.5) return 0;
  if (!Number.isFinite(df) || df > 1e7) return normPpf(p);

  // Symmetry: solve in the upper half for stability.
  const upper = p > 0.5;
  const target = upper ? 1 - p : p; // lower-tail probability < 0.5
  // Cornish–Fisher start from the normal quantile.
  const z = normPpf(target);
  let x =
    z +
    (z ** 3 + z) / (4 * df) +
    (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df * df);

  let lo = -1e8;
  let hi = 0;
  for (let i = 0; i < 100; i++) {
    const f = tCdf(x, df) - target;
    if (Math.abs(f) < 1e-15 * Math.max(target, 1e-300)) break;
    if (f > 0) hi = Math.min(hi, x);
    else lo = Math.max(lo, x);
    const step = f / tPdf(x, df);
    let next = x - step;
    if (!Number.isFinite(next) || next <= lo || next >= hi) next = (lo + hi) / 2;
    if (Math.abs(next - x) <= 1e-15 * Math.max(1, Math.abs(x))) {
      x = next;
      break;
    }
    x = next;
  }
  return upper ? -x : x;
}
