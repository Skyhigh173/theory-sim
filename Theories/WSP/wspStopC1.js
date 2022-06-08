import { add, subtract, logToExp, convertTime } from "../../type_converters.js";

export function wspStopC1(data) {
  const lastPub = data.rho;
  let getTotMult = (val) => (val / 10) * 1.5;
  const totMult = getTotMult(lastPub);

  let dt = 1 * 1.5;
  let t = 0;

  let rho = 0;
  let rhoDot = 0;
  let maxRho = 0;

  let q = 1;
  let dq = 0;
  let chi = 1;
  let S = 0;

  let q1 = 1;
  let q2 = 0;
  let n = 0;
  let c1 = 0;
  let c2 = 0;

  let q1lvl = 1;
  let c1lvl = 0;

  let q1_c = 1;
  let q2_c = 3;
  let n_c = Math.log10(20);
  let c1_c = Math.log10(50);
  let c2_c = 10;

  let coastM = [0, 0];

  let curMult = 0;

  let log2 = Math.log10(2);

  let srK_helper = (x) => {
    let x2 = x * x;
    return Math.log(x2 + 1 / 6 + 1 / 120 / x2 + 1 / 810 / x2 / x2) / 2 - 1;
  };

  let sineRatioK = (n, x, K = 5) => {
    if (n < 1 || x >= n + 1) return 0;
    let N = n + 1 + K,
      x2 = x * x,
      L1 = srK_helper(N + x),
      L2 = srK_helper(N - x),
      L3 = srK_helper(N),
      result =
        N * (L1 + L2 - 2 * L3) + x * (L1 - L2) - Math.log(1 - x2 / N / N) / 2;
    for (let k = n + 1; k < N; ++k) result -= Math.log(1 - x2 / k / k);
    return Math.log10(Math.E) * result;
  };

  let startTime;

  let maxTauH = 0;
  let tauH = 0;
  let pubT;
  let drho;
  let maxT;
  let pubDRho;
  let pubRho;

  const output = document.querySelector("table");

  let q1weight = 0;

  let coast = data.coast;
  let cap = [data.cap || 100000, 2];

  let mq1exp = 0;
  let mc2 = 0;
  let mnboost = 0;

  function updateMilestones(val) {
    if (val >= 25) mnboost = 1;
    if (val >= 40) mnboost = 2;
    if (val >= 55) mc2 = 1;
    if (val >= 70) mq1exp = 1;
    if (val >= 100) mq1exp = 2;
    if (val >= 140) mq1exp = 3;
    if (val >= 200) mq1exp = 4;
  }
  updateMilestones(lastPub);

  function simulate() {
    if (rho > maxRho) maxRho = rho;

    let vq1 = Math.log10(q1) * (1 + 0.01 * mq1exp);
    let vq2 = log2 * q2;
    let vc2 = mc2 > 0 ? log2 * c2 : 0;

    if (maxRho < 201 && maxRho > lastPub) updateMilestones(maxRho);

    dq = Math.max(0, Math.log10(dt) + S + vc2);

    q = add(q, dq);

    rhoDot = totMult + vq1 + vq2 + q + Math.log10(dt);
    rho = add(rho, rhoDot);

    t += dt / 1.5;
    dt *= 1.0001;

    curMult = 10 ** Math.max(0, (maxRho / 10) * 1.5 - totMult);

    drho = maxRho - lastPub;
    tauH = Math.max(0, drho / (t / 3600));
    if (maxTauH < tauH) {
      maxTauH = tauH;
      maxT = t * 2;
      pubT = t;
      pubRho = maxRho;
    }

    if (curMult < coast || coast == 0) buy();
  }
  while (true) {
    simulate();
    if (
      ((tauH >= maxTauH || t < maxT || pubRho >= cap[0] - cap[1]) &&
        maxRho < cap[0]) === false &&
      maxRho > 10
    ) {
      if (pubRho >= cap[0] - cap[1] || maxRho < 11) {
        maxTauH = tauH;
        maxT = t * 2.5;
        pubT = t;
        pubRho = maxRho;
      }
      const NEWdrho = pubRho - lastPub;

      let bestAddMult = getTotMult(pubRho) - totMult;
      return [
        "WSP",
        data.sigma,
        logToExp(data.rho, 2),
        logToExp(pubRho, 2),
        logToExp(NEWdrho / 10, 2),
        (10 ** bestAddMult).toFixed(5),
        `WSPStopC1`,
        (maxTauH / 10).toFixed(7),
        convertTime(pubT),
        [pubRho, pubT, true],
      ];
    }
  }

  function buy() {
    while (q1_c <= rho) {
      rho = subtract(rho, q1_c);
      q1_c += Math.log10(2 ** (3.38 / 4));
      q1 += 2 ** Math.floor(q1lvl / 10);
      q1lvl++;
      q1weight = Math.log10(10 + (q1lvl % 10)) * (1 / 1.04);
    }
    while (q2_c <= rho) {
      rho = subtract(rho, q2_c);
      q2_c += Math.log10(2 ** (3.38 * 3));
      q2++;
    }
    while (c1_c <= rho && n < 750) {
      rho = subtract(rho, c1_c);
      c1_c += Math.log10(2 ** (3.38 / 1.5));
      c1 += 2 ** Math.floor(c1lvl / 50);
      c1lvl++;
      updateS();
    }
    while (c2_c <= rho && mc2 > 0) {
      rho = subtract(rho, c2_c);
      c2_c += 10.17483438;
      c2++;
    }
    while (n_c <= rho) {
      rho = subtract(rho, n_c);
      n_c += Math.log10(2 ** 3.38);
      n++;
      updateS();
    }
  }

  function updateS() {
    let vn = n;
    let vc1 = c1;
    chi = (Math.PI * vc1 * vn) / (vc1 + vn / 3 ** (1 + mnboost)) + 1;
    S = sineRatioK(n, chi / Math.PI);
  }
}
