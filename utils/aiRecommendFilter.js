"use strict";
const filterKeywords = (keywords, preferences = {}, mode = "C", avoidStr = "") => {
  let filtered = keywords.filter((k) => typeof k === "string" && k.trim()).slice(0, 8);
  if (avoidStr) {
    const avoidLower = avoidStr.toLowerCase();
    filtered.length;
    filtered = filtered.filter((kw) => {
      const kwLower = kw.toLowerCase();
      const avoidWords = ["说唱", "rap", "嘻哈", "电音", "dj", "舞曲", "重金属", "摇滚"];
      for (const aw of avoidWords) {
        if (avoidLower.includes(aw) && kwLower.includes(aw)) {
          console.log(`[Filter] 🔑 过滤矛盾关键词: "${kw}" (与avoidDirections冲突: ${aw})`);
          return false;
        }
      }
      return true;
    });
  }
  if (mode === "B") {
    const selLang = preferences.language;
    if (selLang === "mixed") {
      filtered = filtered.filter((kw) => {
        if (/多语|混合/.test(kw)) {
          console.log(`[Filter] 🔑 mixed过滤: 移除"${kw}"`);
          return false;
        }
        return true;
      });
    }
    const conflictWords = {
      "western": /华语|中文|国语|粤语|闽南|台语|日语|韩语|韩文|日文|J-pop|K-pop/i,
      "chinese": /英文|欧美|english|western|日本|韩语|韩文|日文|J-pop|K-pop/i,
      "japanese_korean": /华语|中文|国语|粤语|闽南|台语|英文|欧美|english|western/i
    };
    const langMarkers = {
      "western": /英文|欧美|english|western|欧美流行|英文歌/i,
      "chinese": /华语|中文|国语|粤语|闽南|台语/,
      "japanese_korean": /日韩|日语|韩语|日文|韩文|J-pop|K-pop|日本|韩国/i
    };
    if (selLang && conflictWords[selLang] && langMarkers[selLang]) {
      filtered = filtered.filter((kw) => {
        if (conflictWords[selLang].test(kw)) {
          console.log(`[Filter] 🔑 语言过滤: 移除"${kw}" (含矛盾语言词)`);
          return false;
        }
        if (!langMarkers[selLang].test(kw)) {
          console.log(`[Filter] 🔑 语言过滤: 移除"${kw}" (不含${selLang}语言标记)`);
          return false;
        }
        return true;
      });
    }
  }
  return filtered;
};
const filterCandidates = (searchResults, preferences = {}, excludedKeys = /* @__PURE__ */ new Set()) => {
  var _a;
  const seenKeys = /* @__PURE__ */ new Set();
  const artistCount = /* @__PURE__ */ new Map();
  const MAX_PER_ARTIST = 3;
  const rawCandidates = [];
  let totalRaw = 0;
  for (const result of searchResults) {
    if (!result || !result.list || !Array.isArray(result.list))
      continue;
    const source = result.source;
    for (const song of result.list) {
      totalRaw++;
      const name = String(song.name || "").trim();
      const singer = String(song.singer || "").trim();
      if (!name || !singer)
        continue;
      if (/^第[一二三四五六七八九十百千\d]+[章集话回篇]/.test(name))
        continue;
      if (/喜马拉雅|中广影音|蜻蜓fm|荔枝fm|资讯电台|电台|FM|广播/i.test(singer))
        continue;
      if (name.length > 30)
        continue;
      if (/^#/.test(name))
        continue;
      if ((name.match(/#/g) || []).length >= 2 && name.length < 20)
        continue;
      if (/鬼故事|广播剧|有声|评书|睡前|故事会|文案|BGM|配乐|背景音/.test(song.albumName || ""))
        continue;
      if (/鬼故事|广播剧|有声|评书|睡前|故事会|文案|配乐|背景音/.test(name))
        continue;
      const selLang = preferences.language;
      if (selLang === "japanese_korean") {
        const hasHangul = /[가-힣]/.test(singer) || /[가-힣]/.test(name);
        const hasKana = /[\u3040-\u309f\u30a0-\u30ff]/.test(singer) || /[\u3040-\u309f\u30a0-\u30ff]/.test(name);
        const isLatinSinger = /^[a-zA-Z0-9\s&.,'!-]+$/.test(singer) && singer.length > 1;
        if (!hasHangul && !hasKana && !isLatinSinger)
          continue;
      } else if (selLang === "western") {
        if (/[\u4e00-\u9fff]/.test(singer) || /[가-힣]/.test(singer) || /[\u3040-\u309f\u30a0-\u30ff]/.test(singer))
          continue;
      } else if (selLang === "chinese") {
        if (!/[\u4e00-\u9fff]/.test(singer))
          continue;
      }
      const selScene = preferences.scene;
      if (selScene === "运动健身") {
        if (/伤|泪|哭|痛|心碎|思念|想你|孤独|寂寞|离别|分手|忘|等|安静|温柔|催眠|睡|轻柔|舒缓|疗伤|治愈|低落|难过|遗憾|失去|错过|回忆|怀念/.test(name))
          continue;
      }
      const durStr = String(song.interval || "");
      const durMatch = durStr.match(/(\d+):(\d+)/);
      if (durMatch) {
        const durSec = parseInt(durMatch[1]) * 60 + parseInt(durMatch[2]);
        if (durSec < 30)
          continue;
      }
      const dedupKey = `${name.toLowerCase()}-${singer.toLowerCase()}`;
      if (seenKeys.has(dedupKey))
        continue;
      const excludeKey = `${name} - ${singer}`.toLowerCase();
      if (excludedKeys.has(excludeKey))
        continue;
      const currentArtistCount = artistCount.get(singer) || 0;
      if (currentArtistCount >= MAX_PER_ARTIST)
        continue;
      seenKeys.add(dedupKey);
      artistCount.set(singer, currentArtistCount + 1);
      let songId = song.id || "";
      let songmid = song.songmid || "";
      let hash = song.hash || "";
      if (!songId && hash)
        songId = hash;
      if (!songId && songmid)
        songId = songmid;
      if (!songId && song.copyrightId)
        songId = song.copyrightId;
      if (!songmid && songId)
        songmid = songId;
      if (!hash && songId && source === "kg")
        hash = songId;
      rawCandidates.push({
        index: rawCandidates.length + 1,
        name,
        singer,
        albumName: song.albumName || ((_a = song.album) == null ? void 0 : _a.name) || "",
        source,
        id: songId,
        songmid,
        hash,
        img: song.img || song.pic || "",
        interval: song.interval || "",
        copyrightId: song.copyrightId || ""
      });
    }
  }
  console.log(`[Filter] ✅ 过滤完成: 原始${totalRaw}首 → 去重排除后${rawCandidates.length}首`);
  return rawCandidates;
};
const shuffleByPlatform = (candidates) => {
  const byPlatform = /* @__PURE__ */ new Map();
  for (const c of candidates) {
    const plat = c.source || "unknown";
    if (!byPlatform.has(plat))
      byPlatform.set(plat, []);
    byPlatform.get(plat).push(c);
  }
  const result = [];
  const platformLists = Array.from(byPlatform.values());
  let idx = 0;
  while (result.length < candidates.length) {
    let added = false;
    for (const platList of platformLists) {
      if (idx < platList.length) {
        result.push(platList[idx]);
        added = true;
      }
    }
    if (!added)
      break;
    idx++;
  }
  console.log(`[Filter] 📊 平台轮转: ${candidates.length}首打散为${result.length}首 (平台: ${Array.from(byPlatform.keys()).join(",")})`);
  return result;
};
const detectMode = (seeds, preferences = {}) => {
  const hasCustomPrompt = preferences.customPrompt && preferences.customPrompt.trim().length > 0;
  const hasSceneOrLang = preferences.scene || preferences.era && preferences.era !== "any" || preferences.language && preferences.language !== "any";
  const isEmptySeeds = !seeds || seeds.length === 0;
  if (hasCustomPrompt)
    return "A";
  if (hasSceneOrLang)
    return "B";
  if (isEmptySeeds)
    return "D";
  return "C";
};
exports.detectMode = detectMode;
exports.filterCandidates = filterCandidates;
exports.filterKeywords = filterKeywords;
exports.shuffleByPlatform = shuffleByPlatform;
