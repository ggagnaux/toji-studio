export function normalizeApiBaseUrl(raw) {
  const value = String(raw || "https://api.linkedin.com").trim();
  return value.replace(/\/+$/, "") || "https://api.linkedin.com";
}

export function normalizeApiVersion(raw) {
  const value = String(raw || "").trim();
  if (/^\d{6}$/.test(value)) return value;
  return "202601";
}

export function normalizeOwnerUrn(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^urn:li:(organization|person):/i.test(value)) return value;
  if (/^\d+$/.test(value)) return `urn:li:organization:${value}`;
  return value;
}

export function buildLinkedInPostUrl(postUrn) {
  const urn = String(postUrn || "").trim();
  if (!urn) return "";
  return `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}/`;
}

async function readJsonSafely(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function linkedinApiFetch({ apiBaseUrl, apiVersion, accessToken, path, method = "GET", headers = {}, body }) {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Linkedin-Version": apiVersion,
      "X-Restli-Protocol-Version": "2.0.0",
      ...headers
    },
    body
  });
  const json = await readJsonSafely(res);
  if (!res.ok) {
    throw new Error(json?.message || json?.error || `${res.status} ${res.statusText}`);
  }
  return { json, headers: res.headers };
}

async function uploadLinkedInImage({ uploadUrl, imageBuffer, imageMimeType, accessToken }) {
  const res = await fetch(String(uploadUrl || ""), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": String(imageMimeType || "image/jpeg")
    },
    body: imageBuffer
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
}

async function waitForLinkedInImage({ apiBaseUrl, apiVersion, accessToken, imageUrn, timeoutMs = 30000, intervalMs = 1200 }) {
  const startedAt = Date.now();
  while ((Date.now() - startedAt) < timeoutMs) {
    const { json } = await linkedinApiFetch({
      apiBaseUrl,
      apiVersion,
      accessToken,
      path: `/rest/images/${encodeURIComponent(imageUrn)}`
    });
    const status = String(json?.status || "").trim().toUpperCase();
    if (status === "AVAILABLE") return json;
    if (status === "PROCESSING_FAILED") {
      throw new Error("LinkedIn image processing failed.");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("LinkedIn image processing timed out.");
}

export async function publishArtworkToLinkedIn({
  accessToken,
  commentary,
  imageBuffer,
  imageMimeType,
  altText,
  title,
  owner,
  apiBaseUrl,
  apiVersion
}) {
  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  const normalizedApiVersion = normalizeApiVersion(apiVersion);
  const normalizedOwner = normalizeOwnerUrn(owner);
  if (!normalizedOwner) throw new Error("LinkedIn owner URN/account id is required.");

  const { json: initJson } = await linkedinApiFetch({
    apiBaseUrl: normalizedApiBaseUrl,
    apiVersion: normalizedApiVersion,
    accessToken,
    path: "/rest/images?action=initializeUpload",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: normalizedOwner
      }
    })
  });

  const uploadUrl = String(initJson?.value?.uploadUrl || "").trim();
  const imageUrn = String(initJson?.value?.image || "").trim();
  if (!uploadUrl || !imageUrn) {
    throw new Error("LinkedIn image upload initialization did not return an upload URL and image URN.");
  }

  await uploadLinkedInImage({
    uploadUrl,
    imageBuffer,
    imageMimeType,
    accessToken
  });

  await waitForLinkedInImage({
    apiBaseUrl: normalizedApiBaseUrl,
    apiVersion: normalizedApiVersion,
    accessToken,
    imageUrn
  });

  const postPayload = {
    author: normalizedOwner,
    commentary: String(commentary || "").trim(),
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: []
    },
    content: {
      media: {
        altText: String(altText || "Artwork").trim() || "Artwork",
        title: String(title || "Artwork").trim() || "Artwork",
        id: imageUrn
      }
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false
  };

  const { headers } = await linkedinApiFetch({
    apiBaseUrl: normalizedApiBaseUrl,
    apiVersion: normalizedApiVersion,
    accessToken,
    path: "/rest/posts",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postPayload)
  });

  const postUrn = String(headers.get("x-restli-id") || "").trim();
  if (!postUrn) {
    throw new Error("LinkedIn post publish succeeded but did not return x-restli-id.");
  }

  return {
    owner: normalizedOwner,
    imageUrn,
    postUrn,
    postUrl: buildLinkedInPostUrl(postUrn),
    externalPostId: postUrn,
    apiVersion: normalizedApiVersion,
    payload: postPayload
  };
}
