# 九州福岡熊本旅遊網站 (Kyushu Travel Planner 2026)

這是一個為 2026 九州旅遊行程打造的互動式網站，整合 Firebase Realtime Database，支援即時資料同步、多使用者收藏、地點管理與費用紀錄。

---

## 📌 專案特色

- 📍 九州旅遊首頁（熊本 / 福岡 / 大分 / 別府）
- 🔎 景點搜尋、分類、地區篩選
- ⭐ 多使用者「收藏同步」
- ❤️ 愛心收藏 / 💖 發亮愛心
- ➕ 自訂新增景點
- 🧭 Google Maps 直接導航
- 💰 住宿費用分帳
- 🚗 租車資訊管理
- 📊 首頁即時景點數統計
- 🌗 深色 / 淺色模式完整支援
- 📱 行動裝置優化 UI

---

## 🧠 技術架構

### Frontend
- HTML5
- CSS3（RWD + Dark Mode）
- 原生 JavaScript（Vanilla JS）

### Backend（BaaS）
- Firebase Realtime Database
- Firebase Authentication（Anonymous）

---

## 🔥 Firebase 資料結構

base_places      // 內建景點 (只讀)
custom_places    // 自訂景點
favs             // 收藏狀態
cost_items       // 費用紀錄
rental_info      // 租車資訊
