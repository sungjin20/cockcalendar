const urlPrefix = process.env.NEXT_PUBLIC_URL_PREFIX?.replace(/\/$/, "") || "";

export function appUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${urlPrefix}${normalizedPath}`;
}
