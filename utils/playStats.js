"use strict";const n=t=>!t||!t.completions||t.completions.length===0?0:(t.completions.reduce((e,o)=>e+(o.rate||0),0)/t.completions.length*100).toFixed(1);exports.calculateAvgCompletionRate=n;
