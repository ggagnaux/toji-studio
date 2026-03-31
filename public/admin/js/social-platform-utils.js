export function cleanText(v) {
  return String(v || "").trim();
}

export function normalizePlatformIconLocation(raw) {
  const text = cleanText(raw).replace(/\\/g, "/");
  if (!text) return "";
  if (/^(https?:)?\/\//i.test(text) || text.startsWith("data:")) return text;
  if (text.startsWith("/public/")) return text.slice("/public".length);
  if (text.startsWith("/")) return text;
  const marker = "/assets/";
  const markerIndex = text.toLowerCase().indexOf(marker);
  if (markerIndex >= 0) return text.slice(markerIndex);
  return `/${text.replace(/^\/+/, "")}`;
}

export function resolvePlatformIconSrc(raw, pathname = "") {
  const normalized = normalizePlatformIconLocation(raw);
  if (!normalized) return "";
  if (/^(https?:)?\/\//i.test(normalized) || normalized.startsWith("data:")) return normalized;

  const isPublicPreview = pathname === "/public" || pathname.startsWith("/public/");
  if (isPublicPreview && normalized.startsWith("/assets/")) {
    return `/public${normalized}`;
  }

  return normalized;
}

export function cleanSlug(v) {
  return cleanText(v)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function parseTagsInput(v) {
  return Array.from(
    new Set(
      cleanText(v)
        .split(/[,;\n]+/g)
        .map((t) => cleanText(t).replace(/^#+/, "").toLowerCase())
        .filter(Boolean)
    )
  );
}

export const categoryOptions = ["social", "video", "newsletter", "portfolio", "other"];

export function getPlatformFormMeta(platform) {
  const id = cleanSlug(platform?.id);
  if (id === "bluesky") {
    return {
      intro: "Configure Bluesky for the manual-first workflow. Save the public profile, caption defaults, and optional credentials for later API mode.",
      postingModeDefault: "manual",
      handleLabel: "Bluesky handle",
      handlePlaceholder: "@studio.bsky.social",
      profileLabel: "Bluesky profile URL",
      profilePlaceholder: "https://bsky.app/profile/your-handle",
      accountIdLabel: "DID / account id",
      accountIdPlaceholder: "did:plc:...",
      hashtagsLabel: "Default hashtags",
      hashtagsPlaceholder: "art, painting, toji-studios",
      suffixLabel: "Default caption suffix",
      suffixPlaceholder: "Optional CTA or portfolio link appended to Bluesky captions.",
      notesLabel: "Bluesky notes",
      notesPlaceholder: "Publishing guidance, thread ideas, or reminders for manual posting.",
      clientIdLabel: "Identifier / login",
      clientIdPlaceholder: "handle or email",
      clientSecretLabel: "App password",
      clientSecretPlaceholder: "xxxx-xxxx-xxxx-xxxx",
      accessTokenLabel: "Access JWT",
      refreshTokenLabel: "Refresh JWT"
    };
  }
  if (id === "linkedin") {
    return {
      intro: "Configure LinkedIn for the manual-first workflow. Save the public page/profile, caption defaults, and optional API credentials for later direct posting.",
      postingModeDefault: "manual",
      handleLabel: "LinkedIn page handle",
      handlePlaceholder: "company/your-studio",
      profileLabel: "LinkedIn profile/page URL",
      profilePlaceholder: "https://www.linkedin.com/company/your-page/",
      accountIdLabel: "Organization URN / account id",
      accountIdPlaceholder: "urn:li:organization:123456 or 123456",
      hashtagsLabel: "Default hashtags",
      hashtagsPlaceholder: "digitalart, illustration, conceptart",
      suffixLabel: "Default caption suffix",
      suffixPlaceholder: "Optional CTA or portfolio link appended to LinkedIn captions.",
      notesLabel: "LinkedIn notes",
      notesPlaceholder: "Posting guidance, audience notes, or reminders for manual publishing.",
      clientIdLabel: "Client ID",
      clientIdPlaceholder: "LinkedIn app client ID",
      clientSecretLabel: "Client secret",
      clientSecretPlaceholder: "LinkedIn app client secret",
      accessTokenLabel: "Access token",
      refreshTokenLabel: "Refresh token"
    };
  }

  return {
    intro: "Configure platform defaults and credentials used by the artwork social-post workflow.",
    postingModeDefault: "api",
    handleLabel: "Account handle",
    handlePlaceholder: "@account",
    profileLabel: "Profile URL",
    profilePlaceholder: "https://...",
    accountIdLabel: "Account/Page ID",
    accountIdPlaceholder: "",
    hashtagsLabel: "Default hashtags",
    hashtagsPlaceholder: "tag1, tag2",
    suffixLabel: "Default caption suffix",
    suffixPlaceholder: "Optional default suffix appended to captions.",
    notesLabel: "Notes",
    notesPlaceholder: "Setup notes for this platform.",
    clientIdLabel: "Client ID",
    clientIdPlaceholder: "",
    clientSecretLabel: "Client secret",
    clientSecretPlaceholder: "",
    accessTokenLabel: "Access token",
    refreshTokenLabel: "Refresh token"
  };
}

