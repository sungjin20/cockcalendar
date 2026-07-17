const BASE_URL = "http://real.badmintonfriends.co.kr:8080";

let accessToken = process.env.BADDY_TOKEN || "";
let refreshToken = process.env.BADDY_REFRESH_TOKEN || "";

function readTokens(body: any) {
  const tokenInfo = body?.result?.TOKEN_INFO;
  return {
    access: tokenInfo?.aToken || body?.result?.ACCESS_TOKEN || body?.result?.accessToken || body?.ACCESS_TOKEN || body?.accessToken || body?.TOKEN || "",
    refresh: tokenInfo?.rToken || body?.result?.REFRESH_TOKEN || body?.result?.refreshToken || body?.R_TOKEN || body?.refreshToken || "",
  };
}

function saveTokens(nextAccess: string, nextRefresh?: string) {
  accessToken = nextAccess;
  process.env.BADDY_TOKEN = nextAccess;
  if (nextRefresh) {
    refreshToken = nextRefresh;
    process.env.BADDY_REFRESH_TOKEN = nextRefresh;
  }
  return accessToken;
}

async function loginBaddy() {
  const telNo = process.env.BADDY_TEL_NO;
  const snsId = process.env.BADDY_KAKAO_SNS_ID;
  if (!telNo || !snsId) throw new Error("BADDY_TEL_NO and BADDY_KAKAO_SNS_ID are required");
  const loginUrl = new URL(`${BASE_URL}/auth/sns/sign-in`);
  loginUrl.searchParams.set("snsType", "KAKAO");
  loginUrl.searchParams.set("snsId", snsId);
  loginUrl.searchParams.set("telNo", telNo);
  const response = await fetch(loginUrl, { headers: { "user-agent": "Dart/3.6 (dart:io)", accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Baddy SNS login HTTP ${response.status}`);
  const body = await response.json() as any;
  const tokens = readTokens(body);
  if (!tokens.access) throw new Error(body?.msg || body?.message || `Baddy SNS login failed (resCode: ${body?.resCode || "unknown"})`);
  return saveTokens(tokens.access, tokens.refresh);
}

export async function getBaddyAccessToken() {
  return accessToken || loginBaddy();
}

export async function refreshBaddyAccessToken() {
  const telNo = process.env.BADDY_TEL_NO;
  if (!telNo) throw new Error("BADDY_TEL_NO is required");
  if (!refreshToken) return loginBaddy();
  try {
    const response = await fetch(`${BASE_URL}/auth/token/refresh`, {
      method: "POST",
      headers: { "user-agent": "Dart/3.6 (dart:io)", "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ TEL_NO: telNo, R_TOKEN: refreshToken }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Baddy token refresh HTTP ${response.status}`);
    const body = await response.json() as any;
    const tokens = readTokens(body);
    if (!tokens.access) throw new Error(body?.msg || body?.message || "Baddy token refresh returned no access token");
    return saveTokens(tokens.access, tokens.refresh || refreshToken);
  } catch {
    accessToken = "";
    return loginBaddy();
  }
}
