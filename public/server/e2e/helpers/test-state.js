export const E2E_ADMIN_STATE = {
  settings: {
    brand: "Toji Studios",
    contactEmail: "hello@toji.test",
    externalLinks: []
  },
  tags: ["editorial", "monochrome", "geometry", "motion"],
  series: ["Night Forms", "Signal Bloom"],
  seriesMeta: {
    "night-forms": {
      name: "Night Forms",
      slug: "night-forms",
      description: "Atmospheric studies in contrast, silhouette, and restrained light.",
      sortOrder: 10,
      isPublic: true,
      coverArtworkId: "art-1",
      coverThumb: "assets/img/placeholders/p1.jpg",
      imageOrder: ["art-1", "art-2", "art-3"]
    },
    "signal-bloom": {
      name: "Signal Bloom",
      slug: "signal-bloom",
      description: "A brighter body of work built around motion, color, and repeating geometry.",
      sortOrder: 20,
      isPublic: true,
      coverArtworkId: "art-4",
      coverThumb: "assets/img/placeholders/p1.jpg",
      imageOrder: ["art-4", "art-5", "art-6"]
    }
  },
  artworks: [
    {
      id: "art-1",
      title: "Night Form I",
      status: "published",
      featured: true,
      series: "Night Forms",
      seriesSlugs: ["night-forms", "signal-bloom"],
      year: "2026",
      description: "A quiet opening image from the Night Forms series.",
      tags: ["editorial", "monochrome"],
      thumb: "assets/img/placeholders/p1.jpg",
      image: "assets/img/placeholders/p1.jpg",
      createdAt: "2026-03-01T00:00:00.000Z",
      publishedAt: "2026-03-01T00:00:00.000Z",
      sortOrder: 30
    },
    {
      id: "art-2",
      title: "Night Form II",
      status: "published",
      featured: false,
      series: "Night Forms",
      seriesSlugs: ["night-forms"],
      year: "2026",
      description: "A follow-up study with stronger edge contrast.",
      tags: ["monochrome"],
      thumb: "assets/img/placeholders/p1.jpg",
      image: "assets/img/placeholders/p1.jpg",
      createdAt: "2026-03-02T00:00:00.000Z",
      publishedAt: "2026-03-02T00:00:00.000Z",
      sortOrder: 20
    },
    {
      id: "art-3",
      title: "Night Form III",
      status: "published",
      featured: true,
      series: "Night Forms",
      year: "2026",
      description: "A denser image with layered silhouettes and reflected light.",
      tags: ["editorial", "geometry"],
      thumb: "assets/img/placeholders/p1.jpg",
      image: "assets/img/placeholders/p1.jpg",
      createdAt: "2026-03-03T00:00:00.000Z",
      publishedAt: "2026-03-03T00:00:00.000Z",
      sortOrder: 10
    },
    {
      id: "art-4",
      title: "Signal Bloom I",
      status: "published",
      featured: true,
      series: "Signal Bloom",
      seriesSlugs: ["signal-bloom"],
      year: "2025",
      description: "A brighter, more kinetic composition from Signal Bloom.",
      tags: ["motion", "geometry"],
      thumb: "assets/img/placeholders/p1.jpg",
      image: "assets/img/placeholders/p1.jpg",
      createdAt: "2025-11-01T00:00:00.000Z",
      publishedAt: "2025-11-01T00:00:00.000Z",
      sortOrder: 30
    },
    {
      id: "art-5",
      title: "Signal Bloom II",
      status: "published",
      featured: false,
      series: "Signal Bloom",
      seriesSlugs: ["signal-bloom"],
      year: "2025",
      description: "A continuation built around repeated arcs and softer fields of color.",
      tags: ["motion"],
      thumb: "assets/img/placeholders/p1.jpg",
      image: "assets/img/placeholders/p1.jpg",
      createdAt: "2025-11-02T00:00:00.000Z",
      publishedAt: "2025-11-02T00:00:00.000Z",
      sortOrder: 20
    },
    {
      id: "art-6",
      title: "Signal Bloom III",
      status: "published",
      featured: false,
      series: "Signal Bloom",
      seriesSlugs: ["signal-bloom"],
      year: "2025",
      description: "The series resolves into a more spacious final image.",
      tags: ["geometry"],
      thumb: "assets/img/placeholders/p1.jpg",
      image: "assets/img/placeholders/p1.jpg",
      createdAt: "2025-11-03T00:00:00.000Z",
      publishedAt: "2025-11-03T00:00:00.000Z",
      sortOrder: 10
    }
  ]
};
