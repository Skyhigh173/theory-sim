import { add, subtract, logToExp, convertTime } from "../../type_converters.js";

export function t3snax2(data) {
  const lastPub = data.rho;
  let getTotMult = (val) =>
    val * 0.147 +
    Math.log10(3) +
    Math.log10(
      Math.max(
        1,
        (data.sigma / 20) **
          (data.sigma < 65 ? 0 : data.sigma < 75 ? 1 : data.sigma < 85 ? 2 : 3)
      )
    );
  const totMult = getTotMult(lastPub);

  let dt = 1.5;
  let t = 0;

  let rho = 0;
  let maxRho = 0;
  let rho2 = 0;
  let rho3 = 0;

  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let c11 = 0;
  let c12 = 0;
  let c13 = 0;
  let c21 = 1;
  let c22 = 0;
  let c23 = 0;
  let c31 = 0;
  let c32 = 0;
  let c33 = 0;

  let b1_c = 1;
  let b2_c = 1;
  let b3_c = Math.log10(3000);
  let c11_c = Math.log10(20);
  let c12_c = 1;
  let c13_c = 3;
  let c21_c = Math.log10(500);
  let c22_c = 5;
  let c23_c = 5;
  let c31_c = 4;
  let c32_c = 3;
  let c33_c = 5;

  let b1lvl = 1;
  let b2lvl = 0;
  let b3lvl = 0;

  let b2weight = 0;
  let b3weight = 0;

  let log2 = Math.log10(2);
  let log8 = Math.log10(8);

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

  let milestones = [0, 0, 0, 0];

  function updateMilestones(val) {
    if (val >= 25) milestones = [0, 0, 1, 0];
    if (val >= 50) milestones = [0, 0, 2, 0];
    if (val >= 75) milestones = [0, 1, 2, 0];
    if (val >= 100) milestones = [0, 2, 2, 0];
    if (val >= 125) milestones = [1, 2, 2, 0];
    if (val >= 150) milestones = [1, 2, 2, 1];
    if (val >= 175) milestones = [1, 2, 2, 2];
  }

  updateMilestones(lastPub);

  function simulate() {
    if (t == 0) startTime = performance.now();
    if (rho > maxRho) maxRho = rho;

    if (maxRho > lastPub) updateMilestones(maxRho);

    let vc11 = log2 * c11;
    let vc12 = log2 * c12;
    let vc13 = milestones[0] ? log2 * c13 : 0;
    let vc21 = log2 * c21;
    let vc22 = log2 * c22;
    let vc23 = milestones[0] ? log2 * c23 : 0;
    let vc31 = milestones[0] ? log2 * c31 : 0;
    let vc32 = milestones[0] ? log2 * c32 : 0;
    let vc33 = milestones[0] ? log2 * c33 : 0;
    let vb1 = b1 * (1 + 0.05 * milestones[1]);
    let vb2 = b2 * (1 + 0.05 * milestones[2]);
    let vb3 = b3 * (1 + 0.05 * milestones[3]);

    rho = add(
      rho,
      Math.log10(dt) + totMult + add(add(vc11 + vb1, vc12 + vb2), vc13 + vb3)
    );
    rho2 = add(
      rho2,
      Math.log10(dt) + totMult + add(add(vc21 + vb1, vc22 + vb2), vc23 + vb3)
    );
    rho3 = milestones[0]
      ? add(
          rho3,
          Math.log10(dt) +
            totMult +
            add(add(vc31 + vb1, vc32 + vb2), vc33 + vb3)
        )
      : 0;

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

    if (maxRho + log2 < lastPub) buyBR();
    else buyAR();
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
        "T3",
        data.sigma,
        logToExp(data.rho, 2),
        logToExp(pubRho, 2),
        logToExp(NEWdrho, 2),
        (10 ** bestAddMult).toFixed(5),
        `T3Snax2`,
        maxTauH.toFixed(7),
        convertTime(pubT),
        [pubRho, pubT],
      ];
    }
  }

  function buyBR() {
    while (c33_c + 1 <= rho3) {
      rho3 = subtract(rho3, c33_c);
      c33_c += Math.log10(2.98);
      c33++;
    }
    while (c32_c <= rho2) {
      rho2 = subtract(rho2, c32_c);
      c32_c += Math.log10(6.81744);
      c32++;
    }
    while (c31_c <= rho) {
      rho = subtract(rho, c31_c);
      c31_c += Math.log10(1248.27);
      c31++;
    }
    while (c23_c <= rho3) {
      rho3 = subtract(rho3, c23_c);
      c23_c += Math.log10(2.27);
      c23++;
    }
    while (c22_c <= rho2) {
      rho2 = subtract(rho2, c22_c);
      c22_c += Math.log10(3.65);
      c22++;
    }
    while (c12_c <= rho2 && c12_c + 2 <= rho2) {
      rho2 = subtract(rho2, c12_c);
      c12_c += Math.log10(2.74);
      c12++;
    }
    while (b3_c + Math.log10(5) <= rho3) {
      rho3 = subtract(rho3, b3_c);
      b3_c += Math.log10(1.675);
      b3 = add(b3, log2 * Math.floor(b3lvl / 10));
      b3lvl++;
    }
    while (b2_c + Math.log10(3) <= rho2) {
      rho2 = subtract(rho2, b2_c);
      b2_c += Math.log10(1.308);
      b2 = add(b2, log2 * Math.floor(b2lvl / 10));
      b2lvl++;
    }
    while (b1_c + 1 <= rho) {
      rho = subtract(rho, b1_c);
      b1_c += Math.log10(1.18099);
      b1 = add(b1, log2 * Math.floor(b1lvl / 10));
      b1lvl++;
    }
  }
  function buyAR() {
    while (c33_c + 1 <= rho3 && false) {
      rho3 = subtract(rho3, c33_c);
      c33_c += Math.log10(2.98);
      c33++;
    }
    while (c32_c <= rho2 && false) {
      rho2 = subtract(rho2, c32_c);
      c32_c += Math.log10(6.81744);
      c32++;
    }
    while (c23_c <= rho3) {
      rho3 = subtract(rho3, c23_c);
      c23_c += Math.log10(2.27);
      c23++;
    }
    while (c22_c + log8 <= rho2) {
      rho2 = subtract(rho2, c22_c);
      c22_c += Math.log10(3.65);
      c22++;
    }
    while (c12_c <= rho2) {
      rho2 = subtract(rho2, c12_c);
      c12_c += Math.log10(2.74);
      c12++;
    }
    while (b3_c + Math.log10(5) <= rho3) {
      rho3 = subtract(rho3, b3_c);
      b3_c += Math.log10(1.675);
      b3 = add(b3, log2 * Math.floor(b3lvl / 10));
      b3lvl++;
    }
    while (b2_c + Math.log10(3) <= rho2) {
      rho2 = subtract(rho2, b2_c);
      b2_c += Math.log10(1.308);
      b2 = add(b2, log2 * Math.floor(b2lvl / 10));
      b2lvl++;
    }
  }
}
