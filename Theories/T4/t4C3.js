import { add, subtract, logToExp, convertTime } from "../../type_converters.js";

export function t4C3(data) {
  const lastPub = data.rho;
  let getTotMult = (val) =>
    val * 0.165 -
    Math.log10(4) +
    Math.log10(
      (data.sigma / 20) **
        (data.sigma < 65 ? 0 : data.sigma < 75 ? 1 : data.sigma < 85 ? 2 : 3)
    );
  const totMult = getTotMult(lastPub);

  let results = [];

  let dt = 1.5;
  let t = 0;

  let rho = 0;
  let maxRho = 0;

  let q = 0;

  let c1 = 1;
  let c2 = 0;
  let c3 = 0;
  let q1 = 0;
  let q2 = 0;

  let c1_c = Math.log10(5);
  let c2_c = Math.log10(20);
  let c3_c = Math.log10(2000);
  let q1_c = 3;
  let q2_c = 4;

  let c1lvl = 1;
  let q1lvl = 0;

  let c1weight = 0;
  let q1weight = 0;

  let log2 = Math.log10(2);

  let startTime;

  let curMult = 0;

  let coast = data.coast;
  let cap = [data.cap || 100000, 1];

  let maxTauH = 0;
  let tauH = 0;
  let pubT;
  let drho;
  let maxT;
  let pubDRho;
  let pubRho;

  let mc1exp = 0;
  let mMultQDot = 0;

  function updateMilestones() {
    mc1exp = 0;
    mMultQDot = 0;
    const val = Math.max(lastPub, maxRho);
    if (val >= 25) mMultQDot++;
    if (val >= 50) mMultQDot++;
    if (val >= 75) mMultQDot++;
    if (val >= 100) mc1exp++;
  }

  updateMilestones();

  function simulate() {
    if (t == 0) startTime = performance.now();
    if (rho > maxRho) maxRho = rho;

    if (lastPub < 176) updateMilestones();

    let vq1 = q1;
    let vq2 = log2 * q2;
    let vc1 = c1 * (1 + 0.15 * mc1exp);
    let vc2 = log2 * c2;
    let vc3 = log2 * c3;

    let qdot = log2 * mMultQDot + vq1 + vq2 - add(0, q);
    q = add(q, qdot + Math.log10(dt));

    let rhodot = totMult + Math.log10(dt) + add(vc1 + vc2, vc3 + q);
    rho = add(rho, rhodot);

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

    buy();
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
        "T4",
        data.sigma,
        logToExp(data.rho, 2),
        logToExp(pubRho, 2),
        logToExp(NEWdrho, 2),
        (10 ** bestAddMult).toFixed(5),
        `T4C3`,
        maxTauH.toFixed(7),
        convertTime(pubT),
        [pubRho, pubT, true],
      ];
    }
  }

  function buy() {
    while (q2_c <= rho) {
      rho = subtract(rho, q2_c);
      q2_c += 3;
      q2++;
    }
    while (q1_c <= rho) {
      rho = subtract(rho, q1_c);
      q1_c += 2;
      q1 = add(q1, log2 * Math.floor(q1lvl / 10));
      q1lvl++;
    }
    while (c3_c <= rho) {
      rho = subtract(rho, c3_c);
      c3_c += Math.log10(2.468);
      c3++;
    }
    while (c2_c <= rho && false) {
      rho = subtract(rho, c2_c);
      c2_c += Math.log10(3.75);
      c2++;
    }
    while (c1_c <= rho && false) {
      rho = subtract(rho, c1_c);
      c1_c += Math.log10(1.305);
      c1 = add(c1, log2 * Math.floor(c1lvl / 10));
      c1lvl++;
    }
  }
}
