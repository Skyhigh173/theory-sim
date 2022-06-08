import { add, subtract, logToExp, convertTime } from "../../type_converters.js";

export function cs2XL(data, coast = 0, ac) {
  let getTotMult = (val) => Math.max(0, (val / 10) * 2.203 - Math.log10(200));
  const lastPub = data.rho;
  const totMult = lastPub >= 7 ? getTotMult(lastPub) : 0;

  let dt = 1;
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

  let vq1;

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

  let caps = [data.cap || 100000, 0.5];

  let swapStatus = 0;

  function updateMilestones(val, mode) {
    mc2 = 0;
    mc2exp = 0;
    mq1exp = 0;
    if (mode == 0) {
      if (val >= 10) mc2 = 1;
      if (val >= 45) mc2exp = 1;
      if (val >= 80) mc2exp = 2;
      if (val >= 115) mq1exp = 1;
      if (val >= 220) mq1exp = 2;
      if (val >= 500) mq1exp = 3;
      swapStatus = 0;
    } else {
      if (val >= 10) mq1exp = 1;
      if (val >= 45) mq1exp = 2;
      if (val >= 80) mq1exp = 3;
      if (val >= 115) mc2 = 1;
      if (val >= 220) mc2exp = 1;
      if (val >= 500) mc2exp = 2;
      swapStatus = 1;
    }
  }
  updateMilestones(lastPub, 0);

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

  let bestCoast = [0, 0];

  let lastBuyRho = 0;
  let msrho = 0;

  let acb = ac == undefined ? false : true;

  let coastStats = acStats(data.rho);

  let ctimer = 0;

  let cap = Math.floor(Math.max(1, lastPub / 30) ** 1.4) + 2;

  let msCond = updateMsCond();

  let bpr;
  let isC2pub = false;

  function updateMsCond() {
    if (lastPub > 220) return 40;
    if (lastPub > 115) return 20;
    if (lastPub > 80) return 8;
    if (lastPub > 45) return 4;
    return 0;
  }

  function getQ2Boost(endRho) {
    if (endRho < q2_c) return 0;
    return Math.log10(
      10 ** (subtract(subtract(endRho, q2_c), rho) - subtract(q2_c, rho)) + 1
    );
  }

  function simulate() {
    if (t == 0) startTime = performance.now();
    if (rho > maxRho) maxRho = rho;

    vq1 = q1 * (1 + 0.05 * mq1exp);
    let vq2 = log2 * q2;
    let vc1 = c1;
    let c2level = c2;
    vn = n + 1 + c2level;
    let vc2 = mc2 > 0 ? log2 * c2 * (1 + 0.5 * mc2exp) : 0;

    if (lastPub < 500) {
      if (
        ((t > coast && coast != 0) ||
          rho + Math.log10(msCond * 0.5) > n_c ||
          (rho + Math.log10(msCond) > c2_c && mc2 == 1) ||
          (curMult > 1 && rho + Math.log10(2) > q2_c)) &&
        maxRho < Math.min(n_c, c2_c)
      ) {
        updateMilestones(Math.max(lastPub, maxRho), 1);
      } else updateMilestones(Math.max(lastPub, maxRho), 0);
    } else updateMilestones(501, 0);

    qdot = totMult + vc1 + vc2 + getError;
    q = add(q, qdot + Math.log10(dt));
    rhodot = totMult + vq1 + vq2 + q;
    rho = add(rho, rhodot + Math.log10(dt));

    t += dt / 1.5;
    dt *= 1.0001;

    drho = maxRho - lastPub;
    tauH = Math.max(0, drho / (t / 3600));
    if (
      maxTauH < tauH ||
      (lastPub < 500 && maxRho > 499 && maxRho <= 500.01 && pubRho > 498)
    ) {
      maxTauH = tauH;
      maxT = t * (maxRho < 500 ? 5 : 2.5);
      pubT = t;
      pubRho = maxRho;
      bpr = maxRho;
    }

    if (bpr + 0.07 > maxRho && !isC2pub && rho >= maxRho && false) {
      maxTauH = tauH;
      pubT = t;
      pubRho = maxRho;
    }

    curMult = 10 ** (getTotMult(maxRho) - totMult);

    ctimer++;
    if (lastPub < 500) searchCoast();
    if (t < coast || coast == 0 || (lastPub > 497 && maxRho < 499)) buy();
    if (swapStatus === 0 && (t < coast || coast == 0))
      msrho = [rho, maxRho > rho ? maxRho : rho];
  }
  while (true) {
    simulate();
    if (
      ((tauH >= maxTauH || t < maxT || pubRho >= caps[0] - caps[1]) &&
        maxRho < caps[0]) === false &&
      (maxRho > 12 || curMult > 1.5)
    ) {
      if (!acb) {
        return cs2XL(data, bestCoast[1], true);
      } else {
        if (pubRho >= caps[0] - caps[1] || maxRho < 13) {
          maxTauH = tauH;
          pubT = t;
          pubRho = maxRho;
        }
        const NEWdrho = pubRho - lastPub;

        let bestAddMult = getTotMult(pubRho) - totMult;
        let coastMult = 10 ** (getTotMult(lastBuyRho) - totMult);
        return [
          "CS2",
          data.sigma,
          logToExp(data.rho, 2),
          logToExp(pubRho, 2),
          logToExp(NEWdrho / 10, 2),
          (10 ** bestAddMult).toFixed(5),
          `CS2XL ${(10 ** (getTotMult(lastBuyRho, 2) - totMult)).toFixed(2)}`,
          (maxTauH / 10).toFixed(7),
          convertTime(pubT),
          [pubRho, pubT],
        ];
      }
    }
  }

  function buy() {
    while (c2_c <= rho && mc2 == 1) {
      lastBuyRho = Math.max(lastBuyRho, rho);
      rho = subtract(rho, c2_c);
      c2_c += 5.65;
      c2++;
      updateError(vn + 1);
      if (curMult > 1) isC2pub = true;
      searchCoast(true);
    }
    while (n_c <= rho && n_c + Math.log10(1.4) <= (mc2 == 1 ? c2_c : 1000000)) {
      lastBuyRho = Math.max(lastBuyRho, rho);
      rho = subtract(rho, n_c);
      n_c += log2 * (Math.log2(256) * 3.346);
      n++;
      updateError(vn + 1);
      searchCoast(true);
    }
    while (
      c1_c <= rho &&
      c1_c + c1weight <= Math.min(q2_c, n_c, mc2 == 1 ? c2_c : 1000000) &&
      (swapStatus == 0 || maxRho > 500)
    ) {
      lastBuyRho = Math.max(lastBuyRho, rho);
      rho = subtract(rho, c1_c);
      c1_c += Math.log10(16);
      c1 = add(c1, log2 * Math.floor(c1lvl / 10));
      c1lvl++;
      c1weight = Math.log10(10 + (c1lvl % 10));
      searchCoast(true);
    }
    while (
      q2_c <= rho &&
      q2_c + Math.log10(1.6) <= (mc2 == 1 ? c2_c : 1000000) &&
      q2_c + Math.log10(1.6) <= n_c
    ) {
      lastBuyRho = Math.max(lastBuyRho, rho);
      rho = subtract(rho, q2_c);
      q2_c += Math.log10(128);
      q2++;
      searchCoast(true);
    }
    while (
      q1_c <= rho &&
      q1_c + q1weight <= Math.min(q2_c, n_c, mc2 == 1 ? c2_c : 1000000)
    ) {
      lastBuyRho = Math.max(lastBuyRho, rho);
      rho = subtract(rho, q1_c);
      q1_c += Math.log10(5);
      q1 = add(q1, log2 * Math.floor(q1lvl / 10));
      q1lvl++;
      q1weight = Math.log10(10 + (q1lvl % 10)) * (1 / 1.1);
      searchCoast(true);
    }
  }
  function searchCoast(e500) {
    if (curMult > 0.7 && ((!acb && ctimer % cap == 0) || e500)) {
      for (let i = 5; i <= coastStats[0]; i += coastStats[1]) {
        if (lastPub < 497) {
          let endRho = add(
            rho,
            rhodot -
              vq1 +
              q1 *
                (maxRho >= 10
                  ? maxRho >= 45
                    ? maxRho >= 80
                      ? 1.15
                      : 1.1
                    : 1.05
                  : 1) +
              Math.log10(i * 1.5)
          );
          // console.log(10 ** q2boost, curMult);
          let endTauH = (endRho - lastPub) / ((t + i) / 3600);
          if (bestCoast[0] < endTauH && endTauH >= maxTauH) {
            bestCoast[0] = endTauH;
            bestCoast[1] = t;
          }
        } else {
          let avgQ = add(q + log2, qdot + Math.log10(i * 1.5)) - log2;
          let endRho = add(rho, rhodot - q + avgQ + Math.log10(i * 1.5));
          let endTauH = (endRho - lastPub) / ((t + i) / 3600);
          if (bestCoast[0] < endTauH && endTauH >= maxTauH) {
            bestCoast[0] = endTauH;
            bestCoast[1] = t;
          }
        }
      }
    }
  }

  function acStats(rho) {
    let T11N = [
      [15 * 60, 5],
      [10 * 60, 3],
      [20 * 60, 8],
      [
        (((lastPub - 500) / 100) ** 2 + 0.3333) * 3600,
        ((((lastPub - 500) / 100) ** 2 + 0.3333) * 3600) / 30,
      ],
    ];
    if (rho < 80) return T11N[0];
    if (rho < 300) return T11N[1];
    if (rho < 500) return T11N[2];
    if (rho >= 500) return T11N[3];
  }
}
