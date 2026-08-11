"use strict";
const common_vendor = require("./common/vendor.js");
const utils_system = require("./utils/system.js");
const utils_config = require("./utils/config.js");
const utils_playSong = require("./utils/playSong.js");
const composables_useBottomHeight = require("./composables/useBottomHeight.js");
if (!Math) {
  RocIconPlus();
}
const RocIconPlus = () => "./uni_modules/roc-icon-plus/components/roc-icon-plus/roc-icon-plus.js";
const TABLET_ASPECT_RATIO = 0.85;
const TABLET_MIN_WIDTH = 400;
const MAX_RECORD_DURATION = 8;
const MAX_ATTEMPTS = 3;
const RETRY_INTERVAL = 5e3;
const HISTORY_KEY = "recognize_history";
const MAX_HISTORY = 50;
const _sfc_main = {
  __name: "index",
  emits: ["close"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const statusBarHeight = common_vendor.ref(utils_system.getStatusBarHeight());
    const darkMode = common_vendor.ref(common_vendor.index.getStorageSync("darkMode") === "true");
    const { totalBottomHeight, bottomPaddingStyle } = composables_useBottomHeight.useBottomHeight();
    const scrollViewStyle = common_vendor.computed(() => {
      return {};
    });
    const safeBottomStyle = common_vendor.computed(() => {
      return {
        height: `${totalBottomHeight.value}px`
      };
    });
    const isTablet = common_vendor.ref(false);
    const checkTabletMode = () => {
      try {
        const { windowWidth, windowHeight } = common_vendor.index.getSystemInfoSync();
        const aspectRatio = windowWidth / windowHeight;
        isTablet.value = aspectRatio >= TABLET_ASPECT_RATIO && windowWidth >= TABLET_MIN_WIDTH;
        console.log("[Recognize] 屏幕:", windowWidth, "x", windowHeight, "宽高比:", aspectRatio.toFixed(2), "平板模式:", isTablet.value);
      } catch (e) {
        console.error("[Recognize] 检测平板模式失败:", e);
        isTablet.value = false;
      }
    };
    const recognizeState = common_vendor.ref("idle");
    const results = common_vendor.ref([]);
    const errorMsg = common_vendor.ref("");
    const recordDuration = common_vendor.ref(0);
    const waveBars = common_vendor.ref(new Array(24).fill(8));
    function showError(message) {
      errorMsg.value = message;
      recognizeState.value = "error";
      stopWaveAnimation();
    }
    const useInternalAudio = common_vendor.ref(common_vendor.index.getStorageSync("recognize_use_internal_audio") === true);
    const internalAudioSupported = common_vendor.ref(false);
    common_vendor.watch(useInternalAudio, (newVal) => {
      common_vendor.index.setStorageSync("recognize_use_internal_audio", newVal);
      console.log("[Recognize] 保存音频源选择:", newVal ? "内部音频" : "麦克风");
    });
    const isElectron = common_vendor.ref(false);
    const isFreeServerMode = common_vendor.computed(() => {
      return utils_config.getMeshMode() === "free";
    });
    common_vendor.computed(() => {
      return utils_config.hasOwnServer();
    });
    const showServerGuideModal = common_vendor.ref(false);
    const serverGuideMessage = common_vendor.ref("");
    let recorderManager = null;
    let recordTimer = null;
    let waveTimer = null;
    let tempFilePath = "";
    let attemptCount = 0;
    let retryTimer = null;
    let isPageActive = true;
    const historyList = common_vendor.ref([]);
    function loadHistory() {
      try {
        const data = common_vendor.index.getStorageSync(HISTORY_KEY);
        if (data && Array.isArray(data)) {
          historyList.value = data;
        }
      } catch (e) {
        console.error("[Recognize] 加载历史失败:", e);
      }
    }
    function saveToHistory(songs) {
      if (!songs || songs.length === 0)
        return;
      const now = /* @__PURE__ */ new Date();
      const timeStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0") + " " + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
      const bestMatch = songs[0];
      const record = {
        songmid: bestMatch.songmid,
        name: bestMatch.name,
        singer: bestMatch.singer,
        albumName: bestMatch.albumName || "",
        img: bestMatch.img || "",
        interval: bestMatch.interval || "",
        source: bestMatch.source || "wy",
        types: bestMatch.types || [],
        _types: bestMatch._types || {},
        time: timeStr,
        timestamp: now.getTime()
      };
      historyList.value.unshift(record);
      if (historyList.value.length > MAX_HISTORY) {
        historyList.value = historyList.value.slice(0, MAX_HISTORY);
      }
      try {
        common_vendor.index.setStorageSync(HISTORY_KEY, historyList.value);
      } catch (e) {
        console.error("[Recognize] 保存历史失败:", e);
      }
    }
    function clearHistory() {
      historyList.value = [];
      try {
        common_vendor.index.removeStorageSync(HISTORY_KEY);
      } catch (e) {
      }
    }
    function getRecognizeUrl() {
      const serverUrl = utils_config.getServerUrl();
      return serverUrl + "/api/music/recognize";
    }
    common_vendor.onMounted(() => {
      checkTabletMode();
      common_vendor.index.onWindowResize(() => {
        checkTabletMode();
      });
      common_vendor.index.$on("darkModeChanged", (val) => {
        darkMode.value = val === true || val === "true";
      });
      loadHistory();
    });
    common_vendor.onUnmounted(() => {
      var _a, _b;
      cleanup();
      common_vendor.index.$off("darkModeChanged");
      (_b = (_a = common_vendor.index).offWindowResize) == null ? void 0 : _b.call(_a);
    });
    function cleanup() {
      console.log("[Recognize-Mic] cleanup() 被调用 - 页面卸载，释放所有资源");
      isPageActive = false;
      if (recordTimer) {
        clearInterval(recordTimer);
        recordTimer = null;
      }
      if (waveTimer) {
        clearInterval(waveTimer);
        waveTimer = null;
      }
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (recorderManager) {
        try {
          recorderManager.stop();
        } catch (e) {
        }
      }
    }
    function goBack() {
      cleanup();
      if (isTablet.value) {
        emit("close");
      } else {
        common_vendor.index.navigateBack();
      }
    }
    function closeServerGuideModal() {
      showServerGuideModal.value = false;
    }
    function copyDeployTutorial() {
      const tutorialUrl = "https://github.com/erikjamesgz/cf_phg_music_server";
      common_vendor.index.setClipboardData({
        data: tutorialUrl,
        showToast: false,
        success: () => {
          common_vendor.index.showToast({ title: "链接已复制，请在浏览器打开", icon: "none", duration: 2500 });
          closeServerGuideModal();
        },
        fail: () => {
          common_vendor.index.showToast({ title: "复制失败，请手动复制", icon: "none" });
        }
      });
    }
    function goToSettingsForServer() {
      closeServerGuideModal();
      common_vendor.index.navigateTo({
        url: "/pages/settings/index?showServerModal=true"
      });
    }
    function startRecording() {
      attemptCount = 0;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      isPageActive = true;
      const serverUrl = utils_config.getServerUrl();
      if (!serverUrl) {
        if (isFreeServerMode.value) {
          serverGuideMessage.value = "当前使用公共服务器模式，但需要配置服务器地址才能使用听歌识曲功能";
          showServerGuideModal.value = true;
        } else {
          serverGuideMessage.value = "请先在设置中配置专属服务器地址";
          showServerGuideModal.value = true;
        }
        return;
      }
      requestRecordPermission().then((granted) => {
        if (granted) {
          doStartRecording();
        } else {
          errorMsg.value = "麦克风权限被拒绝，请在系统设置中开启";
          recognizeState.value = "error";
          common_vendor.index.showModal({
            title: "权限被拒绝",
            content: "需要麦克风权限才能录音识别，请在系统设置中开启",
            confirmText: "去设置",
            cancelText: "取消",
            success: (res) => {
              if (res.confirm)
                ;
            }
          });
        }
      }).catch((err) => {
        console.error("[Recognize] 权限请求异常:", err);
        doStartRecording();
      });
    }
    function requestRecordPermission() {
      return new Promise((resolve) => {
        common_vendor.index.authorize({
          scope: "scope.record",
          success: () => {
            resolve(true);
          },
          fail: () => {
            resolve(false);
          }
        });
      });
    }
    function doStartRecording() {
      doStartRecordingFallback();
    }
    function doStartRecordingFallback() {
      try {
        recorderManager = common_vendor.index.getRecorderManager();
        if (!recorderManager) {
          throw new Error("当前环境不支持录音");
        }
        recorderManager.onStart(() => {
          console.log("[Recognize] 降级录音开始");
          recognizeState.value = "recording";
          recordDuration.value = 0;
          startRecordTimer();
          startWaveAnimation();
        });
        recorderManager.onError((err) => {
          console.error("[Recognize] 降级录音错误:", err);
          errorMsg.value = "录音启动失败，请检查麦克风权限";
          recognizeState.value = "error";
        });
        recorderManager.onStop((res) => {
          console.log("[Recognize] 降级录音结束:", res.tempFilePath);
          tempFilePath = res.tempFilePath;
          stopRecordTimer();
          if (!tempFilePath) {
            stopWaveAnimation();
            errorMsg.value = "录音文件获取失败";
            recognizeState.value = "error";
            return;
          }
          uploadAndRecognize();
        });
        recorderManager.start({
          format: "wav",
          sampleRate: 44100,
          numberOfChannels: 1,
          encodeBitRate: 128e3
        });
      } catch (e) {
        console.error("[Recognize] 降级录音也失败:", e);
        errorMsg.value = "录音功能不可用";
        recognizeState.value = "error";
      }
    }
    function stopAndRecognize() {
      if (recorderManager) {
        recorderManager.stop();
      }
    }
    function startRecordTimer() {
      recordTimer = setInterval(() => {
        recordDuration.value++;
        if (recordDuration.value >= MAX_RECORD_DURATION) {
          stopAndRecognize();
        }
      }, 1e3);
    }
    function stopRecordTimer() {
      if (recordTimer) {
        clearInterval(recordTimer);
        recordTimer = null;
      }
    }
    function startWaveAnimation() {
      waveTimer = setInterval(() => {
        waveBars.value = waveBars.value.map(() => {
          return Math.floor(Math.random() * 40) + 8;
        });
      }, 120);
    }
    function stopWaveAnimation() {
      if (waveTimer) {
        clearInterval(waveTimer);
        waveTimer = null;
      }
      waveBars.value = new Array(24).fill(8);
    }
    async function uploadAndRecognize() {
      recognizeState.value = "recognizing";
      attemptCount++;
      const uploadUrl = getRecognizeUrl();
      console.log(`[Recognize] 上传到: ${uploadUrl} (第 ${attemptCount}/${MAX_ATTEMPTS} 次尝试)`);
      let failed = false;
      let failMsg = "";
      try {
        const uploadRes = await new Promise((resolve, reject) => {
          common_vendor.index.uploadFile({
            url: uploadUrl,
            filePath: tempFilePath,
            name: "audio",
            // ⚠️ 绝对不要手动设置 Content-Type！
            // multipart 请求头必须带 boundary 参数（由运行时自动生成），
            // 手动写 'multipart/form-data' 会丢失 boundary，服务端无法解析 → 400/500
            // H5 端 fetch+FormData 自动处理所以一直正常，App 端就是因此识别失败
            success: (res) => {
              let parsedBody = null;
              try {
                parsedBody = JSON.parse(res.data);
              } catch (e) {
              }
              if (res.statusCode >= 200 && res.statusCode < 300) {
                if (parsedBody) {
                  resolve(parsedBody);
                } else {
                  reject(new Error("服务器响应解析失败"));
                }
              } else {
                const errMsg = (parsedBody == null ? void 0 : parsedBody.msg) || `HTTP ${res.statusCode}`;
                console.error("[Recognize] 服务器错误:", res.statusCode, parsedBody);
                reject(new Error(errMsg));
              }
            },
            fail: (err) => reject(err)
          });
        });
        console.log("[Recognize] 识别结果:", uploadRes);
        if (uploadRes.code === 200) {
          const data = uploadRes.data || [];
          if (data.length > 0) {
            results.value = data;
            recognizeState.value = "success";
            stopWaveAnimation();
            saveToHistory(data);
            return;
          } else {
            failed = true;
            failMsg = "未识别到歌曲";
          }
        } else {
          failed = true;
          failMsg = uploadRes.msg || "识别失败";
        }
      } catch (err) {
        console.error("[Recognize] 上传失败:", err);
        failed = true;
        failMsg = err.errMsg || err.message || "网络请求失败";
      }
      if (failed) {
        if (attemptCount < MAX_ATTEMPTS && isPageActive) {
          console.log(`[Recognize] 第 ${attemptCount} 次失败（${failMsg}），${RETRY_INTERVAL / 1e3}秒后重试`);
          errorMsg.value = failMsg;
          retryTimer = setTimeout(() => {
            retryTimer = null;
            if (!isPageActive)
              return;
            console.log(`[Recognize] 开始第 ${attemptCount + 1} 次尝试`);
            doStartRecording();
          }, RETRY_INTERVAL);
        } else {
          console.log("[Recognize] 所有尝试均失败，显示错误页面");
          showError("未能识别到歌曲，请靠近音源后重试");
        }
      }
    }
    async function playRecognizedSong(song) {
      if (!song || !song.songmid) {
        common_vendor.index.showToast({ title: "歌曲信息不完整", icon: "none" });
        return;
      }
      common_vendor.index.showLoading({ title: "正在获取播放链接...", mask: true });
      try {
        const songData = {
          id: song.songmid,
          name: song.name,
          singer: song.singer,
          source: song.source || "wy",
          interval: song.interval,
          img: song.img,
          albumName: song.albumName,
          types: song.types || [],
          _types: song._types || {}
        };
        const success = await utils_playSong.playSongCommon(songData, {
          source: songData.source
        });
        common_vendor.index.hideLoading();
        if (success) {
          common_vendor.index.showToast({ title: "开始播放", icon: "success" });
        } else {
          common_vendor.index.showToast({ title: "暂无播放资源", icon: "none" });
        }
      } catch (err) {
        console.error("[Recognize] 播放失败:", err);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "播放失败", icon: "none" });
      }
    }
    function resetToIdle() {
      console.log("[Recognize-Mic] resetToIdle() - 重置为空闲状态（保留流和权限缓存以供复用）");
      recognizeState.value = "idle";
      results.value = [];
      errorMsg.value = "";
      recordDuration.value = 0;
      attemptCount = 0;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      tempFilePath = "";
    }
    function stopRecognition() {
      console.log("[Recognize] 用户点击停止识别");
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (waveTimer) {
        clearInterval(waveTimer);
        waveTimer = null;
      }
      recognizeState.value = "idle";
      recordDuration.value = 0;
      attemptCount = 0;
      tempFilePath = "";
      common_vendor.index.showToast({ title: "已停止识别", icon: "none" });
    }
    function restartRecognition() {
      console.log("[Recognize] 用户点击重新识别，立即开始新的识别");
      resetToIdle();
      startRecording();
    }
    function handleCoverError(e, song) {
      song.img = "";
    }
    async function playHistoryItem(item) {
      if (!item || !item.songmid) {
        common_vendor.index.showToast({ title: "歌曲信息不完整", icon: "none" });
        return;
      }
      common_vendor.index.showLoading({ title: "正在获取播放链接...", mask: true });
      try {
        const songData = {
          id: item.songmid,
          name: item.name,
          singer: item.singer,
          source: item.source || "wy",
          interval: item.interval,
          img: item.img,
          albumName: item.albumName,
          types: item.types || [],
          _types: item._types || {}
        };
        const success = await utils_playSong.playSongCommon(songData, {
          source: songData.source
        });
        common_vendor.index.hideLoading();
        if (success) {
          common_vendor.index.showToast({ title: "开始播放", icon: "success" });
        } else {
          common_vendor.index.showToast({ title: "暂无播放资源", icon: "none" });
        }
      } catch (err) {
        console.error("[Recognize] 播放历史失败:", err);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "播放失败", icon: "none" });
      }
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: statusBarHeight.value + "px",
        b: darkMode.value ? "#1f2937" : "#ffffff",
        c: common_vendor.p({
          type: "fas",
          name: "chevron-left",
          size: "20",
          color: darkMode.value ? "#ffffff" : "#4b5563"
        }),
        d: common_vendor.o(goBack, "e8"),
        e: darkMode.value ? "#1f2937" : "#ffffff",
        f: internalAudioSupported.value
      }, internalAudioSupported.value ? common_vendor.e({
        g: common_vendor.p({
          type: "fas",
          name: "microphone",
          size: "14",
          color: !useInternalAudio.value ? "#ffffff" : darkMode.value ? "#9ca3af" : "#6b7280"
        }),
        h: !useInternalAudio.value ? 1 : "",
        i: !useInternalAudio.value ? 1 : "",
        j: common_vendor.o(($event) => recognizeState.value !== "recording" && recognizeState.value !== "recognizing" && (useInternalAudio.value = false), "e2"),
        k: common_vendor.p({
          type: "fas",
          name: "volume-high",
          size: "14",
          color: useInternalAudio.value ? "#ffffff" : darkMode.value ? "#9ca3af" : "#6b7280"
        }),
        l: common_vendor.t(isElectron.value ? "系统音频" : "内部音频"),
        m: useInternalAudio.value ? 1 : "",
        n: useInternalAudio.value ? 1 : "",
        o: common_vendor.o(($event) => recognizeState.value !== "recording" && recognizeState.value !== "recognizing" && (useInternalAudio.value = true), "c6"),
        p: recognizeState.value === "recording" || recognizeState.value === "recognizing" ? 1 : "",
        q: useInternalAudio.value
      }, useInternalAudio.value ? {
        r: common_vendor.t(isElectron.value ? "将捕获电脑正在播放的音频" : "将捕获设备内正在播放的音频")
      } : {}) : {}, {
        s: recognizeState.value === "idle"
      }, recognizeState.value === "idle" ? common_vendor.e({
        t: common_vendor.p({
          type: "fas",
          name: "microphone",
          size: "48",
          color: "#ffffff"
        }),
        v: common_vendor.o(startRecording, "13"),
        w: historyList.value.length > 0
      }, historyList.value.length > 0 ? {
        x: common_vendor.o(clearHistory, "73"),
        y: common_vendor.f(historyList.value, (item, index, i0) => {
          return {
            a: item.img,
            b: common_vendor.o(($event) => item.img = "", item.timestamp || index),
            c: common_vendor.t(item.name),
            d: common_vendor.t(item.singer),
            e: common_vendor.t(item.time),
            f: item.timestamp || index,
            g: common_vendor.o(($event) => playHistoryItem(item), item.timestamp || index)
          };
        })
      } : {}) : {}, {
        z: recognizeState.value === "recording" || recognizeState.value === "recognizing"
      }, recognizeState.value === "recording" || recognizeState.value === "recognizing" ? {
        A: common_vendor.f(waveBars.value, (h, i, i0) => {
          return {
            a: i,
            b: h + "px"
          };
        }),
        B: common_vendor.p({
          type: "fas",
          name: "stop",
          size: "16",
          color: "#ffffff"
        }),
        C: common_vendor.o(stopRecognition, "e9")
      } : {}, {
        D: recognizeState.value === "success"
      }, recognizeState.value === "success" ? common_vendor.e({
        E: results.value.length > 0
      }, results.value.length > 0 ? {
        F: common_vendor.t(results.value.length),
        G: common_vendor.f(results.value, (song, index, i0) => {
          return common_vendor.e({
            a: song.img,
            b: common_vendor.o(($event) => handleCoverError($event, song), song.songmid || index),
            c: index === 0
          }, index === 0 ? {} : {}, {
            d: common_vendor.t(song.name),
            e: common_vendor.t(song.singer),
            f: song.albumName
          }, song.albumName ? {
            g: common_vendor.t(song.albumName)
          } : {}, {
            h: song.interval
          }, song.interval ? {
            i: common_vendor.t(song.interval)
          } : {}, {
            j: "f073899c-5-" + i0,
            k: song.songmid || index,
            l: index === 0 ? 1 : "",
            m: common_vendor.o(($event) => playRecognizedSong(song), song.songmid || index)
          });
        }),
        H: common_vendor.p({
          type: "fas",
          name: "play-circle",
          size: "28",
          color: darkMode.value ? "#00d7cd" : "#00afff"
        })
      } : {
        I: common_vendor.p({
          type: "fas",
          name: "music",
          size: "32",
          color: "#ffffff"
        })
      }, {
        J: common_vendor.p({
          type: "fas",
          name: "rotate-right",
          size: "16",
          color: "#ffffff"
        }),
        K: common_vendor.o(restartRecognition, "21")
      }) : {}, {
        L: recognizeState.value === "error"
      }, recognizeState.value === "error" ? {
        M: common_vendor.p({
          type: "fas",
          name: "microphone-slash",
          size: "32",
          color: "#ffffff"
        }),
        N: common_vendor.t(errorMsg.value || "请靠近音源后重试"),
        O: common_vendor.p({
          type: "fas",
          name: "rotate-right",
          size: "16",
          color: "#ffffff"
        }),
        P: common_vendor.o(restartRecognition, "c2")
      } : {}, {
        Q: common_vendor.s(safeBottomStyle.value),
        R: common_vendor.s(scrollViewStyle.value),
        S: showServerGuideModal.value
      }, showServerGuideModal.value ? common_vendor.e({
        T: common_vendor.p({
          type: "fas",
          name: "server",
          size: "40",
          color: "#6b7280"
        }),
        U: common_vendor.t(serverGuideMessage.value),
        V: isFreeServerMode.value
      }, isFreeServerMode.value ? {
        W: common_vendor.p({
          type: "fas",
          name: "cloud-upload-alt",
          size: "20",
          color: "#e2e8f0"
        }),
        X: common_vendor.p({
          type: "fas",
          name: "chevron-right",
          size: "16",
          color: "#9ca3af"
        }),
        Y: common_vendor.o(copyDeployTutorial, "ab")
      } : {}, {
        Z: common_vendor.p({
          type: "fas",
          name: "gear",
          size: "20",
          color: "#e2e8f0"
        }),
        aa: common_vendor.p({
          type: "fas",
          name: "chevron-right",
          size: "16",
          color: "#9ca3af"
        }),
        ab: common_vendor.o(goToSettingsForServer, "ad"),
        ac: common_vendor.o(closeServerGuideModal, "28"),
        ad: darkMode.value ? 1 : "",
        ae: common_vendor.o(() => {
        }, "de"),
        af: common_vendor.o(closeServerGuideModal, "c8")
      }) : {}, {
        ag: darkMode.value ? 1 : ""
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-f073899c"]]);
exports.MiniProgramPage = MiniProgramPage;
