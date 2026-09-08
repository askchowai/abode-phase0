/* Abode — mock data layer.
   Stands in for the MLS + social backend described in PLAN.md phases 1-2.
   Every record here maps 1:1 to a table we'd create in Postgres. */

window.ABODE = (function () {
  const users = {
    u1:  { id: 'u1',  name: 'Marisol Reyes',   role: 'owner',    verified: true  },
    u2:  { id: 'u2',  name: 'Dev Patel',       role: 'neighbor', verified: false },
    u3:  { id: 'u3',  name: 'Karen Whitlock',  role: 'agent',    verified: true  },
    u4:  { id: 'u4',  name: 'Tomas Nilsen',    role: 'past',     verified: true  },
    u5:  { id: 'u5',  name: 'Aisha Brandt',    role: 'resident', verified: true  },
    u6:  { id: 'u6',  name: 'Greg Lomax',      role: 'neighbor', verified: false },
    u7:  { id: 'u7',  name: 'Priya Raghavan',  role: 'owner',    verified: true  },
    u8:  { id: 'u8',  name: 'Bea Okonkwo',     role: 'resident', verified: true  },
    u9:  { id: 'u9',  name: 'Hollis Trent',    role: 'neighbor', verified: false },
    u10: { id: 'u10', name: 'Sam Yarrow',      role: 'agent',    verified: true  },
    me:  { id: 'me',  name: 'You',             role: 'neighbor', verified: false },
  };

  const roleLabel = {
    owner: 'Verified owner', resident: 'Resident', agent: 'Agent of record',
    past: 'Past owner', neighbor: 'Neighbor',
  };

  // p() post, c() comment — keeps the listing records below readable.
  const p = (id, by, ago, text, up, down, pinned, replies) =>
    ({ id, by, ago, text, up, down, pinned: !!pinned, replies: replies || [] });
  const c = (id, by, ago, text, up, down) => ({ id, by, ago, text, up, down });

  const listings = [
    {
      id: 'a1',
      street: '418 Juniper Hollow Rd', city: 'Asheville', state: 'NC', zip: '28804',
      lat: 35.632, lng: -82.561,
      price: 879000, prior: 915000, beds: 4, baths: 3, sqft: 3120, lot: 0.62,
      year: 1978, type: 'Single family', status: 'active', dom: 21, hue: 152,
      hoa: 0, taxes: 4180, ppsf: 282,
      blurb: 'Cedar-and-glass contemporary on a wooded parcel above the Reems Creek valley. Rebuilt kitchen, standing-seam roof, and a screened porch that runs the length of the south elevation.',
      openHouse: { day: 'Saturday', when: '1–4pm', date: 'Sep 12', host: 'u3', rsvps: 34 },
      features: ['Screened porch', 'Wood stove', 'Detached studio', 'Creek frontage', 'Standing-seam roof', 'EV outlet'],
      risk: { flood: ['Zone X', 'Creek at the lower corner has come up in 2004 and 2013; the pad sits about eleven feet above it.'], fire: ['Moderate', 'Wildland-urban interface. County requires 30 ft of defensible space.'], wind: ['Low', 'Inland, ridge-sheltered.'] },
      agent: 'u3', owner: 'u1',
      followers: 214, saves: 88,
      history: [
        { date: 'Aug 2026', what: 'Price cut to $879,000', meta: '-$36,000 (3.9%) · 21 days on market' },
        { date: 'Jul 2026', what: 'Listed for sale at $915,000', meta: 'Whitlock & Co. · MLS 4198220' },
        { date: 'Mar 2024', what: 'Kitchen and primary bath renovated', meta: 'Posted by verified owner · permit #B24-1187' },
        { date: 'Nov 2019', what: 'Sold for $604,000', meta: 'Deed recorded Buncombe County' },
        { date: 'Jun 2016', what: 'Roof replaced', meta: 'Standing seam, 50-yr warranty' },
        { date: 'Apr 1978', what: 'Built', meta: 'Original owner: Nilsen family' },
      ],
      posts: [
        p('a1p1', 'u1', '3 days ago', 'Owner here. Putting the full renovation binder on the listing — every permit, invoice and warranty since 2019. Ask me anything about the house; I would rather you know than guess.', 41, 1, true, [
          c('a1p1c1', 'u2', '3 days ago', 'This is how every listing should work. Did the 2016 roof cover the studio too?', 12, 0),
          c('a1p1c2', 'u1', '2 days ago', 'Yes — same crew, same material, both structures.', 9, 0),
        ]),
        p('a1p2', 'u4', '1 week ago', 'Grew up in this house. The creek floods the lower corner of the lot maybe once every six or seven years, never near the foundation — the pad sits about eleven feet above it. Happy to answer anything.', 63, 2, false, [
          c('a1p2c1', 'u6', '6 days ago', 'Extremely useful, thank you. Flood map shows Zone X here which matched what you said.', 18, 0),
        ]),
        p('a1p3', 'u2', '2 weeks ago', 'Walked past on the greenway. Cedar on the north face is weathering unevenly — worth a look at the open house, though it reads cosmetic.', 27, 4, false, []),
        p('a1p4', 'u3', '2 weeks ago', 'Listing agent. Open house Saturday 1-4. Bring questions about the septic-to-sewer conversion, we have the county letter on file.', 15, 0, false, []),
      ],
      offers: [
        { id: 'a1o1', amt: 862000, by: 'Buyer represented by Coldwell', when: '2 days ago', status: 'live', note: 'Conventional, 20% down, proof of funds attached' },
        { id: 'a1o2', amt: 840000, by: 'Cash buyer, no contingency', when: '5 days ago', status: 'out', note: 'Withdrawn by buyer' },
      ],
    },
    {
      id: 'a2',
      street: '77 Pemberton Row', city: 'Savannah', state: 'GA', zip: '31401',
      lat: 32.073, lng: -81.09,
      price: 1240000, prior: null, beds: 3, baths: 2.5, sqft: 2410,
      lot: 0.08, year: 1889, type: 'Historic rowhouse', status: 'active', dom: 6, hue: 28,
      hoa: 0, taxes: 7920, ppsf: 514,
      blurb: 'Italianate rowhouse a half block off Troup Square. Heart-pine floors, twelve-foot ceilings, and a walled garden with the original brick cistern.',
      features: ['Heart pine floors', 'Walled garden', 'Original cistern', 'Gas lanterns', 'Historic district', 'Off-street parking'],
      risk: { flood: ['Zone AE', 'Half a block off the square; the 2019 elevation certificate is on file and the first floor sits above base flood.'], wind: ['High', 'Coastal Georgia. Opening protection required on any new glazing.'], heat: ['High', 'Ninety days over 90°F in an average year.'] },
      agent: 'u10', owner: 'u7',
      followers: 501, saves: 173,
      history: [
        { date: 'Sep 2026', what: 'Listed for sale at $1,240,000', meta: 'Yarrow Group · MLS 302118' },
        { date: 'Feb 2023', what: 'Historic review board approved rear addition', meta: 'Case HRB-23-044' },
        { date: 'May 2021', what: 'Sold for $845,000', meta: 'Chatham County' },
        { date: '1889', what: 'Built', meta: 'Architect attributed to Alfred Eichberg' },
      ],
      posts: [
        p('a2p1', 'u7', '5 days ago', 'Verified owner. The 2023 rear addition went through full HRB review — drawings and approvals are attached to the listing. The cistern is dry and structurally sound; we had it surveyed.', 88, 0, true, [
          c('a2p1c1', 'u9', '4 days ago', 'Is the ironwork original or a reproduction?', 6, 0),
          c('a2p1c2', 'u7', '4 days ago', 'Original on the stoop, reproduction on the garden gate after 2019.', 14, 0),
        ]),
        p('a2p2', 'u8', '4 days ago', 'Neighbor two doors down. Street parking is genuinely fine outside St. Patrick week, and the square is quiet after nine.', 34, 1, false, []),
        p('a2p9', 'u9', '2 days ago', 'Does the walled garden drain to the lane or into the neighbour\u2019s cistern? The 2023 survey is ambiguous and the agent has not answered on the listing.', 22, 0, false, []),
        p('a2p3', 'u9', '3 days ago', 'Price feels ambitious for the block until you see the garden. It is the best private outdoor space in the district.', 21, 7, false, []),
      ],
      offers: [
        { id: 'a2o1', amt: 1195000, by: 'Buyer represented by Yarrow', when: '1 day ago', status: 'live', note: 'Contingent on inspection' },
      ],
    },
    {
      id: 'a3',
      street: '2210 Larkspur Ave', city: 'Boise', state: 'ID', zip: '83702',
      lat: 43.635, lng: -116.205,
      price: 649000, prior: 675000, beds: 3, baths: 2, sqft: 1740,
      lot: 0.19, year: 1948, type: 'Bungalow', status: 'active', dom: 34, hue: 200,
      hoa: 0, taxes: 3010, ppsf: 373,
      blurb: 'North End bungalow with an unusually deep south-facing lot. Original built-ins, updated systems, and a garage converted to a heated workshop.',
      openHouse: { day: 'Sunday', when: '11am–1pm', date: 'Sep 13', host: 'u3', rsvps: 12 },
      features: ['Original built-ins', 'Heated workshop', 'New furnace 2024', 'Mature garden', 'Alley access'],
      agent: 'u3', owner: 'u5',
      followers: 96, saves: 41,
      history: [
        { date: 'Aug 2026', what: 'Price cut to $649,000', meta: '-$26,000 (3.9%)' },
        { date: 'Aug 2026', what: 'Listed for sale at $675,000', meta: 'MLS 98901221' },
        { date: 'Jan 2024', what: 'Furnace and ductwork replaced', meta: 'Posted by resident' },
        { date: 'Jul 2015', what: 'Sold for $289,000', meta: 'Ada County' },
      ],
      posts: [
        p('a3p1', 'u5', '1 week ago', 'I rent the back unit and have for four years. The workshop stays warm through January on the new furnace. Landlord is selling, not evicting — lease transfers.', 52, 0, false, [
          c('a3p1c1', 'u6', '6 days ago', 'Rare to see a tenant post. Appreciated.', 19, 0),
        ]),
        p('a3p2', 'u2', '5 days ago', 'Thirty-four days on market in the North End is a signal. Second price cut likely before October.', 14, 9, false, []),
      ],
      offers: [],
    },
    {
      id: 'a4',
      street: '9 Fennimore Ct', city: 'Providence', state: 'RI', zip: '02906',
      lat: 41.838, lng: -71.39,
      price: 1495000, prior: null, beds: 5, baths: 4, sqft: 4380,
      lot: 0.31, year: 1904, type: 'Colonial revival', status: 'pending', dom: 12, hue: 12,
      hoa: 0, taxes: 12400, ppsf: 341,
      blurb: 'College Hill colonial revival with a carriage house. Nine-over-nine sash, four working fireplaces, and a third floor finished as a library.',
      features: ['Carriage house', 'Four fireplaces', 'Finished third floor', 'Slate roof', 'Wine cellar'],
      agent: 'u10', owner: 'u7',
      followers: 342, saves: 129,
      history: [
        { date: 'Sep 2026', what: 'Sale pending', meta: 'Accepted 8 days after listing' },
        { date: 'Aug 2026', what: 'Listed for sale at $1,495,000', meta: 'MLS RI7712' },
        { date: 'Oct 2013', what: 'Sold for $910,000', meta: 'Providence County' },
        { date: '1904', what: 'Built', meta: 'Stone & Carpenter' },
      ],
      posts: [
        p('a4p1', 'u10', '4 days ago', 'Agent of record. Under agreement as of Tuesday. Keeping the page open for backup offers and for the neighborhood history thread — that stays regardless of who buys.', 29, 0, true, []),
        p('a4p2', 'u8', '3 days ago', 'The carriage house was a working pottery studio through the nineties. There are still kiln vents in the north wall.', 47, 0, false, []),
      ],
      offers: [
        { id: 'a4o1', amt: 1510000, by: 'Accepted offer', when: '8 days ago', status: 'accepted', note: 'Escalation clause, waived appraisal gap to $40k' },
      ],
    },
    {
      id: 'a5',
      street: '5501 Dune Terrace', city: 'Pensacola', state: 'FL', zip: '32507',
      lat: 30.33, lng: -87.34,
      price: 1875000, prior: 1990000, beds: 4, baths: 4.5, sqft: 3640,
      lot: 0.24, year: 2019, type: 'Coastal contemporary', status: 'active', dom: 58, hue: 190,
      hoa: 2400, taxes: 15200, ppsf: 515,
      blurb: 'Elevated gulf-front build on helical piers, impact glass throughout, and a rooftop deck with a 180-degree water view.',
      features: ['Gulf front', 'Impact glass', 'Elevated construction', 'Rooftop deck', 'Elevator', 'Generator'],
      risk: { flood: ['Zone VE', 'Coastal high hazard. Built 2019 on helical piers, elevated 16 ft — the reason it came through Sally intact.'], wind: ['Very high', 'Design wind speed 150 mph. Impact glazing throughout.'], heat: ['High', 'Gulf coast humidity; the HVAC runs eight months.'] },
      agent: 'u3', owner: 'u1',
      followers: 720, saves: 260,
      history: [
        { date: 'Aug 2026', what: 'Price cut to $1,875,000', meta: '-$115,000 (5.8%)' },
        { date: 'Jul 2026', what: 'Listed for sale at $1,990,000', meta: 'MLS 649901' },
        { date: 'Sep 2020', what: 'Hurricane Sally — no structural damage reported', meta: 'Owner-posted, with adjuster letter' },
        { date: 'Mar 2019', what: 'Built', meta: 'Elevated 16 ft, helical pier foundation' },
      ],
      posts: [
        p('a5p1', 'u1', '2 weeks ago', 'Owner. Sally in 2020 and Ida runoff in 2021 both hit this stretch. Zero structural claims, one deck railing. Adjuster letters are on the listing. Insurance runs about $14k a year — I would rather you see that number now than at closing.', 156, 3, true, [
          c('a5p1c1', 'u2', '2 weeks ago', 'Posting your own insurance premium is the most useful thing I have read on this site.', 61, 0),
          c('a5p1c2', 'u9', '1 week ago', 'Does the generator carry the elevator?', 8, 0),
          c('a5p1c3', 'u1', '1 week ago', 'Yes, whole-house 48kW. Elevator, HVAC, everything.', 11, 0),
        ]),
        p('a5p2', 'u6', '1 week ago', 'Fifty-eight days at this price point on the gulf is normal, not a red flag. The 2019 builds are the ones holding value here.', 33, 5, false, []),
      ],
      offers: [
        { id: 'a5o1', amt: 1780000, by: 'Cash, 14-day close', when: '4 days ago', status: 'live', note: 'As-is, proof of funds verified' },
      ],
    },
    {
      id: 'a6',
      street: '1414 Chandler St', city: 'Detroit', state: 'MI', zip: '48202',
      lat: 42.372, lng: -83.081,
      price: 385000, prior: null, beds: 4, baths: 2, sqft: 2980,
      lot: 0.14, year: 1917, type: 'Foursquare', status: 'active', dom: 9, hue: 340,
      hoa: 0, taxes: 2260, ppsf: 129,
      blurb: 'Boston-Edison foursquare mid-restoration. Plaster and millwork intact, mechanicals new, kitchen unfinished and priced accordingly.',
      features: ['Original millwork', 'New electrical', 'New plumbing', 'Historic district', 'Unfinished kitchen'],
      risk: { flood: ['Zone X', 'No mapped flood risk. The 1917 storm sewer on this block backs up in extreme rain.'], heat: ['Moderate', 'Third floor is unconditioned and reaches the nineties in August.'] },
      agent: 'u10', owner: 'u5',
      followers: 188, saves: 77,
      history: [
        { date: 'Sep 2026', what: 'Listed for sale at $385,000', meta: 'MLS 20260918' },
        { date: '2023-2026', what: 'Full mechanical restoration', meta: 'Documented in 31 owner posts' },
        { date: 'Apr 2022', what: 'Sold for $138,000', meta: 'Wayne County' },
        { date: '1917', what: 'Built', meta: 'Boston-Edison historic district' },
      ],
      posts: [
        p('a6p1', 'u5', '6 days ago', 'Three years of restoration posts are all still on this page — down to the studs and back. Selling because of a job move, not because of the house. The kitchen is the only room left.', 94, 1, true, [
          c('a6p1c1', 'u8', '5 days ago', 'Followed this page since 2023. The plaster work alone was worth watching.', 38, 0),
        ]),
        p('a6p9', 'u2', '4 days ago', 'Is the third-floor apartment legal as a separate unit, or was it converted without a permit?', 31, 0, false, []),
        p('a6p2', 'u9', '4 days ago', 'For anyone new to the district: the tax abatement transfers. Worth about $1,900 a year for the remaining term.', 42, 0, false, []),
      ],
      offers: [
        { id: 'a6o1', amt: 379000, by: 'FHA 203k renovation loan', when: '2 days ago', status: 'live', note: 'Kitchen budget rolled into financing' },
      ],
    },
    {
      id: 'a7',
      street: '30 Alder Loop', city: 'Bend', state: 'OR', zip: '97703',
      lat: 44.068, lng: -121.315,
      price: 925000, prior: null, beds: 3, baths: 2.5, sqft: 2050,
      lot: 0.21, year: 2015, type: 'Modern farmhouse', status: 'active', dom: 3, hue: 96,
      hoa: 780, taxes: 6400, ppsf: 451,
      blurb: 'Northwest Crossing build backing to a trail easement. Vaulted great room, xeriscaped yard, and a garage wired for a shop.',
      features: ['Trail access', 'Xeriscape', 'Vaulted ceilings', 'Shop-wired garage', 'A/C'],
      agent: 'u3', owner: 'u7',
      followers: 74, saves: 33,
      history: [
        { date: 'Sep 2026', what: 'Listed for sale at $925,000', meta: 'MLS 220198441' },
        { date: 'Jun 2015', what: 'Built', meta: 'Northwest Crossing phase 4' },
      ],
      posts: [
        p('a7p1', 'u2', '2 days ago', 'The trail easement behind these is public. Great for access, means people walk past your kitchen window at seven a.m. Fine either way, just know it.', 51, 3, false, []),
      ],
      offers: [],
    },
    {
      id: 'a8',
      street: '860 Mesquite Bend', city: 'Marfa', state: 'TX', zip: '79843',
      lat: 30.309, lng: -104.021,
      price: 540000, prior: 585000, beds: 2, baths: 1, sqft: 1180,
      lot: 1.4, year: 1952, type: 'Adobe', status: 'active', dom: 71, hue: 40,
      hoa: 0, taxes: 3900, ppsf: 458,
      blurb: 'Restored adobe on an acre and a half at the edge of town. Lime-plastered walls, steel casements, and an unobstructed view south to the Chinatis.',
      features: ['Adobe construction', 'Lime plaster', 'Steel casements', 'Well', 'Dark-sky lighting'],
      agent: 'u10', owner: 'u1',
      followers: 133, saves: 58,
      history: [
        { date: 'Jul 2026', what: 'Price cut to $540,000', meta: '-$45,000 (7.7%)' },
        { date: 'Jun 2026', what: 'Listed for sale at $585,000', meta: 'MLS MRF2211' },
        { date: 'Mar 2018', what: 'Adobe re-plastered', meta: 'Traditional lime, no cement stucco' },
        { date: '1952', what: 'Built', meta: 'Original adobe block, locally made' },
      ],
      posts: [
        p('a8p1', 'u1', '3 weeks ago', 'Owner. Adobe needs re-plastering roughly every eight years if you use lime, which we do. Cement stucco traps moisture and destroys the block — if you buy this, do not let anyone talk you into it.', 71, 0, true, []),
        p('a8p2', 'u6', '2 weeks ago', 'Well produces about 9 gpm per the 2018 test. That is solid for this side of town.', 22, 0, false, []),
      ],
      offers: [],
    },
    {
      id: 'a9',
      street: '17 Harbor Slope', city: 'Camden', state: 'ME', zip: '04843',
      lat: 44.21, lng: -69.065,
      price: 2150000, prior: null, beds: 5, baths: 4, sqft: 4020,
      lot: 1.1, year: 1926, type: 'Shingle style', status: 'active', dom: 15, hue: 210,
      hoa: 0, taxes: 18600, ppsf: 535,
      blurb: 'Shingle-style house above the outer harbor with deeded mooring rights and a working boathouse at the foot of the property.',
      features: ['Deeded mooring', 'Boathouse', 'Harbor views', 'Original shingles', 'Guest wing'],
      agent: 'u3', owner: 'u4',
      followers: 466, saves: 191,
      history: [
        { date: 'Sep 2026', what: 'Listed for sale at $2,150,000', meta: 'MLS 1598220' },
        { date: 'Oct 2011', what: 'Sold for $1,320,000', meta: 'Knox County' },
        { date: '1926', what: 'Built', meta: 'Attributed to Parsons & Wait' },
      ],
      posts: [
        p('a9p1', 'u4', '1 week ago', 'Owner since 2011. The mooring is deeded, not a town waitlist slot — that distinction is worth a lot here and gets confused constantly.', 82, 0, true, [
          c('a9p1c1', 'u9', '6 days ago', 'Can confirm. Town list is nine years long right now.', 27, 0),
        ]),
      ],
      offers: [],
    },
    {
      id: 'a10',
      street: '244 Cottonwood Pass', city: 'Salida', state: 'CO', zip: '81201',
      lat: 38.535, lng: -105.999,
      price: 715000, prior: null, beds: 3, baths: 2, sqft: 1620,
      lot: 0.33, year: 1996, type: 'Mountain contemporary', status: 'sold', dom: 0, hue: 260,
      hoa: 0, taxes: 3300, ppsf: 441,
      blurb: 'Sold in June. Page kept live for the address history — south-facing passive solar with a detached two-car and Arkansas river access two blocks down.',
      features: ['Passive solar', 'River access', 'Detached garage', 'Wood stove'],
      risk: { fire: ['High', 'Chaffee County wildfire hazard. Metal roof and cleared perimeter help; insurers still ask.'], flood: ['Zone X', 'Above the Arkansas River floodplain.'] },
      agent: 'u10', owner: 'u5',
      followers: 61, saves: 12,
      history: [
        { date: 'Jun 2026', what: 'Sold for $715,000', meta: 'Chaffee County · 4 days on market' },
        { date: 'Jun 2026', what: 'Listed for sale at $699,000', meta: 'MLS 8801' },
        { date: 'Feb 2020', what: 'Wood stove replaced, EPA certified', meta: 'Owner post' },
        { date: '1996', what: 'Built', meta: 'Owner-builder' },
      ],
      posts: [
        p('a10p1', 'u5', '3 months ago', 'Sold above ask in four days. Leaving the renovation photos up — whoever owns this in 2050 should be able to see what is behind the drywall.', 118, 0, true, [
          c('a10p1c1', 'u2', '3 months ago', 'This is the whole point of the site.', 44, 0),
        ]),
      ],
      offers: [],
    },
    {
      id: 'a11',
      street: '68 Windermere Ct', city: 'Ann Arbor', state: 'MI', zip: '48104',
      lat: 42.26, lng: -83.735,
      price: 1050000, prior: null, beds: 4, baths: 3.5, sqft: 3240,
      lot: 0.27, year: 1968, type: 'Mid-century modern', status: 'active', dom: 11, hue: 170,
      hoa: 0, taxes: 14200, ppsf: 324,
      blurb: 'Post-and-beam by a Cranbrook-trained architect. Clerestory glazing on three elevations, terrazzo entry, and an original kitchen that has been sensitively updated twice.',
      openHouse: { day: 'Saturday', when: '12–2pm', date: 'Sep 12', host: 'u10', rsvps: 21 },
      features: ['Post and beam', 'Clerestory windows', 'Terrazzo floors', 'Architect designed', 'Walk to Burns Park'],
      agent: 'u3', owner: 'u7',
      followers: 287, saves: 104,
      history: [
        { date: 'Sep 2026', what: 'Listed for sale at $1,050,000', meta: 'MLS 3298811' },
        { date: 'Sep 2017', what: 'Roof membrane replaced', meta: 'Flat sections only' },
        { date: 'Aug 2009', what: 'Sold for $492,000', meta: 'Washtenaw County' },
        { date: '1968', what: 'Built', meta: 'Architect: R. Fennell, Cranbrook' },
      ],
      posts: [
        p('a11p1', 'u8', '5 days ago', 'The clerestory glazing is single-pane original. Beautiful, and it is why the heating bill is what it is. Replacing it correctly is a five-figure job — factor it in.', 64, 2, false, [
          c('a11p1c1', 'u7', '4 days ago', 'Fair and accurate. We priced with that in mind.', 31, 0),
        ]),
      ],
      offers: [
        { id: 'a11o1', amt: 1020000, by: 'Buyer represented by Whitlock', when: '1 day ago', status: 'live', note: 'Inspection contingency, 30-day close' },
      ],
    },
    {
      id: 'a12',
      street: '3 Quarry Lane', city: 'Barre', state: 'VT', zip: '05641',
      lat: 44.197, lng: -72.502,
      price: 329000, prior: 349000, beds: 3, baths: 1.5, sqft: 1490,
      lot: 0.44, year: 1936, type: 'Cape', status: 'active', dom: 42, hue: 120,
      hoa: 0, taxes: 4700, ppsf: 221,
      blurb: 'Granite-foundation cape built by a quarry foreman. Slate walk, a barn in fair condition, and mature sugar maples along the north line.',
      features: ['Granite foundation', 'Barn', 'Sugar maples', 'Slate walk', 'Wood heat'],
      risk: { flood: ['Zone X', 'Granite ledge, drains fast.'], heat: ['Low', 'Fewer than five days over 90°F.'] },
      agent: 'u10', owner: 'u4',
      followers: 55, saves: 19,
      history: [
        { date: 'Aug 2026', what: 'Price cut to $329,000', meta: '-$20,000 (5.7%)' },
        { date: 'Jul 2026', what: 'Listed for sale at $349,000', meta: 'MLS 5011882' },
        { date: '1936', what: 'Built', meta: 'Quarry-cut granite foundation' },
      ],
      posts: [
        p('a12p1', 'u9', '3 weeks ago', 'The barn needs a sill on the east side. Not falling down, but budget eight to twelve thousand if you want it to stay standing another fifty years.', 29, 1, false, []),
      ],
      offers: [],
    },
    {
      id: 'a13',
      street: '96 Beaverdam Ridge', city: 'Asheville', state: 'NC', zip: '28804',
      lat: 35.6392, lng: -82.5548,
      price: 745000, prior: null, beds: 3, baths: 2, sqft: 2240,
      lot: 0.51, year: 1994, type: 'Single family', status: 'active', dom: 9, hue: 140,
      hoa: 0, taxes: 3540, ppsf: 333,
      blurb: 'Low-slung ranch on the ridge with a long view south over the valley. One owner since it was built, and it shows in the maintenance records.',
      features: ['Ridge view', 'Two-car garage', 'Heat pump 2021', 'Fenced yard', 'Mature rhododendron'],
      agent: 'u3', owner: 'u5',
      followers: 96, saves: 41,
      history: [
        { date: 'Sep 2026', what: 'Listed for sale at $745,000', meta: 'Whitlock & Co. · MLS 4201773' },
        { date: 'May 2021', what: 'Heat pump replaced', meta: 'Owner post · 16 SEER, permit B21-0904' },
        { date: 'Jun 1994', what: 'Built', meta: 'Beaverdam Ridge phase 2' },
      ],
      posts: [
        p('a13p1', 'u5', '5 days ago', 'Resident of thirty-one years. The view is real but so is the wind — anything you plant on the south side needs staking for the first two winters.', 38, 0, false, [
          c('a13p1c1', 'u2', '4 days ago', 'Good to know. Does the ridge lose power often in ice storms?', 11, 0),
        ]),
      ],
      offers: [],
    },
    {
      id: 'a14',
      street: '12 Elk Mountain Scenic Hwy', city: 'Asheville', state: 'NC', zip: '28804',
      lat: 35.6455, lng: -82.5731,
      price: 1180000, prior: 1250000, beds: 4, baths: 3.5, sqft: 3680,
      lot: 2.4, year: 2008, type: 'Single family', status: 'active', dom: 63, hue: 168,
      hoa: 1200, taxes: 6890, ppsf: 321,
      blurb: 'Timber-frame house on two and a half acres near the Blue Ridge Parkway boundary. Screened sleeping porch, spring-fed pond, and a well that has never gone dry.',
      features: ['Timber frame', 'Spring-fed pond', 'Sleeping porch', 'Generator', 'Parkway adjacent', 'Well'],
      risk: { fire: ['High', 'Parkway-adjacent, one way in. Generator and a 2,500 gallon cistern on site.'], flood: ['Zone X', 'Pond is spring-fed and has never reached the house.'] },
      agent: 'u3', owner: 'u1',
      followers: 187, saves: 72,
      history: [
        { date: 'Aug 2026', what: 'Price cut to $1,180,000', meta: '-$70,000 (5.6%) · 63 days on market' },
        { date: 'Jul 2026', what: 'Listed for sale at $1,250,000', meta: 'MLS 4199014' },
        { date: 'Apr 2014', what: 'Sold for $795,000', meta: 'Buncombe County' },
        { date: 'Oct 2008', what: 'Built', meta: 'Timber frame raised on site' },
      ],
      posts: [
        p('a14p1', 'u6', '2 weeks ago', 'Two months at this price on a road people drive for fun. The pond is lovely and the driveway is brutal in January — ask about the grade before you fall in love with it.', 44, 7, false, [
          c('a14p1c1', 'u3', '2 weeks ago', 'Listing agent. Grade is 12% at the steepest, and it is paved the whole way. Happy to send the survey.', 26, 0),
        ]),
      ],
      offers: [
        { id: 'a14o1', amt: 1105000, by: 'Buyer represented by Beverly-Hanks', when: '6 days ago', status: 'live', note: 'Conventional, 25% down, inspection only' },
      ],
    },
    {
      id: 'a15',
      street: '31 Lakeshore Dr', city: 'Asheville', state: 'NC', zip: '28804',
      lat: 35.6221, lng: -82.5675,
      price: 529000, prior: null, beds: 3, baths: 2, sqft: 1680,
      lot: 0.19, year: 1952, type: 'Cottage', status: 'pending', dom: 5, hue: 96,
      hoa: 0, taxes: 2410, ppsf: 315,
      blurb: 'Post-war cottage two streets off Beaver Lake, taken back to the studs in 2019 with the original oak floors saved and re-laid.',
      features: ['Walk to Beaver Lake', 'Original oak floors', 'Rewired 2019', 'Screened porch', 'Alley parking'],
      agent: 'u10', owner: 'u8',
      followers: 143, saves: 66,
      history: [
        { date: 'Sep 2026', what: 'Sale pending', meta: 'Accepted five days after listing' },
        { date: 'Sep 2026', what: 'Listed for sale at $529,000', meta: 'MLS 4202880' },
        { date: 'Mar 2019', what: 'Down-to-studs renovation', meta: 'Owner-documented in 22 posts' },
        { date: 'Aug 2017', what: 'Sold for $228,000', meta: 'Buncombe County' },
        { date: '1952', what: 'Built', meta: 'Original Beaver Lake plat' },
      ],
      posts: [
        p('a15p1', 'u8', '4 days ago', 'Owner. Under contract, but I am leaving the renovation thread up — the wiring, plumbing and framing photos from 2019 belong to the house, not to me.', 71, 0, true, [
          c('a15p1c1', 'u2', '4 days ago', 'This is the whole argument for the site in one post.', 33, 0),
        ]),
      ],
      offers: [
        { id: 'a15o1', amt: 545000, by: 'Accepted offer', when: '5 days ago', status: 'accepted', note: 'Waived appraisal gap to $20k' },
      ],
    },
    {
      id: 'a16',
      street: '1520 Longfellow St', city: 'Detroit', state: 'MI', zip: '48206',
      lat: 42.3768, lng: -83.0925,
      price: 415000, prior: null, beds: 5, baths: 2.5, sqft: 3390,
      lot: 0.17, year: 1914, type: 'Colonial revival', status: 'active', dom: 17, hue: 18,
      hoa: 0, taxes: 3120, ppsf: 122,
      blurb: 'Boston-Edison colonial with the original leaded glass, a working sleeping porch, and a third floor that was a ballroom and could be again.',
      features: ['Leaded glass', 'Third floor', 'Sleeping porch', 'Historic district', 'Carriage house', 'Original millwork'],
      agent: 'u10', owner: 'u5',
      followers: 232, saves: 91,
      history: [
        { date: 'Sep 2026', what: 'Listed for sale at $415,000', meta: 'MLS 20260931' },
        { date: 'Jun 2022', what: 'Roof and gutters replaced', meta: 'Owner post · copper half-round' },
        { date: 'Nov 2016', what: 'Sold for $186,000', meta: 'Wayne County' },
        { date: '1914', what: 'Built', meta: 'Boston-Edison historic district' },
      ],
      posts: [
        p('a16p1', 'u5', '1 week ago', 'Owner. The third floor is unconditioned — beautiful nine months of the year, an oven in August. Anyone who tells you it is easy to condition has not priced the ductwork.', 52, 1, true, []),
        p('a16p2', 'u9', '5 days ago', 'Is the carriage house on its own meter, or does it run off the main panel?', 14, 0, false, []),
      ],
      offers: [],
    },
    {
      id: 'a17',
      street: '2118 Chicago Blvd', city: 'Detroit', state: 'MI', zip: '48206',
      lat: 42.3735, lng: -83.0961,
      price: 689000, prior: null, beds: 6, baths: 4, sqft: 5120,
      lot: 0.24, year: 1911, type: 'Tudor revival', status: 'active', dom: 31, hue: 44,
      hoa: 0, taxes: 5480, ppsf: 135,
      blurb: 'One of the big Chicago Boulevard Tudors, restored over eleven years by two owners who documented every stage. Slate roof, five fireplaces, ballroom intact.',
      features: ['Slate roof', 'Five fireplaces', 'Ballroom', 'Restored plaster', 'Coach house', 'Boulevard frontage'],
      agent: 'u10', owner: 'u8',
      followers: 418, saves: 156,
      history: [
        { date: 'Aug 2026', what: 'Listed for sale at $689,000', meta: 'MLS 20260844' },
        { date: 'Sep 2019', what: 'Slate roof completed', meta: 'Owner post · eleven-year restoration, phase 7' },
        { date: 'Mar 2015', what: 'Sold for $164,000', meta: 'Wayne County' },
        { date: '1911', what: 'Built', meta: 'Architect: Leonard B. Willeke, attributed' },
      ],
      posts: [
        p('a17p1', 'u8', '3 days ago', 'Eleven years of receipts are in the thread below, oldest first. If you are buying a house like this, read them before you make an offer — not after.', 96, 2, true, [
          c('a17p1c1', 'u5', '3 days ago', 'The plaster posts alone saved me four thousand dollars on my own place.', 41, 0),
          c('a17p1c2', 'u2', '2 days ago', 'What did the slate actually come to, all in?', 19, 0),
        ]),
      ],
      offers: [
        { id: 'a17o1', amt: 655000, by: 'Cash buyer, 21-day close', when: '4 days ago', status: 'live', note: 'Proof of funds attached, inspection for information only' },
      ],
    },
    {
      id: 'a18',
      street: '288 Benefit St', city: 'Providence', state: 'RI', zip: '02903',
      lat: 41.8262, lng: -71.4053,
      price: 1690000, prior: null, beds: 4, baths: 3, sqft: 3010,
      lot: 0.07, year: 1794, type: 'Federal', status: 'active', dom: 12, hue: 8,
      hoa: 0, taxes: 14200, ppsf: 561,
      blurb: 'Federal house on the Mile of History, twelve-over-twelve sash, original panelling in three rooms, and a garden that steps down the hill behind it.',
      features: ['Mile of History', 'Original panelling', 'Twelve-over-twelve sash', 'Terraced garden', 'Off-street parking'],
      agent: 'u10', owner: 'u7',
      followers: 276, saves: 104,
      history: [
        { date: 'Sep 2026', what: 'Listed for sale at $1,690,000', meta: 'MLS RI7810' },
        { date: 'Jul 2018', what: 'Historic district commission approved rear glazing', meta: 'Case HDC-18-221' },
        { date: 'Apr 2009', what: 'Sold for $912,000', meta: 'Providence County' },
        { date: '1794', what: 'Built', meta: 'Recorded in the 1937 HABS survey' },
      ],
      posts: [
        p('a18p1', 'u9', '6 days ago', 'The hill is steeper than the photographs suggest and Benefit Street parking is a contact sport. Wonderful house, but walk it in the rain before you buy it.', 47, 5, false, []),
      ],
      offers: [],
    },
    {
      id: 'a19',
      street: '54 Cranmore Ave', city: 'Asheville', state: 'NC', zip: '28804',
      lat: 35.6288, lng: -82.5602,
      price: 612000, prior: null, beds: 3, baths: 2, sqft: 1980,
      lot: 0.23, year: 1926, type: 'Bungalow', status: 'sold', dom: 0, hue: 76,
      hoa: 0, taxes: 2860, ppsf: 309,
      blurb: 'Sold in 2023 and not for sale. The page stays because the house does — four owners of records, a 1978 fire, and the rebuild that followed it.',
      features: ['Original bungalow millwork', 'Rebuilt 1979', 'Deep lot', 'Detached garage'],
      risk: { fire: ['Moderate', 'The 1978 fire was a chimney flue, not wildfire; flue relined in 1979 and again in 2011.'], flood: ['Zone X', 'No mapped flood risk.'] },
      agent: 'u3', owner: 'u4',
      followers: 168, saves: 12,
      history: [
        { date: 'Apr 2023', what: 'Sold for $612,000', meta: 'Buncombe County · off market since' },
        { date: 'Feb 2023', what: 'Listed for sale at $598,000', meta: 'Sold above ask in nine days' },
        { date: 'Aug 2011', what: 'Sold for $268,000', meta: 'Buncombe County' },
        { date: 'Jun 1994', what: 'Sold for $96,500', meta: 'Buncombe County' },
        { date: 'Mar 1979', what: 'Rebuilt after fire', meta: 'Front two rooms original, rest reframed' },
        { date: 'Nov 1978', what: 'House fire', meta: 'Chimney flue · fire report 78-1142 on file' },
        { date: '1926', what: 'Built', meta: 'Craftsman bungalow, original plat' },
      ],
      posts: [
        p('a19p1', 'u4', '5 months ago', 'Past owner. The 1978 fire is the thing every buyer eventually asks about, so here it is in full: flue fire, front two rooms survived, everything behind them was reframed in 1979 to the code of the day. The 2011 inspection found no fire damage remaining. Fire report is scanned below.', 118, 2, true, [
          c('a19p1c1', 'u2', '5 months ago', 'This is the kind of thing that vanishes when a listing expires. Thank you for leaving it up.', 46, 0),
          c('a19p1c2', 'u5', '4 months ago', 'Neighbour here. Confirmed — my mother watched it burn. They rebuilt it properly.', 38, 0),
        ]),
        p('a19p2', 'u9', '2 months ago', 'Not for sale and I am not looking to buy it. I just like that the record is here. The house across from mine burned in 1981 and nobody remembers except the people who were on the street that night.', 57, 1, false, []),
      ],
      offers: [],
    },
    {
      id: 'a20',
      street: '905 W Boston Blvd', city: 'Detroit', state: 'MI', zip: '48202',
      lat: 42.3751, lng: -83.0872,
      price: 372000, prior: null, beds: 4, baths: 2.5, sqft: 2980,
      lot: 0.15, year: 1922, type: 'Foursquare', status: 'sold', dom: 0, hue: 200,
      hoa: 0, taxes: 2740, ppsf: 125,
      blurb: 'Sold in 2021, still the most complete restoration record on the boulevard. The owner kept posting after the sale, and so did the new one.',
      features: ['Foursquare', 'Restored porch', 'Original radiators', 'Basement workshop'],
      agent: 'u10', owner: 'u5',
      followers: 341, saves: 24,
      history: [
        { date: 'Sep 2021', what: 'Sold for $372,000', meta: 'Wayne County · off market since' },
        { date: 'Jul 2021', what: 'Listed for sale at $359,000', meta: 'Four offers in a week' },
        { date: 'May 2020', what: 'Porch rebuilt to the 1922 drawings', meta: 'Owner post · 31 photographs' },
        { date: 'Mar 2016', what: 'Sold for $71,000', meta: 'Wayne County' },
        { date: '1922', what: 'Built', meta: 'Boston-Edison historic district' },
      ],
      posts: [
        p('a20p1', 'u5', '3 months ago', 'I sold this house in 2021 and I still get asked about the porch. Every drawing, invoice and mistake is in the thread. The new owner has the originals now; the record belongs to the house either way.', 94, 0, true, [
          c('a20p1c1', 'u8', '3 months ago', 'The porch posts are why I bought on this street.', 41, 0),
        ]),
        p('a20p2', 'u8', '6 weeks ago', 'Current owner. Adding to it rather than starting over: the radiators were re-tapped this spring, receipts below. Whoever owns this house in 2050 should be able to read all of it.', 76, 0, false, []),
      ],
      offers: [],
    },
    {
      id: 'a21',
      street: '1408 N 9th St', city: 'Boise', state: 'ID', zip: '83702',
      lat: 43.6318, lng: -116.2036,
      price: 585000, prior: null, beds: 3, baths: 1.5, sqft: 1610,
      lot: 0.14, year: 1911, type: 'Bungalow', status: 'active', dom: 4, hue: 52,
      hoa: 0, taxes: 2980, ppsf: 363,
      blurb: 'North End bungalow four blocks from Hyde Park. Original fir floors, a sleeping porch off the back bedroom, and alley access to a garage that fits one car of 1911 dimensions.',
      features: ['Hyde Park walkable', 'Fir floors', 'Sleeping porch', 'Alley garage', 'Mature maples'],
      risk: { fire: ['Moderate', 'Foothills interface two miles north; the city keeps a fuel break above Hill Road.'], heat: ['Moderate', 'Twenty-odd days over 95°F, and no air conditioning in the house.'] },
      agent: 'u3', owner: 'u2',
      followers: 122, saves: 48,
      history: [
        { date: 'Sep 2026', what: 'Listed for sale at $585,000', meta: 'MLS 98903117' },
        { date: 'Aug 2019', what: 'Sewer line replaced to the main', meta: 'Owner post · trenchless, permit 19-4471' },
        { date: 'May 2013', what: 'Sold for $246,000', meta: 'Ada County' },
        { date: '1911', what: 'Built', meta: 'Original North End plat' },
      ],
      posts: [
        p('a21p1', 'u2', '3 days ago', 'Owner. No air conditioning and I am not pretending otherwise — the house is shaded and the sleeping porch works, but if you need 68 degrees in July, budget for a mini-split.', 46, 0, true, [
          c('a21p1c1', 'u6', '2 days ago', 'Honest listing posts are why I check this site first.', 22, 0),
        ]),
      ],
      offers: [],
    },
    {
      id: 'a22',
      street: '210 E Jones St', city: 'Savannah', state: 'GA', zip: '31401',
      lat: 32.0755, lng: -81.0928,
      price: 875000, prior: 925000, beds: 3, baths: 2, sqft: 2080,
      lot: 0.06, year: 1856, type: 'Greek revival', status: 'active', dom: 48, hue: 12,
      hoa: 0, taxes: 6240, ppsf: 421,
      blurb: 'Antebellum side-hall house a block from Lafayette Square, with the garden apartment that has paid its own taxes since 1974.',
      features: ['Garden apartment', 'Original heart pine', 'Walled courtyard', 'Historic district', 'Off-street parking'],
      risk: { flood: ['Zone AE', 'Historic district drainage; the courtyard holds water in a king tide and the crawlspace has a sump.'], wind: ['High', 'Coastal Georgia. Shutters are original and functional.'] },
      agent: 'u10', owner: 'u9',
      followers: 204, saves: 61,
      history: [
        { date: 'Aug 2026', what: 'Price cut to $875,000', meta: '-$50,000 (5.4%) · 48 days on market' },
        { date: 'Jul 2026', what: 'Listed for sale at $925,000', meta: 'Yarrow Group · MLS 302904' },
        { date: 'Jan 2014', what: 'Garden apartment permitted as a legal rental', meta: 'Certificate on file' },
        { date: 'Jun 2004', what: 'Sold for $412,000', meta: 'Chatham County' },
        { date: '1856', what: 'Built', meta: 'Attributed to John S. Norris' },
      ],
      posts: [
        p('a22p1', 'u9', '1 week ago', 'Owner. The garden apartment is legally permitted — certificate is in the history above. Two buyers have now asked whether the rental is grandfathered; it is not, it is licensed, and that matters when you insure it.', 63, 1, true, []),
        p('a22p2', 'u2', '5 days ago', 'Forty-eight days on market on Jones Street is a long time. Is the tenant staying with the sale?', 18, 0, false, []),
      ],
      offers: [
        { id: 'a22o1', amt: 840000, by: 'Buyer represented by Cora Bett', when: '3 days ago', status: 'live', note: 'Conventional, 30% down, tenant to remain' },
      ],
    },
    {
      id: 'a23',
      street: '1017 Baldwin Ave', city: 'Ann Arbor', state: 'MI', zip: '48104',
      lat: 42.2731, lng: -83.7202,
      price: 725000, prior: null, beds: 4, baths: 2.5, sqft: 2340,
      lot: 0.16, year: 1928, type: 'Tudor', status: 'active', dom: 11, hue: 176,
      hoa: 0, taxes: 9840, ppsf: 310,
      blurb: 'Burns Park tudor on a deep lot, walking distance to the elementary school and about eleven minutes to the diag on foot.',
      features: ['Burns Park', 'Leaded glass', 'Slate entry', 'Finished attic', 'Walk to campus'],
      agent: 'u10', owner: 'u6',
      followers: 178, saves: 70,
      history: [
        { date: 'Sep 2026', what: 'Listed for sale at $725,000', meta: 'MLS 3299104' },
        { date: 'Jul 2020', what: 'Knob and tube fully replaced', meta: 'Owner post · letter from the electrician on file' },
        { date: 'Apr 2012', what: 'Sold for $358,000', meta: 'Washtenaw County' },
        { date: '1928', what: 'Built', meta: 'Burns Park plat' },
      ],
      posts: [
        p('a23p1', 'u6', '6 days ago', 'Owner. The knob and tube is gone — all of it, in 2020, with the electrician’s letter in the history. Two insurers still asked. Have the letter ready when you shop coverage.', 51, 0, true, [
          c('a23p1c1', 'u8', '5 days ago', 'This is exactly the thread I needed on my own place. Thank you.', 24, 0),
        ]),
      ],
      offers: [],
    },
    {
      id: 'a24',
      street: '4 Mountain St', city: 'Camden', state: 'ME', zip: '04843',
      lat: 44.2085, lng: -69.0631,
      price: 1395000, prior: null, beds: 5, baths: 3, sqft: 3420,
      lot: 0.9, year: 1901, type: 'Shingle style', status: 'active', dom: 22, hue: 208,
      hoa: 0, taxes: 11400, ppsf: 408,
      blurb: 'Shingle-style house on the hill above the harbour, with the third-floor room the original owner used to watch the schooner fleet come in.',
      features: ['Harbour view', 'Wraparound porch', 'Third-floor lookout', 'Barn', 'Walk to the village'],
      risk: { wind: ['High', 'Nor’easter exposure on the harbour side; the porch was rebuilt after the 2010 storm.'], flood: ['Zone X', 'Well above the harbour; the barn sits lower and has flooded twice.'] },
      agent: 'u3', owner: 'u4',
      followers: 289, saves: 96,
      history: [
        { date: 'Sep 2026', what: 'Listed for sale at $1,395,000', meta: 'MLS ME4471' },
        { date: 'Nov 2010', what: 'Porch rebuilt after nor’easter', meta: 'Owner post · same profile, heavier framing' },
        { date: 'Jul 1998', what: 'Sold for $310,000', meta: 'Knox County' },
        { date: '1901', what: 'Built', meta: 'Shingle style, architect unrecorded' },
      ],
      posts: [
        p('a24p1', 'u4', '2 weeks ago', 'Past owner of the house next door. The barn takes water in a hard easterly — twice in thirty years, both times the harbour side. It is a barn, it dries out, but do not put a workshop floor in it without a drain.', 58, 0, false, []),
      ],
      offers: [],
    },
  ];

  /* Neighborhood groups. `addresses` are the homes in this build that sit inside
     the group boundary; `stats` are neighborhood-wide numbers that would come
     from the MLS + assessor in phase 1, not from the twelve records above. */
  const groups = [
    {
      id: 'g1', name: 'Reems Creek Valley', city: 'Asheville, NC', members: 1240, today: 8,
      blurb: 'The valley north of town, from the Weaverville line up to the gap. Mostly 1970s and later builds on wooded acreage, a handful of older farmsteads along the creek.',
      addresses: ['a1', 'a13', 'a14', 'a15', 'a19'], mods: ['u1', 'u2'],
      stats: { forSale: 14, median: 742000, ppsf: 268, cuts: 5, sold90: 9 },
      events: [
        { id: 'g1e1', title: 'Creek cleanup', when: 'Saturday 9am', where: 'Bridge at Reems Creek Rd', going: 26,
          note: 'Bring gloves. The county lends grabbers if you ask at the fire station.' },
        { id: 'g1e2', title: 'Well-water testing clinic', when: 'Oct 4, 10am–2pm', where: 'Weaverville library', going: 41,
          note: 'County health department runs it free. Bring a sample in a clean jar.' },
      ],
      posts: [
        p('g1p1', 'u1', '2 days ago', 'Reminder that the county is repaving Reems Creek from the school to the bridge starting the 15th. Flaggers 7am to 5pm, expect fifteen minutes either way. The detour through Ox Creek is not worth it, I tried.', 34, 0, true, [
          c('g1p1c1', 'u6', '2 days ago', 'Confirmed, sign went up at the fire station this morning.', 8, 0),
        ]),
        p('g1p2', 'u6', '5 days ago', 'Anyone else on well seeing pressure drop since August? Third dry month and we are down to a trickle by evening. Curious whether it is the aquifer or just my pump on its way out.', 41, 1, false, [
          c('g1p2c1', 'u2', '5 days ago', 'Same on our side of the ridge. Driller told me the shallow wells here always dip in a dry September and come back in November.', 22, 0),
          c('g1p2c2', 'u4', '4 days ago', 'Ours is 420 feet and steady. If yours is under 200 that is probably your answer.', 15, 0),
        ]),
        p('g1p3', 'u2', '1 week ago', 'Two houses on the creek listed this month and both are asking well over what the same houses went for in 2023. Curious what people think is actually selling versus sitting.', 28, 3, false, []),
      ],
    },
    {
      id: 'g2', name: 'Troup Square', city: 'Savannah, GA', members: 863, today: 12,
      blurb: 'One of the six original wards laid out east of Bull Street. Rowhouses, gas lanterns, and a historic review board that has opinions about your windows.',
      addresses: ['a2', 'a22'], mods: ['u7', 'u10'],
      stats: { forSale: 6, median: 1085000, ppsf: 486, cuts: 1, sold90: 4 },
      posts: [
        p('g2p1', 'u7', '1 day ago', 'For anyone about to go before the review board: they are approving rear additions that are set back and clearly modern, and rejecting anything that fakes a period detail. Mine passed on the second try once we stopped pretending the addition was from 1889.', 57, 0, true, [
          c('g2p1c1', 'u10', '1 day ago', 'This matches every case I have watched this year. Honest contrast wins.', 19, 0),
        ]),
        p('g2p2', 'u9', '4 days ago', 'The live oak at the northeast corner of the square dropped a limb in the storm. City forestry has been out twice. If you park under it, maybe do not for a few weeks.', 33, 0, false, []),
        p('g2p3', 'u10', '1 week ago', 'Short-term rental permits in the ward are capped and the waitlist is real. If a listing tells you STR income is a given, ask to see the permit number before you believe it.', 62, 2, false, [
          c('g2p3c1', 'u9', '6 days ago', 'Worth saying loudly. Two buyers on my street found out after closing.', 24, 0),
        ]),
      ],
    },
    {
      id: 'g3', name: 'Boston-Edison', city: 'Detroit, MI', members: 2105, today: 21,
      blurb: 'Thirty-six blocks of 1910s mansions built for auto money, a local historic district since 1974. Restoration is the neighborhood hobby and the neighborhood expense.',
      addresses: ['a6', 'a16', 'a17', 'a20'], mods: ['u5', 'u8'],
      stats: { forSale: 11, median: 468000, ppsf: 132, cuts: 3, sold90: 7 },
      events: [
        { id: 'g3e1', title: 'Block club meeting', when: 'Thursday 7pm', where: '2118 Chicago Blvd, the ballroom', going: 58,
          note: 'Scaffold tower rota, and the slate roofers are sending someone to answer questions.' },
      ],
      posts: [
        p('g3p1', 'u5', '6 hours ago', 'Slate roof thread, since it comes up every fall. Two crews in the metro will actually work slate rather than talk you into asphalt. Ask for the address of a job they did ten years ago and go look at it.', 88, 1, true, [
          c('g3p1c1', 'u8', '4 hours ago', 'Ours is going on year twelve from that same list. Worth every dollar.', 27, 0),
          c('g3p1c2', 'u9', '2 hours ago', 'Any of them do copper flashing? That is where mine failed, not the slate.', 11, 0),
        ]),
        p('g3p2', 'u8', '3 days ago', 'The block club is buying a shared scaffold tower. Twelve houses in so far, cost lands around sixty dollars each and it lives in my carriage house. Reply if you want in.', 74, 0, false, [
          c('g3p2c1', 'u2', '3 days ago', 'In. This is the single best idea this group has had.', 31, 0),
        ]),
        p('g3p3', 'u9', '1 week ago', 'Reminder that the historic district means exterior changes need approval, including paint colors on the trim. It is not a formality and the fines are real.', 45, 6, false, []),
      ],
    },
    {
      id: 'g4', name: 'North End', city: 'Boise, ID', members: 1780, today: 5,
      blurb: 'Bungalows and old maples between downtown and the foothills. Alleys, block parties, and a running argument about parking permits.',
      addresses: ['a3', 'a21'], mods: ['u3'],
      stats: { forSale: 19, median: 689000, ppsf: 341, cuts: 8, sold90: 14 },
      posts: [
        p('g4p1', 'u3', '2 days ago', 'Eight price cuts in the North End this month, most of them on houses that listed in June and never moved. Anything priced right is still going in a week. The middle is where things are sitting.', 52, 2, true, []),
        p('g4p2', 'u6', '5 days ago', 'Foothills trail access from Hill Road is closed for the season for erosion work. Camelback is the easy substitute and nobody is using it yet.', 29, 0, false, []),
      ],
    },
    {
      id: 'g5', name: 'College Hill', city: 'Providence, RI', members: 3402, today: 17,
      blurb: 'The hill above the river — colonial and Federal houses, brick sidewalks that will roll an ankle, and two universities pressing on the edges.',
      addresses: ['a4', 'a18'], mods: ['u10', 'u5'],
      stats: { forSale: 9, median: 1240000, ppsf: 452, cuts: 2, sold90: 6 },
      posts: [
        p('g5p1', 'u10', '1 day ago', 'Under agreement on Fennimore in nine days with three offers. For anyone watching this street: the price was not the story, the fully documented systems were. Buyers paid up for not having to guess.', 66, 1, true, [
          c('g5p1c1', 'u5', '22 hours ago', 'This is the argument for keeping the address page current even when you are not selling.', 34, 0),
        ]),
        p('g5p2', 'u5', '4 days ago', 'If you are on the older brick sewer laterals, get the camera inspection before the ground freezes. Ours failed in February and the emergency price was double.', 48, 0, false, []),
        p('g5p3', 'u2', '1 week ago', 'Student move-in weekend is the 30th. Move your car off Waterman by Friday night or you will be circling for an hour.', 37, 0, false, []),
      ],
    },
    {
      id: 'g6', name: 'Burns Park', city: 'Ann Arbor, MI', members: 1966, today: 9,
      blurb: 'Prewar houses on deep lots a walk from campus and from the elementary school that gives the neighborhood its name.',
      addresses: ['a11', 'a23'], mods: ['u8'],
      stats: { forSale: 8, median: 812000, ppsf: 356, cuts: 2, sold90: 11 },
      posts: [
        p('g6p1', 'u8', '3 days ago', 'Leaf pickup starts the week of the 20th and the city will not take bags this year, it is loose piles at the curb only. Last year half the street got skipped over this.', 42, 0, true, []),
        p('g6p2', 'u9', '6 days ago', 'Knob and tube is still in more houses here than people admit. Two insurers now decline outright. Ask the seller for the panel photos before you write.', 55, 1, false, [
          c('g6p2c1', 'u5', '5 days ago', 'Ours was partially replaced in 1998 and the insurer still wanted a letter from the electrician.', 18, 0),
        ]),
      ],
    },
  ];

  /* Seeded conversations so the inbox has something in it. Threads you start are
     stored client-side and stay unanswered — nobody is on the other end. */
  const threads = [
    {
      id: 't1', with: 'u1', about: 'a1', ago: '2 days ago',
      msgs: [
        { by: 'me', ago: '4 days ago', text: 'Saw your renovation binder post. Is the 2024 kitchen permit closed out, or still open with the county?' },
        { by: 'u1', ago: '4 days ago', text: 'Closed out in June 2024. Final inspection card is scanned in the binder, page eleven. Happy to send the county lookup link if it helps.' },
        { by: 'me', ago: '3 days ago', text: 'That would help. Also — is the detached studio on the same septic?' },
        { by: 'u1', ago: '2 days ago', text: 'Separate. It has its own 500 gallon tank installed in 2016, pumped last spring. Receipt is in the binder too.' },
      ],
    },
    {
      id: 't2', with: 'u10', about: 'a4', ago: '6 days ago',
      msgs: [
        { by: 'me', ago: '1 week ago', text: 'Is the Fennimore listing taking backup offers now that it is under agreement?' },
        { by: 'u10', ago: '6 days ago', text: 'Yes, and I would encourage it. Inspection is next Tuesday. I will keep the address page updated either way — that page is staying up regardless of who buys.' },
      ],
    },
  ];

  const byId = Object.fromEntries(listings.map((l) => [l.id, l]));

  return { users, roleLabel, listings, byId, groups, threads };
})();
