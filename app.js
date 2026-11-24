const $ = (id) => document.getElementById(id);

function parseAddress(raw) {
  let s = raw.replace(/\r/g, "\n");
  const out = { name: "", addr: "", pin: "", phone: "", warn: [] };

  // Phone: pehle international (+CC ya 00CC), phir Indian
  const intlRe =
    /(?<!\d)(?:\+|00)\s*(?!91[\s\-.(]*\d{5})\d{1,3}[\s\-.()]*\d(?:[\s\-.()]*\d){6,12}(?!\d)/;
  const indRe = /(?<!\d)(?:\+?\s*91[\s-]*|0)?([6-9]\d{4}[\s-]?\d{5})(?!\d)/;
  const im = s.match(intlRe);
  const pm = im ? null : s.match(indRe);
  if (im) {
    out.phone = im[0]
      .replace(/^00/, "+")
      .replace(/[\s\-.()]+/g, " ")
      .replace(/^\+\s+/, "+")
      .trim();
    s = s.replace(im[0], " ");
  } else if (pm) {
    const d = pm[1].replace(/\D/g, "");
    out.phone = "+91 " + d.slice(0, 5) + " " + d.slice(5);
    s = s.replace(pm[0], " ");
  } else {
    out.warn.push("Phone nahi mila");
  }

  // Pincode: pehle Indian (6 digit), na mile to videshi postal code
  const pinRe = /(?<!\d)[1-9]\d{2}\s?\d{3}(?!\d)/;
  const pn = s.match(pinRe);
  if (pn) {
    out.pin = pn[0].replace(/\s/g, "");
    const d = out.pin;
    s = s.replace(
      new RegExp(
        "(?<!\\d)" + d.slice(0, 3) + "\\s?" + d.slice(3) + "(?!\\d)",
        "g",
      ),
      " ",
    );
    s = s.replace(/\(\s*\)/g, " ");
  } else {
    // UK, Canada, phir US ZIP (5 digit)
    let alt = s.match(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i);
    if (!alt) alt = s.match(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i);
    if (!alt) {
      const zips = s.match(/(?<!\d)\d{5}(?:-\d{4})?(?!\d)/g);
      if (zips) alt = [zips[zips.length - 1]];
    }
    if (alt) {
      out.pin = alt[0].toUpperCase().replace(/\s+/g, " ");
      const i = s.lastIndexOf(alt[0]);
      s = s.slice(0, i) + " " + s.slice(i + alt[0].length);
    } else {
      out.warn.push("Pincode nahi mila");
    }
  }

  s = s
    .replace(/\b(ph|phone|mobile|mob|tel|contact)\b\s*[:.\-]?/gi, " ")
    .replace(/\bindia\b/gi, " ");

  const parts = s
    .split(/[\n,]+/)
    .map((p) => p.replace(/\s+/g, " ").replace(/^[\s\-:;.]+|[\s\-:;.]+$/g, ""))
    .filter(Boolean);

  if (parts.length) {
    out.name = parts[0];
    out.addr = parts.slice(1).join(", ");
  }
  if (parts.length < 2) out.warn.push("Naam ke baad address nahi mila");

  return out;
}

function render() {
  const p = parseAddress($("toRaw").value);
  const hasInput = $("toRaw").value.trim() !== "";

  $("pToName").textContent = p.name;
  $("pToAddr").textContent = p.addr;
  $("pToPin").textContent = p.pin ? "PIN " + p.pin : "";
  $("pToPhone").textContent = p.phone ? "Ph: " + p.phone : "";
  $("status").textContent = hasInput ? p.warn.join(" | ") : "";

  const ord = $("orderNo").value.trim();
  $("pOrderTag").textContent = ord ? "ORDER" : "";
  $("pOrder").textContent = ord ? "#" + ord : "";

  const cod = $("cod").value;
  $("pPay").textContent = cod ? cod : "PREPAID";

  const w = $("weight").value;
  $("pWeight").style.display = w ? "block" : "none";
  $("pWeight").textContent = w ? w + " kg" : "";

  const item = $("item").value.trim();
  $("pItem").style.display = item ? "block" : "none";
  $("pItem").textContent = item ? item : "";

  $("pNote").style.display = $("fragile").checked ? "block" : "none";

  // FROM: line 1 = naam, baaki = address/phone
  const fLines = $("fromRaw")
    .value.split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  $("pFrom").style.display = fLines.length ? "block" : "none";
  $("pFromName").textContent = fLines[0] || "";
  $("pFromAddr").textContent = fLines.slice(1).join("\n");
}

function clearAll() {
  // FROM ko clear nahi karta
  ["toRaw", "orderNo", "cod", "weight", "item"].forEach(
    (id) => ($(id).value = ""),
  );
  $("fragile").checked = false;
  render();
}

async function loadFrom() {
  try {
    const d = await chrome.storage.local.get("fromRaw");
    $("fromRaw").value = d.fromRaw || "";
  } catch (e) {
    console.error("storage load fail", e);
  }
  render();
}

function saveFrom() {
  try {
    chrome.storage.local.set({ fromRaw: $("fromRaw").value });
  } catch (e) {
    console.error("storage save fail", e);
  }
}

document.querySelectorAll("input, textarea").forEach((el) => {
  el.addEventListener("input", render);
  el.addEventListener("change", render);
});
$("fromRaw").addEventListener("input", saveFrom);
$("printBtn").addEventListener("click", () => window.print());
$("clearBtn").addEventListener("click", clearAll);

loadFrom();
