# Abode

A real estate marketplace where every address is also a social profile.
Search listings the ordinary way, then read what the verified owner, the last
owner, the tenant and the neighbors actually said about the house — going back
decades. Follow an address, upvote what's useful, and put an offer in front of
the owner directly.

`PLAN.md` is the phased build plan. This repo is **Phase 0**: the full product
surface, running against mock data that stands in for the MLS.

## Run it

No build step, no framework. Open `index.html` in a browser, or:

```
npm start          # http://localhost:4173
```

## Test it

```
npm install
npm test
```

`test/data.mjs` holds the mock feed to MLS standards — unique keys, coordinates
inside the state they claim, price per square foot that matches the arithmetic,
every owner, agent, moderator and thread resolving. `test/contrast.mjs` computes
the contrast of every meaningful colour pair in both themes. `test/perf.mjs`
keeps each page inside a render budget and the whole site inside a byte budget.
`test/links.mjs` walks every internal link on every page and fails on a missing
file, an unknown address, group or person, or a page nothing links to.
`test/render.mjs` loads every page headlessly and asserts it renders without
errors. `test/a11y.mjs` audits every page for unnamed controls, unlabelled
fields, unannounced graphics, skipped heading levels and a working skip link. `test/interactions.mjs` drives the real behaviour: follow, vote,
post, reply, submit an offer, filter and sort search, save a listing, drive the
map (pin/filter sync, pin selection, card hover, layout persistence), join and
post to a neighborhood group, claim an address and use the owner powers, read and tune
alerts, trip the Fair Housing screen, report a post, and verify state survives a
page load.

## What's here

| | |
|---|---|
| `index.html` | Landing, search entry (list or map), featured listings, neighborhood groups, claim-your-address entry, and a directory of every working surface |
| `search.html` | Filters (query, price, beds, status), quick chips for open house / price cut / owner posting / active wall, six sort modes including closest to wherever the map is looking, and a list / split / map layout |
| the map | Web-Mercator, drawn from the listing coordinates — no tile provider, no API key. Homes closer than a thumb collapse into a counted cluster you can open by clicking. Drag, pinch or arrow-key to pan, wheel or +/− to zoom, then "Search this area" to filter the results to the rectangle on screen. Pins price-label and colour by status, collide-avoid their labels, cross-highlight with the result cards, and open a preview when clicked |
| `address.html` | The core page — gallery, feed, price history chart, timeline, facts, locator map, offers, who's on the page |
| sign-in | One-time-code sign-in (email or phone), a display name on your posts, and sign-out that leaves your saves and follows alone |
| price chart | Hand-drawn SVG step line over every dollar figure in the record, with a hover crosshair; the timeline underneath is its table view |
| ownership claim | Three kinds of standing — owner, resident, past owner — each with its own bar: the deed-name match for owners, proof of address for residents, manual review for past owners. Only the owner badge pins posts, answers offers or asks for review |
| streets | Follow a whole street, not just one house |
| request a page | An address this build does not hold can be queued, with the four steps it would actually take to open its page |
| `about.html`, `fair-housing.html`, `content-policy.html` | The written rules — what the law protects, what belongs on an address page and what does not, how reports and appeals work |
| `moderation.html` | The moderator queue — reported posts with the rule cited and not the reporter, three decisions, and one appeal to a different moderator |
| `groups.html` | Every neighborhood group, searchable, with what is inside each one |
| `profile.html` | A person — everything they posted and replied, the addresses they own or represent, the groups they moderate |
| `group.html` | Neighborhood group — wall, market snapshot, moderators, group map, member homes |
| screening | Every post and reply passes a Fair Housing and occupant-privacy check before it is stored — blocks with the rule quoted and a legal way to say it, warns on coded language |
| reporting | Report a post with a reason, see it in triage, and follow it in your alerts |
| saved searches | Save the whole filter set from the search page, reopen it from your saved page, and get an alert when something new or reduced matches |
| `agent.html` | Agent desk — verify a licence, mark the addresses you represent, see per-listing what is waiting on you (live offers, unanswered questions, tour requests, open threads) and answer a question without leaving the page |
| open houses | Owners and the agent of record schedule one; anyone can RSVP; it flags on search cards, fires an alert to followers and lands on the agent desk |
| `compare.html` | Up to four homes side by side on the numbers that differ, with the best cell in each row marked; the tray follows you between pages |
| recently viewed | The last eight addresses you opened, on address pages and your saved page |
| affordability | Works backwards from income, debts and cash to a price ceiling, says which assumptions did it, and can drive the search |
| estimate | A range from the nearest addresses with a page, with the working shown and a plain statement that it is not an appraisal |
| private notes | A note on any address that only you see, and that travels in your data export |
| cost to own | A real amortisation — down payment, rate and term you set once and keep — broken into principal and interest, tax, insurance, HOA and PMI when the loan is over 80% |
| tours | Request a private tour with the agent of record; it lands on their desk |
| your data | Download everything the build holds about you, or delete all of it after one confirmation |
| since your last visit | An address page says what changed while you were away; the feed marks where you left off |
| group events | A group can do things, not just talk — cleanups, clinics, block meetings, with a count of who is going |
| mute | Stop an address raising alerts without unfollowing it |
| hazard | Flood, wildfire, wind and heat where a record exists for the parcel, with its source named — and a plain "nothing on file" where none does |
| comparables | The nearest addresses with a page, compared on price per square foot, with the real distance stated rather than implied |
| photo viewer | Full-screen gallery with arrow keys, wrap-around, escape to close and focus returned |
| record export | Any address page hands you the whole record as JSON — parcel, price history, posts with replies, offers — the shape the public API would return |
| work log | Anyone with standing at an address can add work to its record — date, what was done, who, cost, permit — and it merges into the timeline in date order, marked as owner-contributed and never overwriting the county's rows |
| photos | A wall post can carry a photograph, resized in the browser before it is stored, with a plain reason when it cannot be |
| metadata | Every page carries a description and Open Graph tags; address pages emit schema.org structured data matching the record, and `npm run sitemap` rebuilds sitemap.xml from the data |
| post kinds | Every wall post is a question, an update, work done or an observation — and an unanswered question becomes the agent's queue |
| owner dashboard | Verified owners get a private panel on their own address — seven weeks of views as columns, follows, saves, live offers, message threads |
| offers | Anyone can write a non-binding offer; a verified owner can accept, counter or decline it in public; the buyer can take the counter, split the difference or withdraw, and the exchange stays on the page |
| `messages.html` | Direct threads with owners and agents, screened like every other surface, with an unread count in the nav |
| `alerts.html` | Alert centre — price cuts, status changes, posts, offers, group activity and claim decisions, with per-kind and per-channel switches, a digest choice and quiet hours stated back as a sentence |
| `feed.html` | Everything that happened — posts, price cuts, open houses, status changes and accepted offers — filterable by kind, paged, with followed addresses and groups alongside |
| `saved.html` | Saved listings and followed addresses |
| `assets/js/data.js` | Mock MLS + social records. Twenty-four addresses, two of them off market — sold years ago, no listing, page and history intact — clustered in Asheville, Detroit and Providence so map search, comparables and groups behave like they would with a real feed — each with history, posts, comments, votes and offers |
| `assets/js/app.js` | Rendering and all interactions. State persists to `localStorage` |
| `assets/css/styles.css` | Design system — warm paper canvas, emerald accent, gold for verification, and a dark theme whose colours are re-picked rather than inverted |

Listing photos are procedurally generated SVG so the repo carries no image
weight and no licensing questions.

## What is deliberately not here

Real MLS data (Phase 1) and a backend with accounts (Phase 2). Owner
verification (Phase 3) is here as a full front end — deed match, proof routes,
review states, badge powers — but approval is stubbed: no postcard is mailed and
no human reads a document.
See `PLAN.md`.

Offers in this build are non-binding expressions of interest, which is also the
right posture for the real product until a licensed brokerage is in the loop.
