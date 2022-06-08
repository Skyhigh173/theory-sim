import { add, subtract, logToExp, convertTime } from "../../type_converters.js";

export function t6noC345d(data) {
  const lastPub = data.rho;
  let getTotMult = (val) =>
    val * 0.196 -
    Math.log10(50) +
    Math.log10(
      (data.sigma / 20) **
        (data.sigma < 65 ? 0 : data.sigma < 75 ? 1 : data.sigma < 85 ? 2 : 3)
    );
  const totMult = getTotMult(lastPub);

  let dt = 1 * 1.5;
  let t = 0;

  let rho = 0;
  let maxRho = 0;

  let q = 0;
  let r = 1;

  let C = 0;

  let q1 = 1;
  let q2 = 0;
  let r1 = 0;
  let r2 = 0;

  let c1 = 0;
  let c2 = 0;
  let c5 = 0;

  let q1_c = Math.log10(15);
  let q2_c = Math.log10(500);
  let r1_c = 25;
  let r2_c = 30;

  let c1_c = 1;
  let c2_c = 2;
  let c5_c = Math.log10(15);

  let q1lvl = 1;
  let r1lvl = 0;
  let c1lvl = 0;

  let c1weight = 0;
  let q1weight = 0;
  let r1weight = 0;

  let curMult = 0;

  let log2 = Math.log10(2);

  let startTime;

  let maxTauH = 0;
  let tauH = 0;
  let pubT;
  let drho;
  let maxT;
  let pubDRho;
  let pubRho;

  let coast = data.coast;
  let cap = [data.cap || 100000, 2.5];

  function simulate() {
    if (t == 0) startTime = performance.now();
    if (rho > maxRho) maxRho = rho;

    let vc1 = c1 * 1.15;
    let vc2 = log2 * c2;
    let vc5 = log2 * c5;
    let vr2 = log2 * r2;
    let vq2 = log2 * q2;

    C = subtract(calculateIntegral(vc1, vc2, vc5), rho);
    q = add(q, q1 + vq2 + Math.log10(dt));

    r = add(r, r1 + vr2 + Math.log10(dt) - 3);

    let newCurrency = calculateIntegral(vc1, vc2, vc5);
    C = C > newCurrency ? newCurrency : C;
    rho = subtract(newCurrency, C);

    dt *= 1.0001;
    t += dt / 1.5;

    curMult = 10 ** (getTotMult(maxRho) - totMult);

    drho = maxRho - lastPub;
    tauH = Math.max(0, drho / (t / 3600));
    if (maxTauH < tauH) {
      maxTauH = tauH;
      pubDRho = drho;
      maxT = t * 3;
      pubT = t;
      pubRho = maxRho;
    }

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
        "T6",
        data.sigma,
        logToExp(data.rho, 2),
        logToExp(pubRho, 2),
        logToExp(NEWdrho, 2),
        (10 ** bestAddMult).toFixed(5),
        `T6noC345d`,
        maxTauH.toFixed(7),
        convertTime(pubT),
        [pubRho, pubT],
      ];
    }
  }

  function buy() {
    while (r2_c <= rho) {
      rho = subtract(rho, r2_c);
      r2_c += 10;
      r2++;
    }
    while (q2_c <= rho) {
      rho = subtract(rho, q2_c);
      q2_c += 2;
      q2++;
    }
    while (c5_c <= rho && false) {
      rho = subtract(rho, c5_c);
      c5_c += Math.log10(3.9);
      c5++;
    }
    while (c2_c <= rho) {
      rho = subtract(rho, c2_c);
      c2_c += Math.log10(5);
      c2++;
    }
    while (c1_c <= rho && c1_c + c1weight <= Math.min(q2_c, r2_c, c2_c)) {
      rho = subtract(rho, c1_c);
      c1_c += log2;
      c1 = add(c1, log2 * Math.floor(c1lvl / 10));
      c1lvl++;
      c1weight = Math.log10(10 + (c1lvl % 10)) * (1 / 1.15);
    }
    while (r1_c <= rho) {
      rho = subtract(rho, r1_c);
      r1_c += 5;
      r1 = add(r1, log2 * Math.floor(r1lvl / 10));
      r1lvl++;
      r1weight = Math.log10(10 + (r1lvl % 10)) * (1 / 1.1);
    }
    while (q1_c <= rho && q1_c + q1weight <= Math.min(q2_c, r2_c, c2_c)) {
      rho = subtract(rho, q1_c);
      q1_c += Math.log10(3);
      q1 = add(q1, log2 * Math.floor(q1lvl / 10));
      q1lvl++;
      q1weight = Math.log10(7 + (q1lvl % 10));
    }
  }
  function calculateIntegral(t1, t2, t5, t2e = 0, t5e = 0) {
    let term1 = t1 + (t2 + log2 * t2e) + q + r;
    let term4 = t5 + log2 * t5e + q + r * 2 - log2;

    return totMult + add(term1, term4);
  }
}
