# Overture

A go-to-market planner that runs entirely in the browser. Pick a motion, set
four numbers (annual contract value, monthly budget, win rate, sales cycle),
allocate the budget across six channels, and the page models twelve months of
pipeline and ARR, blended CAC, payback, a sequenced ninety-day playbook, and a
summary card you can drop into a deck.

Open `index.html` directly, or host the folder anywhere static files are served.
No build step, no dependencies beyond two Google Fonts.

## How the model works

Each channel carries a cost per lead, a lead-to-opportunity rate, a ramp time,
and a monthly spend level at which returns start to flatten. The motion you pick
scales each channel's conversion up or down, and the ACV nudges conversion as
well (bigger deals, fewer of them). Opportunities close after the sales cycle at
the win rate you set, and the twelve-month rows roll up from there.

Blended CAC is total spend divided by customers won inside the window. Payback
is CAC divided by monthly gross profit at an assumed 80% margin.

The benchmarks are starting points. Replace them in the `CHANNELS` table at the
top of the script once you have your own numbers.
