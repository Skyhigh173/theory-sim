import {
  log10,
  add,
  subtract,
  logToExp,
  convertTime,
} from "../../type_converters.js";

export function t2(data) {
  const lastPub = data.rho;
  let getTotMult = (val) =>
    val * 0.198 -
    2 +
    Math.log10(
      Math.max(
        1,
        (data.sigma / 20) **
          (data.sigma < 65 ? 0 : data.sigma < 75 ? 1 : data.sigma < 85 ? 2 : 3)
      )
    );
  const totMult = lastPub < 15 ? 0 : getTotMult(lastPub);

  let dt = 1.5;
  let t = 0;

  let rho = 0;
  let maxRho = 0;

  let extraTime = 0;

  let q1 = 0;
  let q2 = 1;
  let q3 = 1;
  let q4 = 1;

  let r1 = 1;
  let r2 = 1;
  let r3 = 1;
  let r4 = 1;

  let dq1 = 1;
  let dq2 = 0;
  let dq3 = 0;
  let dq4 = 0;

  let dr1 = 0;
  let dr2 = 0;
  let dr3 = 0;
  let dr4 = 0;

  let q1_c = 1;
  let q2_c = Math.log10(5000);
  let q3_c = Math.log10(3e25);
  let q4_c = Math.log10(8e50);

  let r1_c = Math.log10(2e6);
  let r2_c = Math.log10(3e9);
  let r3_c = Math.log10(4e25);
  let r4_c = Math.log10(5e50);

  let q1lvl = 1;
  let q2lvl = 0;
  let q3lvl = 0;
  let q4lvl = 0;
  let r1lvl = 0;
  let r2lvl = 0;
  let r3lvl = 0;
  let r4lvl = 0;

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
  let cap = [data.cap || 100000, 5];

  let milestones = [0, 0, 0, 0];

  function updateMilestones(val) {
    if (val >= 25) milestones[0] = 1;
    if (val >= 50) milestones[0] = 2;
    if (val >= 75) milestones[1] = 1;
    if (val >= 100) milestones[1] = 2;
    if (val >= 125) milestones[2] = 1;
    if (val >= 150) milestones[2] = 2;
    if (val >= 175) milestones[2] = 3;
    if (val >= 200) milestones[3] = 1;
    if (val >= 225) milestones[3] = 2;
    if (val >= 250) milestones[3] = 3;
  }

  updateMilestones(lastPub);

  function simulate() {
    if (t == 0) startTime = performance.now();
    if (rho > maxRho) maxRho = rho;

    if (maxRho < 260 && maxRho > lastPub) updateMilestones(maxRho);

    let logdt = Math.log10(dt);
    let curMult = 10 ** (getTotMult(maxRho) - totMult);

    q1 = add(q1, dq1 + q2 + logdt);
    q2 = add(q2, dq2 + q3 + logdt);
    q3 = milestones[0] > 0 ? add(q3, dq3 + q4 + logdt) : q3;
    q4 = milestones[0] > 1 ? add(q4, dq4 + logdt) : q4;

    r1 = add(r1, dr1 + r2 + logdt);
    r2 = add(r2, dr2 + r3 + logdt);
    r3 = milestones[1] > 0 ? add(r3, dr3 + r4 + logdt) : r3;
    r4 = milestones[1] > 1 ? add(r4, dr4 + logdt) : r4;

    let rhodot =
      q1 * (1 + 0.05 * milestones[2]) +
      r1 * (1 + 0.05 * milestones[3]) +
      totMult +
      logdt;
    rho = add(rho, rhodot);

    t += dt / 1.5;
    dt *= 1.0001;

    if (rho < data.t2Extra) extraTime = t;

    drho = maxRho - lastPub;
    tauH = Math.max(0, drho / (t / 3600));
    if (maxTauH < tauH || maxRho < 15) {
      maxTauH = tauH;
      pubDRho = drho;
      maxT = t * 2;
      pubT = t;
      pubRho = maxRho;
    }

    buy();
  }
  while (true) {
    simulate();
    if (
      ((tauH >= maxTauH || t < maxT || pubRho >= cap[0] - cap[1]) &&
        maxRho < cap[0]) === false &&
      maxRho > 15
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
        "T2",
        data.sigma,
        logToExp(data.rho, 2),
        logToExp(pubRho, 2),
        logToExp(NEWdrho, 2),
        (10 ** bestAddMult).toFixed(5),
        `T2`,
        maxTauH.toFixed(7),
        convertTime(pubT - extraTime),
        [pubRho, pubT - extraTime, true],
      ];
    }
  }

  function buy() {
    while (q1_c <= rho) {
      rho = subtract(rho, q1_c);
      q1_c += log2;
      dq1 = add(dq1, log2 * Math.floor(q1lvl / 10));
      q1lvl++;
    }
    while (q2_c <= rho) {
      rho = subtract(rho, q2_c);
      q2_c += log2;
      dq2 = add(dq2, log2 * Math.floor(q2lvl / 10));
      q2lvl++;
    }
    while (q3_c <= rho && milestones[0] > 0) {
      rho = subtract(rho, q3_c);
      q3_c += Math.log10(3);
      dq3 = add(dq3, log2 * Math.floor(q3lvl / 10));
      q3lvl++;
    }
    while (q4_c <= rho && milestones[0] > 1) {
      rho = subtract(rho, q4_c);
      q4_c += Math.log10(4);
      dq4 = add(dq4, log2 * Math.floor(q4lvl / 10));
      q4lvl++;
    }
    while (r1_c <= rho) {
      rho = subtract(rho, r1_c);
      r1_c += log2;
      dr1 = add(dr1, log2 * Math.floor(r1lvl / 10));
      r1lvl++;
    }
    while (r2_c <= rho) {
      rho = subtract(rho, r2_c);
      r2_c += log2;
      dr2 = add(dr2, log2 * Math.floor(r2lvl / 10));
      r2lvl++;
    }
    while (r3_c <= rho && milestones[1] > 0) {
      rho = subtract(rho, r3_c);
      r3_c += Math.log10(3);
      dr3 = add(dr3, log2 * Math.floor(r3lvl / 10));
      r3lvl++;
    }
    while (r4_c <= rho && milestones[1] > 1) {
      rho = subtract(rho, r4_c);
      r4_c += Math.log10(4);
      dr4 = add(dr4, log2 * Math.floor(r4lvl / 10));
      r4lvl++;
    }
  }
}
