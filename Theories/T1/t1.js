import {
  log10,
  add,
  subtract,
  logToExp,
  convertTime,
} from "../../type_converters.js";

export function t1(data) {
  const lastPub = data.rho;
  let getTotMult = (val) =>
    val * 0.164 -
    Math.log10(3) +
    Math.log10(
      (data.sigma / 20) **
        (data.sigma < 65 ? 0 : data.sigma < 75 ? 1 : data.sigma < 85 ? 2 : 3)
    );
  const totMult = lastPub > 10 ? getTotMult(lastPub) : 0;

  let dt = 1.5;
  let t = 0;

  let rho = 0;
  let maxRho = 0;

  let rhom1 = 0;
  let rhom2 = 0;

  let q1 = 0;
  let q2 = 0;

  let c1 = -Infinity;
  let c2 = 0;
  let c3 = 0;
  let c4 = 0;

  let q1_c = Math.log10(5);
  let q2_c = 2;

  let c1_c = Math.log10(15);
  let c2_c = Math.log10(3000);
  let c3_c = 4;
  let c4_c = 10;

  let c1lvl = 0;
  let q1lvl = 1;

  let q1weight = 0;
  let c1weight = 0;

  let term1;
  let term2;
  let term3;

  let log2 = Math.log10(2);

  let curMult;
  let coast = data.coast;

  let cap = [data.cap || 100000, 0.5];

  let maxTauH = 0;
  let tauH = 0;
  let pubT;
  let drho;
  let maxT;
  let pubRho;

  let mc1exp = 0;
  let mlogterm = 0;
  let mc3term = 0;
  let mc4term = 0;

  function updateMilestones() {
    let amount = Math.floor(Math.max(lastPub, maxRho) / 25);
    if (amount > 0) mc3term = 1;
    if (amount > 1) mc4term = 1;
    if (amount > 2) mlogterm = 1;
    if (amount > 3) mc1exp = Math.min(amount - 3, 3);
  }
  updateMilestones();

  function simulate() {
    if (rho > maxRho) maxRho = rho;

    if (lastPub < 200) updateMilestones();

    rhom2 = rhom1;
    rhom1 = rho;

    let vc3 = mc3term > 0 ? c3 + rhom1 * 0.2 : 0;
    let vc4 = mc4term > 0 ? c4 + rhom2 * 0.3 : 0;

    term1 =
      c1 * (1 + 0.05 * mc1exp) +
      log2 * c2 +
      (mlogterm > 0 ? Math.log10(1 + rho / Math.LOG10E / 100) : 0);

    term2 = add(vc3, vc4);
    term3 = q1 + log2 * q2;

    let rhodot = add(term1, term2) + term3 + totMult + Math.log10(dt);
    rho = add(rho, rhodot);

    dt *= 1.0001;
    t += dt / 1.5;

    drho = maxRho - lastPub;
    tauH = Math.max(0, drho / (t / 3600));
    if (maxTauH < tauH) {
      maxTauH = tauH;
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
        maxRho < cap[0]) === false &&
      maxRho > 10
    ) {
      if (pubRho >= cap[0] - cap[1] || pubRho < 10) {
        maxTauH = tauH;
        maxT = t * 2.5;
        pubT = t;
        pubRho = maxRho;
      }
      const NEWdrho = pubRho - lastPub;

      let bestAddMult = getTotMult(pubRho) - totMult;
      return [
        "T1",
        data.sigma,
        logToExp(data.rho, 2),
        logToExp(pubRho, 2),
        logToExp(NEWdrho, 2),
        (10 ** bestAddMult).toFixed(5),
        `T1`,
        maxTauH.toFixed(7),
        convertTime(pubT),
        [pubRho, pubT, true],
      ];
    }
  }

  function buy() {
    while (c4_c <= rho && mc4term === 1) {
      rho = subtract(rho, c4_c);
      c4_c += 8;
      c4++;
    }
    while (c3_c <= rho && mc3term === 1) {
      rho = subtract(rho, c3_c);
      c3_c += 4.5;
      c3++;
    }
    while (c2_c <= rho) {
      rho = subtract(rho, c2_c);
      c2_c += 1;
      c2++;
    }
    while (c1_c <= rho) {
      rho = subtract(rho, c1_c);
      c1_c += log2;
      c1 = add(c1, log2 * Math.floor(c1lvl / 10));
      c1lvl++;
      c1weight = Math.log10(10 + (c1lvl % 10)) * (1 / 1.1);
    }
    while (q2_c + Math.log10(1.11) <= rho) {
      rho = subtract(rho, q2_c);
      q2_c += 1;
      q2++;
    }
    while (q1_c <= rho) {
      rho = subtract(rho, q1_c);
      q1_c += log2;
      q1 = add(q1, log2 * Math.floor(q1lvl / 10));
      q1lvl++;
      q1weight = Math.log10(8 + (q1lvl % 10) ** 0.8);
    }
  }
}
