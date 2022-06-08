import { log10 , add , subtract , logToExp , convertTime } from "../../type_converters.js";

export function trig(data) {
  const lastPub = data.rho;
  let getTotMult = (val) => (val / 2.5) * 0.6 / Math.log(3);
  const totMult = getTotMult(lastPub);
  
  let dt = 1.5;
  let t = 0;
  
  let rho = 0;
  let maxrho = 0;
  
  let x = 0;
  let Q = 1;
  
  let a1 = 0;
  let a2 = 0;
  let a3 = 0;
  let dq = 0;
  let k = 0;
  let vdt = 0;
  
  let a1_c = 1;
  let a2_c = 1;
  let a3_c = 1;
  let dq_c = 1;
  let k_c = 0;
  let vdt_c = 0;
  
  /*function updateMilestones() {
    mterms = 0;
    mc1exp = 0;
    mMultQDot = 0;
    const val = Math.max(lastPub, maxRho);
    if (val >= 25) mterms++;
    if (val >= 50) mterms++;
    if (val >= 75) mterms++;
    if (val >= 100) mMultQDot++;
    if (val >= 125) mMultQDot++;
    if (val >= 150) mMultQDot++;
    if (val >= 175) mc1exp++;
  }

  updateMilestones();
  */
  
