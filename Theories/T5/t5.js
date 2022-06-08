import { add, subtract, logToExp, convertTime } from "../../type_converters.js";

export function t5(data) {
  const lastPub = data.rho;
  let getTotMult = (val) =>
    val * 0.159 +
    Math.log10(
      (data.sigma / 20) **
        (data.sigma < 65 ? 0 : data.sigma < 75 ? 1 : data.sigma < 85 ? 2 : 3)
    );
  const totMult = getTotMult(lastPub);

  let dt = 1.5;
  let t = 0;

  let rho = 0;
  let maxRho = 0;
  let q = 1;

  let q1 = 1;
  let q2 = 0;
  let c1 = 0;
  let c2 = 0;
  let c3 = 0;

  let q1_c = 1;
  let q2_c = Math.log10(15);
  let c1_c = 6;
  let c2_c = Math.log10(75);
  let c3_c = 3;

  let q1lvl = 1;
  let c1lvl = 0;

  let c1weight = 0;
  let q1weight = 0;

  let curMult = 1;

  const log2 = Math.log10(2);

  let startTime;

  let maxTauH = 0;
  let tauH = 0;
  let pubT;
  let drho;
  let maxT;
  let pubDRho;
  let pubRho;

  let coast = data.coast;
  let cap = [data.cap || 100000, 1];

  function simulate() {
    if (t == 0) startTime = performance.now();
    if (rho > maxRho) maxRho = rho;

    let vq1 = q1 * 1.15;
    let vq2 = log2 * q2;
    let vc1 = c1;
    let vc2 = log2 * c2;
    let vc3 = log2 * c3 * 1.1;
    let dq = vc1 - vc2 + q + subtract(vc3, q - vc2) + Math.log10(dt);

    q = add(q, Math.max(0, dq));
    q = Math.min(q, vc2 + vc3);
    rho = add(rho, totMult + vq1 + vq2 + q + Math.log10(dt));

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
        "T5",
        data.sigma,
        logToExp(data.rho, 2),
        logToExp(pubRho, 2),
        logToExp(NEWdrho, 2),
        (10 ** bestAddMult).toFixed(5),
        `T5`,
        maxTauH.toFixed(7),
        convertTime(pubT),
        [pubRho, pubT, true],
      ];
    }
  }

  function buy() {
    while (q1_c <= rho) {
      rho = subtract(rho, q1_c);
      q1_c += Math.log10(1.61328);
      q1 = add(q1, log2 * Math.floor(q1lvl / 10));
      q1lvl++;
      q1weight = Math.log10(10 + (q1lvl % 10));
    }
    while (q2_c <= rho) {
      rho = subtract(rho, q2_c);
      q2_c += Math.log10(64);
      q2++;
    }
    while (c1_c <= rho) {
      rho = subtract(rho, c1_c);
      c1_c += Math.log10(1.18099);
      c1 = add(c1, log2 * Math.floor(c1lvl / 10));
      c1lvl++;
      c1weight = Math.log10(10 + (c1lvl % 10));
    }
    while (c2_c <= rho) {
      rho = subtract(rho, c2_c);
      c2_c += Math.log10(4.53725);
      c2++;
    }
    while (c3_c <= rho) {
      rho = subtract(rho, c3_c);
      c3_c += Math.log10(8.85507e7);
      c3++;
    }
  }
}
