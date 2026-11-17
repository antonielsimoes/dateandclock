(function () {
  "use strict";

  const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
  const STORAGE_THEME = "agora-theme";
  const STORAGE_24H = "agora-24h";
  const STORAGE_SECONDS = "agora-seconds";
  const STORAGE_TIME_ZONE = "agora-timezone";
  const SVG_NS = "http://www.w3.org/2000/svg";

  const MONTHS = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  const WEEKDAYS = [
    "domingo", "segunda-feira", "terça-feira", "quarta-feira",
    "quinta-feira", "sexta-feira", "sábado"
  ];
  const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

  const REGION_ORDER = ["America", "Europe", "Asia", "Africa", "Oceania", "Other"];
  const REGION_LABELS = {
    America: "Américas",
    Europe: "Europa",
    Asia: "Ásia",
    Africa: "África",
    Oceania: "Oceania",
    Other: "Outros"
  };
  const FALLBACK_ZONES = [
    DEFAULT_TIME_ZONE,
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Lisbon",
    "Asia/Tokyo",
    "Australia/Sydney"
  ];

  const ZONE_DATA = window.AGORA_ZONE_DATA || { countries: {}, cities: {} };
  const root = document.documentElement;

  const nodes = {
    clockTime: document.getElementById("clockTime"),
    hourPart: document.getElementById("hourPart"),
    minutePart: document.getElementById("minutePart"),
    secondsPart: document.getElementById("secondsPart"),
    periodPart: document.getElementById("periodPart"),
    digitalSide: document.getElementById("digitalSide"),
    weekdayPart: document.getElementById("weekdayPart"),
    datePart: document.getElementById("datePart"),
    greetingText: document.getElementById("greetingText"),
    greetingIcon: document.getElementById("greetingIcon"),
    progressPercent: document.getElementById("progressPercent"),
    progressBar: document.getElementById("progressBar"),
    progressFill: document.getElementById("progressFill"),
    remainingPart: document.getElementById("remainingPart"),
    analogClock: document.getElementById("analogClock"),
    hourHand: document.getElementById("hourHand"),
    minuteHand: document.getElementById("minuteHand"),
    secondHand: document.getElementById("secondHand"),
    offsetChip: document.getElementById("offsetChip"),
    zoneCity: document.getElementById("zoneCity"),
    locationText: document.getElementById("locationText"),
    footerZone: document.getElementById("footerZone"),
    pageTitle: document.getElementById("pageTitle"),
    timezoneButton: document.getElementById("timezoneButton"),
    timezoneDialog: document.getElementById("timezoneDialog"),
    closeTimezoneButton: document.getElementById("closeTimezoneButton"),
    timezoneSearch: document.getElementById("timezoneSearch"),
    clearTimezoneSearch: document.getElementById("clearTimezoneSearch"),
    zoneFilters: document.getElementById("zoneFilters"),
    zoneCount: document.getElementById("zoneCount"),
    zoneList: document.getElementById("zoneList"),
    zoneListScroll: document.getElementById("zoneListScroll"),
    zoneEmpty: document.getElementById("zoneEmpty"),
    monthLabel: document.getElementById("monthLabel"),
    weekGrid: document.getElementById("weekGrid"),
    todayNote: document.getElementById("todayNote"),
    formatToggle: document.getElementById("formatToggle"),
    secondsToggle: document.getElementById("secondsToggle"),
    formatHint: document.getElementById("formatHint"),
    copyButton: document.getElementById("copyButton"),
    themeToggle: document.getElementById("themeToggle"),
    themeColor: document.getElementById("themeColor"),
    snackbar: document.getElementById("snackbar"),
    snackbarText: document.getElementById("snackbarText")
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function normalizeSearch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function readBoolean(key, fallback) {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? fallback : stored === "true";
    } catch (error) {
      return fallback;
    }
  }

  function readString(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function persist(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (error) {
      /* Preferências continuam válidas durante a sessão. */
    }
  }

  let countryDisplay = null;
  try {
    countryDisplay = new Intl.DisplayNames(["pt-BR"], { type: "region" });
  } catch (error) {
    countryDisplay = null;
  }

  const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });

  function getRegionKey(zoneId) {
    const area = zoneId.split("/")[0];

    if (area === "America") {
      return "America";
    }
    if (area === "Europe") {
      return "Europe";
    }
    if (area === "Asia") {
      return "Asia";
    }
    if (area === "Africa") {
      return "Africa";
    }
    if (area === "Australia" || area === "Pacific") {
      return "Oceania";
    }
    return "Other";
  }

  function getCountryName(code) {
    if (!code) {
      return "";
    }

    try {
      return countryDisplay ? countryDisplay.of(code) || code : code;
    } catch (error) {
      return code;
    }
  }

  function getCountryNames(codes) {
    return (codes || []).map(getCountryName).filter(Boolean);
  }

  function getCountryLabel(codes) {
    const names = getCountryNames(codes);

    if (names.length === 0) {
      return "Fuso internacional";
    }
    if (names.length === 1) {
      return names[0];
    }
    return `${names[0]} +${names.length - 1}`;
  }

  function getCountryTitle(codes) {
    const names = getCountryNames(codes);

    return names.length ? names.join(", ") : "Fuso internacional";
  }

  function getCityName(zoneId) {
    if (zoneId === "UTC") {
      return "UTC";
    }

    if (ZONE_DATA.cities && ZONE_DATA.cities[zoneId]) {
      return ZONE_DATA.cities[zoneId];
    }

    const parts = zoneId.split("/");
    const city = parts[parts.length - 1].replace(/_/g, " ");

    return /^GMT[+-]/i.test(city) ? city.replace(/^GMT/i, "UTC") : city;
  }

  function createZoneEntry(zoneId) {
    const codes = (ZONE_DATA.countries && ZONE_DATA.countries[zoneId]) || [];
    const region = getRegionKey(zoneId);
    const city = getCityName(zoneId);
    const isUtc = zoneId === "UTC";
    const countryLabel = isUtc ? "Tempo Universal Coordenado" : getCountryLabel(codes);
    const countryTitle = isUtc ? "Tempo Universal Coordenado" : getCountryTitle(codes);
    const countryCode = isUtc ? "UTC" : (codes[0] || "UTC");
    const search = normalizeSearch([
      zoneId,
      city,
      countryTitle,
      codes.join(" "),
      REGION_LABELS[region]
    ].join(" "));

    return {
      id: zoneId,
      city: city,
      countryCode: countryCode,
      countryLabel: countryLabel,
      countryTitle: countryTitle,
      region: region,
      regionLabel: REGION_LABELS[region],
      search: search
    };
  }

  function getZoneIds() {
    let ids = [];

    try {
      if (typeof Intl.supportedValuesOf === "function") {
        ids = Intl.supportedValuesOf("timeZone");
      }
    } catch (error) {
      ids = [];
    }

    if (!ids.length && ZONE_DATA.countries) {
      ids = Object.keys(ZONE_DATA.countries);
    }

    if (!ids.length) {
      ids = FALLBACK_ZONES.slice();
    }

    const unique = new Set(ids.filter(function (id) {
      return typeof id === "string" && id;
    }));

    unique.add("UTC");
    unique.add(DEFAULT_TIME_ZONE);

    return Array.from(unique);
  }

  const zoneCatalog = getZoneIds()
    .map(createZoneEntry)
    .sort(function (a, b) {
      const regionA = REGION_ORDER.indexOf(a.region);
      const regionB = REGION_ORDER.indexOf(b.region);

      if (regionA !== regionB) {
        return regionA - regionB;
      }
      return collator.compare(a.city, b.city) || collator.compare(a.id, b.id);
    });

  const zoneById = new Map(zoneCatalog.map(function (entry) {
    return [entry.id, entry];
  }));

  function getInitialTimeZone() {
    const stored = readString(STORAGE_TIME_ZONE, "");

    if (stored && zoneById.has(stored)) {
      return stored;
    }
    if (zoneById.has(DEFAULT_TIME_ZONE)) {
      return DEFAULT_TIME_ZONE;
    }
    return zoneCatalog.length ? zoneCatalog[0].id : DEFAULT_TIME_ZONE;
  }

  const state = {
    use24h: readBoolean(STORAGE_24H, true),
    showSeconds: readBoolean(STORAGE_SECONDS, true),
    timeZone: getInitialTimeZone(),
    zoneFilter: "all",
    lastSecond: -1,
    lastMinute: -1,
    lastDateKey: "",
    snackbarTimer: 0,
    zoneTimeTimer: 0,
    searchTimer: 0
  };

  const partsFormatters = new Map();
  const offsetFormatters = new Map();

  function makePartsFormatter(zone) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
  }

  function getPartsFormatter(zone) {
    if (!partsFormatters.has(zone)) {
      try {
        partsFormatters.set(zone, makePartsFormatter(zone));
      } catch (error) {
        partsFormatters.set(zone, makePartsFormatter(DEFAULT_TIME_ZONE));
      }
    }
    return partsFormatters.get(zone);
  }

  function getOffsetFormatter(zone) {
    if (!offsetFormatters.has(zone)) {
      try {
        offsetFormatters.set(zone, new Intl.DateTimeFormat("en-US", {
          timeZone: zone,
          timeZoneName: "shortOffset"
        }));
      } catch (error) {
        offsetFormatters.set(zone, null);
      }
    }
    return offsetFormatters.get(zone);
  }

  function getZonedParts(date, zone) {
    const targetZone = zone || state.timeZone;
    const values = {};

    for (const part of getPartsFormatter(targetZone).formatToParts(date)) {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
    }

    return {
      year: Number(values.year),
      month: Number(values.month),
      day: Number(values.day),
      hour: Number(values.hour) % 24,
      minute: Number(values.minute),
      second: Number(values.second)
    };
  }

  function getOffsetLabel(date, zone) {
    const formatter = getOffsetFormatter(zone || state.timeZone);

    if (!formatter) {
      return "GMT";
    }

    const part = formatter.formatToParts(date || new Date()).find(function (item) {
      return item.type === "timeZoneName";
    });

    return part ? part.value.replace(/-/g, "−") : "GMT";
  }

  function getWeekdayIndex(year, month, day) {
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }

  function buildClockTicks() {
    const group = document.getElementById("analogTicks");

    if (!group) {
      return;
    }

    const fragment = document.createDocumentFragment();
    const center = 50;

    for (let index = 0; index < 60; index += 1) {
      const angle = (index * 6 * Math.PI) / 180;
      const isMajor = index % 5 === 0;
      const innerRadius = isMajor ? 44 : 45.3;
      const outerRadius = 47.2;
      const line = document.createElementNS(SVG_NS, "line");

      line.setAttribute("x1", String(center + Math.sin(angle) * innerRadius));
      line.setAttribute("y1", String(center - Math.cos(angle) * innerRadius));
      line.setAttribute("x2", String(center + Math.sin(angle) * outerRadius));
      line.setAttribute("y2", String(center - Math.cos(angle) * outerRadius));

      if (isMajor) {
        line.setAttribute("class", "is-major");
      }

      fragment.append(line);
    }

    const ring = document.createElementNS(SVG_NS, "circle");
    ring.setAttribute("class", "analog__inner-ring");
    ring.setAttribute("cx", String(center));
    ring.setAttribute("cy", String(center));
    ring.setAttribute("r", "38.2");
    fragment.append(ring);

    group.replaceChildren(fragment);
  }

  function getDateKey(zoned) {
    return `${zoned.year}-${pad(zoned.month)}-${pad(zoned.day)}`;
  }

  function getGreeting(hour) {
    if (hour < 12) {
      return "Bom dia";
    }
    if (hour < 18) {
      return "Boa tarde";
    }
    return "Boa noite";
  }

  function getDisplayHour(hour) {
    if (state.use24h) {
      return pad(hour);
    }
    return pad(hour % 12 || 12);
  }

  function getPeriod(hour) {
    return hour < 12 ? "AM" : "PM";
  }

  function formatUnit(value, singular, plural) {
    return `${value} ${value === 1 ? singular : plural}`;
  }

  function getCurrentZone() {
    return zoneById.get(state.timeZone) || createZoneEntry(state.timeZone);
  }

  function updateDigital(zoned) {
    const hourText = getDisplayHour(zoned.hour);
    const minuteText = pad(zoned.minute);
    const secondText = pad(zoned.second);
    const period = getPeriod(zoned.hour);

    nodes.hourPart.textContent = hourText;
    nodes.minutePart.textContent = minuteText;
    nodes.secondsPart.textContent = `:${secondText}`;
    nodes.secondsPart.hidden = !state.showSeconds;
    nodes.periodPart.textContent = period;
    nodes.periodPart.hidden = state.use24h;
    nodes.digitalSide.hidden = state.use24h && !state.showSeconds;

    const spokenHour = state.use24h ? zoned.hour : (zoned.hour % 12 || 12);
    let spoken = `${formatUnit(spokenHour, "hora", "horas")} e ${formatUnit(zoned.minute, "minuto", "minutos")}`;

    if (state.showSeconds) {
      spoken += ` e ${formatUnit(zoned.second, "segundo", "segundos")}`;
    }

    if (!state.use24h) {
      spoken += `, ${period}`;
    }

    nodes.clockTime.setAttribute("aria-label", spoken);
    nodes.clockTime.setAttribute("datetime", `${pad(zoned.hour)}:${minuteText}:${secondText}`);
  }

  function updateProgress(zoned) {
    const elapsed = zoned.hour * 3600 + zoned.minute * 60 + zoned.second;
    const percent = Math.min(100, (elapsed / 86400) * 100);
    const rounded = Math.round(percent);
    const remainingMinutes = Math.max(0, Math.ceil((86400 - elapsed) / 60));
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    let remainingText;

    if (remainingMinutes === 0) {
      remainingText = "Menos de 1 min para a meia-noite";
    } else if (remainingMinutes === 1) {
      remainingText = "Falta 1 min para a meia-noite";
    } else if (hours > 0) {
      remainingText = `Faltam ${hours} h ${pad(minutes)} min para a meia-noite`;
    } else {
      remainingText = `Faltam ${minutes} min para a meia-noite`;
    }

    nodes.progressPercent.textContent = `${rounded}%`;
    nodes.progressFill.style.width = `${percent.toFixed(2)}%`;
    nodes.progressBar.setAttribute("aria-valuenow", String(rounded));
    nodes.progressBar.setAttribute(
      "aria-valuetext",
      `${rounded}% do dia concluído. ${remainingText}`
    );
    nodes.remainingPart.textContent = remainingText;
  }

  function updateAnalog(zoned, milliseconds) {
    const smoothSecond = zoned.second + milliseconds / 1000;
    const smoothMinute = zoned.minute + smoothSecond / 60;
    const smoothHour = (zoned.hour % 12) + smoothMinute / 60;

    nodes.secondHand.style.transform = `rotate(${smoothSecond * 6}deg)`;
    nodes.minuteHand.style.transform = `rotate(${smoothMinute * 6}deg)`;
    nodes.hourHand.style.transform = `rotate(${smoothHour * 30}deg)`;
  }

  function updateZoneIdentity() {
    const entry = getCurrentZone();
    const offset = getOffsetLabel(new Date(), state.timeZone);
    const location = entry.countryCode && entry.countryCode !== "UTC"
      ? `${entry.city}, ${entry.countryCode}`
      : entry.city;

    nodes.zoneCity.textContent = entry.city;
    nodes.zoneCity.title = `${entry.countryTitle} · ${entry.id}`;
    nodes.locationText.textContent = location;
    nodes.locationText.title = `${entry.city} · ${entry.countryTitle}`;
    nodes.footerZone.textContent = entry.id === "UTC"
      ? "Tempo Universal Coordenado"
      : `Horário de ${entry.city}`;
    nodes.pageTitle.textContent = `Hora, data e dia da semana em ${entry.city}`;
    nodes.timezoneButton.setAttribute(
      "aria-label",
      `Alterar fuso horário. Atual: ${entry.city}, ${offset}`
    );
  }

  function updateHeadings(zoned, now) {
    const weekdayIndex = getWeekdayIndex(zoned.year, zoned.month, zoned.day);
    const weekday = WEEKDAYS[weekdayIndex];
    const month = MONTHS[zoned.month - 1];
    const hourText = getDisplayHour(zoned.hour);
    const minuteText = pad(zoned.minute);
    const period = getPeriod(zoned.hour);
    const greeting = getGreeting(zoned.hour);
    const isNight = zoned.hour < 6 || zoned.hour >= 18;
    const entry = getCurrentZone();
    const offset = getOffsetLabel(now, state.timeZone);

    nodes.weekdayPart.textContent = capitalize(weekday);
    nodes.datePart.textContent = `${zoned.day} de ${month} de ${zoned.year}`;
    nodes.monthLabel.textContent = `${capitalize(month)} de ${zoned.year}`;
    nodes.todayNote.textContent = `Hoje é ${weekday}, ${zoned.day} de ${month}`;
    nodes.greetingText.textContent = greeting;
    nodes.greetingIcon.setAttribute("href", isNight ? "#i-moon" : "#i-sun");
    nodes.offsetChip.textContent = offset;
    nodes.analogClock.setAttribute(
      "aria-label",
      `Relógio analógico marcando ${zoned.hour} horas e ${zoned.minute} minutos`
    );
    nodes.timezoneButton.setAttribute(
      "aria-label",
      `Alterar fuso horário. Atual: ${entry.city}, ${offset}`
    );

    nodes.formatHint.textContent = state.use24h
      ? `${hourText}:${minuteText}`
      : `${hourText}:${minuteText} ${period}`;

    document.title = `${hourText}:${minuteText} · ${weekday}, ${zoned.day} de ${month} · ${entry.city} — Agora`;
  }

  function renderWeek(zoned) {
    const dateKey = getDateKey(zoned);

    if (nodes.weekGrid.dataset.weekKey === dateKey) {
      return;
    }

    const todayWeekday = getWeekdayIndex(zoned.year, zoned.month, zoned.day);
    const startDay = zoned.day - todayWeekday;
    const fragment = document.createDocumentFragment();
    const todayMonth = MONTHS[zoned.month - 1];

    for (let index = 0; index < 7; index += 1) {
      const date = new Date(Date.UTC(zoned.year, zoned.month - 1, startDay + index));
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      const weekday = date.getUTCDay();
      const isToday = year === zoned.year && month === zoned.month - 1 && day === zoned.day;

      const item = document.createElement("li");
      item.className = isToday ? "day-card day-card--today" : "day-card";
      item.setAttribute(
        "aria-label",
        `${WEEKDAYS[weekday]}, ${day} de ${MONTHS[month]} de ${year}${isToday ? ", hoje" : ""}`
      );
      item.title = `${capitalize(WEEKDAYS[weekday])}, ${day} de ${MONTHS[month]}`;

      if (isToday) {
        item.setAttribute("aria-current", "date");
      }

      const name = document.createElement("span");
      name.className = "day-card__name";
      name.textContent = WEEKDAYS_SHORT[weekday];

      const number = document.createElement("span");
      number.className = "day-card__number";
      number.textContent = String(day);

      const dot = document.createElement("span");
      dot.className = "day-card__dot";
      dot.setAttribute("aria-hidden", "true");

      item.append(name, number, dot);
      fragment.append(item);
    }

    nodes.weekGrid.replaceChildren(fragment);
    nodes.weekGrid.dataset.weekKey = dateKey;
    nodes.todayNote.textContent = `Hoje é ${WEEKDAYS[todayWeekday]}, ${zoned.day} de ${todayMonth}`;
  }

  function updateSecondsVisibility() {
    nodes.analogClock.classList.toggle("is-seconds-hidden", !state.showSeconds);
  }

  function refreshAll() {
    const now = new Date();
    const zoned = getZonedParts(now, state.timeZone);

    updateZoneIdentity();
    updateDigital(zoned);
    updateProgress(zoned);
    updateAnalog(zoned, now.getMilliseconds());
    updateHeadings(zoned, now);
    renderWeek(zoned);
    updateSecondsVisibility();

    state.lastSecond = zoned.second;
    state.lastMinute = zoned.minute;
    state.lastDateKey = getDateKey(zoned);
  }

  function tick(force) {
    const now = new Date();
    const zoned = getZonedParts(now, state.timeZone);
    const dateKey = getDateKey(zoned);
    const secondChanged = zoned.second !== state.lastSecond;
    const minuteChanged = zoned.minute !== state.lastMinute;
    const dateChanged = dateKey !== state.lastDateKey;

    updateAnalog(zoned, now.getMilliseconds());

    if (force || secondChanged) {
      updateDigital(zoned);
      updateProgress(zoned);
      state.lastSecond = zoned.second;
    }

    if (force || minuteChanged || dateChanged) {
      updateHeadings(zoned, now);
      state.lastMinute = zoned.minute;
    }

    if (force || dateChanged) {
      renderWeek(zoned);
      state.lastDateKey = dateKey;
    }
  }

  function getCopyText(zoned) {
    const hourText = getDisplayHour(zoned.hour);
    const minuteText = pad(zoned.minute);
    const secondText = pad(zoned.second);
    const period = getPeriod(zoned.hour);

    return `${hourText}:${minuteText}` +
      (state.showSeconds ? `:${secondText}` : "") +
      (state.use24h ? "" : ` ${period}`);
  }

  function fallbackCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.setAttribute("aria-hidden", "true");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "-9999px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, area.value.length);

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }

    area.remove();
    return copied;
  }

  async function copyCurrentTime() {
    const zoned = getZonedParts(new Date(), state.timeZone);
    const text = getCopyText(zoned);
    const entry = getCurrentZone();
    let copied = false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (error) {
        copied = false;
      }
    }

    if (!copied) {
      copied = fallbackCopy(text);
    }

    if (copied) {
      showSnackbar(`Horário copiado · ${text} · ${entry.city}`);
    } else {
      showSnackbar("Não foi possível copiar o horário");
    }
  }

  function showSnackbar(message) {
    window.clearTimeout(state.snackbarTimer);
    nodes.snackbarText.textContent = message;
    nodes.snackbar.classList.add("is-visible");
    state.snackbarTimer = window.setTimeout(function () {
      nodes.snackbar.classList.remove("is-visible");
    }, 2800);
  }

  function applyTheme(theme, shouldPersist) {
    const isDark = theme === "dark";

    root.dataset.theme = isDark ? "dark" : "light";
    nodes.themeToggle.setAttribute("aria-pressed", String(isDark));
    nodes.themeToggle.setAttribute(
      "aria-label",
      isDark ? "Ativar tema claro" : "Ativar tema escuro"
    );
    nodes.themeToggle.title = isDark ? "Ativar tema claro" : "Ativar tema escuro";
    nodes.themeColor.setAttribute("content", isDark ? "#120e1c" : "#4a2bc7");

    if (shouldPersist) {
      persist(STORAGE_THEME, isDark ? "dark" : "light");
    }
  }

  function createIcon(symbolId) {
    const svg = document.createElementNS(SVG_NS, "svg");
    const use = document.createElementNS(SVG_NS, "use");

    svg.setAttribute("class", "icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    use.setAttribute("href", `#${symbolId}`);
    svg.append(use);

    return svg;
  }

  function updateFilterChips() {
    nodes.zoneFilters.querySelectorAll(".filter-chip").forEach(function (chip) {
      chip.setAttribute("aria-pressed", String(chip.dataset.region === state.zoneFilter));
    });
  }

  function createZoneOption(entry, now) {
    const isSelected = entry.id === state.timeZone;
    const zoned = getZonedParts(now, entry.id);
    const timeText = `${pad(zoned.hour)}:${pad(zoned.minute)}`;
    const offset = getOffsetLabel(now, entry.id);
    const option = document.createElement("button");

    option.type = "button";
    option.className = isSelected ? "zone-option is-selected" : "zone-option";
    option.dataset.zone = entry.id;
    option.setAttribute(
      "aria-label",
      `${entry.city}, ${entry.countryTitle}. ${timeText}, ${offset}.${isSelected ? " Fuso selecionado." : ""}`
    );

    if (isSelected) {
      option.setAttribute("aria-current", "true");
    }

    const code = document.createElement("span");
    code.className = "zone-option__code";
    code.textContent = entry.countryCode;
    code.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "zone-option__copy";

    const city = document.createElement("span");
    city.className = "zone-option__city";
    city.textContent = entry.city;

    const meta = document.createElement("span");
    meta.className = "zone-option__meta";
    meta.textContent = entry.countryLabel;

    const id = document.createElement("span");
    id.className = "zone-option__id";
    id.textContent = entry.id;

    copy.append(city, meta, id);

    const check = document.createElement("span");
    check.className = "zone-option__check";
    check.setAttribute("aria-hidden", "true");
    check.append(createIcon("i-check"));

    const time = document.createElement("span");
    time.className = "zone-option__time";

    const timeValue = document.createElement("strong");
    timeValue.textContent = timeText;

    const offsetValue = document.createElement("span");
    offsetValue.textContent = offset;

    time.append(timeValue, offsetValue);
    option.append(code, copy, check, time);

    return option;
  }

  function renderZoneList() {
    const now = new Date();
    const query = normalizeSearch(nodes.timezoneSearch.value);
    const filtered = zoneCatalog.filter(function (entry) {
      if (state.zoneFilter !== "all" && entry.region !== state.zoneFilter) {
        return false;
      }
      return !query || entry.search.includes(query);
    });
    const groups = new Map();

    filtered.forEach(function (entry) {
      if (!groups.has(entry.region)) {
        groups.set(entry.region, []);
      }
      groups.get(entry.region).push(entry);
    });

    const fragment = document.createDocumentFragment();

    REGION_ORDER.forEach(function (region) {
      const entries = groups.get(region);

      if (!entries || entries.length === 0) {
        return;
      }

      const section = document.createElement("section");
      const heading = document.createElement("h3");
      const headingText = document.createElement("span");
      const count = document.createElement("span");
      const headingId = `zone-group-${region}`;

      section.className = "zone-group";
      section.setAttribute("role", "group");
      section.setAttribute("aria-labelledby", headingId);
      heading.className = "zone-group__title";
      heading.id = headingId;
      headingText.textContent = REGION_LABELS[region];
      count.className = "zone-group__count";
      count.textContent = String(entries.length);
      heading.append(headingText, count);
      section.append(heading);

      entries.forEach(function (entry) {
        section.append(createZoneOption(entry, now));
      });

      fragment.append(section);
    });

    nodes.zoneList.replaceChildren(fragment);
    nodes.zoneList.hidden = filtered.length === 0;
    nodes.zoneEmpty.hidden = filtered.length !== 0;
    nodes.clearTimezoneSearch.hidden = !nodes.timezoneSearch.value;

    if (query) {
      nodes.zoneCount.textContent = filtered.length === 1
        ? "1 resultado"
        : `${filtered.length} resultados`;
    } else {
      nodes.zoneCount.textContent = filtered.length === 1
        ? "1 fuso horário"
        : `${filtered.length} fusos horários`;
    }
  }

  function updateAllZoneTimes() {
    const now = new Date();
    const options = nodes.zoneList.querySelectorAll(".zone-option");

    options.forEach(function (option) {
      const entry = zoneById.get(option.dataset.zone);
      const zoned = getZonedParts(now, option.dataset.zone);
      const timeText = `${pad(zoned.hour)}:${pad(zoned.minute)}`;
      const offset = getOffsetLabel(now, option.dataset.zone);
      const timeValue = option.querySelector(".zone-option__time strong");
      const offsetValue = option.querySelector(".zone-option__time span");
      const isSelected = option.classList.contains("is-selected");

      if (timeValue) {
        timeValue.textContent = timeText;
      }
      if (offsetValue) {
        offsetValue.textContent = offset;
      }
      if (entry) {
        option.setAttribute(
          "aria-label",
          `${entry.city}, ${entry.countryTitle}. ${timeText}, ${offset}.${isSelected ? " Fuso selecionado." : ""}`
        );
      }
    });
  }

  function scrollSelectedZoneIntoView() {
    const selected = nodes.zoneList.querySelector(".zone-option.is-selected");

    if (!selected) {
      return;
    }

    const scrollRect = nodes.zoneListScroll.getBoundingClientRect();
    const selectedRect = selected.getBoundingClientRect();
    const target = nodes.zoneListScroll.scrollTop +
      (selectedRect.top - scrollRect.top) -
      (scrollRect.height - selectedRect.height) / 2;

    nodes.zoneListScroll.scrollTop = Math.max(0, target);

    window.requestAnimationFrame(function () {
      const nextScrollRect = nodes.zoneListScroll.getBoundingClientRect();
      let cutoff = nextScrollRect.top;

      nodes.zoneList.querySelectorAll(".zone-group__title").forEach(function (heading) {
        const rect = heading.getBoundingClientRect();

        if (rect.top <= nextScrollRect.top + 2 && rect.bottom > cutoff) {
          cutoff = rect.bottom;
        }
      });

      cutoff += 2;
      const options = nodes.zoneList.querySelectorAll(".zone-option");

      for (const option of options) {
        const rect = option.getBoundingClientRect();

        if (rect.bottom > cutoff) {
          if (rect.top < cutoff) {
            nodes.zoneListScroll.scrollTop = Math.max(
              0,
              nodes.zoneListScroll.scrollTop - (cutoff - rect.top)
            );
          }
          break;
        }
      }
    });
  }

  function openTimezoneDialog() {
    if (!nodes.timezoneDialog || nodes.timezoneDialog.open) {
      return;
    }

    state.zoneFilter = "all";
    nodes.timezoneSearch.value = "";
    nodes.clearTimezoneSearch.hidden = true;
    updateFilterChips();
    renderZoneList();

    nodes.timezoneDialog.showModal();
    document.body.classList.add("dialog-open");
    nodes.timezoneButton.setAttribute("aria-expanded", "true");

    window.clearInterval(state.zoneTimeTimer);
    state.zoneTimeTimer = window.setInterval(updateAllZoneTimes, 30000);

    window.requestAnimationFrame(function () {
      scrollSelectedZoneIntoView();
      nodes.timezoneSearch.focus({ preventScroll: true });
    });
  }

  function closeTimezoneDialog() {
    if (nodes.timezoneDialog && nodes.timezoneDialog.open) {
      nodes.timezoneDialog.close();
    }
  }

  function handleTimezoneDialogClosed() {
    document.body.classList.remove("dialog-open");
    nodes.timezoneButton.setAttribute("aria-expanded", "false");
    window.clearInterval(state.zoneTimeTimer);
    window.clearTimeout(state.searchTimer);
    state.zoneTimeTimer = 0;
    state.searchTimer = 0;
    nodes.timezoneButton.focus({ preventScroll: true });
  }

  function selectTimeZone(zoneId) {
    const entry = zoneById.get(zoneId);

    if (!entry) {
      return;
    }

    if (entry.id === state.timeZone) {
      closeTimezoneDialog();
      return;
    }

    state.timeZone = entry.id;
    persist(STORAGE_TIME_ZONE, entry.id);
    closeTimezoneDialog();
    refreshAll();
    showSnackbar(`Fuso alterado para ${entry.city} · ${getOffsetLabel(new Date(), entry.id)}`);
  }

  nodes.formatToggle.checked = state.use24h;
  nodes.secondsToggle.checked = state.showSeconds;

  nodes.formatToggle.addEventListener("change", function () {
    state.use24h = nodes.formatToggle.checked;
    persist(STORAGE_24H, state.use24h);
    refreshAll();
  });

  nodes.secondsToggle.addEventListener("change", function () {
    state.showSeconds = nodes.secondsToggle.checked;
    persist(STORAGE_SECONDS, state.showSeconds);
    refreshAll();
  });

  nodes.copyButton.addEventListener("click", copyCurrentTime);

  nodes.themeToggle.addEventListener("click", function () {
    applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
  });

  nodes.timezoneButton.addEventListener("click", openTimezoneDialog);
  nodes.closeTimezoneButton.addEventListener("click", closeTimezoneDialog);

  nodes.timezoneDialog.addEventListener("close", handleTimezoneDialogClosed);

  nodes.timezoneDialog.addEventListener("click", function (event) {
    if (event.target !== nodes.timezoneDialog) {
      return;
    }

    const rect = nodes.timezoneDialog.getBoundingClientRect();
    const outside = event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;

    if (outside) {
      closeTimezoneDialog();
    }
  });

  nodes.timezoneSearch.addEventListener("input", function () {
    nodes.clearTimezoneSearch.hidden = !nodes.timezoneSearch.value;
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(renderZoneList, 80);
  });

  nodes.timezoneSearch.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      const first = nodes.zoneList.querySelector(".zone-option");

      if (first) {
        event.preventDefault();
        first.click();
      }
    }

    if (event.key === "ArrowDown") {
      const first = nodes.zoneList.querySelector(".zone-option");

      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  nodes.clearTimezoneSearch.addEventListener("click", function () {
    nodes.timezoneSearch.value = "";
    nodes.clearTimezoneSearch.hidden = true;
    renderZoneList();
    nodes.timezoneSearch.focus({ preventScroll: true });
  });

  nodes.zoneFilters.addEventListener("click", function (event) {
    const chip = event.target.closest(".filter-chip");

    if (!chip) {
      return;
    }

    state.zoneFilter = chip.dataset.region || "all";
    updateFilterChips();
    renderZoneList();
    nodes.zoneListScroll.scrollTop = 0;
  });

  nodes.zoneList.addEventListener("click", function (event) {
    const option = event.target.closest(".zone-option");

    if (option) {
      selectTimeZone(option.dataset.zone);
    }
  });

  nodes.zoneList.addEventListener("keydown", function (event) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    const options = Array.from(nodes.zoneList.querySelectorAll(".zone-option"));
    const index = options.indexOf(document.activeElement);

    if (index === -1) {
      return;
    }

    event.preventDefault();
    const next = options[index + (event.key === "ArrowDown" ? 1 : -1)];

    if (next) {
      next.focus();
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      tick(true);
    }
  });

  window.addEventListener("focus", function () {
    tick(true);
  });

  applyTheme(root.dataset.theme === "dark" ? "dark" : "light", false);
  buildClockTicks();
  refreshAll();
  updateFilterChips();

  window.setInterval(tick, 100);
}());
