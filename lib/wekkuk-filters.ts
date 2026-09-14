const EXCLUDED_TITLE_PARTS = ["배드민턴 유청소년", "배드민턴 시니어", "배드민턴 성인부"];

export function isExcludedWekkukTitle(title: string) {
  return EXCLUDED_TITLE_PARTS.some(part => title.includes(part));
}

export function isExcludedWekkukOrganizer(organizer: string) {
  return organizer.trim() === "대한체육회";
}
