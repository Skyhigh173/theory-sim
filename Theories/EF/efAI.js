import { add, subtract, logToExp, convertTime } from "../../type_converters.js";

export function efAI(data, optimalPubRho = 0) {
  let rhoToTau = 250 / 100;
  const lastPub = data.rho;
  let calculateMult = (val) => Math.max(0, (val / rhoToTau) * 0.387);
  const totMult = calculateMult(lastPub);

  let pubMultRho = optimalPubRho > 0 ? optimalPubRho : 10000;

  let lastBuy = [0, 0, 0];

  let dt = 1.5;
  let t = 0;

  let rho = 0;
  let maxRho = 0;

  let T = 0;
  let currency_R = Number.MIN_VALUE;
  let currency_I = Number.MIN_VALUE;
  let q = 0;
  let qdot;

  let log2 = Math.log10(2);

  let q1 = 0;
  let q2 = 0;
  let a1 = 0;
  let a2 = Number.MIN_VALUE;
  let a3 = 0;
  let b1 = 0;
  let b2 = 0;
  let c1 = 0;
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

  let a1weight = 0;
  let b1weight = 0;
  let c1weight = 0;
  let q1weight = 0;

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

  let mscost = [10, 10];

  let nextMcost = 10;
  let totalMilestones = 0;

  function updateMilestones(val) {
    if (val >= mscost[0]) dimension = 1;
    else {
      nextMcost = 10;
      return;
    }
    if (val >= mscost[0] + mscost[1]) dimension = 2;
    else {
      nextMcost = 20;
      return;
    }
    if (val >= mscost[0] + mscost[1] * 2) aterm = 1;
    else {
      nextMcost = 30;
      return;
    }
    if (val >= mscost[0] + mscost[1] * 3) abase = 1;
    else {
      nextMcost = 40;
      return;
    }
    if (val >= mscost[0] + mscost[1] * 4) abase = 2;
    else {
      nextMcost = 50;
      return;
    }
    if (val >= mscost[0] + mscost[1] * 6) aexp = 1;
    else {
      nextMcost = 70;
      return;
    }
    if (val >= mscost[0] + mscost[1] * 8) aexp = 2;
    else {
      nextMcost = 90;
      return;
    }
    if (val >= mscost[0] + mscost[1] * 10) aexp = 3;
    else {
      nextMcost = 110;
      return;
    }
    if (val >= mscost[0] + mscost[1] * 12) aexp = 4;
    else {
      nextMcost = 130;
      return;
    }
    if (val >= mscost[0] + mscost[1] * 14) aexp = 5;
    else {
      nextMcost = 150;
      return;
    }
    if (val >= 250) b2baseinc = 1;
    else {
      nextMcost = 250;
      return;
    }
    if (val >= 275) b2baseinc = 2;
    else {
      nextMcost = 275;
      return;
    }
    if (val >= 300) c2baseinc = 1;
    else {
      nextMcost = 300;
      return;
    }
    if (val >= 325) c2baseinc = 2;
    else {
      nextMcost = 325;
      return;
    }
    nextMcost = 100000;
  }

  updateMilestones(lastPub);

  let initMilestones = dimension + aterm + abase + aexp + b2baseinc + c2baseinc;

  let A2B2Diff = 0;

  let rDr = [0, 0];

  function updateA2B2Diff() {
    let a2diff = add(a2, Math.log10(40) * Math.floor(a2lvl / 10)) - a2;
    let b2diff = Math.log10(1.1 + 0.01 * b2baseinc);
    A2B2Diff = Math.min(
      0.67778,
      a2diff * 5 - b2diff * (1 / curMult) + Math.log10(curMult * 2.5)
    );
  }

  let coast = data.coast;
  let cap = [data.cap || 100000, 0.2];

  let isA2pub = false;
  let bpr;

  function simulate() {
    if (t == 0) startTime = performance.now();
    if (rho > maxRho) maxRho = rho;

    if (maxRho > lastPub) {
      totalMilestones =
        dimension + aterm + abase + aexp + b2baseinc + c2baseinc;
      updateMilestones(maxRho);
    }

    let logbonus = Math.log10(dt) + totMult;
    let vq1 = q1;
    let vq2 = log2 * q2;
    qdot = vq1 + vq2 + totMult;
    q = add(q, qdot + Math.log10(dt));

    // t calc
    T += dt * (tval / 5) * 1.5;

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

    let R = b + Math.log10(Math.abs(Math.cos(T))); // b * cos(t) - real part of solution
    let I = c + Math.log10(Math.abs(Math.sin(T))); // c * i * sin(t) - "imaginary" part of solution

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
    dt *= optimalPubRho === 0 ? 1.005 : 1.0001;

    rDr[0] += rho / currency_R;
    rDr[1]++;

    curMult = 10 ** (calculateMult(maxRho) - totMult);

    // if (maxRho > 49.9 && maxRho < 60) console.log(t, maxRho);

    drho = maxRho - lastPub;
    tauH = Math.max(0, drho / (t / 3600));
    //normal tau/h calcs
    if (maxTauH < tauH || lastPub < 10) {
      maxTauH = tauH;
      maxT = t * (maxRho < 100 ? (maxRho < 50 ? 20 : 5) : 2.5);
      pubT = t;
      pubRho = maxRho;
      bpr = maxRho;
    }
    //overpushes maxrho by 10^0.01
    if (bpr + 0.01 > maxRho && !isA2pub && rho >= maxRho && false) {
      maxTauH = tauH;
      pubT = t;
      pubRho = maxRho;
    }

    let maxval = Math.max(lastPub, maxRho);

    if ((t < coast || coast == 0) && nextMcost - 0.8 > rho) buy();
    else {
      while (a3_c <= currency_I && abase > 1) {
        currency_I = subtract(currency_I, a3_c);
        a3_c += Math.log10(2 ** 2.2);
        a3++;
      }
      while (a2_c <= currency_R && abase > 0) {
        currency_R = subtract(currency_R, a2_c);
        a2_c += Math.log10(2 ** 2.2);
        a2 = add(a2, Math.log10(40) * Math.floor(a2lvl / 10));
        a2lvl++;
        updateA2B2Diff();
      }
    }
  }
  while (true) {
    simulate();
    if (
      (((tauH >= maxTauH || t < maxT || pubRho >= cap[0] - cap[1]) &&
        maxRho < cap[0]) === false ||
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
        (lastPub < 106 && lastPub > 105 && curMult > 3) ||
        (lastPub < 87 && lastPub > 85 && curMult > 3) ||
        (lastPub < 67 && lastPub > 65 && curMult > 3) ||
        (lastPub < 46.4 && lastPub > 44.7 && curMult > 3) ||
        (lastPub < 37 && lastPub > 36 && curMult > 3) ||
        (lastPub < 27 && lastPub > 26 && curMult > 3) ||
        (totalMilestones - initMilestones < 1 &&
          curMult > 3 &&
          optimalPubRho === 0)) &&
      pubRho >= 10
    ) {
      if (pubRho >= cap[0] - cap[1] || pubRho < 11) {
        maxTauH = tauH;
        pubT = t;
        pubRho = maxRho;
      }
      if (optimalPubRho === 0 && lastPub >= 10) {
        return efAI(data, pubRho);
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
        `EFAI q1: ${lastBuy[0]} q2: ${lastBuy[1]} a1: ${
          pubRho >= 30 ? lastBuy[2] : 0
        }`,
        (maxTauH / rhoToTau).toFixed(7),
        convertTime(pubT),
        [pubRho, pubT],
      ];
    }
  }

  function buy() {
    while (
      c2_c <= currency_I &&
      dimension > 1 &&
      (c2_c + (curMult > 1 ? Math.log10(5) : 0) <= a3_c || abase < 2) &&
      c2_c + 1 <= pubMultRho
    ) {
      currency_I = subtract(currency_I, c2_c);
      c2_c += log2;
      c2++;
    }
    while (c1_c <= currency_I && dimension > 1 && c1_c + c1weight <= c2_c) {
      currency_I = subtract(currency_I, c1_c);
      c1_c += Math.log10(200);
      c1 = add(c1, log2 * Math.floor(c1lvl / 10));
      c1lvl++;
      c1weight = c1lvl < 15 ? 0 : Math.log10((c1lvl % 10) / 5);
    }
    while (
      b2_c <= currency_R &&
      dimension > 0 &&
      (b2_c + A2B2Diff <= a2_c || abase < 1) &&
      b2_c + 1 <= pubMultRho
    ) {
      currency_R = subtract(currency_R, b2_c);
      b2_c += log2;
      b2++;
      updateA2B2Diff();
    }
    while (b1_c <= currency_R && dimension > 0 && b1_c + b1weight <= b2_c) {
      currency_R = subtract(currency_R, b1_c);
      b1_c += Math.log10(200);
      b1 = add(b1, log2 * Math.floor(b1lvl / 10));
      b1lvl++;
      b1weight = b1lvl < 15 ? 0 : Math.log10((b1lvl % 10) / 5);
    }
    while (a3_c <= currency_I && abase > 1) {
      currency_I = subtract(currency_I, a3_c);
      a3_c += Math.log10(2 ** 2.2);
      a3++;
    }
    while (a2_c <= currency_R && abase > 0) {
      currency_R = subtract(currency_R, a2_c);
      a2_c += Math.log10(2 ** 2.2);
      a2 = add(a2, Math.log10(40) * Math.floor(a2lvl / 10));
      a2lvl++;
      updateA2B2Diff();
    }
    while (
      a1_c <= rho &&
      aterm > 0 &&
      a1_c + a1weight <= q2_c &&
      a1_c + Math.log10(10 / (1 + aexp * 0.1) + (a1lvl % 10)) <= pubMultRho
    ) {
      rho = subtract(rho, a1_c);
      a1_c += Math.log10(2 ** 2.2);
      a1 = add(a1, log2 * Math.floor(a1lvl / 10));
      a1lvl++;
      if (aterm > 0) lastBuy[2] = a1lvl;
      a1weight = Math.log10(4 + (a1lvl % 10) / 2);
    }
    while (q2_c <= rho && q2_c + Math.log10(q - qdot) <= pubMultRho) {
      rho = subtract(rho, q2_c);
      q2_c += Math.log10(60);
      q2++;
      lastBuy[1] = q2;
    }
    while (
      q1_c <= rho &&
      (q1_c + q1weight <= q2_c || q1lvl < 2) &&
      q1_c + q1weight + Math.log10(8) <= pubMultRho
    ) {
      rho = subtract(rho, q1_c);
      q1_c += Math.log10(1.61328);
      q1 = add(q1, log2 * Math.floor(q1lvl / 10));
      q1lvl++;
      lastBuy[0] = q1lvl;
      q1weight = Math.log10(10 + (q1lvl % 10));
    }
    while (tval_c <= rho && tval < 5) {
      rho = subtract(rho, tval_c);
      tval_c += 6;
      tval++;
    }
  }
}
