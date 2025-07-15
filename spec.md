
# 📄 1. 需求

| 条目 | 内容 |
|---|---|
| 产品名 | 上下班打卡工具 |
| 目标用户 | 对隐私极度敏感、不愿数据上云的上班族 |
| 核心场景 | 上班/下班各点一次按钮 → 月末一键导出 PDF → 自行保存到微信聊天记录或手机本地 |
| 功能列表 | ① 上班打卡 ② 下班打卡 ③ 本月统计 ④ 导出 PDF ⑤ 本地风险提示 |
| 非功能 | • 纯本地，无网络请求 • 包体 ≤ 1 MB • 换机/清缓存会丢数据（弹窗告知） |

---

# 🏗️ 2. 技术架构（纯前端版）
要符合微信小程序官方文档的要求和最佳实践: https://developers.weixin.qq.com/miniprogram/dev/framework/ 

| 层级 | 技术 | 备注 |
|---|---|---|
| 小程序 | 原生框架 | 微信开发者工具「普通 QuickStart」即可 |
| UI | 微信官方组件 + WeUI | 无第三方依赖 |
| 图表 | 无图表，文字列表 | 省包体 |
| 存储 | wx.setStorageSync | 本地 KV，上限 10 MB |
| PDF | 前端 canvas 手写表格 + wx.canvasToTempFilePath | 无外部库 |
| 成本 | 0 元 | 无服务器、无域名、无备案 |

目录结构（3 个页面）  
```
/miniprogram
 ├─ app.json
 ├─ app.js
 ├─ pages/index/        # 打卡
 ├─ pages/stat/         # 统计
 └─ pages/export/       # PDF + 本地备份
```

---

# 🔧 3. 具体技术实现（离线完整版）

## 3.1 数据模型（本地 storage）

```js
// key: 'records'   value: Array<Object>
[
  {
    date: "2025-07-14",
    on: "09:31",    // HH:mm
    off: "18:45"
  }
]
```

## 3.2 首次启动弹窗：告知数据本地存储

```js
// app.js
App({
  onLaunch() {
    const key = 'hasShownWarning';
    if (!wx.getStorageSync(key)) {
      wx.showModal({
        title: '重要提醒',
        content: '所有数据仅保存在本机，换机或卸载微信会丢失，请定期导出 PDF 备份！',
        showCancel: false
      });
      wx.setStorageSync(key, true);
    }
  }
})
```

## 3.3 页面 1：打卡页 `pages/index/index.wxml`

```xml
<view class="container">
  <button type="primary" bindtap="checkIn">上班打卡</button>
  <button type="warn"  bindtap="checkOut">下班打卡</button>
</view>
```

`index.js`

```js
Page({
  checkIn() {
    const today = new Date().toISOString().slice(0,10);
    const now = new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    const records = wx.getStorageSync('records') || [];
    const idx = records.findIndex(r=>r.date===today);
    idx>=0 ? records[idx].on = now : records.push({date:today,on:now});
    wx.setStorageSync('records',records);
    wx.showToast({title:'已上班打卡'});
  },
  checkOut() {
    /* 同上，把 on 换成 off */
  }
})
```

## 3.4 页面 2：统计页 `pages/stat/stat.wxml`

```xml
<scroll-view scroll-y>
  <view wx:for="{{list}}" wx:key="date" class="row">
    {{item.date}} 上班：{{item.on}} 下班：{{item.off}}
  </view>
</scroll-view>
```

`stat.js`

```js
Page({
  onShow() {
    this.setData({list: wx.getStorageSync('records') || []});
  }
})
```

## 3.5 页面 3：导出 & 本地备份 `pages/export/export.wxml`

```xml
<view class="container">
  <button type="primary" bindtap="makePdf">导出本月 PDF</button>
  <button type="default" bindtap="sharePdf" disabled="{{!pdfPath}}">把 PDF 发给自己</button>
  <text class="tip">PDF 生成后可长期保存在聊天记录</text>
</view>
<canvas type="2d" id="canvas" style="position:fixed;left:-9999px;width:595px;height:842px"/>
```

`export.js`

```js
Page({
  data:{ pdfPath:'' },
  makePdf() {
    const records = wx.getStorageSync('records') || [];
    if(!records.length){ wx.showToast({title:'无数据',icon:'none'}); return; }

    const query = wx.createSelectorQuery();
    query.select('#canvas').fields({node:true,size:true}).exec(res=>{
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      canvas.width = 595; canvas.height = 842;
      ctx.fillStyle = '#000';
      ctx.font = '14px sans-serif';
      ctx.fillText('日期       上班    下班',40,40);
      records.forEach((r,i)=>{
        ctx.fillText(`${r.date}  ${r.on}  ${r.off}`,40,70+i*30);
      });
      wx.canvasToTempFilePath({
        canvas,
        success: r=>{
          this.setData({pdfPath:r.tempFilePath});
          wx.saveFileToDisk ? wx.saveFileToDisk({filePath:r.tempFilePath}) 
                            : wx.openDocument({filePath:r.tempFilePath,showMenu:true});
        }
      });
    });
  },
  sharePdf() {
    wx.shareFileMessage({ filePath:this.data.pdfPath });
  }
})
```

## 3.6 app.json（只保留 3 个 tab）

```json
{
  "pages":[
    "pages/index/index",
    "pages/stat/stat",
    "pages/export/export"
  ],
  "window":{
    "navigationBarTitleText":"打卡黑匣子 Lite"
  }
}
```

---

## ✅ 4. 交付 checklist（本地版）

| 任务 | 交付物 | 状态 |
|---|---|---|
| 新建项目 | app.json / app.js / 3 个页面 | TODO |
| 首次启动弹窗 | app.js 内 onLaunch | TODO |
| 打卡逻辑 | index.js | TODO |
| 统计列表 | stat.wxml + stat.js | TODO |
| PDF 导出 + 本地保存 | export.js + canvas | TODO |
| 真机测试 | 安卓 / iOS 各 1 台 | TODO |

---

### 🎯 一句话总结（离线版）

> 0 后端、0 费用、0 云开发——3 个页面、1 个本地 storage、2 个按钮就能跑；  
> 换机或清缓存会丢数据，务必在首次启动 + 导出 PDF 时双重提示用户。