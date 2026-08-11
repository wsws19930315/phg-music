"use strict";
const SCENE_KEYWORDS = {
  "开车提神": "节奏快 律动感 摇滚 电子",
  "深夜助眠": "轻音乐 纯音乐 安静 舒缓",
  "运动健身": "高能量 燃 电子 DJ 嘻哈",
  "工作学习": "轻柔 无歌词 背景 Lo-fi 古典",
  "聚会派对": "DJ 舞曲 电子 House 气氛",
  "独处放空": "氛围感 民谣 爵士 独立音乐",
  "情绪低落": "治愈 温暖 共情 舒缓",
  "兴奋High": "电子 摇滚 金属 爆发力 高能量"
};
const ERA_KEYWORDS = {
  "classic": "经典老歌 90年代 怀旧",
  "millennium": "2000年代 千禧 回忆",
  "2010s": "2010年代 流行 现代",
  "latest": "2024新歌 最新 热门"
};
const LANG_KEYWORDS = {
  "chinese": "华语 中文",
  "western": "英文 欧美",
  "japanese_korean": "日语 韩语 日韩",
  "mixed": "华语+英文+日韩（多语言混合，每组关键词只用一种语言）"
};
const SCENE_FILTERS = {
  "运动健身": "🔑🔑🔑 最高优先级！必须只选适合运动的歌！运动歌的特征：BPM快(120+)、节奏强劲、有鼓点、电子/摇滚/说唱风格。❌❌❌ 绝对禁止选这些歌：抒情情歌、慢歌、民谣、轻音乐、治愈系、催眠曲、悲伤情歌、钢琴曲、女声抒情。即使候选歌曲里有用户平时喜欢的抒情歌，也绝对不能选！如果候选里没有运动歌，宁可不选也不要选抒情歌！",
  "开车提神": "必须选节奏快、律动感强、能提神的歌曲。❌ 排除催眠曲、轻音乐、慢节奏抒情歌。",
  "深夜助眠": "必须选轻柔、舒缓、安静的歌曲。❌ 排除高能量、电子舞曲、重金属、快节奏歌曲。",
  "工作学习": "必须选轻柔、无歌词或低干扰的背景音乐。❌ 排除高能量、DJ舞曲、重金属。",
  "聚会派对": "必须选气氛热烈、适合派对的舞曲或流行歌。❌ 排除催眠曲、慢节奏悲伤情歌。",
  "独处放空": "必须选氛围感强、沉浸式的歌曲。❌ 排除过于吵闹的DJ舞曲。",
  "情绪低落": "必须选治愈、温暖、共情的歌曲。❌ 排除过度亢奋的电子舞曲和重金属。",
  "兴奋High": "必须选高能量、爆发力强的歌曲。❌ 排除慢节奏抒情、催眠曲、轻音乐。"
};
const ERA_REQUIREMENTS = {
  "millennium": "年代要求：必须选2000年代（2000-2009年）的歌曲。❌ 排除2015年以后的新歌。",
  "classic": '年代要求：必须选经典老歌/90年代及更早的歌曲。❌ 排除2010年以后的新歌（如"满天星辰不及你""星空剪影"等网络新歌绝对不能选）。',
  "2010s": "年代要求：必须选2010年代（2010-2019年）的流行歌曲。❌ 排除2020年以后的新歌和90年代老歌。",
  "latest": "年代要求：必须选2023-2024年的新歌。❌ 排除2015年以前的老歌。"
};
const LANG_REQUIREMENTS = {
  "western": "语言要求：必须选英文/欧美歌曲，❌ 排除纯华语歌曲和纯日韩语歌曲。",
  "chinese": "语言要求：必须选华语歌曲，❌ 排除纯英文/欧美歌曲和纯日韩语歌曲。",
  "japanese_korean": "语言要求：必须选日语或韩语歌曲（歌手必须是日本/韩国艺人），❌ 排除纯英文歌曲（如Avicii/The Chainsmokers/Justin Bieber等欧美歌手）和纯华语歌曲。注意：K-pop歌曲即使歌名是英文（如BLACKPINK/BIGBANG的歌），只要歌手是韩国/日本艺人就可以选。"
};
const buildKeywordPrompt = (seeds, hotSearchKeywords = [], userProfile = {}, preferences = {}, dislikeArtists = [], mode = "C") => {
  var _a;
  const seedList = seeds.map((s, i) => `${i + 1}. 《${s.name}》- ${s.singer}`).join("\n");
  const avoidStr = userProfile.avoidDirections ? Array.isArray(userProfile.avoidDirections) ? userProfile.avoidDirections.join("、") : String(userProfile.avoidDirections) : "";
  let prompt = "";
  if (mode === "A") {
    const customText = preferences.customPrompt.trim();
    const hotListA = hotSearchKeywords.slice(0, 10).join(", ");
    prompt = `根据用户的个性化需求，生成20组音乐搜索关键词。

【用户的需求】
${customText}

【用户口味参考（仅供参考方向，不要直接用歌手名搜索）】
${seedList}

${hotListA ? `【当前热搜趋势（仅参考，最多4组来自热搜）】
${hotListA}
` : ""}
${avoidStr ? `【需避免的风格方向】
${avoidStr}
` : ""}
${dislikeArtists.length > 0 ? `【用户不喜欢的歌曲特征参考】
${dislikeArtists.slice(0, 8).join("、")}
` : ""}
【要求 - 非常重要】
1. 全部20组关键词都必须与用户需求"${customText}"直接相关！
2. 理解用户意图和情绪，不是字面搜索：
   - 例如"今天生日"→"欢快流行"、"庆生派对"、"快乐节奏"、"生日歌曲"、"庆祝英文歌"、"派对舞曲"
   - 例如"想听DJ"→"DJ舞曲"、"电子嗨曲"、"节拍强劲"、"house音乐"、"edm电子"、"舞曲remix"
   - 例如"失恋了"→"伤感情歌"、"心碎流行"、"治愈英文歌"、"失恋歌曲"、"emo摇滚"、"悲伤民谣"
3. 每组2-8个字，必须是QQ音乐/网易云能搜到歌曲的词
4. ❌ 不要生成和需求无关的词！
5. ❌ 不要生成纯歌手名搜索（如"马思唯"），要生成风格/场景/流派词
6. 🔑 热搜参考限制：最多4组（20%）可以参考热搜趋势，其余16组必须围绕用户需求生成
${avoidStr ? `7. ❌ 不要生成与以下方向相关的关键词：${avoidStr}` : ""}

【输出格式】
只输出JSON数组：
["关键词1","关键词2",..."关键词20"]`;
  } else if (mode === "B") {
    const sceneKw = preferences.scene && SCENE_KEYWORDS[preferences.scene] ? SCENE_KEYWORDS[preferences.scene] : "";
    const eraKw = preferences.era && preferences.era !== "any" && ERA_KEYWORDS[preferences.era] ? ERA_KEYWORDS[preferences.era] : "";
    const langKw = preferences.language && preferences.language !== "any" && LANG_KEYWORDS[preferences.language] ? LANG_KEYWORDS[preferences.language] : "";
    const exploreMode = preferences.explore || "moderate";
    const profileParts = [];
    if (userProfile.profileName)
      profileParts.push(`画像: ${userProfile.profileName}`);
    if ((_a = userProfile.musicStyles) == null ? void 0 : _a.length)
      profileParts.push(`平时偏好流派: ${Array.isArray(userProfile.musicStyles) ? userProfile.musicStyles.join("、") : userProfile.musicStyles}`);
    if (userProfile.languagePreference)
      profileParts.push(`平时语言偏好: ${userProfile.languagePreference}`);
    if (userProfile.emotionTone)
      profileParts.push(`平时情绪基调: ${userProfile.emotionTone}`);
    if (userProfile.rhythmPreference)
      profileParts.push(`平时节奏偏好: ${userProfile.rhythmPreference}`);
    const profileStr = profileParts.length > 0 ? profileParts.join("\n") : "无";
    const prefDescParts = [];
    if (preferences.scene)
      prefDescParts.push(`场景: ${preferences.scene}${sceneKw ? ` (${sceneKw})` : ""}`);
    if (eraKw)
      prefDescParts.push(`年代: ${preferences.era} (${eraKw})`);
    if (langKw)
      prefDescParts.push(`语言: ${preferences.language} (${langKw})`);
    if (exploreMode) {
      const exploreDesc = { "strict": "严格匹配口味", "moderate": "适度探索", "surprise": "大胆探索新风格" };
      prefDescParts.push(`探索: ${exploreDesc[exploreMode] || exploreMode}`);
    }
    const overrideWarnings = [];
    if (langKw) {
      overrideWarnings.push(`- 语言覆盖：用户选择了"${langKw}"，全部关键词必须偏向该语言方向。即使用户平时主要听华语，也不要生成华语相关关键词！`);
    }
    if (preferences.scene) {
      overrideWarnings.push(`- 场景覆盖：用户选择了"${preferences.scene}"，全部关键词必须体现该场景的氛围。即使用户平时听柔和的歌，选了"兴奋High"就生成高能量关键词，不要生成柔和的！`);
    }
    if (eraKw) {
      overrideWarnings.push(`- 年代覆盖：用户选择了"${eraKw}"，全部关键词必须体现该年代特征。即使用户平时听新歌，选了经典就只生成经典老歌方向的关键词！`);
    }
    prompt = `根据用户选择的明确方向，生成20组音乐搜索关键词。

【用户选择的方向（绝对优先，覆盖平时习惯）】
${prefDescParts.join("\n")}

【用户平时口味（仅用于未选择方向的空缺补充）】
${profileStr}
种子歌曲: ${seeds.map((s) => `${s.name}-${s.singer}`).slice(0, 5).join(", ")}

${avoidStr ? `【硬约束 - 不可违反】
需避免的风格方向: ${avoidStr}
` : ""}
${dislikeArtists.length > 0 ? `【用户不喜欢的歌曲特征参考】
${dislikeArtists.slice(0, 8).join("、")}
` : ""}
【核心规则 - 方向优先，偏好打底】
1. 用户选择的每一个方向（场景/语言/年代）都是绝对优先级，必须同时体现在关键词中！
   - 不要只侧重某一个方向，所有选择的方向必须同时贯穿
   - 例如：scene=情绪低落 + era=classic + language=chinese → 关键词应该是"经典华语疗伤"、"90年代华语治愈"、"怀旧华语情歌"等，同时包含场景+年代+语言
${overrideWarnings.join("\n")}
2. 用户平时的画像偏好只用于补充用户【没有明确选择】的维度
3. 每组2-8个字，必须是QQ音乐/网易云能搜到歌曲的词
4. 关键词类型（20组要丰富多样，每组都必须同时体现场景+年代+语言）：
   - 6组：场景+年代组合词
   - 7组：年代+语言组合词
   - 7组：场景+语言+年代组合词
${preferences.language === "mixed" ? `5. 🔑 语言=多语混合：20组关键词必须覆盖不同语言！
   - 7组用华语词
   - 7组用英文词
   - 6组用日韩词
   - ❌ 绝对不要用"多语"这个词！每组关键词只能是单一语言的！` : ""}
${exploreMode === "surprise" ? `${preferences.language === "mixed" ? "6" : "5"}. 🔑 探索模式=惊喜：大胆生成用户平时不怎么听的方向，但必须符合用户选择的方向！
` : ""}${exploreMode === "strict" ? `${preferences.language === "mixed" ? "6" : "5"}. 探索模式=严格：在用户选择的方向内，尽量贴近用户平时的口味
` : ""}
6. ❌ 不要生成纯歌手名搜索，要生成风格/场景/流派词
${avoidStr ? `7. ❌ 不要生成与以下方向相关的关键词：${avoidStr}` : ""}

【输出格式】
只输出JSON数组：
["关键词1","关键词2",..."关键词20"]`;
  } else if (mode === "D") {
    const hotList = hotSearchKeywords.slice(0, 15).join(", ");
    prompt = `你是一个音乐推荐专家。这是一位新用户，还没有听过任何歌曲，没有收藏记录。
你的任务是生成20组【多样化】的搜索关键词，覆盖不同风格和场景，帮助探索用户的音乐喜好。

【当前各平台热搜趋势】
${hotList}

【要求 - 非常重要】
1. 生成20组关键词，每组2-8个字
2. 关键词必须是音乐平台能搜到歌曲的词
3. 🔑 多样性要求：20组关键词必须覆盖不同风格方向！
   - 6组：当下热门流行（可参考热搜趋势，但不要直接用歌手名）
   - 7组：经典怀旧方向，如"经典老歌"、"90年代金曲"
   - 7组：不同风格探索（民谣、电子、摇滚、R&B、爵士等）
4. ❌ 不要全部生成同一风格的关键词
5. ❌ 不要生成纯歌手名搜索

【输出格式】
只输出JSON数组：
["关键词1","关键词2",..."关键词20"]`;
  } else {
    const profileHint = userProfile.profileName || userProfile.profileDesc || "";
    const hotList = hotSearchKeywords.slice(0, 10).join(", ");
    prompt = `根据用户喜欢的歌曲和画像，生成20组音乐搜索关键词。

【用户喜欢的歌曲】
${seedList}

【用户画像】
${profileHint}

【热搜趋势（参考潮流方向）】
${hotList}

${avoidStr ? `【需避免的风格方向】
${avoidStr}
` : ""}
${dislikeArtists.length > 0 ? `【用户不喜欢的歌曲特征参考】
${dislikeArtists.slice(0, 8).join("、")}
` : ""}
【要求 - 非常重要】
1. 生成20组关键词，每组2-8个字
2. 关键词必须是音乐平台能搜到歌曲的词，不要生造词
3. 关键词类型（20组要丰富多样）：
   - 7组：歌手风格词，从种子歌曲的歌手名衍生
   - 7组：流派场景词，音乐平台常用分类词
   - 6组：画像衍生词，从用户画像偏好衍生
4. ✅ 好的关键词："马思唯 说唱"、"中文说唱"、"华语抒情"
   ❌ 坏的关键词："深夜循环"、"治愈系"（平台搜不到）
${avoidStr ? `5. ❌ 不要生成与以下方向相关的关键词：${avoidStr}` : ""}

【输出格式】
只输出JSON数组：
["关键词1","关键词2",..."关键词20"]`;
  }
  return prompt;
};
const KEYWORD_SYSTEM_MESSAGE = "你是音乐搜索关键词生成器。直接输出JSON数组，不要任何解释。不要思考过程，直接输出结果。";
const parseKeywords = (response) => {
  if (!response)
    return [];
  let jsonStr = response.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  }
  const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }
  jsonStr = jsonStr.replace(/\[\(/g, "[").replace(/\)\]/g, "]");
  jsonStr = jsonStr.replace(/,\s*\]/g, "]");
  try {
    const keywords = JSON.parse(jsonStr);
    if (Array.isArray(keywords)) {
      return keywords.filter((k) => typeof k === "string" && k.trim());
    }
  } catch (e) {
    console.error("[Prompt] 关键词解析失败:", e.message);
  }
  return [];
};
const buildRankPrompt = (seeds, candidates, userProfile = {}, preferences = {}, dislikeArtists = []) => {
  var _a;
  const seedList = seeds.length > 0 ? seeds.map((s, i) => `${i + 1}. 《${s.name}》- ${s.singer}`).join("\n") : "（新用户，暂无听歌记录）";
  const candidateList = candidates.map(
    (c, i) => `${i + 1}.《${c.name}》-${c.singer} [${c.interval || "??:??"}]`
  ).join("\n");
  const targetCount = candidates.length;
  const profileParts = [];
  if (userProfile.profileName)
    profileParts.push(`画像名称: ${userProfile.profileName}`);
  if (userProfile.profileDesc)
    profileParts.push(userProfile.profileDesc);
  if ((_a = userProfile.musicStyles) == null ? void 0 : _a.length)
    profileParts.push(`流派偏好: ${userProfile.musicStyles.join("、")}`);
  if (userProfile.languagePreference)
    profileParts.push(`语言偏好: ${userProfile.languagePreference}`);
  if (userProfile.emotionTone)
    profileParts.push(`情绪基调: ${userProfile.emotionTone}`);
  if (userProfile.rhythmPreference)
    profileParts.push(`节奏偏好: ${userProfile.rhythmPreference}`);
  if (userProfile.voicePreference)
    profileParts.push(`声音偏好: ${userProfile.voicePreference}`);
  if (userProfile.eraPreference)
    profileParts.push(`年代偏好: ${userProfile.eraPreference}`);
  const profileDetail = profileParts.length > 0 ? profileParts.join("\n") : "";
  const dislikeHint = dislikeArtists.length > 0 ? `
【用户不喜欢的歌曲（避免推荐相似风格）】
${dislikeArtists.join("、")}
` : "";
  const avoidHint = userProfile.avoidDirections ? `
【需避免的风格方向】
${userProfile.avoidDirections}
` : "";
  const hasScene = preferences.scene && preferences.scene.trim().length > 0;
  const sceneName = preferences.scene || "";
  const sceneKw = hasScene && SCENE_KEYWORDS[sceneName] ? SCENE_KEYWORDS[sceneName] : "";
  const sceneRequirement = hasScene && SCENE_FILTERS[sceneName] ? SCENE_FILTERS[sceneName] : "";
  let langRequirement = "";
  if (preferences.language && preferences.language !== "any" && LANG_REQUIREMENTS[preferences.language]) {
    langRequirement = LANG_REQUIREMENTS[preferences.language];
  }
  let eraRequirement = "";
  if (preferences.era && preferences.era !== "any" && ERA_REQUIREMENTS[preferences.era]) {
    eraRequirement = ERA_REQUIREMENTS[preferences.era];
  }
  const currentNeedParts = [];
  if (sceneRequirement)
    currentNeedParts.push(sceneRequirement);
  if (langRequirement)
    currentNeedParts.push(langRequirement);
  if (eraRequirement)
    currentNeedParts.push(eraRequirement);
  const currentNeedStr = currentNeedParts.length > 0 ? `
【🔑 当前需求 - 硬性要求，必须遵守！】
${currentNeedParts.join("\n")}
` : "";
  const hasCustom = preferences.customPrompt && preferences.customPrompt.trim().length > 0;
  const customPromptText = hasCustom ? preferences.customPrompt.trim() : "";
  const prompt = `从以下候选歌曲中选出${targetCount}首最匹配的，并给出推荐理由。

${currentNeedStr}${profileDetail ? `【用户画像（仅参考口味，不覆盖上面的硬性要求）】
${profileDetail}
` : ""}【用户喜欢的歌曲（仅参考口味）】
${seedList}

${dislikeHint}${avoidHint}
【候选歌曲(共${candidates.length}首)】
${candidateList}

【要求】
1. 选${targetCount}首最匹配的
2. 平台多样性：尽量保证多样性，不要全部选自同一个平台
${hasCustom ? `3. 🔑 关键：用户需求是"${customPromptText}"，优先选歌名/歌手名/风格与该需求相关的歌曲
   - 不要选和需求完全无关的歌曲！
4. 推荐理由必须诚实具体，说明这首歌为什么和需求相关` : `3. 每首理由10-20字，说明推荐原因`}
${hasScene ? `4. 🔑 场景硬性要求：用户当前场景是"${sceneName}"${sceneKw ? `(${sceneKw})` : ""}，必须只选符合该场景的歌曲！
   - 推荐理由必须说明这首歌为什么适合${sceneName}场景
   - ❌ 不要选不符合${sceneName}场景的歌曲，即使它们是用户平时喜欢的！` : ""}
${langRequirement ? `5. ${langRequirement}` : ""}
${eraRequirement ? `6. ${eraRequirement}` : ""}

输出JSON数组：
[{"i":1,"r":"理由"},{"i":2,"r":"理由"}]`;
  return prompt;
};
const RANK_SYSTEM_MESSAGE = "你是音乐推荐助手。只输出JSON数组，不要解释。不要思考过程，直接输出结果。";
const parseRankResult = (response) => {
  if (!response)
    return [];
  let jsonStr = response.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  }
  const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }
  jsonStr = jsonStr.replace(/,\s*\]/g, "]");
  try {
    const ranked = JSON.parse(jsonStr);
    if (Array.isArray(ranked)) {
      return ranked.filter((r) => {
        const idx = r.i || r.index;
        return typeof idx === "number" && idx >= 1;
      }).map((r) => ({
        index: r.i || r.index,
        reason: r.r || r.reason || "基于您的听歌偏好推荐",
        category: r.c || r.category || "A"
      }));
    }
  } catch (e) {
    console.error("[Prompt] 排序结果解析失败:", e.message);
  }
  return [];
};
exports.KEYWORD_SYSTEM_MESSAGE = KEYWORD_SYSTEM_MESSAGE;
exports.RANK_SYSTEM_MESSAGE = RANK_SYSTEM_MESSAGE;
exports.buildKeywordPrompt = buildKeywordPrompt;
exports.buildRankPrompt = buildRankPrompt;
exports.parseKeywords = parseKeywords;
exports.parseRankResult = parseRankResult;
