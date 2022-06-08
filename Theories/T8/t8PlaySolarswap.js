import { add, subtract, logToExp, convertTime } from "../../type_converters.js";

export function t8PlaySolarswap(data) {
  const lastPub = data.rho;
  let getTotMult = (val) =>
    val * 0.15 +
    Math.log10(
      (data.sigma / 20) **
        (data.sigma < 65 ? 0 : data.sigma < 75 ? 1 : data.sigma < 85 ? 2 : 3)
    );
  const totMult = getTotMult(lastPub);

  let rdt = 0.00014;
  let dt = 1.5;
  let t = 0;

  let rho = 0;
  let maxRho = 0;

  let c1 = 1;
  let c2 = 0;
  let c3 = 0;
  let c4 = 0;
  let c5 = 0;

  let c1_c = 1;
  let c2_c = Math.log10(20);
  let c3_c = 2;
  let c4_c = 2;
  let c5_c = 2;

  let c1lvl = 1;

  let c1weight = 0;

  let curMult = 1;

  let deafultStates = [-6, 15, 0];

  let bounds = [
    [1, -20, 22],
    [-1.5, -21, 18],
    [8, 0, 37],
  ];

  let x = -6;
  let y = 15;
  let z = 0;

  let dx, dy, dz;

  let msTimer = 0;

  let log2 = Math.log10(2);

  let drhos = [];

  let startTime;

  let coast = data.coast;
  let cap = [data.cap || 100000, 0.5];

  let maxTauH = 0;
  let tauH = 0;
  let pubT;
  let drho;
  let maxT;
  let pubDRho;
  let pubRho;

  let logged = false;

  function simulate() {
    if (t == 0) startTime = performance.now();
    if (rho > maxRho) maxRho = rho;

    dx = -500 * (y + z);
    dy = 500 * x + 50 * y;
    dz = 50 + 500 * z * (x - 14);

    let midpointx = x + dx * 0.5 * rdt;
    let midpointy = y + dy * 0.5 * rdt;
    let midpointz = z + dz * 0.5 * rdt;

    dx = -500 * (midpointy + midpointz);
    dy = 500 * midpointx + 50 * midpointy;
    dz = 50 + 500 * midpointz * (midpointx - 14);

    x += dx * rdt;
    y += dy * rdt;
    z += dz * rdt;

    dx = -500 * (y + z);
    dy = 500 * x + 50 * y;
    dz = 50 + 500 * z * (x - 14);

    let xlowerBound = (bounds[0][1] - bounds[0][0]) * 5 + bounds[0][0];
    let xupperBound = (bounds[0][2] - bounds[0][0]) * 5 + bounds[0][0];
    let ylowerBound = (bounds[1][1] - bounds[1][0]) * 5 + bounds[1][0];
    let yupperBound = (bounds[1][2] - bounds[1][0]) * 5 + bounds[1][0];
    let zlowerBound = (bounds[2][1] - bounds[2][0]) * 5 + bounds[2][0];
    let zupperBound = (bounds[2][2] - bounds[2][0]) * 5 + bounds[2][0];

    if (
      x < xlowerBound ||
      x > xupperBound ||
      y < ylowerBound ||
      y > yupperBound ||
      z < zlowerBound ||
      z > zupperBound
    ) {
      x = deafultStates[0];
      y = deafultStates[1];
      z = deafultStates[2];
    }

    dx = -500 * (y + z);
    dy = 500 * x + 50 * y;
    dz = 50 + 500 * z * (x - 14);
    msTimer++;

    if (msTimer == 335) {
      x = deafultStates[0];
      y = deafultStates[1];
      z = deafultStates[2];
      msTimer = 0;
    }

    let vc1 = c1;
    let vc2 = log2 * c2;
    let vc3 = Math.log10(3) * c3 * 1.15;
    let vc4 = Math.log10(5) * c4 * 1.15;
    let vc5 = Math.log10(7) * c5 * 1.15;

    let dx2Term = vc3 + Math.log10(dx * dx);
    let dy2Term = vc4 + Math.log10(dy * dy);
    let dz2Term = vc5 + Math.log10(dz * dz);

    let rhodot =
      Math.log10(dt) +
      totMult +
      vc1 +
      vc2 +
      add(add(dx2Term, dy2Term), dz2Term) / 2 -
      2;
    rho = add(rho, rhodot);

    dt *= 1.0001;
    t += dt / 1.5;

    drho = maxRho - lastPub;
    tauH = Math.max(0, drho / (t / 3600));
    if (maxTauH < tauH) {
      maxTauH = tauH;
      pubDRho = drho;
      maxT = t * 3;
      pubT = t;
      pubRho = maxRho;
    }

    curMult = 10 ** (getTotMult(maxRho) - totMult);

    if (curMult < coast || coast == 0) buy();
  }
  while (true) {
    simulate();
    if (
      ((tauH >= maxTauH || t < maxT || pubRho >= cap[0] - cap[1]) &&
        maxRho < cap[0]) === false
    ) {
      if (pubRho >= cap[0] - cap[1]) {
        maxTauH = tauH;
        maxT = t * 2.5;
        pubT = t;
        pubRho = maxRho;
      }
      const NEWdrho = pubRho - lastPub;

      let bestAddMult = getTotMult(pubRho) - totMult;
      return [
        "T8",
        data.sigma,
        logToExp(data.rho, 2),
        logToExp(pubRho, 2),
        logToExp(NEWdrho, 2),
        (10 ** bestAddMult).toFixed(5),
        `T8PlaySolarswap`,
        maxTauH.toFixed(7),
        convertTime(pubT),
        [pubRho, pubT],
      ];
    }
  }

  function buy() {
    while (c5_c <= rho && c5_c + Math.log10(2.5) <= Math.min(c2_c, c4_c)) {
      rho = subtract(rho, c5_c);
      c5_c += 1.15 * Math.log10(7);
      c5++;
    }
    while (c4_c <= rho) {
      rho = subtract(rho, c4_c);
      c4_c += 1.15 * Math.log10(5);
      c4++;
    }
    while (c3_c <= rho && c3_c + Math.log10(2.5) <= Math.min(c2_c, c4_c)) {
      rho = subtract(rho, c3_c);
      c3_c += 1.15 * Math.log10(3);
      c3++;
    }
    while (c2_c <= rho) {
      rho = subtract(rho, c2_c);
      c2_c += Math.log10(64);
      c2++;
    }
    while (c1_c <= rho && c1_c + c1weight <= Math.min(c2_c, c4_c)) {
      rho = subtract(rho, c1_c);
      c1_c += Math.log10(1.5172);
      c1 = add(c1, log2 * Math.floor(c1lvl / 10));
      c1lvl++;
      c1weight = Math.log10(10 + (c1lvl % 10)) * (1 / 1.2);
    }
  }
}
