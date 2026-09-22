# 九州自駕 Travel OS 2026

一個為 2026 九州自駕旅行打造的 Web App。

整合每日行程、雙車分流、景點資料、Google Maps 導航與 Firebase 即時同步，讓旅途中可以直接查看目前行程與下一站。

## Live Demo

https://fishingwithbag.github.io/

## 主要功能

* 今日行程 Dashboard
* 自動判斷目前行程 / 下一站
* 13 號車 / 15 號車 / 全員行程分流
* 每日完整行程管理
* 景點資料庫
* Google Maps 快速導航
* 行車時間與距離資訊
* Firebase 即時同步
* 手機版介面
* PWA / 加入手機主畫面

## 技術

* HTML
* CSS
* JavaScript
* Firebase Realtime Database
* Firebase Functions
* Google Maps Platform
* GitHub Pages

## 主要檔案

```text
index.html          Travel OS 首頁
itinerary.html      每日行程
travel-os-ui.js     UI / 行程邏輯
travel-os.css       介面樣式
maps-config.js      Google Maps 前端設定
manifest.webmanifest
icons/
```

## 行程

2026/09/30 ～ 2026/10/07

九州自駕路線涵蓋：

**別府 / 大分 / 熊本 / 阿蘇 / 高千穗 / 福岡**

---

Built for the road, not just for planning.

## Firebase production 邊界

這個 repository 是私人旅遊網站的 production source，固定使用 `gen-lang-client-0162948406`。`database.rules.json` 是這個網站自己的 production Rules，和公開的 Travel-OS OpenSource Rules 完全分開。

- `.firebaserc` 固定指向私人 production project。
- `firebase.json` 的 Database deploy 會先執行 `scripts/guard-private-firebase-deploy.mjs`。
- 目標不是 `gen-lang-client-0162948406` 時直接拒絕部署。
- `.firebaserc`、`firebase.json`、`database.rules.json` 必須已被 Git 追蹤且沒有未提交變更，才允許 production Rules deploy。
- Travel-OS OpenSource repository 不得部署任何 Rules 到這個 project。
