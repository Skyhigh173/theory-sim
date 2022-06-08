import { add, subtract, logToExp, convertTime } from "../../type_converters.js";

export function cs2(data) {
  let getTotMult = (val) => Math.max(0, (val / 10) * 2.203 - Math.log10(200));
  const lastPub = data.rho;
  const totMult = lastPub >= 7 ? getTotMult(lastPub) : 0;

  let dt = 1 * 1.5;
  let t = 0;

  let rho = 0;
  let rhodot = 0;
  let maxRho = 0;
  let qdot = 0;
  let q = 0;

  let c1 = 0;
  let c2 = 0;
  let q1 = 0;
  let q2 = 0;
  let n = 0;

  let c1_c = 6;
  let c2_c = 3;
  let q1_c = 1;
  let q2_c = Math.log10(15);
  let n_c = Math.log10(50);

  let vn;

  let c1lvl = 0;
  let q1lvl = 1;

  let q1weight = 0;
  let c1weight = 0;

  let curMult = 0;

  let log2 = Math.log10(2);

  let startTime;

  let maxTauH = 0;
  let tauH = 0;
  let pubT;
  let drho;
  let maxT;
  let pubRho;

  let mc2 = 0;
  let mc2exp = 0;
  let mq1exp = 0;

  function updateMilestones(val) {
    let available = 0;
    let cost =
      (available < 4 ? 1 + 3.5 * available : available < 5 ? 22 : 50) * 10;
    while (cost <= val && available < 6) {
      available++;
      cost =
        (available < 4 ? 1 + 3.5 * available : available < 5 ? 22 : 50) * 10;
      if (available > 0) mc2 = 1;
      if (available > 1) mc2exp = 1;
      if (available > 2) mc2exp = 2;
      if (available > 3) mq1exp = 1;
      if (available > 4) mq1exp = 2;
      if (available > 5) mq1exp = 3;
    }
  }
  updateMilestones(lastPub);

  let getError;

  function updateError(n) {
    if (n < 6) {
      switch (n) {
        case 1:
          getError = Math.log10(2.060660172040101);
          return;
        case 2:
          getError = Math.log10(12.010407635829813);
          return;
        case 3:
          getError = Math.log10(70.00178562229294);
          return;
        case 4:
          getError = Math.log10(408.0003059755347);
          return;
        case 5:
          getError = Math.log10(2378.000049517553);
          return;
      }
    }
    let root2 = Math.SQRT2;
    let vdn =
      ((-(root2 - 1)) ** n * (n % 2 ? -1 : 1) + (1 + root2) ** n) / 2 / root2;
    let vp = (root2 + 1) ** n * (n % 2 ? -1 : 1);
    getError = Math.log10(Math.abs(vdn)) + Math.log10(Math.abs(vp));
  }

  updateError(1);

  let coast = data.coast;
  let cap = [data.cap || 100000, 0.5];

  function simulate() {
    if (t == 0) startTime = performance.now();
    if (rho > maxRho) maxRho = rho;

    if (maxRho < 501 && maxRho > lastPub) {
      updateMilestones(maxRho);
    }

    let vq1 = q1 * (1 + 0.05 * mq1exp);
    let vq2 = log2 * q2;
    let vc1 = c1;
    let c2level = mc2 > 0 ? c2 : 0;
    vn = n + 1 + c2level;
    let vc2 = mc2 > 0 ? log2 * c2 * (1 + 0.5 * mc2exp) : 0;

    qdot = totMult + Math.log10(dt) + vc1 + vc2 + getError;
    q = add(q, qdot);
    rhodot = totMult + vq1 + vq2 + q + Math.log10(dt);
    rho = add(rho, rhodot);

    t += dt / 1.5;
    dt *= 1.0001;

    drho = maxRho - lastPub;
    tauH = Math.max(0, drho / (t / 3600));
    if (maxTauH < tauH) {
      maxTauH = tauH;
      maxT = t * 3;
      pubT = t;
      pubRho = maxRho;
    }

    curMult = 10 ** (getTotMult(maxRho) - totMult);

    if (t < coast || coast == 0) buy();
  }
  while (true) {
    simulate();
    if (
      ((tauH >= maxTauH || t < maxT || pubRho >= cap[0] - cap[1]) &&
        maxRho < cap[0]) === false &&
      (maxRho > 12 || curMult > 1.5)
    ) {
      if (pubRho >= cap[0] - cap[1] || maxRho < 13) {
        maxTauH = tauH;
        maxT = t * 2.5;
        pubT = t;
        pubRho = maxRho;
      }
      const NEWdrho = pubRho - lastPub;

      let bestAddMult = getTotMult(pubRho) - totMult;
      return [
        "CS2",
        data.sigma,
        logToExp(data.rho, 2),
        logToExp(pubRho, 2),
        logToExp(NEWdrho / 10, 2),
        (10 ** bestAddMult).toFixed(5),
        `CS2`,
        (maxTauH / 10).toFixed(7),
        convertTime(pubT),
        [pubRho, pubT, true],
      ];
    }
  }

  function buy() {
    while (c2_c <= rho && mc2 == 1) {
      rho = subtract(rho, c2_c);
      c2_c += 5.65;
      c2++;
      updateError(vn + 1);
    }
    while (n_c <= rho) {
      rho = subtract(rho, n_c);
      n_c += log2 * (Math.log2(256) * 3.346);
      n++;
      updateError(vn + 1);
    }
    while (c1_c <= rho) {
      rho = subtract(rho, c1_c);
      c1_c += Math.log10(16);
      c1 = add(c1, log2 * Math.floor(c1lvl / 10));
      c1lvl++;
      c1weight = Math.log10(10 + (c1lvl % 10));
    }
    while (q2_c <= rho) {
      rho = subtract(rho, q2_c);
      q2_c += Math.log10(128);
      q2++;
    }
    while (q1_c <= rho) {
      rho = subtract(rho, q1_c);
      q1_c += Math.log10(5);
      q1 = add(q1, log2 * Math.floor(q1lvl / 10));
      q1lvl++;
      q1weight = Math.log10(10 + (q1lvl % 10)) * (1 / 1.15);
    }
  }
}
