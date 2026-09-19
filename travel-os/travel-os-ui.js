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

  function calendarDaysBetween(fromDate, toDate) {
    const from = Date.parse(`${fromDate}T00:00:00Z`);
    const to = Date.parse(`${toDate}T00:00:00Z`);
    return Math.round((to - from) / 86400000);
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

  function parkingSpotUrl(spot, item) {
    if (spot?.mapsUrl) return String(spot.mapsUrl);
    if (!spot?.name) return '';
    const area = item?.city || item?.region || '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${spot.name} ${area} Japan`)}`;
  }

  function focusParkingRows(item, viewGroup = 'all') {
    const parking = item?.parking;
    if (!parking || typeof parking !== 'object') return [];
    const mode = parking.mode === 'split' ? 'split' : 'shared';
    const itemGroup = item?.travelGroup === 'carA' || item?.travelGroup === 'carB' ? item.travelGroup : 'all';
    const definitions = mode === 'shared'
      ? [{ badge: '停車', spot: parking.shared?.primary }]
      : (itemGroup === 'all'
          ? (viewGroup === 'carA' || viewGroup === 'carB' ? [viewGroup] : ['carA', 'carB'])
          : [itemGroup])
        .map(group => ({ badge: group === 'carA' ? '13號' : '15號', spot: parking[group]?.primary }));

    return definitions
      .filter(({ spot }) => Boolean(spot?.name || spot?.mapsUrl))
      .map(({ badge, spot }) => {
        const meta = [];
        if (Number(spot.walkMin) > 0) meta.push(`步行 ${Number(spot.walkMin)} 分`);
        if (Number(spot.fee) > 0) meta.push(`¥${Number(spot.fee).toLocaleString()}`);
        return {
          badge,
          name: String(spot.name || '開啟停車場導航'),
          url: parkingSpotUrl(spot, item),
          meta: meta.join(' · ')
        };
      });
  }

  function focusParkingHtml(item, viewGroup) {
    const rows = focusParkingRows(item, viewGroup);
    if (!rows.length) return '';
    const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M9 17V7h4.2a3.4 3.4 0 0 1 0 6.8H9m0-3.4h4.2"/></svg>';
    return `<div class="focus-parking-list" aria-label="停車資訊">${rows.map(row => `<a class="focus-parking" href="${escapeValue(row.url)}" target="_blank" rel="noopener" aria-label="導航至${escapeValue(row.name)}">${icon}<span class="focus-parking__copy"><small>${escapeValue(row.badge)}</small><strong>${escapeValue(row.name)}</strong>${row.meta ? `<em>${escapeValue(row.meta)}</em>` : ''}</span><span class="focus-parking__arrow" aria-hidden="true">↗</span></a>`).join('')}</div>`;
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
    const preferredParking = focusParkingRows(item, item.travelGroup)[0];
    if (preferredParking?.url) return preferredParking.url;
    const query = encodeURIComponent(`${item.name || ''} ${item.city || item.region || ''} Japan`);
    return item.googlePlaceId
      ? `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(item.googlePlaceId)}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  function legSummary(item, nextItem) {
    const route = item?.routeInfo;
    const transitMode = String(item?.transitMode || '');
    const currentMode = transitMode === 'WALK' || transitMode.includes('步行') ? 'WALK' : transitMode === 'DRIVE' || transitMode.includes('開車') ? 'DRIVE' : '';
    const sameLeg = route && nextItem && route.mode === currentMode && String(route.destinationKey || '') === String(nextItem?.placeId || nextItem?._key || nextItem?.name || '');
    if (sameLeg && Number.isFinite(Number(route.durationMinutes)) && Number.isFinite(Number(route.distanceKm))) {
      const icon = route.mode === 'WALK' ? '🚶' : '🚗';
      return `${icon} ${Number(route.durationMinutes)} 分 · ${Number(route.distanceKm).toFixed(1)} km`;
    }
    return Number(item?.transitMin || 0) ? `${Number(item.transitMin)} 分 ${item.transitMode || ''}` : '交通未設定';
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
      const beforeTrip = now.date < tripDays[0].date;
      const afterTrip = now.date > tripDays[tripDays.length - 1].date;
      const daysUntilTrip = beforeTrip ? calendarDaysBetween(now.date, tripDays[0].date) : 0;
      document.getElementById('dashboard-title').textContent = beforeTrip
        ? `距離出遊還有 ${daysUntilTrip} 天。`
        : afterTrip
          ? '旅程已結束，回顧美好足跡。'
          : '今天，從下一站開始。';
      document.getElementById('trip-progress-day').textContent = beforeTrip ? '9/30 出發' : `DAY ${dayIndex + 1} / ${tripDays.length}`;
      document.getElementById('trip-progress-label').textContent = beforeTrip ? '行前倒數' : afterTrip ? '旅程已結束' : '旅程進行中';
      document.getElementById('dashboard-focus-label').textContent = beforeTrip ? 'FIRST' : afterTrip ? 'LAST' : 'NOW';
      document.getElementById('dashboard-fleet-label').textContent = beforeTrip ? '首日用車' : afterTrip ? '末日用車' : '今日用車';
      document.getElementById('dashboard-fleet-hint').textContent = `確認兩台租車的取車狀態，以及${beforeTrip ? '首日' : afterTrip ? '末日' : '今日'}需要一起行動的站點。`;
      document.getElementById('dashboard-date').textContent = `${day.date.replaceAll('-', '.')}  ${city || '九州'}`;
      document.getElementById('dashboard-city').textContent = city || '九州';

      const focus = document.getElementById('dashboard-now');
      if (!pair.current) {
        focus.classList.remove('skeleton-block');
        focus.innerHTML = `<p class="dashboard-focus__time">DAY START</p><h2>${beforeTrip ? '首日還沒有行程' : '今天還沒有行程'}</h2><p class="dashboard-focus__meta">從景點庫挑選，或直接新增一個行程。</p><div class="dashboard-actions"><a class="gmap-primary" href="index.html?view=places">打開景點庫</a><a class="focus-secondary" href="itinerary.html">新增</a></div>`;
      } else {
        focus.classList.remove('skeleton-block');
        focus.innerHTML = `<p class="dashboard-focus__time">${escapeValue(pair.current.start || '--:--')} - ${escapeValue(pair.current.end || '--:--')}</p><h2>${escapeValue(pair.current.name)}</h2><p class="dashboard-focus__meta"><span>${escapeValue(typeName(pair.current))}</span><span>${escapeValue(groupName(pair.current))}</span><span>${escapeValue(pair.current.city || pair.current.region || city || '')}</span></p><div class="dashboard-actions"><a class="gmap-primary" href="${escapeValue(mapsUrl(pair.current))}" target="_blank" rel="noopener">${mapsIcon()}<span>Google Maps</span></a><a class="focus-secondary" href="itinerary.html">詳情</a></div>`;
      }

      const next = document.getElementById('dashboard-next');
      document.getElementById('dashboard-next-time').textContent = pair.next?.start || '--:--';
      next.innerHTML = pair.next
        ? `<h3>${escapeValue(pair.next.name)}</h3><p>${escapeValue(legSummary(pair.current, pair.next))}　${escapeValue(groupName(pair.next))}</p><div class="dashboard-next__actions"><button class="next-detail" type="button" data-detail-next>查看備註・編輯</button></div>`
        : `<h3>${beforeTrip ? '首日沒有下一站' : '今天沒有下一站'}</h3><p>可以留白，也可以到行程管理加入安排。</p>`;
      next.querySelector('[data-detail-next]')?.addEventListener('click', () => openDetail(pair.next, { date: day.date }));

      const fleet = document.getElementById('dashboard-fleet');
      fleet.innerHTML = ['carA', 'carB'].map((key, index) => {
        const rental = rentals[key] || {};
        const pickupDate = String(rental['pickup-date'] || '').slice(5).replace('-', '/');
        const pickup = [pickupDate, rental['pickup-time']].filter(Boolean).join(' ');
        const details = [rental.car || rental.company || '車輛尚未設定', pickup ? `${pickup} 取車` : '取車時間尚未設定'].join(' · ');
        return `<p>${index === 0 ? '13號車' : '15號車'}<small>${escapeValue(details)}</small></p>`;
      }).join('') + `<p>共同行程<small>${beforeTrip ? '首日' : afterTrip ? '末日' : '今天'} ${items.filter(item => groupName(item) === '全員').length} 站</small></p>`;

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

  function openDetail(item, options = {}) {
    const dialog = detailDialog();
    document.getElementById('detail-sheet-title').textContent = item.name || '未命名行程';
    const parkingRows = focusParkingRows(item, options.viewGroup || 'all');
    const parkingSummary = parkingRows.length
      ? parkingRows.map(row => `${row.badge === '停車' ? '' : `${row.badge}：`}${row.name}`).join('／')
      : '未設定';
    const rows = [
      ['時間', `${item.start || '--:--'} - ${item.end || '--:--'}`],
      ['城市', item.city || item.region || '未設定'],
      ['同行', groupName(item)],
      ['營業', item.hours || '未設定'],
      ['到下一站', legSummary(item, null)],
      ['費用', item.cost ? `¥${Number(item.cost).toLocaleString()}` : '未設定'],
      ['停車', parkingSummary],
      ['備註', item.note || '無']
    ];
    document.getElementById('detail-sheet-body').innerHTML = rows.map(([label, value]) => `<div><span>${escapeValue(label)}</span><strong>${escapeValue(value)}</strong></div>`).join('');
    document.getElementById('detail-sheet-edit').onclick = () => {
      dialog.close();
      const editButton = document.querySelector(`.btn-edit[data-key="${CSS.escape(String(item._key || ''))}"]`);
      if (editButton) {
        editButton.click();
        return;
      }
      const target = new URL('itinerary.html', location.href);
      if (options.date) target.searchParams.set('date', options.date);
      if (item._key) target.searchParams.set('edit', item._key);
      location.href = `${target.pathname.split('/').pop()}${target.search}`;
    };
    dialog.showModal();
  }

  function setupToday() {
    if (document.body.dataset.page !== 'today' || typeof renderDay !== 'function') return;
    const actual = tokyoNow();
    const requestedParams = new URLSearchParams(location.search);
    const requestedDate = requestedParams.get('date');
    const requestedDayIndex = requestedDate ? TRIP_DAYS.findIndex(day => day.date === requestedDate) : -1;
    const initialIndex = requestedDayIndex >= 0 ? requestedDayIndex : closestDayIndex(actual.date);
    let pendingEditKey = requestedParams.get('edit');
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
      const focusStateLabel = actual.date === date ? 'NOW' : actual.date < date ? 'START' : 'LAST';
      document.getElementById('today-date-label').textContent = `${date.slice(5).replace('-', '/')}  ${new Intl.DateTimeFormat('zh-TW', { weekday: 'short', timeZone: 'Asia/Tokyo' }).format(new Date(`${date}T12:00:00+09:00`))}`;
      document.getElementById('today-city-label').textContent = city;
      document.getElementById('today-day-count').textContent = `DAY ${currentDay + 1} / ${TRIP_DAYS.length}`;

      document.querySelectorAll('.timeline .tl-item').forEach(row => row.classList.remove('focus-source-row'));
      [pair.current, pair.next].filter(Boolean).forEach(item => document.querySelector(`.timeline .tl-item[data-key="${CSS.escape(String(item._key))}"]`)?.classList.add('focus-source-row'));

      const current = document.getElementById('today-now');
      if (!pair.current) {
        current.innerHTML = `<div class="focus-label"><span>${focusStateLabel}</span><span>EMPTY</span></div><h2 class="focus-name">這天還沒有行程</h2><p class="focus-meta">從景點庫選擇地點，或手動新增。</p><div class="dashboard-actions"><a class="gmap-primary" href="index.html?view=places">打開景點庫</a><button class="focus-secondary" type="button" data-open-add>＋</button></div>`;
      } else {
        current.innerHTML = `<div class="focus-label"><span>${focusStateLabel}</span><span>${escapeValue(pair.current.start || '--:--')}</span></div><h2 class="focus-name">${escapeValue(pair.current.name)}</h2><p class="focus-meta"><span>${escapeValue(pair.current.start || '--:--')} - ${escapeValue(pair.current.end || '--:--')}</span><span>${escapeValue(typeName(pair.current))}</span><span>${escapeValue(groupName(pair.current))}</span><span>${escapeValue(city)}</span></p>${focusParkingHtml(pair.current, groupView)}<div class="dashboard-actions"><a class="gmap-primary" href="${escapeValue(mapsUrl(pair.current))}" target="_blank" rel="noopener">${mapsIcon()}<span>Google Maps</span></a><button class="focus-secondary" type="button" data-detail-current aria-label="查看詳情">•••</button></div>`;
        current.querySelector('[data-detail-current]').addEventListener('click', () => openDetail(pair.current, { date, viewGroup: groupView }));
      }
      current.querySelector('[data-open-add]')?.addEventListener('click', () => document.getElementById('btn-add-item')?.click());

      const next = document.getElementById('today-next');
      next.innerHTML = pair.next
        ? `<div class="next-label"><span>NEXT</span><span>${escapeValue(pair.next.start || '--:--')}</span></div><div class="next-row"><h2>${escapeValue(pair.next.name)}</h2><p>${escapeValue(legSummary(pair.current, pair.next))}</p></div><button class="next-detail" type="button" data-detail-next>查看備註・編輯</button>`
        : '<div class="next-label"><span>NEXT</span><span>DONE</span></div><div class="next-row"><h2>這天沒有下一站</h2><p>保留彈性</p></div>';
      next.querySelector('[data-detail-next]')?.addEventListener('click', () => openDetail(pair.next, { date, viewGroup: groupView }));

      if (pendingEditKey) {
        const requestedEdit = document.querySelector(`.btn-edit[data-key="${CSS.escape(String(pendingEditKey))}"]`);
        if (requestedEdit) {
          pendingEditKey = null;
          const cleanUrl = new URL(location.href);
          cleanUrl.searchParams.delete('date');
          cleanUrl.searchParams.delete('edit');
          history.replaceState(null, '', `${cleanUrl.pathname}${cleanUrl.search}`);
          requestedEdit.click();
        }
      }
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
