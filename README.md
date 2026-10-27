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

The assistant works without an API key using prepared portfolio answers, visibly labelled as a portfolio guide. For free AI responses, create an OpenRouter account and set `OPENROUTER_API_KEY` in the Netlify project's environment variables (Functions scope), then redeploy. The assistant tries `liquid/lfm-2.5-2.6b:free`, then `google/gemma-4-26b-a4b-it:free`, within a bounded request budget. Free model availability and usage limits vary; when neither responds, the prepared portfolio guide answers instead. Both endpoints share the same biography facts. Do not put keys in the HTML, repository, or browser.

Paid provider fallback is disabled by default. Only set `CHAT_ALLOW_PAID_PROVIDERS=true` if you intentionally want to enable the configured OpenAI or Groq providers. Closing the panel preserves the current conversation until the page reloads.

Run backend checks with `node --test tests/chat.test.js`.
