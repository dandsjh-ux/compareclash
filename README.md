# Compare Clash 🃏

A multiplayer card battle for young learners that practises **vocabulary** and **comparatives**
(*bigger, faster, more expensive, the heaviest…*). Two to four players sit around a tabletop,
read the challenge card and play the word card that fits best.

- **100-card deck**: 84 illustrated nouns in 7 categories (animals, food, transport, buildings, home, nature, toys) plus 16 action cards
- **Hand of 6**, refilled after every round. **3 free discards** per game (up to 2 cards each), then 3 VP each
- **Vocab Points (VP)**: everyone starts with 20. Winning a round pays 5 VP
- **Gambit**: bet that you'll WIN (pays 1:1) or LOSE (pays 2:1), up to a third of your VP
- After every round the game shows a sentence and can read it aloud, e.g. *"A barn is bigger than a car."* *"The bee is the slowest!"*
- Computer players can fill empty seats. They also take over for anyone who disconnects or runs out of time

No dependencies. It runs on plain Node.js (18 or newer) using the built-in `http` module and a small WebSocket layer.

---

## Run it locally

```bash
npm start
# open http://localhost:3000
```

To test multiplayer on one computer, open a second browser window (or an incognito window) and join with the room code.

## Deploy on Render (Web Service)

1. Push this folder to a GitHub repo.
2. In Render, choose **New → Web Service** and connect the repo.
3. Settings:
   - **Runtime:** Node
   - **Build command:** `npm install` (nothing gets installed, but Render expects a build command)
   - **Start command:** `npm start`
   - **Health check path:** `/healthz`
4. Deploy. Render sets `PORT` automatically, and WebSockets work on Render web services with no extra setup.

> On Render's free plan the service sleeps after about 15 minutes with no visitors. The first visit then takes 30–60 seconds to wake it, so open the site a minute before class.

Games are kept in memory. Restarting or redeploying the service ends any games in progress.

---

## How a round works

1. **Challenge card**: one of five kinds:
   | Kind | Example | What it tests |
   |---|---|---|
   | Simple | `BIGGER?` `CHEAPER?` `QUIETER?` | the basic comparative |
   | Theme bonus | `HOTTER?` + "Food cards get +2 power" | categories + comparative |
   | Target | `CLOSEST IN SIZE to a bus` | estimating, not just "biggest wins" |
   | Limit | `BIGGEST… but it must be smaller than a dog` | two comparisons at once |
   | Combo | `BIGGER & FASTER?` | two attributes added together |
2. Each player plays **one word card** face down, plus **one optional action card**.
3. **Gambit**: players bet (or don't).
4. **Reveal**: cards flip, actions resolve in this order: Reverse → Swap → Boost/Shrink → Double → Steal. Shield and Mirror protect against targeted actions.
5. The winner gets 5 VP and bets are paid. Then the sentence appears.

Choose **5, 10 or 15 rounds**, or **Free Play**. The highest earner at the end wins. In Free Play there is no round limit; the host presses **Finish game** whenever they like.

### Action cards (16)
| Card | Qty | Effect |
|---|---|---|
| Reverse | 2 | Flips the challenge (bigger ↔ smaller, closest ↔ furthest) |
| Swap | 2 | Swap your played word card with another player's |
| Shrink | 2 | Another player's card loses 2 power |
| Boost | 3 | Your card gains 2 power |
| Shield | 2 | Blocks Swap, Shrink, Steal and Peek aimed at you |
| Mirror | 1 | Bounces a targeted action back at the sender |
| Peek | 2 | See another player's card before you bet |
| Double | 1 | Doubles the prize and all bets this round |
| Steal | 1 | Take a random card from another player's hand |

### How cards are judged
Every noun stores real-world values in `public/cards.js`:
**size** (metres), **weight** (kg), **speed** (km/h), **price** (US$), **loudness** (dB) and **temperature** (°C).

- Each value becomes a **power score from 1 to 10**, based on its rank across the whole deck. A mouse and a mountain can share one scale, and Boost/Shrink (±2) feel the same on every challenge.
- Ties are broken by the real value. An exact tie gives the sentence *"A cat is as fast as a fox!"*
- A card can be **out** for a challenge: *a house can't move*, *the sun can't be bought*, or *a horse isn't smaller than a dog*. Those cards can't win that round.
- If a power-up wins against the real facts, the game says so: *"A mouse wins with BOOST power! (Really, a cat is bigger than a mouse.)"*. Students never see a false sentence presented as true.

## Changing the cards

Everything is in **`public/cards.js`**:
- `ROWS`: one line per noun: `id, word, category, size, weight, speed, price, loudness, temperature, [phrase]`.
  Use `null` for "can't" (e.g. speed for a house). The optional phrase handles words like *"a bowl of soup"* or *"the sun"*.
- `ART`: the SVG drawing for each noun, drawn on a 100×100 grid.
- `ACTIONS`: the action cards and how many of each.

If you add or remove nouns, the deck size changes automatically. Power scores are recalculated when the server starts.

### Swapping in generated artwork later
Each card's picture is `ART[id]`. To use image files instead, put them in `public/cards/<id>.png` and change `ART[id]` to
`'<img src="/cards/<id>.png" alt="">'`. The rest of the game doesn't need to change.

## Files

```
server.js          game server: rooms, rules, bots, WebSocket, static files
public/cards.js    card data, stats, SVG art, challenge text and scoring (shared by server + browser)
public/client.js   tabletop UI, animations, betting, sound and read-aloud
public/style.css   styling
public/index.html  page shell
```
