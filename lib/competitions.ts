export type Competition = { id:string; title:string; platform:string; region:string; venue:string; startDate:string; endDate:string; dayOfWeek:string; organizer:string; description:string; posterUrl:string; documents:{name:string;url:string}[]; sourceUrl:string };
// Production data is read from PostgreSQL. This empty fallback prevents sample competitions from appearing before the first collection.
export const competitions: Competition[] = [];
