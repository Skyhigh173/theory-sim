import { add, subtract, logToExp, convertTime } from "../../type_converters.js";

export function t7(data) {
  const lastPub = data.rho;
  let getTotMult = (val) =>
    val * 0.152 +
    Math.log10(
      (data.sigma / 20) **
        (data.sigma < 65 ? 0 : data.sigma < 75 ? 1 : data.sigma < 85 ? 2 : 3)
    );
  const totMult = getTotMult(lastPub);

  let dt = 1.5;
  let t = 0;

  let rho = 0;
  let rho2 = 0;
  let maxRho = 0;

  let q1 = 1;
  let c1 = 0;
  let c2 = 0;
  let c3 = 0;
  let c4 = 0;
  let c5 = 0;
  let c6 = 0;

  let q1_c = Math.log10(500);
  let c1_c = 1;
  let c2_c = Math.log10(40);
  let c3_c = 5;
  let c4_c = 1;
  let c5_c = 8;
  let c6_c = 2;

  let drho13 = 0;
  let drho23 = 0;

  let q1lvl = 1;
  let c1lvl = 0;

  let c1weight = 0;
  let q1weight = 0;

  let curMult = 1;

  let coast = data.coast;
  let cap = [data.cap || 100000, 0.5];

  let log2 = Math.log10(2);

  let startTime;

  let maxTauH = 0;
  let tauH = 0;
  let pubT;
  let drho;
  let maxT;
  let pubDRho;
  let pubRho;

  let dimension = 0;
  let r12term = 0;
  let r22term = 0;
  let r1r2term = 0;
  let c1exp = 0;

  function updateMilestones() {
    let val = Math.max(lastPub, maxRho);
    if (val >= 25) r12term = 1;
    if (val >= 50) c1exp = 1;
    if (val >= 75) {
      r12term = 0;
      c1exp = 3;
    }
    if (val >= 100) r12term = 1;
    if (val >= 125) {
      dimension = 1;
      r12term = 1;
      r22term = 1;
      r1r2term = 1;
      c1exp = 1;
    }
    if (val >= 150) c1exp = 2;
    if (val >= 175) c1exp = 3;
  }

  updateMilestones();

  function simulate() {
    if (t == 0) startTime = performance.now();
    if (rho > maxRho) maxRho = rho;

    if (lastPub < 175) updateMilestones();

    let vq1 = q1;
    let vc1 = c1 * (1 + 0.05 * c1exp);
    let vc2 = log2 * c2;
    let vc3 = log2 * c3;
    let vc4 = log2 * c4;
    let vc5 = log2 * c5;
    let vc6 = log2 * c6;

    let drho11 = vc1 + vc2;
    let drho12 = r12term > 0 ? Math.log10(1.5) + vc3 + rho / 2 : 0;
    let drho21 = dimension > 0 ? vc4 : 0;
    let drho22 = r22term > 0 ? Math.log10(1.5) + vc5 + rho2 / 2 : 0;
    drho13 =
      r1r2term > 0
        ? Math.min(
            drho13 + 2,
            Math.min(Math.log10(0.5) + vc6 + rho2 / 2 - rho / 2, rho + 2)
          )
        : 0;
    drho23 =
      r1r2term > 0
        ? Math.min(
            drho23 + 2,
            Math.min(Math.log10(0.5) + vc6 + rho / 2 - rho2 / 2, rho2 + 2)
          )
        : 0;
    let dtq1bonus = Math.log10(dt) + vq1 + totMult;

    rho = add(rho, dtq1bonus + add(add(drho11, drho12), drho13));
    rho2 = add(rho2, dtq1bonus + add(add(drho21, drho22), drho23));

    t += dt / 1.5;
    dt *= 1.0001;

    drho = maxRho - lastPub;
    tauH = Math.max(0, drho / (t / 3600));
    if (maxTauH < tauH) {
      maxTauH = tauH;
      pubDRho = drho;
      maxT = t * 2;
      pubT = t;
      pubRho = maxRho;
    }

    curMult = 10 ** (getTotMult(maxRho) - totMult);

    if (10 ** curMult < coast || coast == 0) buy();
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
        "T7",
        data.sigma,
        logToExp(data.rho, 2),
        logToExp(pubRho, 2),
        logToExp(NEWdrho, 2),
        (10 ** bestAddMult).toFixed(5),
        `T7`,
        maxTauH.toFixed(7),
        convertTime(pubT),
        [pubRho, pubT, true],
      ];
    }
  }

  function buy() {
    while (c6_c <= rho && r1r2term > 0) {
      rho = subtract(rho, c6_c);
      c6_c += Math.log10(2.81);
      c6++;
    }
    while (c5_c <= rho && r22term > 0) {
      rho = subtract(rho, c5_c);
      c5_c += Math.log10(60);
      c5++;
    }
    while (c4_c <= rho && dimension > 0) {
      rho = subtract(rho, c4_c);
      c4_c += Math.log10(2.82);
      c4++;
    }
    while (c3_c <= rho && r12term > 0) {
      rho = subtract(rho, c3_c);
      c3_c += Math.log10(63);
      c3++;
    }
    while (c2_c <= rho) {
      rho = subtract(rho, c2_c);
      c2_c += Math.log10(8);
      c2++;
    }
    while (c1_c <= rho) {
      rho = subtract(rho, c1_c);
      c1_c += Math.log10(1.275);
      c1 = add(c1, log2 * Math.floor(c1lvl / 10));
      c1lvl++;
      c1weight = Math.log10(10 + (c1lvl % 10));
    }
    while (q1_c <= rho) {
      rho = subtract(rho, q1_c);
      q1_c += Math.log10(1.51572);
      q1 = add(q1, log2 * Math.floor(q1lvl / 10));
      q1lvl++;
      q1weight = Math.log10(10 + (q1lvl % 10));
    }
  }
}
