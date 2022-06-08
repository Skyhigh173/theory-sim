import { add, subtract, logToExp, convertTime } from "../../type_converters.js";

export function t6AI(data) {
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

  let q = Number.MIN_VALUE;
  let r = 0;

  let C = 0;

  let q1 = 0;
  let q2 = 0;
  let r1 = Number.MIN_VALUE;
  let r2 = 0;

  let c1 = Number.MIN_VALUE;
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
  let cap = [data.cap || 100000, 2];

  let k = 0;

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

    t += dt / 1.5;
    dt *= 1.0001;

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

    if (coast > curMult || coast == 0) checkBuy();
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
        `T6AI`,
        maxTauH.toFixed(7),
        convertTime(pubT),
        [pubRho, pubT],
      ];
    }
  }

  function checkBuy() {
    while (true) {
      let costs = [
        r2_c,
        r1_c + r1weight,
        q2_c,
        q1_c + q1weight,
        c5_c - Math.min(0, k / 2),
        c2_c + Math.max(0, k),
        c1_c + c1weight < c2_c ? c1_c : 1e100,
      ];
      let minCost = [Number.MAX_VALUE, null];
      for (let i = 0; i < 7; i++)
        if (costs[i] < minCost[0] && costs[i] <= rho) {
          minCost = [costs[i], i];
        }
      if (minCost[1] != null) buy(minCost[1]);
      else break;
    }
  }

  function buy(i) {
    switch (i) {
      case 0:
        if (r2_c > rho) break;
        rho = subtract(rho, r2_c);
        r2_c += 10;
        r2++;
        break;
      case 1:
        if (r1_c > rho) break;
        rho = subtract(rho, r1_c);
        r1_c += 5;
        r1 = add(r1, log2 * Math.floor(r1lvl / 10));
        r1lvl++;
        r1weight = Math.log10(5 + (r1lvl % 10)) * (1 / 1.1);
        break;
      case 2:
        if (q2_c > rho) break;
        rho = subtract(rho, q2_c);
        q2_c += 2;
        q2++;
        break;
      case 3:
        if (q1_c > rho) break;
        rho = subtract(rho, q1_c);
        q1_c += Math.log10(3);
        q1 = add(q1, log2 * Math.floor(q1lvl / 10));
        q1lvl++;
        q1weight = Math.log10(3.5 + (q1lvl % 10) ** 0.6);
        break;
      case 4:
        if (c5_c > rho) break;
        rho = subtract(rho, c5_c);
        c5_c += Math.log10(3.9);
        c5++;
        break;
      case 5:
        if (c2_c > rho) break;
        rho = subtract(rho, c2_c);
        c2_c += Math.log10(5);
        c2++;
        break;
      case 6:
        if (c1_c > rho) break;
        rho = subtract(rho, c1_c);
        c1_c += log2;
        c1 = add(c1, log2 * Math.floor(c1lvl / 10));
        c1lvl++;
        c1weight = Math.log10(10 + (c1lvl % 10)) * (1 / 1.04);
        break;
    }
  }
  function calculateIntegral(t1, t2, t5) {
    let term1 = t1 + t2 + q + r;
    let term4 = t5 + q + r * 2 - log2;
    k = term4 - term1;

    return totMult + add(term1, term4);
  }
}
