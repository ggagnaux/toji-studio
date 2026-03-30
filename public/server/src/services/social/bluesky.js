function normalizeServiceUrl(raw) {
  const value = String(raw || "https://bsky.social").trim();
  return value.replace(/\/+$/, "") || "https://bsky.social";
}

async function readJsonSafely(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function xrpcFetch(serviceUrl, path, opts = {}) {
  const res = await fetch(`${serviceUrl}${path}`, opts);
  const json = await readJsonSafely(res);
  if (!res.ok) {
    throw new Error(json?.message || json?.error || `${res.status} ${res.statusText}`);
  }
  return json;
}

function buildBlueskyPostUrl(handle, uri) {
  const safeHandle = String(handle || "").trim();
  const match = String(uri || "").match(/^at:\/\/[^/]+\/app\.bsky\.feed\.post\/([^/?#]+)$/i);
  const rkey = match?.[1] || "";
  if (!safeHandle || !rkey) return "";
  return `https://bsky.app/profile/${safeHandle}/post/${rkey}`;
}

export async function publishArtworkToBluesky({
  identifier,
  appPassword,
  text,
  imageBuffer,
  imageMimeType,
  altText,
  aspectRatio,
  serviceUrl,
  handle
}) {
  const normalizedServiceUrl = normalizeServiceUrl(serviceUrl);
  const session = await xrpcFetch(normalizedServiceUrl, "/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: String(identifier || "").trim(),
      password: String(appPassword || "")
    })
  });

  const uploadRes = await fetch(`${normalizedServiceUrl}/xrpc/com.atproto.repo.uploadBlob`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessJwt}`,
      "Content-Type": String(imageMimeType || "image/jpeg")
    },
    body: imageBuffer
  });
  const uploadJson = await readJsonSafely(uploadRes);
  if (!uploadRes.ok) {
    throw new Error(uploadJson?.message || uploadJson?.error || `${uploadRes.status} ${uploadRes.statusText}`);
  }

  const image = {
    alt: String(altText || "Artwork").trim() || "Artwork",
    image: uploadJson?.blob
  };
  if (aspectRatio?.width > 0 && aspectRatio?.height > 0) {
    image.aspectRatio = {
      width: Number(aspectRatio.width),
      height: Number(aspectRatio.height)
    };
  }

  const record = {
    $type: "app.bsky.feed.post",
    text: String(text || "").trim(),
    createdAt: new Date().toISOString(),
    embed: {
      $type: "app.bsky.embed.images",
      images: [image]
    }
  };

  const createJson = await xrpcFetch(normalizedServiceUrl, "/xrpc/com.atproto.repo.createRecord", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessJwt}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record
    })
  });

  const resolvedHandle = String(handle || session.handle || identifier || "").trim();
  const postUrl = buildBlueskyPostUrl(resolvedHandle, createJson?.uri);
  const externalPostId = postUrl
    ? postUrl.replace(/^https:\/\/bsky\.app\//i, "")
    : String(createJson?.uri || "").trim();

  return {
    did: String(session.did || "").trim(),
    handle: resolvedHandle,
    uri: String(createJson?.uri || "").trim(),
    cid: String(createJson?.cid || "").trim(),
    postUrl,
    externalPostId,
    record,
    blob: uploadJson?.blob || null
  };
}
