   # DJ Papzin portfolio

   Welcome to my portfolio! This repository contains the source code for my personal website showcasing my AI engineering projects, experience and music.

   ## Contact form deployment

   The contact form uses Netlify Forms. Before deploying to a new Netlify project, enable **Forms → Enable form detection**, then deploy the site so Netlify registers the `contact` form. Configure **Form submission notifications → Email notification** for the intended inbox; form storage alone does not enable email delivery.

   For `djpapzin-portfolio`, form detection and email notifications to `l.fanampe@gmail.com` were enabled on 7 October 2026. A labelled preview submission was stored and its notification arrived in that inbox. The old Formspree endpoint returned “Form not found” and is no longer used. After deploying, submit a labelled test and verify both the confirmation page and inbox delivery.

   ## Profile content

   The public biography, experience, skills and selected projects are maintained in `content/profile.json`. The website and both chatbot modes use this record. See `docs/profile-maintenance.md` for the update workflow.

   ## Technologies Used

   - Python, TensorFlow, Keras, OpenCV
   - Natural Language Processing (NLP)
   - Computer Vision
   - Machine Learning & Deep Learning
   - Django, Flask, Streamlit
   - OpenAI API, LangChain
   - Node.js, SQLite, Three.js
   - HTML5, CSS3, JavaScript, Bootstrap 5

   ## Setup

   To run this portfolio locally:

   1. Clone this repository
   2. Run `node scripts/sync-profile.js` to generate the profile sections.
   3. Open `index.html` in your browser, or serve the directory locally.

   ## Contact

   Feel free to reach out to me for collaborations or opportunities:

   - Email: L.fanampe@gmail.com
   - LinkedIn: [djpapzin](https://linkedin.com/in/djpapzin)
   - Twitter: [@djpapzin](https://twitter.com/djpapzin)
   - GitHub: [djpapzin](https://github.com/djpapzin)

   ## License

   This project is open source and available under the [MIT License](LICENSE).

## Portfolio chat

The assistant uses live AI when a configured provider responds, with each response labelled in the chat. Both endpoints use the approved shared profile and retain conversation history. If all providers are unavailable, the visibly labelled prepared portfolio guide remains available.

For Groq, set `GROQ_API_KEY` in the Netlify project environment, then redeploy. No additional Groq switch is needed. This tries `openai/gpt-oss-20b`, then `openai/gpt-oss-120b`. The owner confirmed the account is on the Free plan on 27 October 2026. Keep that account on the Free plan for free-only operation: billing is controlled by the Groq account plan, not an application flag. Groq's retired Llama models are no longer used. See [Groq billing](https://console.groq.com/docs/billing-faqs) and [model deprecations](https://console.groq.com/docs/deprecations).

`OPENROUTER_API_KEY` enables the free backup: [`openrouter/free`](https://openrouter.ai/docs/guides/routing/routers/free-router) chooses among available free models, followed by `liquid/lfm-2.5-2.6b:free` and `google/gemma-4-26b-a4b-it:free`. This avoids depending solely on two shared free-model pools. The paid `openrouter/auto` router is never used. When configured, Groq is tried first; an invalid Groq key skips directly to OpenRouter. An account-wide OpenRouter free quota skips pointless retries on another model; structured limit reasons are logged without credentials or provider messages. Each request has a bounded time budget. [Free quotas](https://openrouter.ai/docs/api_reference/limits) still apply and cannot be bypassed by switching models. Do not put keys in the HTML, repository, or browser.

OpenAI fallback is disabled by default. Keep `CHAT_ALLOW_PAID_PROVIDERS` unset for free-only operation. Setting `GROQ_API_KEY` does **not** enable OpenAI. Closing the panel preserves the current conversation until the page reloads.

Run backend checks with `node --test tests/chat.test.js`.
