# Contributing to Lineup

Thanks for helping. Three kinds of contribution matter most, in this order.

## 1. The lexicon

`lib/model.js` holds `LEX`, a list of `[phrase, weight]` pairs. A phrase belongs there when it could appear on any B2B homepage without changing meaning. Weight 1.0 is pure filler ("empower", "seamless"). Weight 0.5 is a word that is sometimes doing work ("automate", "platform"). Weight 0.3 is a phrase that is usually fine but often padding ("trusted by").

Open a pull request with the phrase, the weight, and two or three real sites where you saw it. Don't paste the sites' full copy.

## 2. The part detectors

`BUYER`, `ALT`, `NUMBER`, `PROOF`, `OUTCOME`, and `CONCRETE` are regular expressions that decide whether a position names a buyer, an alternative, and so on. They are deliberately plain so anyone can read them. If a real, specific headline fails a part it clearly has, open an issue with the headline and which part failed, or send a pull request that adds the missing word.

## 3. Calibration

`test/model.test.js` pins the score bands for generic, half-specific, and specific copy. If you change the model, the tests tell you what moved. A change that makes generic copy score lower or specific copy score higher needs a reason in the pull request.

## Ground rules

- No dependencies. The whole project runs on Node's standard library.
- No tracking. The server stores what people submit and how they vote, nothing else. Keep it that way.
- Keep the seeds fictional. `scripts/seeds.json` must never contain a real company's copy.
- `npm test` stays green.
