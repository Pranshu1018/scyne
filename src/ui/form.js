/* Contact form. Set data-endpoint on the form (Formspree, Web3Forms, a serverless
   function) to POST JSON. Without one, it opens the visitor's email app, pre-filled. */

const EMAIL = "hello@scyne.studio";

export function initForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const status = form.querySelector(".form__status");
  const say = (msg, kind = "") => { status.textContent = msg; status.className = `form__status ${kind}`; };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
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
    const data = { name: fd.get("name"), email: fd.get("email"), need: fd.getAll("need"), message: fd.get("message") };

    if (form.dataset.endpoint) {
      say("Sending…");
      try {
        const res = await fetch(form.dataset.endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        say(`Thanks, ${String(data.name).split(" ")[0]}. We'll reply by email.`);
      } catch {
        say(`That didn't send. Please email ${EMAIL} instead.`, "is-err");
      }
      return;
    }

    const body = [`Name: ${data.name}`, `Email: ${data.email}`, data.need.length ? `Looking for: ${data.need.join(", ")}` : "", "", data.message || ""].join("\n").trim();
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`New project: ${data.name}`)}&body=${encodeURIComponent(body)}`;
    say(`Your email app should open with this message. If it doesn't, write to ${EMAIL}.`);
  });
}
