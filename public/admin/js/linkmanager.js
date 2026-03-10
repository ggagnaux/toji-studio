    import {
      loadStateAutoSync, saveState, el,
      setYearFooter, ensureBaseStyles,
      showToast
    } from "../admin.js";

    ensureBaseStyles();
    setYearFooter();

    const state = await loadStateAutoSync();
    state.settings ||= {};

    const externalLinksRows = document.getElementById("externalLinksRows");
    const externalLinksHint = document.getElementById("externalLinksHint");
    const externalLinksAddBtn = document.getElementById("externalLinksAdd");
    const externalLinksSaveBtn = document.getElementById("externalLinksSave");

    const EXTERNAL_LINK_CATEGORIES = ["social", "portfolio", "shop", "video", "newsletter", "other"];
    state.settings.externalLinks = normalizeExternalLinks(state.settings.externalLinks);
    let externalLinksDraft = cloneExternalLinks(state.settings.externalLinks);

    function uniqueLinkId(){
      return `lnk_${Math.random().toString(16).slice(2, 10)}`;
    }

    function emptyExternalLink(){
      return {
        id: uniqueLinkId(),
        label: "",
        url: "",
        category: "social",
        enabled: true
      };
    }

    function cloneExternalLinks(links){
      if (!Array.isArray(links)) return [];
      return links.map((row) => ({
        id: String(row?.id || uniqueLinkId()),
        label: String(row?.label || ""),
        url: String(row?.url || ""),
        category: EXTERNAL_LINK_CATEGORIES.includes(String(row?.category || "").toLowerCase())
          ? String(row.category).toLowerCase()
          : "other",
        enabled: row?.enabled == null ? true : !!row.enabled
      }));
    }

    function normalizeExternalLinks(links){
      const used = new Set();
      return cloneExternalLinks(links)
        .filter((row) => row.label.trim() || row.url.trim())
        .map((row) => {
          let id = row.id;
          while (!id || used.has(id)) id = uniqueLinkId();
          used.add(id);
          return {
            id,
            label: row.label.trim(),
            url: row.url.trim(),
            category: row.category,
            enabled: !!row.enabled
          };
        });
    }

    function renderExternalLinksEditor(){
      if (!externalLinksRows || !externalLinksHint) return;
      externalLinksRows.innerHTML = "";
      externalLinksHint.textContent = `${externalLinksDraft.length} link${externalLinksDraft.length === 1 ? "" : "s"}`;

      if (!externalLinksDraft.length) {
        externalLinksRows.appendChild(
          el("div", { class: "sub external-link-empty" }, "No links yet. Add one to get started.")
        );
        return;
      }

      externalLinksDraft.forEach((row, idx) => {
        const popId = `removeLinkConfirm_${row.id || idx}`;
        const categorySelect = el("select", {
          "aria-label": `Category for link ${idx + 1}`,
          onchange: (e) => {
            const value = String(e.target.value || "").toLowerCase();
            row.category = EXTERNAL_LINK_CATEGORIES.includes(value) ? value : "other";
          }
        });

        EXTERNAL_LINK_CATEGORIES.forEach((name) => {
          const option = new Option(name[0].toUpperCase() + name.slice(1), name, false, row.category === name);
          categorySelect.appendChild(option);
        });

        externalLinksRows.appendChild(
          el("div", { class: "external-link-row" },
            el("input", {
              type: "text",
              placeholder: "Label (e.g., Instagram)",
              value: row.label,
              "aria-label": `Label for link ${idx + 1}`,
              oninput: (e) => { row.label = e.target.value; }
            }),
            el("input", {
              type: "url",
              placeholder: "https://...",
              value: row.url,
              "aria-label": `URL for link ${idx + 1}`,
              oninput: (e) => { row.url = e.target.value; }
            }),
            categorySelect,
            el("label", { class: "external-link-toggle" },
              el("input", {
                type: "checkbox",
                checked: row.enabled ? "" : null,
                onchange: (e) => { row.enabled = !!e.target.checked; }
              }),
              el("span", { class: "sub" }, "Enabled")
            ),
            el("div", {},
              el("button", {
                class: "btn danger",
                type: "button",
                popovertarget: popId,
                "aria-haspopup": "dialog",
                "aria-label": `Remove link ${row.label || idx + 1}`
              }, "Remove"),
              el("div", {
                id: popId,
                class: "external-link-confirm",
                popover: "auto",
                role: "dialog",
                "aria-label": "Confirm remove link"
              },
                el("p", {}, `Remove "${row.label || "this link"}"?`),
                el("div", { class: "external-link-confirm-actions" },
                  el("button", {
                    class: "btn",
                    type: "button",
                    popovertarget: popId,
                    popovertargetaction: "hide"
                  }, "Cancel"),
                  el("button", {
                    class: "btn danger",
                    type: "button",
                    onclick: () => {
                      externalLinksDraft.splice(idx, 1);
                      renderExternalLinksEditor();
                    }
                  }, "Remove")
                )
              )
            )
          )
        );
      });
    }

    function validateExternalLink(link, index){
      const label = String(link.label || "").trim();
      const url = String(link.url || "").trim();
      const rowLabel = `Link ${index + 1}`;

      if (!label || !url) return `${rowLabel} must include both a label and a URL.`;
      if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
        return `${rowLabel} URL must start with https://, http://, mailto:, or tel:.`;
      }
      if (/^https?:\/\//i.test(url)) {
        try { new URL(url); } catch { return `${rowLabel} has an invalid URL.`; }
      }
      return "";
    }

    function saveExternalLinks(){
      const next = normalizeExternalLinks(externalLinksDraft);
      for (let i = 0; i < next.length; i += 1) {
        const err = validateExternalLink(next[i], i);
        if (err) return showToast(err, { tone: "error" });
      }

      state.settings.externalLinks = next;
      saveState(state);
      externalLinksDraft = cloneExternalLinks(next);
      renderExternalLinksEditor();
      showToast(`Saved ${next.length} external link${next.length === 1 ? "" : "s"}.`, { tone: "success" });
    }

    externalLinksAddBtn?.addEventListener("click", () => {
      externalLinksDraft.push(emptyExternalLink());
      renderExternalLinksEditor();
    });

    externalLinksSaveBtn?.addEventListener("click", saveExternalLinks);

    renderExternalLinksEditor();
  

