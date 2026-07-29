export type MainFilterState = {
  query: string;
  platform: string;
  month: string;
  page: number;
};

export type CalendarViewState = {
  visibleMonth: string;
  enabledPlatforms: string[];
  mobileView: "calendar" | "summary";
};

const FILTER_STATE_KEY = "cockcalendar:main-filters";
const CALENDAR_STATE_KEY = "cockcalendar:calendar-view";
const SCROLL_POSITION_KEY = "cockcalendar:main-scroll";
const MAIN_HISTORY_KEY = "cockcalendar:main-history";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

export function readMainFilterState() {
  return readJson<MainFilterState>(FILTER_STATE_KEY);
}

export function writeMainFilterState(state: MainFilterState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(FILTER_STATE_KEY, JSON.stringify(state));
}

export function readCalendarViewState() {
  return readJson<CalendarViewState>(CALENDAR_STATE_KEY);
}

export function writeCalendarViewState(state: CalendarViewState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CALENDAR_STATE_KEY, JSON.stringify(state));
}

export function rememberMainScroll() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SCROLL_POSITION_KEY, String(window.scrollY));
  window.sessionStorage.setItem(MAIN_HISTORY_KEY, "true");
}

export function readMainScroll() {
  if (typeof window === "undefined") return null;
  const savedValue = window.sessionStorage.getItem(SCROLL_POSITION_KEY);
  if (savedValue === null) return null;
  const value = Number(savedValue);
  return Number.isFinite(value) ? value : null;
}

export function hasMainHistory() {
  return typeof window !== "undefined" && window.sessionStorage.getItem(MAIN_HISTORY_KEY) === "true";
}
