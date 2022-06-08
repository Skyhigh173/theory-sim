import { add, subtract, logToExp, convertTime } from "../../type_converters.js";

export function slStopA(data) {
  const lastPub = data.rho;
  let getTotMult = (val) => (val / 10) * 1.5;
  const totMult = getTotMult(lastPub);

  let dt = 1 * 1.5;
  let t = 0;

  let rho1 = 0;
  let maxRho1 = 0;
  let rho2 = 0;
  let rho2dot = 0;
  let rho3 = 0;

  let a1 = 1;
  let a2 = 0;
  let b1 = 0;
  let b2 = 0;

  let a1_c = 0;
  let a2_c = Math.log10(175);
  let b1_c = Math.log10(500);
  let b2_c = 3;

  let a1lvl = 1;
  let b1lvl = 0;

  let curMult = 0;

  let inverseE_Gamma;

  let updateInverseE_Gamma = (x) => {
    let y =
      Math.log10(
        Math.log10(2) / Math.log10(Math.E) +
          x / Math.log10(Math.E) +
          Math.log10(Math.PI) / Math.log10(Math.E)
      ) -
      (Math.log10(2) + x);
    inverseE_Gamma =
      0 -
      Math.log10(Math.E) -
      add(subtract(y, y + y - Math.log10(2)), y + y + y + Math.log10(6));
  };

  let logE = Math.log10(Math.E);

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

  let mr2exp = 0;
  let ma3exp = 0;
  let mb1exp = 0;
  let mb2exp = 0;

  function updateMilestones(val, state) {
    mr2exp = 0;
    ma3exp = 0;
    mb1exp = 0;
    mb2exp = 0;
    if (val >= 25) mb2exp = 1;
    if (val >= 50) mb2exp = 2;
    if (val >= 75) mb1exp = 1;
    if (val >= 100) mb1exp = 2;
    if (val >= 125) mr2exp = 1;
    if (val >= 150) mr2exp = 2;
    if (val >= 175) mr2exp = 3;
    if (val >= 200) ma3exp = 1;
    if (val >= 225) ma3exp = 2;
    if (val >= 250) ma3exp = 3;
    if (val >= 275) ma3exp = 4;
    if (val >= 300) ma3exp = 5;
  }

  updateMilestones(lastPub);

  function simulate() {
    if (t == 0) startTime = performance.now();
    if (rho1 > maxRho1) maxRho1 = rho1;

    let vb2 = b2 * Math.log10(2);
    let va2 = a2 * Math.log10(2);

    let rho3dot = b1 * (1 + 0.02 * mb1exp) + vb2 * (1 + 0.02 * mb2exp);
    rho3 = add(rho3, rho3dot + Math.log10(dt));
    updateInverseE_Gamma(Math.max(1, rho3));

    rho2dot =
      Math.LOG10E *
      (a1 / logE +
        va2 / logE -
        Math.log(2 - 0.008 * ma3exp) * (Math.max(1, rho3) / logE));

    rho2 = add(rho2, Math.max(0, rho2dot) + Math.log10(dt));

    let rho1dot = rho2 * (1 + mr2exp * 0.02) * 0.5 + inverseE_Gamma;
    rho1 = add(rho1, rho1dot + totMult + Math.log10(dt));

    t += dt / 1.5;
    dt *= 1.0001;

    drho = maxRho1 - lastPub;
    tauH = Math.max(0, drho / (t / 3600));
    if (maxTauH < tauH) {
      maxTauH = tauH;
      pubDRho = drho;
      maxT = t * 2;
      pubT = t;
      pubRho = rho1;
    }

    curMult = 10 ** Math.max(0, (maxRho1 / 10) * 1.5 - totMult);

    buy();
  }
  while (true) {
    simulate();
    if (
      ((tauH >= maxTauH || t < maxT || pubRho >= cap[0] - cap[1]) &&
        maxRho1 < cap[0]) === false &&
      maxRho1 > 10
    ) {
      if (pubRho >= cap[0] - cap[1] || maxRho1 < 11) {
        maxTauH = tauH;
        maxT = t * 2.5;
        pubT = t;
        pubRho = maxRho1;
      }
      const NEWdrho = pubRho - lastPub;

      let bestAddMult = getTotMult(pubRho) - totMult;
      return [
        "SL",
        data.sigma,
        logToExp(data.rho, 2),
        logToExp(pubRho, 2),
        logToExp(NEWdrho / 10, 2),
        (10 ** bestAddMult).toFixed(5),
        `SLstopA`,
        (maxTauH / 10).toFixed(7),
        convertTime(pubT),
        [pubRho, pubT, true],
      ];
    }
  }

  function buy() {
    while (a1_c <= rho1 && curMult <= 4.5) {
      rho1 = subtract(rho1, a1_c);
      a1_c += Math.log10(2 ** (0.369 * Math.log2(10)));
      a1 = add(a1, Math.log10(3.5) * Math.floor(a1lvl / 3));
      a1lvl++;
    }
    while (a2_c <= rho1 && curMult <= 4.5) {
      rho1 = subtract(rho1, a2_c);
      a2_c += 1;
      a2++;
    }
    while (b1_c <= rho1) {
      rho1 = subtract(rho1, b1_c);
      b1_c += Math.log10(2 ** (0.649 * Math.log2(10)));
      b1 = add(b1, Math.log10(6.5) * Math.floor(b1lvl / 4));
      b1lvl++;
    }
    while (b2_c <= rho1) {
      rho1 = subtract(rho1, b2_c);
      b2_c += Math.log10(2 ** (0.926 * Math.log2(10)));
      b2++;
    }
  }
}
