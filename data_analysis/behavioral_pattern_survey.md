# Odd Bird Out — Player Behavioral Pattern Survey

**Dataset:** 56 sessions across June 25, 27, and 28, 2026  
**Total observations:** 336 player-phase sequences (168 trust + 168 ostracism)  
**Unique exact action sequences:** 182 distinct patterns

---

## 1. Categorized Strategy Patterns with Frequencies

### A. Top-Level Categorization

| Category | Combined | Trust Phase | Ostracism Phase |
|----------|----------|-------------|-----------------|
| **Frequent Switcher (2 targets)** | 214 (63.7%) | 116 (69.0%) | 98 (58.3%) |
| **Two-Target Infrequent Switcher** | 42 (12.5%) | 19 (11.3%) | 23 (13.7%) |
| **Two-Target With Dominant Preference** | 24 (7.1%) | 11 (6.5%) | 13 (7.7%) |
| **Loyal To One Partner** | 23 (6.8%) | 8 (4.8%) | 15 (8.9%) |
| **Strict Alternator** | 19 (5.7%) | 9 (5.4%) | 10 (6.0%) |
| **Two-Target With Occasional Hide** | 9 (2.7%) | 4 (2.4%) | 5 (3.0%) |
| **Frequent Hider (3-4 hides)** | 4 (1.2%) | 1 (0.6%) | 3 (1.8%) |
| **Almost Always Hides (5-6 hides)** | 1 (0.3%) | 0 (0.0%) | 1 (0.6%) |

### B. Detailed Sub-Categories

#### 1. Loyal To One Partner (6.8%) — 23 instances

Players who share with the **exact same target** every round (or at least 4-5 of 6 rounds with no second target ever used).

- **Trust phase:** 8 instances
- **Ostracism phase:** 15 instances (more common — some players lock in during Phase 2)

Target distribution among single-target loyalists:

| Target | Instances |
|--------|-----------|
| A | 7 |
| B | 8 |
| C | 8 |

#### 2. Strict Alternator (5.7%) — 19 instances

Players who follow an exact alternating pattern — target swaps every single round like a metronome.
Examples: `C→B→C→B→C→B`, `A→B→A→B→A→B`, `B→A→B→A→B→A`

- **Trust phase:** 9 instances
- **Ostracism phase:** 10 instances
- Notable: Some players alternate identically in both phases (e.g., session `028716e6` player A alternates B-C-B-C-B-C in both phases).

#### 3. Two-Target Infrequent Switcher (12.5%) — 42 instances

Players who use both available targets but switch only **1-2 times** across 6 rounds. They tend to share with one partner for a long run, then switch once or twice.

Typical run patterns: `3-3` (3 rounds with A, 3 with B), `4-2`, `2-4`, `5-1`

#### 4. Two-Target With Dominant Preference (7.1%) — 24 instances

Players who switch 3+ times but have a clear favorite (≥70% of shares go to one target). More switching than "Infrequent Switcher" yet with a clear preference ratio.

#### 5. Frequent Switcher (2 targets) (63.7%) — 214 instances

The largest category. Players who share every round, use both partners, and switch targets 3-5 times. Sub-patterns include:

| Run Pattern | Count | Description |
|------------|-------|-------------|
| `1-1-1-1-1-1` (changes every round, non-alternating) | 23 | Chaotic, swaps every round but not in strict A-B-A-B order |
| `1-2-2-1` | 20 | Two medium runs sandwiched by singles |
| `2-1-1-1-1` | 19 | One pair then four singles |
| `1-1-2-2` | 18 | Two rounds A, two singles, two rounds B |
| `1-1-1-1-2` | 17 | Four singles then a pair |
| `2-2-2` | 16 | Three runs of two each |
| `1-2-1-1-1` | 16 | One single, one pair, three more singles |
| `1-2-1-2` | 12 | Alternating single-double |

#### 6. Hide-Containing Patterns (4.2%) — 14 instances

**Two-Target With Occasional Hide (9 instances):**
Players who share most rounds but intersperse 1-2 hides.

**Frequent Hider (4 instances, 3-4 hides):**
Players who hide in half or more of the rounds.

**Almost Always Hides (1 instance):**
- Session `f8d42940` player C (ostracism): shared once then hid 5 rounds.

---

## 2. Detailed Findings

### Target Switching Behavior

| Target changes across 6 rounds | Count | Percentage |
|-------------------------------|-------|------------|
| 0 changes (loyalist) | ~22 | 6.5% |
| 1 change | 22 | 6.5% |
| 2 changes | 44 | 13.1% |
| 3 changes | 74 | 22.0% |
| 4 changes | 98 | 29.2% |
| 5 changes | 73 | 21.7% |

**73% of player-phases involve 3 or more target switches.** Only 6.5% show zero switching.

### Hide Behavior

| Hide count per phase | Count | Percentage |
|---------------------|-------|------------|
| 0 hides | 321 | 95.5% |
| 1-2 hides | 10 | 3.0% |
| 3-4 hides | 4 | 1.2% |
| 5-6 hides | 1 | 0.3% |

Hide actions are rare (4.5% of all sequences contain any hide).

### Reciprocity Influence

When a player's target **did** reciprocate (shared back in the same round):
- 44% stayed with that same target the next round
- 56% switched to the other target

When a player's target did **NOT** reciprocate:
- 49.2% stayed with that same target next round
- 50.8% switched

The difference is small (5 points) and in the **opposite** direction of what "following reciprocity" would predict. Reciprocity does not strongly drive target selection.

### Phase-to-Phase Consistency

Of 168 individual players tracked across both phases:
- **86 (51.2%)** kept the same behavioral category from trust to ostracism
- **82 (48.8%)** changed category between phases

Notable shifts:
- **Loyalty emerges in Phase 2:** 8 trust loyalists grew to 15 ostracism loyalists
- **Frequent Switchers decrease:** 116 (69%) in trust → 98 (58.3%) in ostracism
- **Hide behaviors increase:** 5 hider instances in trust → 8 in ostracism

---

## 3. Patterns That Don't Fit Neatly

| Pattern | Instances | Description |
|---------|-----------|-------------|
| **Hide cluster in middle** | 3-4 | Player shares first few rounds, hides 2-3 in a row, returns to sharing |
| **Late-game dropout** | 3 | Player shares 3-4 rounds then goes silent |
| **Hide-dispersed** | 4 | Hides scattered across early, middle, and late rounds |
| **One-off hide in switching** | 4 | Mostly alternating/switching but one hide inserted |
| **Phase-in hider** | 1 | Shared once then vanished for 5 rounds |
| **"Bystander" lock-in** | Several sessions | 2 players form a mutual pair for all 6 rounds while the third is always excluded |

---

## 4. Most Common Exact Sequences (Top 10)

| Frequency | Pattern | Description |
|-----------|---------|-------------|
| 9× | `A A A A A A` | Single-target loyalist (to A) |
| 7× | `B B B B B B` | Single-target loyalist (to B) |
| 6× | `C C C C C C` | Single-target loyalist (to C) |
| 6× | `C A A C C A` | Two-target, 3 switches |
| 5× | `A B A B A B` | Strict alternator |
| 5× | `A B B A A B` | Two-target, 2 switches |
| 5× | `C A A C C C` | Two-target, 1 switch |
| 4× | `B C B C B C` | Strict alternator |
| 4× | `B A B A B A` | Strict alternator |
| 4× | `A B B B B B` | Dominant preference (mostly B) |

---

## 5. Key Takeaways

1. **No single dominant pattern** — 182 unique sequences from 336 observations means high behavioral diversity.
2. **Two-target sharing is the norm** — 94% of all sequences use exactly 2 partners (the two other players).
3. **Frequent switching (3-5 changes in 6 rounds) dominates** — 72.9% of sequences. Players do not settle on a fixed target.
4. **Hide actions are rare (4.5%)** but meaningful when they occur — they signal disengagement or timeout.
5. **Reciprocity barely influences target choice** — only a 5-percentage-point difference in stay rates between reciprocated and non-reciprocated rounds.
6. **Players become slightly more loyal in Phase 2** — single-target loyalty nearly doubles from trust (4.8%) to ostracism (8.9%).
7. **Some players (6.5%) are pathologically loyal** — they share with the same person all 6 rounds regardless of whether they get anything back.
8. **Sessions where one player is structurally excluded** ("bystander lock-in") occur repeatedly — an emergent group dynamic worth further investigation.
