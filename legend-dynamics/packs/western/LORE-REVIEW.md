# Trails of Blood & Dust: lore review

A working document for the author. It is **not** built into the guides, the creator or the site.

Every item carries one of these labels:

- **Approved** is in the guides now. It comes from the author's decisions.
- **Existing** is canon that hasn't changed.
- **Proposed** is a draft that needs approval before it becomes canon.
- **Open** is undecided; the guides say the GM rules until it is decided.

Folklore entries in section 4 are drafts written from the existing setting text and from widely known traditions. They still have to be reconciled with the author's folklore guide, which wasn't available for this pass.

---

## 1. What is now in the guides (approved)

### Three layers

There are three separate layers:

- **Local folklore** is player-facing.
- **The truth** is the GM's.
- **Lore cards** hold what the characters have established.

These are new sections:

- *Folklore, truth and lore cards* is in the Players' Guide.
- The rewritten *Weaknesses* section is in the GM's Guide, with a short note left in the Players' Guide.

### Scoped lore cards

A card holds only what the characters established. Later discoveries add more cards.

- **What it records:** subject, precise finding, limits, evidence or source, how it was learned, date, owner and recipients. The data is `discovery.scoped`.
- **The rules text:** the Players' Guide has *The lore card* and *Earning a lore card*.
- **A basis for a proposal.** An investigation proposal needs a reasonable basis. Stating the GM's secret answer earns nothing, and an idea is never rejected because it matches the truth. Ideas are free. The GM provides enough clues and more than one route.

### Weaknesses work without a card

This replaces the old rule ("a lore card is what lets a hunter use it on purpose").

- Called shots follow the ordinary combat rules.
- An unfamiliar ritual still needs its procedure, knowledge, skill and components.
- The rules engine never looked at cards. A test now pins this down (`engine/rules/test/core.test.mjs`).

### Ways to earn a card

There are four routes:

1. A discovery clock.
2. Something seen or tested firsthand.
3. A reliable account, such as a survivor, a grimoire, church archives or Shadow Knight records.
4. A creature's word, backed up by evidence.

The data is `discovery.routes`.

- A source's reputation alone doesn't guarantee accuracy.
- A fact established directly is recorded at once, with no full clock needed.

### Phases and gate preserved

The phases are unchanged: Confront the unknown, Identify, Uncover.

- **The Identify gate** now reads: confirmed creature knowledge doesn't apply until identity is confirmed. Hypotheses, tests and precautions are allowed before that, and true weaknesses still work.
- **Unchanged:** the Harvest (4 or 6 segments), Heat, Whispers, The Dark, and the failure and push costs. Proposing an idea adds no cost.

### Vampire lineages

These are in the GM's Guide under *Vampires*:

- natural source and lineage;
- killing the source restores the whole chain;
- killing an intermediate cures nobody;
- there are multiple natural sources;
- a stake incapacitates and doesn't release the lineage;
- wounds already regenerated stay healed;
- unhealed wounds have their human consequences at once;
- reversion repairs nothing;
- this cure applies to vampires only.

The turning procedure is unchanged: a vampire who drains a victim to Dying can choose to turn them.

### Wendigo

- Ordinary weapons wound it, and the existing one-box cap except for fire is kept.
- Only fire interferes with its regeneration.
- Destruction needs decapitation and burning.
- The headless body lashes out blindly.

The icy-heart requirement is removed everywhere: the weakness table, the threat, the lore-card subject and the GM's Guide.

### Hellhounds

- The hunt is a curse tied to a claim on a soul.
- It ends when the claim's conditions are resolved or changed, or through a major ritual by a powerful practitioner.
- Holy water protects for a time and doesn't cancel the pact.
- Whether destroying its body buys time is left **open**.

### The shadow realm

- It is one cohesive reality with an independent, brutal ecology. It is not an alternate Earth, and there are no multiverses or time travel.
- Some creatures cross over and spread contagion; others don't.
- Fallen angels are an unsettled belief.

### Demons

The guide now distinguishes three kinds:

- demonic creatures native to the shadow realm;
- creatures under demonic influence;
- true demons native to the Abyss: no light, eldritch powers, not fire, no literal fiery hell.

Further approved points:

- **Entry.** A true demon needs summoning or possession to enter our world.
- **Possession vulnerability.** It needs both corruption and a complete absence of faith of any kind.
- **The encounter.** It is framed as a ritual or a negotiation, not a combat profile.
- **Talisman banishment.** The host's outcome depends on the talisman; the holy-sword example is included.
- **Ritual banishment.** It preserves the host if the body can survive.
- **A possessed body.** It is animated through fatal wounds, without healing. Bodily injury doesn't kill the demon, and this is not regeneration.

### Rituals and remedies

Every remedy and ritual has a procedure: requirements, time, rolls, components, interruption and failure. That principle is stated in the guides. The numbers are **proposed** (section 3).

### Data changes

- **Lore-card subjects:**
  - the vampire, wendigo and demon texts are updated;
  - Hellhound is added (it is now a Hunter's Almanac option);
  - the almanac is still three cards.
- **Threats:** the wendigo and hellhound trait texts are updated. No numbers changed.

### Tools

- **GM view → Discovery → Record a finding without a clock.** It gives a scoped card to the chosen recipients, with an owner and shared copies.
- **Minting** in a scoped setting no longer pre-fills the creature's whole profile, and it needs a finding.
- **The player's card editor** has the new fields.
- Old cards and old character files load unchanged, with the new fields empty.

### Not changed

- Existing identifiers, URLs, saved-character format (fields were only added), other settings, the Discord bot, and the Grimm and Pelion apps.
- Saved cards keep their old text. A character file whose Hunter's Almanac card says "heart of ice" keeps it until the player re-picks the card.

---

## 2. Access model (report)

| Material | Who can see it today |
|---|---|
| Players' Guide (`players-guide.md`, `.docx`, the creator's Guide tab, the website download) | Everyone. |
| GM's Guide (`gm-guide.md`, `.docx`, the website download) | Everyone. Its own introduction says "anyone can read it". |
| The creator page | Everyone. It embeds the **whole setting pack** as JavaScript (`const PACK = …`): the threats, every weakness, and every lore-card subject's full truth. Any player can read it with *View source*, or open the **GM view** tab, which has no login. |
| The website | A static Cloudflare Pages site with no authentication. Collapsed sections and CSS hide nothing from someone who looks. |
| Discord bot | Pack data on the server side. Players see only what commands print. |

**Conclusion:** at present GM material is protected only by the honor system. Options, which are an **author decision**:

- **(a) Keep the honor system.** Label GM sections clearly. This is the status quo.
- **(b) Two builds.** A player creator and guide with the GM truth stripped from the pack, plus a GM bundle shared privately (a file or a private link). This is moderate work in `tools/build-legend.py`.
- **(c) Cloudflare Access** in front of a `/gm/` path that serves the GM build. It is free for small groups and needs dashboard setup. It only helps if (b) also strips the truth from the public build.

---

## 3. Proposed mechanics (not canon)

Each is a draft for review. Nothing below is in the guides.

### 3.1 Wendigo regeneration (open → proposal)

- **Rate.** At the end of each of its turns, the wendigo clears **1 box** that wasn't marked by fire.
- **Fire suppression.** A box marked by fire doesn't heal **for the rest of the scene**. *Alternative:* fire stops all its healing until the end of its next turn.
- **Between scenes.** It clears every box not marked by fire by the next nightfall.

### 3.2 The headless wendigo (open → proposal)

- After it is beheaded, the body acts at the end of each round. It makes one Brawling attack at its usual target −4, at a random character within reach. If no one is in reach, it moves its full Move in a random direction.
- It can't defend, and it can't be Dazed or Pinned.
- Fire that marks a box stops it; burning the body takes **one minute** (about ten rounds) of a fire kept going. Until the body has burned, the wendigo can still regenerate as in 3.1, and a body left unburned rises whole at the next nightfall.

### 3.3 Destroying a hellhound's body (open: options only)

The author decided this is unresolved. These are options, not a recommendation:

- **(A)** No time is bought. Another hound arrives at the next nightfall.
- **(B)** It buys a fixed respite: until the next new moon.
- **(C)** It starts a 4-segment **Return** clock that ticks once a day. The hunt resumes when it fills.

### 3.4 Demon classification (proposal, not canon)

Organized around influence, manifestation and what opposes them:

| Kind | Influence | Manifestation | Opposed by |
|---|---|---|---|
| Minor demonic creature (shadow realm) | Little or none; a predator | Physical, already in our world when it has crossed | Ordinary harm; holy water hurts it |
| Major demonic creature (shadow realm) | Fear; can sway the weak-willed | Physical | Holy water; Significant wards; fire |
| Creature under demonic influence | Whatever the demon pushes through it | Its own body | Breaking the influence: a Significant ritual, or cutting off the demon behind it |
| Minor true demon | Whispers, temptation, small bargains | Summoning circle, or possession of a corrupted, faithless host | A Significant banishment ritual; a minor holy talisman |
| Major true demon | Bargains that bind towns; possession | Summoning by a Major ritual only, or possession | A Major banishment ritual; a powerful holy talisman (a relic) |

### 3.5 Possession resolution (open → proposal)

- **Faith (open).** Two candidate definitions:
  - **(i)** any sincere belief in something beyond oneself: a church, a tradition, the spirits, a sworn cause;
  - **(ii)** religious faith only.
- **Corruption (open).** Candidates are a full **The Dark** track, or a story condition (a pact, a murder for gain).
- **Resolution (proposal).** When an eligible character is targeted, the character rolls **Will** against the demon's **Presence** target in a contest; the character wins ties. On a loss, the demon holds them for the scene. Each scene the host can roll again; a companion's Persuasion or Leadership assists.
- **Stabilizing a possessed host before banishment (open).** One option: a Medicine roll at −4 stabilizes, but the demon may refuse it with a Will contest.

### 3.6 Ritual procedures (the requirement is approved; these numbers are proposed)

All use the *Magic* ritual clock (Occult rolls at the tradition's pace) unless a remedy says otherwise.

| Procedure | Requirements | Time and rolls | Components (proposed) | Interruption | Failure |
|---|---|---|---|---|---|
| Zombie treatment *(existing: a Medicine roll with an Occult remedy stops the Infection clock)* | Medicine Trained; an Occult remedy prepared beforehand (a Minor ritual, or a folk remedy from a practitioner) | One Medicine roll, −2 if the Infection clock is half full or more; 10 minutes | The remedy, clean water, a blade to open the bite | The roll is lost and the clock ticks | The clock ticks; one more try after the next tick |
| Lifting a curse (werewolf: existing Major "for a month") | Occult Specialty; the curse's source named | Major: 6 segments; 1 roll per hour | Something of the one who laid the curse; silver | Lost segments return to 0 | The Dark +1, and the cursed person suffers the curse's effect at once |
| Binding a ghost | Occult Trained; the ghost's name or its bones | Significant: 4 segments; 10 minutes a roll | Salt circle, an iron nail, its grave dirt | The ghost acts freely for the scene | The ghost attacks the binder: Will roll or flee |
| Demon banishment | Occult Specialty; the demon's name or the binding's terms; one practitioner of faith present, if faith becomes part of possession (3.5) | Major: 6 segments; 1 roll per 10 minutes; the demon may oppose each roll (contest) | A holy object; the summoning's anchor, if any | The demon takes a free action, and the clock loses 2 segments | The Dark +2; the demon may make one demand |
| Hellhound pact intervention | A powerful practitioner (Occult Expert); the terms of the claim known | Major: 6 segments; 1 roll per hour, at night only | Something of the quarry's; holy water | The hound arrives at once | The pact tightens: −2 on the next attempt, and the hunt quickens |

### 3.7 Werewolf silver and toughness (open)

- The weakness table says silver gives "an extra box, and its toughness doesn't help".
- The **werewolf threat's data** only lifts its one-box cap for silver: there is no extra box.
- The **werewolf origin** (a player character) has Tough plus a silver weakness.

Decide which is canon for the threat, then bring the threat data or the table into line.

### 3.8 Witch curse removal (open)

The witch's Hex trait has no removal procedure. Options:

- **(a)** It ends when the witch dies.
- **(b)** It ends when the link (hair, blood, a name) is destroyed.
- **(c)** A Significant ritual lifts it.

### 3.9 Banshee recurrence (open)

She follows a bloodline and leaves at dawn if the one she keens for lives. Not yet set:

- when she returns for the same family;
- whether surviving her keening ends her claim on that person;
- whether she can be ended at all.

---

## 4. Threat audit (draft; reconcile folklore with the folklore guide)

Each threat is described under these headings:

- **Folklore**: what townsfolk say (player-facing; may be wrong).
- **Truth**: the GM's truth.
- **Clues**: what an investigation can find.
- **Counters**: countermeasures.
- **Transmission**: how it spreads, where defined.
- **Temporary**: temporary protection.
- **Permanent**: how it is ended for good.
- **Discoveries**: example scoped cards.
- **Open**: unresolved decisions.

"Existing" marks text that is already canon.

### Hired gun · Outlaw (ordinary people)

- **Folklore:** none.
- **Truth:** ordinary people (existing: Numbers; Quick draw).
- **Clues:** witnesses, wanted posters, tracks, who's paying.
- **Counters:** the law, a gunfight, a better offer.
- **Permanent:** arrest, death or a bargain.
- **Discoveries:** none needed.
- **No supernatural vulnerabilities.**

### Zombie

- **Folklore:** "the dead walk where a witch or a plague has been"; burn the dead.
- **Truth (existing):** only a headshot (−2) or fire puts one down.
- **Clues:** opened graves, slow tracks, bite wounds.
- **Transmission (existing):** a bite that marks a box starts the Infection clock (4 segments, hourly).
- **Temporary:** walls; distance (they're slow).
- **Permanent:** a headshot or fire, per zombie. The source (if any) is **open**.
- **Discoveries:** "A head shot put it down"; "Infection ran its course in four hours".
- **Open:** the treatment procedure (3.6); whether every zombie outbreak has a source.
- **Note:** the contagious zombie is a 20th-century film idea. The Haitian *zonbi* is a different, historical belief; keep the game's version distinct from it.

### Ghoul

- **Folklore:** grave-robbers that aren't men.
- **Truth (existing):** it eats corpses, flees daylight and fire, and won't go onto holy ground.
- **Clues:** emptied graves, drag marks, bones gnawed.
- **Counters:** fire, daylight, holy ground (existing).
- **Temporary:** consecrated ground.
- **Permanent:** fire or daylight.
- **Discoveries:** "It would not cross the churchyard wall".
- **Note:** the name comes from Arabic *ghūl*; the game's ghoul is a game invention.

### Werewolf

- **Folklore:** silver, wolfsbane, the full moon, a bite.
- **Truth (existing):** silver (see 3.7), wolfsbane keeps it away, it is forced to change under the full moon, and Relentless (only silver marks more than 1 box).
- **Clues:** killings on full-moon nights, wolf tracks that end in boot prints, a newcomer with healing wounds.
- **Transmission (existing):** a bite under the full moon can pass the curse on (GM decides).
- **Temporary:** wolfsbane; locking the person away at moonrise.
- **Permanent:** death by silver, or a Major ritual that lifts the curse for a month (existing). A permanent cure is **open**.
- **Discoveries:** "Silver buckshot made it bleed".
- **Open:** silver and toughness (3.7).

### Vampire

- **Folklore:** stakes, garlic, crosses, invitations, sunlight.
- **Truth (approved):** see *Vampires* (lineages). Existing: a stake incapacitates; fire, sunlight and beheading destroy; holy symbols hold it back; it can't enter uninvited; Mesmerize.
- **Clues:** bodies drained white, a stranger who's never seen by day, a grave disturbed from inside, victims who sicken and change.
- **Transmission (existing and approved):** drained to Dying, and turned by choice. The turned join the lineage.
- **Temporary:** holy symbols, refusing entry, daylight, the stake.
- **Permanent:** destroy it. Destroying the natural source restores the whole lineage.
- **Discoveries:**
  - "The stake held it; pulling it freed it";
  - "When the Ferris woman died, her husband turned human again" (evidence of a lineage);
  - "Killing the one who turned him cured nobody" (an intermediate).
- **Open:** how characters can learn who a lineage's natural source is. Clue routes are needed.

### Ghost

- **Folklore:** unfinished business; don't speak to it.
- **Truth (existing):** it can't be hurt; it is laid to rest by finishing its business or bound by a ritual; Haunting.
- **Clues:** cold spots, repeated events, who died here.
- **Counters:** finishing its business; a binding.
- **Temporary:** leaving the place; salt, if the author wants it (**open**).
- **Permanent:** rest, or binding.
- **Discoveries:** "It wants the deed returned".
- **Open:** the binding procedure (3.6).

### Wraith

- **Folklore:** a cold that kills; salt in the coffin.
- **Truth (existing):** only silver, cold iron, salt and fire hurt it; it can't cross salt or iron filings; it is destroyed for good only when its bones are burned; Life-drinker.
- **Transmission (existing):** someone it kills rises as a wraith at the next new moon unless buried with salt in the coffin.
- **Temporary:** a line of salt or iron.
- **Permanent:** burn its bones.
- **Discoveries:** "It stopped at the salt line".

### Banshee

- **Folklore:** her keening means a death in the family.
- **Truth (existing):** weapons don't touch her; she leaves at dawn if the one she keens for is still alive; silver or an iron bell silences her for the scene; she is tied to a bloodline.
- **Clues:** family history, deaths that follow a name.
- **Temporary:** silver, an iron bell; keeping the one she keens for alive till dawn.
- **Permanent:** **open** (3.9).
- **Note:** from the Irish *bean sídhe*. The silver and iron details are game inventions.

### Witch

- **Folklore:** the evil eye, poppets, hair and nail clippings.
- **Truth (existing):** a person who works hexes through a link.
- **Clues:** poppets, stolen hair, who profits.
- **Counters:** break her link; fight her as a person (3 boxes).
- **Temporary:** a folk talisman against hexes (existing Talisman Edge).
- **Permanent:** the law, death or a bargain.
- **Open:** curse removal (3.8).
- **No vulnerabilities beyond being mortal.**

### Skinwalker

- **Folklore:** don't meet its eyes; don't say its name.
- **Truth (existing):** a person underneath. In a stolen shape, ordinary wounds mark only 1 box; it is mortal in its own shape; its true name forces it back for the scene.
- **Clues:** animal tracks that change, voices of the absent.
- **Counters:** its true name.
- **Permanent:** kill it in its own shape.
- **Note: sensitive.** The name comes from Diné (Navajo) tradition (*yee naaldlooshii*), which many Diné people prefer not to discuss. The game's mechanics are inventions. **Author decision:** keep the name with a note, or rename the threat to a game term.

### Hellhound

- **Folklore:** the black dog that comes for the damned.
- **Truth (approved):** see *Hellhounds*. Existing: it always finds its quarry; holy water drives it off.
- **Clues:** the quarry's past, the pact's terms, who else the hound has taken.
- **Temporary:** holy water.
- **Permanent:** resolve or change the claim; a Major ritual by a powerful practitioner.
- **Discoveries:** "Holy water drove it off till dawn; the hunt went on".
- **Open:** whether killing its body buys time (3.3); the intervention procedure (3.6).
- **Note:** the black dog of British and European folklore. Its pact is a game choice.

### Wendigo

- **Folklore:** a hunger that takes those who ate people in the starving winter; it calls in the voices of the lost.
- **Truth (approved):** see *The wendigo*. Existing: strongest in deep winter, weakest in summer heat.
- **Transmission (existing):** the Hunger clock for a character who eats human flesh; only a Major ritual lifts it.
- **Temporary:** fire; summer.
- **Permanent:** behead it and burn the body.
- **Discoveries:** "Fire kept its wounds open"; "Beheaded, it kept swinging".
- **Open:** regeneration rate, fire duration, undirected attacks (3.1, 3.2).
- **Note: sensitive.** From Algonquian-speaking peoples' traditions (*windigo*, among other spellings). The game's regeneration, fire and beheading rules are inventions, not those traditions' beliefs.

### Revenant gunslinger

- **Folklore:** a killer too mean to stay dead.
- **Truth (existing):** it rises at the next midnight unless its grave is salted and burned.
- **Clues:** an empty grave, its old feuds.
- **Temporary:** daylight is **open**.
- **Permanent:** salt and burn its grave.
- **Discoveries:** "It came back after we buried him".

### Headless Rider

- **Folklore:** hide over running water.
- **Truth (existing):** its head is hidden near where it died; laid back in the grave, the rider rests; it can't cross running water; Hell-ridden.
- **Temporary:** a bridge over running water.
- **Permanent:** return the head to the grave.
- **Note:** a European and American literary tradition, including Irving's *Legend of Sleepy Hollow* (1820).

### Demon (lore and weakness tables only; not a threat entry)

- **Folklore:** the Devil at the crossroads; holy water.
- **Truth (approved):** see *Demons*. Existing: holy water burns it; it must keep a bargain to the letter.
- **Clues:** a summoning's traces, a possessed person's changes, the bargain's terms.
- **Temporary:** holy water; bargain terms.
- **Permanent:** banishment, by a powerful holy talisman or a completed ritual.
- **Open:**
  - the classification (3.4);
  - possession, faith, corruption and stabilization (3.5);
  - the banishment procedure (3.6);
  - whether holy water affects true demons and demonic creatures alike.
- **No generic combat profile by design.**

---

## 5. Waiting for the folklore guide

These parts of the request need the author's folklore guide, which wasn't available in this session:

- the **eighteen adventure seeds** (to keep as editable proposals);
- the **regional guide**, by region, supported locality and period (1860–64, 1865–69, 1870–74, 1875–79, 1880–84, 1885–89, with 1890 separately), with documentary dates, alleged event dates and fictional placement kept apart;
- the **local folklore** entries above, to reconcile;
- what the **Shadow Knights** are (the guides now mention their records as one reliable source, without describing them).
