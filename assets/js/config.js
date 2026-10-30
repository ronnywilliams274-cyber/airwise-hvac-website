/* =====================================================================
   AIRWISE HVAC SOLUTIONS: SITE CONFIG
   Edit this file to change contact details, offers, reviews and stats.
   No build step needed: save and refresh the page.
   ===================================================================== */
window.AIRWISE_CONFIG = {
  company: {
    name: 'Airwise HVAC Solutions',
    legalName: 'Airwise HVAC Solutions LLC',
    phone: '+19164753948',            // used for tel: and sms: links
    phoneDisplay: '(916) 475-3948',
    email: 'airwisehvacsolutionsllc@gmail.com',
    serviceArea: 'Greater Sacramento', // TODO: confirm the cities you serve
    // Business hours drive the live "Open now" badge (24h clock, local time zone below)
    hours: {
      timeZone: 'America/Los_Angeles',
      // 0 = Sunday ... 6 = Saturday   ->  [openHour, closeHour]  (null = closed)
      week: { 0: null, 1: [7, 19], 2: [7, 19], 3: [7, 19], 4: [7, 19], 5: [7, 19], 6: [8, 16] },
      label: 'Mon–Fri 7am–7pm · Sat 8am–4pm'
    }
  },

  /* Pexels API key. Used ONLY until you run DOWNLOAD-MEDIA.bat, which saves
     every photo/video locally. After that, set this to '' before going live
     so your key is not exposed in public source code. */
  pexelsApiKey: '9bFZeNGzbgG781DtzePC1PWNS4g9l7UONaLScFBCJwJC53pa78QMs8sd',

  /* Optional form backend (Formspree, Getform, Basin, your own API...).
     Leave '' to send quote requests via the visitor's email app (mailto). */
  formEndpoint: '',

  /* Seasonal offer. deadline: 'YYYY-MM-DD' or '' for "end of the current month". */
  offer: {
    eyebrow: 'Limited-time · Seasonal tune-up',
    title: 'Beat the winter rush.',
    price: 89,                         // TODO: your real price
    anchorLabel: 'Typical emergency no-heat call',
    anchorPrice: '$250+',              // TODO: your real number
    includes: ['21-point safety & efficiency check', 'Filter swap & coil inspection', 'Written health report'],
    deadline: ''
  },

  /* SAMPLE REVIEWS. Replace them with real reviews (copy from Google), then set
     reviewsAreSamples to false. Publishing invented reviews is illegal under FTC rules. */
  reviewsAreSamples: true,
  rating: { value: '5.0', source: 'Google' },
  reviews: [
    { name: 'Maria G.', place: 'Elk Grove', service: 'AC installation', stars: 5,
      text: 'They walked me through three options, no pressure. Install day they covered every floor and left the place cleaner than they found it.' },
    { name: 'Derek P.', place: 'Roseville', service: 'Heat pump retrofit', stars: 5,
      text: 'Swapped our 18-year-old unit without touching the ductwork. Our first summer bill dropped noticeably. Wish we had called sooner.' },
    { name: 'Lena & Sam', place: 'Folsom', service: 'Maintenance plan', stars: 5,
      text: 'The tune-up caught a failing capacitor before the July heat wave. That one visit paid for itself.' },
    { name: 'Hector R.', place: 'Natomas', service: 'New construction', stars: 5,
      text: 'As a builder I need crews who hit rough-in dates. Airwise did, every time, and the inspections passed first try.' },
    { name: 'Priya K.', place: 'Rancho Cordova', service: 'Painting', stars: 5,
      text: 'Same team did our condenser swap and repainted the side of the house. One crew, one invoice, zero headaches.' }
  ],

  /* Stats counters. TODO: replace with your real numbers. */
  stats: [
    { value: 100, suffix: '%', label: 'Upfront, written quotes' },
    { value: 24, suffix: 'h', label: 'Typical reply time' },
    { value: 21, suffix: '-pt', label: 'Tune-up inspection' },
    { value: 5, suffix: '', label: 'Services. One accountable crew.' }
  ]
};
