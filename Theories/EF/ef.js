import { add, subtract, logToExp, convertTime } from "../../type_converters.js";

export function ef(data) {
  let rhoToTau = 250 / 100;
  const lastPub = data.rho;
  let calculateMult = (val) => Math.max(0, (val / rhoToTau) * 0.387);
  const totMult = calculateMult(lastPub);

  let dt = 1.5;
  let t = 0;

  let rho = 0;
  let maxRho = 0;

  let T = 0;
  let currency_R = Number.MIN_VALUE;
  let currency_I = Number.MIN_VALUE;
  let q = 0;

  let log2 = Math.log10(2);

  let q1 = 0;
  let q2 = 0;
  let a1 = log2;
  let a2 = Number.MIN_VALUE;
  let a3 = 0;
  let b1 = log2;
  let b2 = 0;
  let c1 = log2;
  let c2 = 0;
  let tval = 1;

  let q1_c = 1;
  let q2_c = Math.log10(5);
  let a1_c = Math.log10(2000);
  let a2_c = Math.log10(500);
  let a3_c = Math.log10(500);
  let b1_c = Math.log10(20);
  let b2_c = 2;
  let c1_c = Math.log10(20);
  let c2_c = 2;
  let tval_c = 6;

  let a1lvl = 1;
  let b1lvl = 1;
  let c1lvl = 1;
  let q1lvl = 1;
  let a2lvl = 0;

  let I;
  let R;

  let a1weight;
  let b1weight;
  let c1weight;
  let q1weight;

  let curMult = 0;

  let startTime;

  let maxTauH = 0;
  let tauH = 0;
  let pubT;
  let drho;
  let maxT;
  let pubRho;

  let dimension = 0;
  let aterm = 0;
  let abase = 0;
  let aexp = 0;
  let b2baseinc = 0;
  let c2baseinc = 0;
  let snaekysIdeaIdk = 0;

  let mscost = [10, 10];

  function updateMilestones(val) {
    if (val >= mscost[0]) dimension = 1;
    if (val >= mscost[0] + mscost[1]) dimension = 2;
    if (val >= mscost[0] + mscost[1] * 2) aterm = 1;
    if (val >= mscost[0] + mscost[1] * 3) abase = 1;
    if (val >= mscost[0] + mscost[1] * 4) abase = 2;
    if (val >= mscost[0] + mscost[1] * 6) aexp = 1;
    if (val >= mscost[0] + mscost[1] * 8) aexp = 2;
    if (val >= mscost[0] + mscost[1] * 10) aexp = 3;
    if (val >= mscost[0] + mscost[1] * 12) aexp = 4;
    if (val >= mscost[0] + mscost[1] * 14) aexp = 5;
    if (val >= 250) b2baseinc = 1;
    if (val >= 275) b2baseinc = 2;
    if (val >= 300) c2baseinc = 1;
    if (val >= 325) c2baseinc = 2;
  }

  updateMilestones(lastPub);

  let coast = data.coast;
  let cap = [data.cap || 100000, 0.5];

  function simulate() {
    if (rho > maxRho) maxRho = rho;

    if (maxRho > lastPub) {
      updateMilestones(maxRho);
    }

    let logbonus = Math.log10(dt) + totMult;
    let vq1 = q1;
    let vq2 = log2 * q2;
    q = add(q, vq1 + vq2 + logbonus);

    // t calc
    T += dt * (tval / 5);

    // a calc
    let va1 = a1;
    let va2 = a2;
    let va3 = log2 * a3;
    let va_exp = 0.1 * aexp + 1;
    let va_base = 0;
    switch (abase) {
      case 0:
        va_base = va1;
        break;
      case 1:
        va_base = va1 + va2;
        break;
      case 2:
        va_base = va1 + va2 + va3;
        break;
    }
    let a = aterm == 0 ? 0 : va_base * va_exp;

    // b calc
    let vb1 = b1;
    let vb2 = Math.log10(1.1 + 0.01 * b2baseinc) * b2;
    let b = vb1 + vb2;

    // c calc
    let vc1 = c1;
    let vc2 = Math.log10(1.1 + 0.0125 * c2baseinc) * c2;
    let c = vc1 + vc2;

    R = b + Math.log10(Math.abs(Math.cos(T))); // b * cos(t) - real part of solution
    I = c + Math.log10(Math.abs(Math.sin(T))); // c * i * sin(t) - "imaginary" part of solution

    // stops R2 and I3 from growing when not unlocked
    currency_R = dimension > 0 ? add(currency_R, logbonus + R * 2) : 0;

    currency_I = dimension > 1 ? add(currency_I, logbonus + I * 2) : 0;

    // this check exists to stop rho from growing when every variable is 0
    // vq1 = 0 basically means at start of every pub

    switch (dimension) {
      case 0:
        rho = add(rho, logbonus + (Math.log10(T) + q * 2) / 2);
        break;
      case 1:
        rho = add(
          rho,
          logbonus + add(Math.log10(T) + q * 2, currency_R * 2) / 2
        );
        break;
      case 2:
        rho = add(
          rho,
          logbonus +
            a +
            add(add(Math.log10(T) + q * 2, currency_R * 2), currency_I * 2) / 2
        );
        break;
    }

    t += dt / 1.5;
    dt *= 1.0001;

    curMult = 10 ** (calculateMult(maxRho) - totMult);

    drho = maxRho - lastPub;
    tauH = Math.max(0, drho / (t / 3600));
    if (maxTauH < tauH) {
      maxTauH = tauH;
      maxT = t * (maxRho < 100 ? (maxRho < 50 ? 20 : 5) : 2);
      pubT = t;
      pubRho = maxRho;
    }

    if (t < coast || coast == 0) buy();
  }

  while (true) {
    simulate();
    if (
      (((tauH >= maxTauH || t < maxT || pubRho >= cap[0] - cap[1]) &&
        maxRho < cap[0]) === false &&
        maxRho > 10) ||
      (lastPub < 30 && maxRho > 32.4) ||
      (lastPub < 40 && maxRho > 42) ||
      (lastPub < 50 && maxRho > 55) ||
      (lastPub < 70 && maxRho > 72) ||
      (lastPub < 90 && maxRho > 92) ||
      (lastPub < 110 && maxRho > 113) ||
      (lastPub < 150 && maxRho > 153) ||
      (lastPub < 130 && maxRho > 134) ||
      (lastPub < 146 && lastPub > 145 && curMult > 2) ||
      (lastPub < 126 && lastPub > 125 && curMult > 2) ||
      (lastPub < 107 && lastPub > 105 && curMult > 3) ||
      (lastPub < 87 && lastPub > 85 && curMult > 3) ||
      (lastPub < 67 && lastPub > 65 && curMult > 3) ||
      (lastPub < 46.4 && lastPub > 44.7 && curMult > 3) ||
      (lastPub < 37 && lastPub > 36 && curMult > 3) ||
      (lastPub < 27 && lastPub > 26 && curMult > 3)
    ) {
      if (pubRho >= cap[0] - cap[1] || maxRho < 11) {
        maxTauH = tauH;
        maxT = t * 2.5;
        pubT = t;
        pubRho = maxRho;
      }
      const NEWdrho = pubRho - lastPub;

      let bestAddMult = calculateMult(pubRho) - totMult;
      return [
        "EF",
        data.sigma,
        logToExp(data.rho, 2),
        logToExp(pubRho, 2),
        logToExp(NEWdrho * 0.4, 2),
        (10 ** bestAddMult).toFixed(5),
        `EF`,
        (maxTauH / rhoToTau).toFixed(7),
        convertTime(pubT),
        [pubRho, pubT, true],
      ];
    }
  }

  function buy() {
    while (c2_c <= currency_I && dimension > 1 && maxRho < 1500) {
      currency_I = subtract(currency_I, c2_c);
      c2_c += log2;
      c2++;
    }
    while (c1_c <= currency_I && dimension > 1 && maxRho < 1500) {
      currency_I = subtract(currency_I, c1_c);
      c1_c += Math.log10(200);
      c1 = add(c1, log2 * Math.floor(c1lvl / 10));
      c1lvl++;
      c1weight = Math.log10(10 + (c1lvl % 10));
    }
    while (b2_c <= currency_R && dimension > 0 && maxRho < 1500) {
      currency_R = subtract(currency_R, b2_c);
      b2_c += log2;
      b2++;
    }
    while (b1_c <= currency_R && dimension > 0 && maxRho < 1500) {
      currency_R = subtract(currency_R, b1_c);
      b1_c += Math.log10(200);
      b1 = add(b1, log2 * Math.floor(b1lvl / 10));
      b1lvl++;
    }
    while (a3_c <= currency_I && abase > 1 && maxRho < 1500) {
      currency_I = subtract(currency_I, a3_c);
      a3_c += Math.log10(2 ** 2.2);
      a3++;
    }
    while (a2_c <= currency_R && abase > 0 && maxRho < 1500) {
      currency_R = subtract(currency_R, a2_c);
      a2_c += Math.log10(2 ** 2.2);
      a2 = add(a2, Math.log10(40) * Math.floor(a2lvl / 10));
      a2lvl++;
    }
    while (a1_c <= rho && aterm > 0 && maxRho < 1500) {
      rho = subtract(rho, a1_c);
      a1_c += Math.log10(2 ** 2.2);
      a1 = add(a1, log2 * Math.floor(a1lvl / 10));
      a1lvl++;
    }
    while (q2_c <= rho && maxRho < 1500) {
      rho = subtract(rho, q2_c);
      q2_c += Math.log10(60);
      q2++;
    }
    while (q1_c <= rho && maxRho < 1500) {
      rho = subtract(rho, q1_c);
      q1_c += Math.log10(1.61328);
      q1 = add(q1, log2 * Math.floor(q1lvl / 10));
      q1lvl++;
    }
    while (tval_c <= rho && tval < 5) {
      rho = subtract(rho, tval_c);
      tval_c += 6;
      tval++;
    }
  }
}
