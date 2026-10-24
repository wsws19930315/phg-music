"use strict";const r=[1500,4e3,7e3,1e4];function o(e){const t=Number(e),n=!Number.isFinite(t)||t<1?0:Math.min(Math.floor(t),r.length)-1;return r[n]}exports.getPlayErrorRetryDelay=o;
