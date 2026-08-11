"use strict";
const common_vendor = require("../common/vendor.js");
const CACHE_KEY = "ai_hot_search_cache";
const CACHE_TTL = 12 * 60 * 60 * 1e3;
const getCache = () => {
  try {
    const raw = common_vendor.index.getStorageSync(CACHE_KEY);
    if (!raw)
      return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp > CACHE_TTL) {
      console.log("[HotSearch] 缓存已过期，重新获取");
      return null;
    }
    console.log(`[HotSearch] 命中缓存，${data.keywords.length}个热搜词，缓存于 ${new Date(data.timestamp).toLocaleString("zh-CN")}`);
    return data.keywords;
  } catch (e) {
    return null;
  }
};
const saveCache = (keywords) => {
  try {
    common_vendor.index.setStorageSync(CACHE_KEY, JSON.stringify({
      keywords,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn("[HotSearch] 缓存保存失败:", e.message);
  }
};
const getHotSearchKeywords = async (searchApi) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
  const cached = getCache();
  if (cached)
    return cached;
  console.log("[HotSearch] 🔍 直接请求各音乐平台热搜...");
  const results = await Promise.allSettled([
    searchApi.getWyHotSearch(),
    searchApi.getTxHotSearch(),
    searchApi.getKgHotSearch(),
    searchApi.getKwHotSearch(),
    searchApi.getMgHotSearch()
  ]);
  const hotKeywords = [];
  if (results[0].status === "fulfilled" && ((_b = (_a = results[0].value) == null ? void 0 : _a.data) == null ? void 0 : _b.itemList)) {
    results[0].value.data.itemList.slice(0, 8).forEach((item) => {
      if (item.searchWord)
        hotKeywords.push(item.searchWord);
    });
  }
  if (results[1].status === "fulfilled" && ((_e = (_d = (_c = results[1].value) == null ? void 0 : _c.hotkey) == null ? void 0 : _d.data) == null ? void 0 : _e.vec_hotkey)) {
    results[1].value.hotkey.data.vec_hotkey.slice(0, 8).forEach((item) => {
      if (item.query)
        hotKeywords.push(item.query);
    });
  }
  if (results[2].status === "fulfilled" && ((_g = (_f = results[2].value) == null ? void 0 : _f.data) == null ? void 0 : _g.info)) {
    results[2].value.data.info.slice(0, 8).forEach((item) => {
      if (item.filename) {
        const parts = item.filename.split(" - ");
        if (parts[1])
          hotKeywords.push(parts[1]);
      }
    });
  }
  if (results[3].status === "fulfilled" && ((_h = results[3].value) == null ? void 0 : _h.tagvalue)) {
    results[3].value.tagvalue.slice(0, 8).forEach((item) => {
      if (item.key)
        hotKeywords.push(item.key);
    });
  }
  if (results[4].status === "fulfilled" && ((_l = (_k = (_j = (_i = results[4].value) == null ? void 0 : _i.data) == null ? void 0 : _j.hotwords) == null ? void 0 : _k[0]) == null ? void 0 : _l.hotwordList)) {
    results[4].value.data.hotwords[0].hotwordList.filter((item) => item.resourceType === "song").slice(0, 8).forEach((item) => {
      if (item.word)
        hotKeywords.push(item.word);
    });
  }
  const unique = [...new Set(hotKeywords)];
  if (unique.length === 0) {
    console.warn("[HotSearch] ⚠️ 所有平台热搜获取失败，使用备用数据");
    return ["周杰伦", "林俊杰", "薛之谦", "邓紫棋", "五月天", "陈奕迅", "王菲", "李荣浩"];
  }
  console.log(`[HotSearch] ✅ 获取到 ${unique.length} 个热搜词: ${unique.slice(0, 10).join(", ")}...`);
  saveCache(unique);
  return unique;
};
exports.getHotSearchKeywords = getHotSearchKeywords;
