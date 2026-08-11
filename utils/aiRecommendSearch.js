"use strict";
const services_api = require("../services/api.js");
const ALL_SOURCES = ["tx", "kg", "wy", "kw", "mg"];
const batchSearch = async (keywords, hotSearchKeywords = [], pageSize = 20) => {
  var _a;
  console.log(`[BatchSearch] 🔍 开始批量搜索: ${keywords.length}组关键词 (全并行)`);
  const allPromises = [];
  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];
    const src1 = ALL_SOURCES[i % ALL_SOURCES.length];
    const src2 = ALL_SOURCES[(i + 2) % ALL_SOURCES.length];
    console.log(`[BatchSearch]   关键词"${kw}" → [${src1}] + [${src2}]`);
    const page1 = Math.floor(Math.random() * 3) + 1;
    const page2 = Math.floor(Math.random() * 3) + 1;
    allPromises.push(
      services_api.searchApi.searchSongs(kw, src1, page1, pageSize).catch((e) => {
        console.warn(`[BatchSearch] ⚠️ [${src1}] "${kw}" 搜索失败:`, e.message);
        return { source: src1, list: [] };
      }).then((r) => {
        if (r && r.list && r.list.length > 0) {
          console.log(`[BatchSearch]   [${r.source}] "${kw}": ${r.list.length}首`);
        }
        return r;
      })
    );
    allPromises.push(
      services_api.searchApi.searchSongs(kw, src2, page2, pageSize).catch((e) => {
        console.warn(`[BatchSearch] ⚠️ [${src2}] "${kw}" 搜索失败:`, e.message);
        return { source: src2, list: [] };
      }).then((r) => {
        if (r && r.list && r.list.length > 0) {
          console.log(`[BatchSearch]   [${r.source}] "${kw}": ${r.list.length}首`);
        }
        return r;
      })
    );
  }
  const coveredSources = new Set(keywords.map((_, i) => ALL_SOURCES[i % ALL_SOURCES.length]));
  const uncoveredSources = ALL_SOURCES.filter((s) => !coveredSources.has(s));
  if (uncoveredSources.length > 0 && hotSearchKeywords.length > 0) {
    const explorationKeyword = hotSearchKeywords[Math.floor(Math.random() * hotSearchKeywords.length)];
    if (explorationKeyword) {
      console.log(`[BatchSearch] 📡 补充搜索: "${explorationKeyword}" → [${uncoveredSources.join(",")}]`);
      for (const src of uncoveredSources) {
        allPromises.push(
          services_api.searchApi.searchSongs(explorationKeyword, src, 1, pageSize).catch((e) => {
            console.warn(`[BatchSearch] ⚠️ [${src}] 补充搜索失败:`, e.message);
            return { source: src, list: [] };
          })
        );
      }
    }
  }
  const allResults = await Promise.all(allPromises);
  const results = allResults.filter((r) => r && r.list && r.list.length > 0);
  const platformStats = {};
  for (const r of results) {
    const src = r.source || "?";
    platformStats[src] = (platformStats[src] || 0) + (((_a = r.list) == null ? void 0 : _a.length) || 0);
  }
  console.log(`[BatchSearch] ✅ 搜索完成: ${results.length}个结果, 平台分布:`, platformStats);
  return results;
};
exports.batchSearch = batchSearch;
