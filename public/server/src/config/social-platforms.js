export const ALLOWED_SOCIAL_PLATFORMS = Object.freeze([
  Object.freeze({ id: "bluesky", name: "Bluesky", category: "social", iconLocation: "/assets/img/socialmediaicons/bluesky-logo.svg" }),
  Object.freeze({ id: "instagram", name: "Instagram", category: "social", iconLocation: "/assets/img/socialmediaicons/instagram-logo.svg" }),
  Object.freeze({ id: "threads", name: "Threads", category: "social", iconLocation: "/assets/img/socialmediaicons/threads-logo.svg" }),
  Object.freeze({ id: "linkedin", name: "LinkedIn", category: "social", iconLocation: "/assets/img/socialmediaicons/linkedin-logo.svg" })
]);

const platformMap = new Map(ALLOWED_SOCIAL_PLATFORMS.map((platform) => [platform.id, platform]));

export function getAllowedSocialPlatform(id) {
  return platformMap.get(String(id || "").trim().toLowerCase()) || null;
}

export function getAllowedSocialPlatformIds() {
  return ALLOWED_SOCIAL_PLATFORMS.map((platform) => platform.id);
}

