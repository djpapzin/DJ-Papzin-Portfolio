# Keeping the portfolio and LinkedIn aligned

`content/profile.json` is the editable source for the professional profile. Its facts were reviewed against LinkedIn on 27 October 2026. It supplies the website title and metadata, hero, About, experience, skills, featured projects, contact details, CV links, chatbot model grounding and prepared biography answers.

## Make a profile update

1. Check the current LinkedIn profile and confirm any new role, date or claim with the owner. Edit the relevant fields in `content/profile.json` and record the review date in `reviewedOn`.
2. Update the PDF when its facts change, then update `cv.path` and `cv.updatedOn`. Run `python3 scripts/build-cv.py --output /path/to/review/CV.docx` with `python-docx` installed, render it to PDF, and visually review every page before replacing the file at `cv.path`. The builder reads role titles, organizations, dates, the contract-overlap note, Next Sapien responsibilities and the TruthGuard summary from `content/profile.json`; its other condensed CV prose remains editorial content. The PDF is a reviewed document, not automatically rewritten by the site build. Keep salary expectations and private recruiter conversations out of this public record.
3. Run `node scripts/sync-profile.js`. This refreshes the marked sections of `index.html` and the CV redirects in `_redirects`. Edit layout in the renderer or surrounding page; edits inside generated blocks are replaced on the next build.
4. Run `node scripts/sync-profile.js --check` and `node --test tests/*.test.js`.
5. Review the website preview, CV download and chatbot answers before publishing. Update LinkedIn through its own editor when the approved record changes there, too.

Every Netlify build regenerates the page from this record and runs the tests before creating the code-search index. Both chatbot endpoints load the same record through `content/profile.js`, including when no model provider is available. Repository snippets are secondary evidence and do not override the approved biography.

## What is synchronized

- The role, location, availability and biography used by the page and chatbot.
- One consolidated freelance role and one entry per contract in the shared experience list.
- The core skill groups and the ordered `featured` project IDs.
- Selected project descriptions across the homepage, Projects tab and chatbot.
- Download links for the current CV, including `/cv.pdf` and the previous CV URL.

The `projects` list controls the generated project cards as a collection: adding, removing or reordering an item changes that section on the next build. The `featured` list only selects homepage highlights; all remaining profile projects stay available to the chatbot. Remove a deleted project from `featured` too. Other project cards and the repository search catalog remain separately maintained editorial content.

The music section and detailed case study remain editorial content. LinkedIn changes are not polled or imported automatically. The review date records a human-reviewed comparison, not a live connection to LinkedIn. Nothing posts to LinkedIn from this build.

## Checks that prevent drift

`tests/profile-sync.test.js` checks generated page consistency, exact experience dates, featured order, valid dates and IDs, and real chatbot endpoint responses. It also changes profile fields, project membership and skill groups in test fixtures to confirm the website and chatbot grounding both reflect the edit. A missing CV or generated section stops the build.
