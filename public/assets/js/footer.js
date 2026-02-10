export function renderPublicFooter({
  leftText = "© {year} Toji Studios",
  rightHtml = `<a href="gallery.html">Gallery</a> • <a href="about.html">About</a> • <a href="contact.html">Contact</a>`,
} = {}) {
  const host = document.getElementById("siteFooter");
  if (!host) throw new Error('Missing <footer id="siteFooter"></footer>');

  const year = new Date().getFullYear();
  const left = leftText.replace("{year}", String(year));

  host.className = "footer";
  host.innerHTML = `
    <div class="row">
      <div>${escapeHtml(left)}</div>
      <div>${rightHtml}</div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
