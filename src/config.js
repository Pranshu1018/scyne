/* How people reach Scyne. Change them here; index.html has the same links written out for
   visitors without JavaScript (search for wa.me and hello@). */
export const EMAIL = "hello@scyne.studio";
export const WHATSAPP = "919372650767"; // +91 93726 50767, digits only for wa.me links
export const WHATSAPP_HELLO = "Hi Scyne, I'd like to talk about my business.";
export const waLink = (text = WHATSAPP_HELLO) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

/* The contact form posts here: FormSubmit emails each enquiry to the address in the URL. The
   very first message sends a one-time "activate this form" email to that inbox; click it once
   and every enquiry after that arrives as a normal email. */
export const FORM_ENDPOINT = `https://formsubmit.co/ajax/${EMAIL}`;
