(function () {
  "use strict";

  const TIME_ZONE = "America/Sao_Paulo";
  const STORAGE_THEME = "agora-theme";
  const STORAGE_24H = "agora-24h";
  const STORAGE_SECONDS = "agora-seconds";

  const MONTHS = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  const WEEKDAYS = [
    "domingo", "segunda-feira", "terça-feira", "quarta-feira",
    "quinta-feira", "sexta-feira", "sábado"
  ];
  const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

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

  const state = {
    use24h: readBoolean(STORAGE_24H, true),
    showSeconds: readBoolean(STORAGE_SECONDS, true),
    lastSecond: -1,
    lastMinute: -1,
    lastDateKey: "",
    snackbarTimer: 0
  };

  let partsFormatter;
  let offsetFormatter;

  try {
    partsFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
  } catch (error) {
    partsFormatter = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
  }

  try {
    offsetFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      timeZoneName: "shortOffset"
    });
  } catch (error) {
    offsetFormatter = null;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function readBoolean(key, fallback) {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? fallback : stored === "true";
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

  function getZonedParts(date) {
    const values = {};

    for (const part of partsFormatter.formatToParts(date)) {
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

  function getWeekdayIndex(year, month, day) {
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }

  function buildClockTicks() {
    const group = document.getElementById("analogTicks");

    if (!group) {
      return;
    }

    const namespace = "http://www.w3.org/2000/svg";
    const fragment = document.createDocumentFragment();
    const center = 50;

    for (let index = 0; index < 60; index += 1) {
      const angle = (index * 6 * Math.PI) / 180;
      const isMajor = index % 5 === 0;
      const innerRadius = isMajor ? 44 : 45.3;
      const outerRadius = 47.2;
      const line = document.createElementNS(namespace, "line");

      line.setAttribute("x1", String(center + Math.sin(angle) * innerRadius));
      line.setAttribute("y1", String(center - Math.cos(angle) * innerRadius));
      line.setAttribute("x2", String(center + Math.sin(angle) * outerRadius));
      line.setAttribute("y2", String(center - Math.cos(angle) * outerRadius));

      if (isMajor) {
        line.setAttribute("class", "is-major");
      }

      fragment.append(line);
    }

    const ring = document.createElementNS(namespace, "circle");
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

  function getOffsetLabel(date) {
    if (!offsetFormatter) {
      return "GMT−3";
    }

    const part = offsetFormatter.formatToParts(date).find(function (item) {
      return item.type === "timeZoneName";
    });

    return part ? part.value.replace("-", "−") : "GMT−3";
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

  function updateHeadings(zoned, now) {
    const weekdayIndex = getWeekdayIndex(zoned.year, zoned.month, zoned.day);
    const weekday = WEEKDAYS[weekdayIndex];
    const month = MONTHS[zoned.month - 1];
    const hourText = getDisplayHour(zoned.hour);
    const minuteText = pad(zoned.minute);
    const period = getPeriod(zoned.hour);
    const greeting = getGreeting(zoned.hour);
    const isNight = zoned.hour < 6 || zoned.hour >= 18;

    nodes.weekdayPart.textContent = capitalize(weekday);
    nodes.datePart.textContent = `${zoned.day} de ${month} de ${zoned.year}`;
    nodes.monthLabel.textContent = `${capitalize(month)} de ${zoned.year}`;
    nodes.todayNote.textContent = `Hoje é ${weekday}, ${zoned.day} de ${month}`;
    nodes.greetingText.textContent = greeting;
    nodes.greetingIcon.setAttribute("href", isNight ? "#i-moon" : "#i-sun");
    nodes.offsetChip.textContent = getOffsetLabel(now);
    nodes.analogClock.setAttribute(
      "aria-label",
      `Relógio analógico marcando ${zoned.hour} horas e ${zoned.minute} minutos`
    );

    nodes.formatHint.textContent = state.use24h
      ? `${hourText}:${minuteText}`
      : `${hourText}:${minuteText} ${period}`;

    document.title = `${hourText}:${minuteText} · ${weekday}, ${zoned.day} de ${month} — Agora`;
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
    const zoned = getZonedParts(now);

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
    const zoned = getZonedParts(now);
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
    const zoned = getZonedParts(new Date());
    const text = getCopyText(zoned);
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
      showSnackbar(`Horário copiado · ${text}`);
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

  window.setInterval(tick, 100);
}());
