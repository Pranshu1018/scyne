/* Contact form: checks the fields, sends the enquiry to Scyne's inbox (see FORM_ENDPOINT in
   config.js), and says plainly what happened. If sending fails, it offers WhatsApp and email
   with the message already written, so no enquiry is lost. */

import { EMAIL, FORM_ENDPOINT, waLink } from "../config.js";

export function initForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const status = form.querySelector(".form__status"), button = form.querySelector('button[type="submit"]');
  const say = (html, kind = "") => { status.innerHTML = html; status.className = `form__status ${kind}`; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let sending = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending) return;
    let first = null;
    ["f-name", "f-email"].forEach((id) => {
      const input = form.querySelector(`#${id}`);
      const ok = input.checkValidity() && input.value.trim() !== "";
      input.closest(".field").classList.toggle("is-invalid", !ok);
      input.toggleAttribute("aria-invalid", !ok);
      if (!ok && !first) first = input;
    });
    if (first) { first.focus(); say("Please add your name and a valid email.", "is-err"); return; }

    const fd = new FormData(form);
    if (fd.get("_honey")) return; // a bot filled the hidden field
    const data = { name: String(fd.get("name")).trim(), email: String(fd.get("email")).trim(), phone: String(fd.get("phone") || "").trim(), need: fd.getAll("need"), message: String(fd.get("message") || "").trim() };
    const summary = [`Name: ${data.name}`, `Email: ${data.email}`, data.phone && `Phone: ${data.phone}`, data.need.length && `Looking for: ${data.need.join(", ")}`, data.message && `\n${data.message}`].filter(Boolean).join("\n");
    const first_ = esc(data.name.split(" ")[0]);

    sending = true; button.disabled = true; button.textContent = "Sending…"; say("");
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: data.name, email: data.email, phone: data.phone || "—", looking_for: data.need.join(", ") || "—", message: data.message || "—",
          _subject: `New enquiry from ${data.name}${data.need.length ? ` · ${data.need.join(", ")}` : ""}`,
          _replyto: data.email, _template: "table", _captcha: "false",
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.success === false || out.success === "false") throw new Error(out.message || String(res.status));
      form.reset();
      form.classList.add("is-sent");
      say(`<b>Thanks, ${first_}. It's with us.</b> We reply to every message ourselves, usually the same day. In a hurry? <a href="${waLink(`Hi Scyne, I'm ${data.name}. I just sent you a message on the website.`)}" target="_blank" rel="noopener">Chat on WhatsApp</a>.`, "is-ok");
    } catch {
      // nothing is lost: the same message, ready to send another way
      say(`That didn't go through. Send it on <a href="${waLink(`Hi Scyne,\n${summary}`)}" target="_blank" rel="noopener">WhatsApp</a> or by <a href="mailto:${EMAIL}?subject=${encodeURIComponent(`New enquiry from ${data.name}`)}&body=${encodeURIComponent(summary)}">email</a> instead, it's already written.`, "is-err");
    } finally {
      sending = false; button.disabled = false; button.textContent = "Send";
    }
  });
}
