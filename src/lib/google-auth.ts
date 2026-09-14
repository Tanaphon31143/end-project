import "server-only";

export function getGoogleConfig(requestUrl?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not configured");
  }

  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (!baseUrl && requestUrl) {
    const url = new URL(requestUrl);
    baseUrl = `${url.protocol}//${url.host}`;
  }
  if (!baseUrl) {
    baseUrl = "http://localhost:3000";
  }

  const redirectUri = `${baseUrl.replace(/\/+$/, "")}/api/auth/google/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function buildGoogleAuthUrl(state: string, requestUrl?: string): string {
  const { clientId, redirectUri } = getGoogleConfig(requestUrl);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, requestUrl?: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig(requestUrl);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to exchange code for tokens:", errorBody);
    throw new Error("Failed to exchange authorization code");
  }

  const data = await response.json();
  return data as {
    access_token: string;
    id_token?: string;
    expires_in: number;
    token_type: string;
    refresh_token?: string;
  };
}

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to fetch Google user info:", errorBody);
    throw new Error("Failed to fetch Google user profile");
  }

  return response.json();
}
