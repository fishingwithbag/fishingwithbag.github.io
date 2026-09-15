(function () {
  'use strict';

  const tripDays = [
    { date: '2026-09-30', label: '9/30', city: '別府' },
    { date: '2026-10-01', label: '10/1', city: '大分' },
    { date: '2026-10-02', label: '10/2', city: '熊本' },
    { date: '2026-10-03', label: '10/3', city: '移動' },
    { date: '2026-10-04', label: '10/4', city: '福岡' },
    { date: '2026-10-05', label: '10/5', city: '福岡' },
    { date: '2026-10-06', label: '10/6', city: '福岡' },
    { date: '2026-10-07', label: '10/7', city: '回台' }
  ];

  function tokyoNow() {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date()).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }

  function minutes(value) {
    if (!/^\d{1,2}:\d{2}$/.test(String(value || ''))) return Number.MAX_SAFE_INTEGER;
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  }

  function closestDayIndex(date) {
    const exact = tripDays.findIndex(day => day.date === date);
    if (exact >= 0) return exact;
    if (date < tripDays[0].date) return 0;
    if (date > tripDays[tripDays.length - 1].date) return tripDays.length - 1;
    const next = tripDays.findIndex(day => day.date > date);
    return Math.max(0, next);
  }

  function itemArray(raw, date) {
    const value = raw && raw[date];
    if (!value) return [];
    const rows = Array.isArray(value)
      ? value.filter(Boolean).map((item, index) => ({ ...item, _key: String(index) }))
      : Object.entries(value).map(([key, item]) => ({ ...item, _key: key }));
    return rows.sort((a, b) => minutes(a.start) - minutes(b.start));
  }

  function activePair(items, dayDate) {
    if (!items.length) return { current: null, next: null };
    const now = tokyoNow();
    if (now.date !== dayDate) return { current: items[0], next: items[1] || null };
    let currentIndex = items.findIndex(item => {
      const start = minutes(item.start);
      const end = minutes(item.end);
      return start <= now.minutes && now.minutes < end;
    });
    if (currentIndex < 0) {
      const upcoming = items.findIndex(item => minutes(item.start) > now.minutes);
      currentIndex = upcoming >= 0 ? upcoming : items.length - 1;
    }
    return { current: items[currentIndex], next: items[currentIndex + 1] || null };
  }

  function groupName(item) {
    return ({ all: '全員', carA: '13號', carB: '15號' })[item?.travelGroup] || '全員';
  }

  function typeName(item) {
    return ({ spot: '景點', meal: '餐廳', stay: '住宿', transit: '交通', commute: '接送', flight: '航班', rental: '租車', other: '其他' })[item?.type] || item?.category || '行程';
  }

  function mapsUrl(item) {
    if (!item) return '#';
    const flightNo = String(item.flightNo || '').toUpperCase().replace(/\s+/g, '');
    if (item.type === 'flight') {
      const airport = flightNo === 'JX846'
        ? '桃園國際機場 第一航廈'
        : flightNo === 'JX847'
          ? '熊本機場 國內線・國際線航廈'
          : item.origin || item.name;
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(airport)}`;
    }
    if (item.type === 'rental') {
      const rentalPoint = item.city || item.region || item.name;
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${rentalPoint} Japan`)}`;
    }
    const parking = item.parking || {};
    const preferred = parking.mode === 'split'
      ? parking[item.travelGroup]?.primary?.mapsUrl
      : parking.shared?.primary?.mapsUrl;
    return preferred || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name || ''} Japan`)}`;
  }

  function mapsIcon() {
    return '<svg class="gmap-icon" viewBox="0 0 36 36" aria-hidden="true"><circle class="gmap-icon__bg" cx="18" cy="18" r="16"/><path class="gmap-icon__green" d="M18 6.2c-5.05 0-9.15 4.05-9.15 9.05 0 6.8 9.15 14.55 9.15 14.55V19.1l-3.75-3.75L18 6.2z"/><path class="gmap-icon__blue" d="M18 29.8s9.15-7.75 9.15-14.55c0-2.45-.98-4.67-2.57-6.3L18 15.5v14.3z"/><path class="gmap-icon__yellow" d="M8.85 15.25c0 2.8 1.55 5.95 3.38 8.6L18 18.1v-2.6l-5.95-5.95a8.95 8.95 0 0 0-3.2 5.7z"/><path class="gmap-icon__red" d="M24.58 8.95A9.08 9.08 0 0 0 18 6.2a9.02 9.02 0 0 0-5.95 2.25L18 14.4l6.58-5.45z"/><circle class="gmap-icon__center" cx="18" cy="15.35" r="3.15"/></svg>';
  }

  function escapeValue(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function setupViewNavigation() {
    const views = [...document.querySelectorAll('[data-view]')];
    if (!views.length) return;
    const params = new URLSearchParams(location.search);
    const initial = ['dashboard', 'places', 'more'].includes(params.get('view')) ? params.get('view') : 'dashboard';
    const show = viewName => {
      views.forEach(view => { view.hidden = view.dataset.view !== viewName; });
      document.querySelectorAll('[data-view-target]').forEach(button => button.classList.toggle('active', button.dataset.viewTarget === viewName));
      const url = new URL(location.href);
      if (viewName === 'dashboard') url.searchParams.delete('view'); else url.searchParams.set('view', viewName);
      history.replaceState(null, '', `${url.pathname}${url.search}`);
      window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    document.querySelectorAll('[data-view-target]').forEach(button => button.addEventListener('click', () => show(button.dataset.viewTarget)));
    document.getElementById('qa-add-btn')?.addEventListener('click', () => show('places'));
    document.getElementById('fav-btn')?.addEventListener('click', () => show('places'));
    show(initial);
  }

  function setupDashboard() {
    if (document.body.dataset.page !== 'dashboard') return;
    setupViewNavigation();
    let itinerary = {};
    let dayRegions = {};
    let rentals = {};
    const sync = document.getElementById('os-sync-state');

    function render() {
      const now = tokyoNow();
      const dayIndex = closestDayIndex(now.date);
      const day = tripDays[dayIndex];
      const items = itemArray(itinerary, day.date);
      const pair = activePair(items, day.date);
      const city = pair.current?.city || pair.current?.region || (Array.isArray(dayRegions[day.date]) ? dayRegions[day.date][0] : dayRegions[day.date]) || day.city;
      document.getElementById('trip-progress-day').textContent = `DAY ${dayIndex + 1} / ${tripDays.length}`;
      document.getElementById('trip-progress-label').textContent = now.date < tripDays[0].date ? '下一趟旅程' : now.date > tripDays[tripDays.length - 1].date ? '旅程已結束' : '旅程進行中';
      document.getElementById('dashboard-date').textContent = `${day.date.replaceAll('-', '.')}  ${city || '九州'}`;
      document.getElementById('dashboard-city').textContent = city || '九州';

      const focus = document.getElementById('dashboard-now');
      if (!pair.current) {
        focus.classList.remove('skeleton-block');
        focus.innerHTML = '<p class="dashboard-focus__time">DAY START</p><h2>今天還沒有行程</h2><p class="dashboard-focus__meta">從景點庫挑選，或直接新增一個行程。</p><div class="dashboard-actions"><a class="gmap-primary" href="index.html?view=places">打開景點庫</a><a class="focus-secondary" href="itinerary.html">新增</a></div>';
      } else {
        focus.classList.remove('skeleton-block');
        focus.innerHTML = `<p class="dashboard-focus__time">${escapeValue(pair.current.start || '--:--')} - ${escapeValue(pair.current.end || '--:--')}</p><h2>${escapeValue(pair.current.name)}</h2><p class="dashboard-focus__meta"><span>${escapeValue(typeName(pair.current))}</span><span>${escapeValue(groupName(pair.current))}</span><span>${escapeValue(pair.current.city || pair.current.region || city || '')}</span></p><div class="dashboard-actions"><a class="gmap-primary" href="${escapeValue(mapsUrl(pair.current))}" target="_blank" rel="noopener">${mapsIcon()}<span>Google Maps</span></a><a class="focus-secondary" href="itinerary.html">詳情</a></div>`;
      }

      const next = document.getElementById('dashboard-next');
      document.getElementById('dashboard-next-time').textContent = pair.next?.start || '--:--';
      next.innerHTML = pair.next
        ? `<h3>${escapeValue(pair.next.name)}</h3><p>${Number(pair.current?.transitMin || 0) ? `開車 ${Number(pair.current.transitMin)} 分` : '交通時間未設定'}　${escapeValue(groupName(pair.next))}</p>`
        : '<h3>今天沒有下一站</h3><p>可以留白，也可以到今日行程加入安排。</p>';

      const fleet = document.getElementById('dashboard-fleet');
      fleet.innerHTML = ['carA', 'carB'].map((key, index) => {
        const rental = rentals[key] || {};
        const pickupDate = String(rental['pickup-date'] || '').slice(5).replace('-', '/');
        const pickup = [pickupDate, rental['pickup-time']].filter(Boolean).join(' ');
        const details = [rental.car || rental.company || '車輛尚未設定', pickup ? `${pickup} 取車` : '取車時間尚未設定'].join(' · ');
        return `<p>${index === 0 ? '13號車' : '15號車'}<small>${escapeValue(details)}</small></p>`;
      }).join('') + `<p>共同行程<small>今天 ${items.filter(item => groupName(item) === '全員').length} 站</small></p>`;

      const warning = items.find((item, index) => index && minutes(item.start) < minutes(items[index - 1].end) + Number(items[index - 1].transitMin || 0));
      document.getElementById('dashboard-alert').textContent = warning ? `${warning.name} 的抵達時間可能衝突` : '沒有需要立即處理的提醒';
    }

    function connect() {
      if (!window.__firebaseReady || !window.__db) return;
      sync.textContent = '即時同步';
      window.__onValue(window.__ref(window.__db, 'itinerary'), snapshot => { itinerary = snapshot.val() || {}; render(); }, () => { sync.textContent = '行程離線'; });
      window.__onValue(window.__ref(window.__db, 'day_regions'), snapshot => { dayRegions = snapshot.val() || {}; render(); });
      window.__onValue(window.__ref(window.__db, 'rental_info'), snapshot => { rentals = snapshot.val() || {}; render(); });
    }
    render();
    if (window.__firebaseReady) connect(); else window.addEventListener('firebase-ready', connect, { once: true });
  }

  function detailDialog() {
    let dialog = document.getElementById('os-detail-sheet');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'os-detail-sheet';
    dialog.id = 'os-detail-sheet';
    dialog.innerHTML = '<div class="detail-sheet__handle"></div><header><div><span>行程詳情</span><h2 id="detail-sheet-title"></h2></div><button type="button" data-close-detail aria-label="關閉">×</button></header><div class="detail-sheet__body" id="detail-sheet-body"></div><div class="detail-sheet__actions"><button type="button" id="detail-sheet-edit">編輯行程</button><form method="dialog"><button>完成</button></form></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('[data-close-detail]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    return dialog;
  }

  function openDetail(item) {
    const dialog = detailDialog();
    document.getElementById('detail-sheet-title').textContent = item.name || '未命名行程';
    const parking = item.parking || {};
    const activeParking = parking.mode === 'split' ? parking[item.travelGroup] : parking.shared;
    const rows = [
      ['時間', `${item.start || '--:--'} - ${item.end || '--:--'}`],
      ['城市', item.city || item.region || '未設定'],
      ['同行', groupName(item)],
      ['營業', item.hours || '未設定'],
      ['到下一站', item.transitMin ? `${item.transitMin} 分 ${item.transitMode || ''}` : '未設定'],
      ['費用', item.cost ? `¥${Number(item.cost).toLocaleString()}` : '未設定'],
      ['停車', activeParking?.primary?.name || '未設定'],
      ['備註', item.note || '無']
    ];
    document.getElementById('detail-sheet-body').innerHTML = rows.map(([label, value]) => `<div><span>${escapeValue(label)}</span><strong>${escapeValue(value)}</strong></div>`).join('');
    document.getElementById('detail-sheet-edit').onclick = () => {
      dialog.close();
      document.querySelector(`.btn-edit[data-key="${CSS.escape(String(item._key || ''))}"]`)?.click();
    };
    dialog.showModal();
  }

  function setupToday() {
    if (document.body.dataset.page !== 'today' || typeof renderDay !== 'function') return;
    const actual = tokyoNow();
    const initialIndex = closestDayIndex(actual.date);
    if (typeof currentDay !== 'undefined') currentDay = initialIndex;

    const originalRenderDay = renderDay;
    renderDay = function () {
      originalRenderDay();
      const date = TRIP_DAYS[currentDay].date;
      const allItems = (itineraryData[date] || []).slice().sort(compareItineraryTime);
      const items = groupView === 'all' ? allItems : allItems.filter(item => itemGroup(item) === 'all' || itemGroup(item) === groupView);
      const pair = activePair(items, date);
      const day = tripDays[currentDay] || { date, city: '' };
      const regions = getDayRegions(date);
      const city = pair.current?.city || pair.current?.region || regions[0] || day.city || '九州';
      document.getElementById('today-date-label').textContent = `${date.slice(5).replace('-', '/')}  ${new Intl.DateTimeFormat('zh-TW', { weekday: 'short', timeZone: 'Asia/Tokyo' }).format(new Date(`${date}T12:00:00+09:00`))}`;
      document.getElementById('today-city-label').textContent = city;
      document.getElementById('today-day-count').textContent = `DAY ${currentDay + 1} / ${TRIP_DAYS.length}`;

      document.querySelectorAll('.timeline .tl-item').forEach(row => row.classList.remove('focus-source-row'));
      [pair.current, pair.next].filter(Boolean).forEach(item => document.querySelector(`.timeline .tl-item[data-key="${CSS.escape(String(item._key))}"]`)?.classList.add('focus-source-row'));

      const current = document.getElementById('today-now');
      if (!pair.current) {
        current.innerHTML = '<div class="focus-label"><span>NOW</span><span>EMPTY</span></div><h2 class="focus-name">今天還沒有行程</h2><p class="focus-meta">從景點庫選擇地點，或手動新增。</p><div class="dashboard-actions"><a class="gmap-primary" href="index.html?view=places">打開景點庫</a><button class="focus-secondary" type="button" data-open-add>＋</button></div>';
      } else {
        current.innerHTML = `<div class="focus-label"><span>NOW</span><span>${escapeValue(pair.current.start || '--:--')}</span></div><h2 class="focus-name">${escapeValue(pair.current.name)}</h2><p class="focus-meta"><span>${escapeValue(pair.current.start || '--:--')} - ${escapeValue(pair.current.end || '--:--')}</span><span>${escapeValue(typeName(pair.current))}</span><span>${escapeValue(groupName(pair.current))}</span><span>${escapeValue(city)}</span></p><div class="dashboard-actions"><a class="gmap-primary" href="${escapeValue(mapsUrl(pair.current))}" target="_blank" rel="noopener">${mapsIcon()}<span>Google Maps</span></a><button class="focus-secondary" type="button" data-detail-current aria-label="查看詳情">•••</button></div>`;
        current.querySelector('[data-detail-current]').addEventListener('click', () => openDetail(pair.current));
      }
      current.querySelector('[data-open-add]')?.addEventListener('click', () => document.getElementById('btn-add-item')?.click());

      const next = document.getElementById('today-next');
      next.innerHTML = pair.next
        ? `<div class="next-label"><span>NEXT</span><span>${escapeValue(pair.next.start || '--:--')}</span></div><div class="next-row"><h2>${escapeValue(pair.next.name)}</h2><p>${Number(pair.current?.transitMin || 0) ? `${Number(pair.current.transitMin)} 分車程` : '交通未設定'}</p></div>`
        : '<div class="next-label"><span>NEXT</span><span>DONE</span></div><div class="next-row"><h2>今天沒有下一站</h2><p>保留彈性</p></div>';
    };

    document.getElementById('today-manage-toggle')?.addEventListener('click', event => {
      const open = document.body.classList.toggle('show-today-tools');
      event.currentTarget.textContent = open ? '收合' : '管理';
    });
    const sync = document.getElementById('os-sync-state');
    const markConnected = () => { sync.textContent = '即時同步'; };
    if (window.__firebaseReady) markConnected(); else window.addEventListener('firebase-ready', markConnected, { once: true });
    buildTabs();
    renderDay();
  }

  setupDashboard();
  setupToday();
})();
