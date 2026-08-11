"use strict";
const common_vendor = require("../../../../common/vendor.js");
let _faFontLoaded = false;
let _faFontLoading = false;
const _sfc_main = {
  name: "roc-icon-plus",
  data() {
    return {};
  },
  mounted() {
    this.loadFontAwesomeForMp();
  },
  methods: {
    /**
     * 小程序环境下通过 uni.loadFontFace 加载 FontAwesome 字体
     * 解决 @font-face 在组件 scoped 样式中无法全局生效的问题
     * 使用全局标记确保只加载一次，避免多实例重复请求
     */
    loadFontAwesomeForMp() {
      if (_faFontLoaded || _faFontLoading)
        return;
      _faFontLoading = true;
      const cdnSources = [
        "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/webfonts",
        "https://cdn.bootcdn.net/ajax/libs/font-awesome/6.5.1/webfonts"
      ];
      const cdnBase = cdnSources[0];
      const fonts = [
        {
          global: true,
          family: "Font Awesome 6 Free",
          desc: { style: "normal", weight: "900" },
          source: `url("${cdnBase}/fa-solid-900.woff2")`
        },
        {
          global: true,
          family: "Font Awesome 6 Free",
          desc: { style: "normal", weight: "400" },
          source: `url("${cdnBase}/fa-regular-400.woff2")`
        },
        {
          global: true,
          family: "Font Awesome 6 Brands",
          desc: { style: "normal", weight: "400" },
          source: `url("${cdnBase}/fa-brands-400.woff2")`
        }
      ];
      let loadedCount = 0;
      let failedCount = 0;
      fonts.forEach((cfg) => {
        common_vendor.index.loadFontFace({
          ...cfg,
          success: () => {
            loadedCount++;
            if (loadedCount + failedCount === fonts.length) {
              _faFontLoaded = true;
              _faFontLoading = false;
            }
          },
          fail: () => {
            failedCount++;
            if (failedCount === 1) {
              console.warn("[roc-icon-plus] 小程序字体加载失败，请在微信后台配置 downloadFile 合法域名");
            }
            if (loadedCount + failedCount === fonts.length) {
              _faFontLoaded = true;
              _faFontLoading = false;
            }
          }
        });
      });
    }
  },
  computed: {
    faType() {
      return `${this.type}`;
    },
    faName() {
      return `fa-${this.name}`;
    },
    faRotate() {
      return `fa-rotate-${this.rotate}`;
    },
    faAnimationType() {
      return `fa-${this.animationType}`;
    }
  },
  props: {
    type: {
      type: String,
      default: "fas"
    },
    name: {
      type: String,
      default: "",
      required: true
    },
    size: {
      type: [Number, String],
      default: 16
    },
    color: {
      type: String,
      default: "#606266"
    },
    rotate: {
      type: [Number, String],
      default: 0
    },
    animationType: {
      type: String,
      default: ""
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.n($options.faType),
    b: common_vendor.n($options.faName),
    c: common_vendor.n($options.faRotate),
    d: common_vendor.n($options.faAnimationType),
    e: String($props.size).includes("px") ? $props.size : `${$props.size}px`,
    f: $props.color
  };
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-83907e33"]]);
wx.createComponent(Component);
