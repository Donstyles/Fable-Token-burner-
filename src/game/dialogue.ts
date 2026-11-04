/**
 * The villagers' talk and the first quests (DESIGN.md 16.7). A dialogue is a greeting and a
 * list of topics, as MM6's NPC windows were: a line of plain talk, a rumour that changes each
 * time, or a quest, which the topic itself carries through its stages: offered on the first
 * asking, open while the party works at it, ready when the party comes back with it done,
 * and over once the reward is paid. The prose is the game's voice; keep it short, spoken
 * and particular to Gullhaven, never generic.
 */
import type { QuestDef } from './quests';

export const QUESTS: Record<string, QuestDef> = {
  'tobins-sheep': {
    id: 'tobins-sheep',
    title: "Tobin's Sheep",
    text:
      "Bandits on the coast road took two of Old Tobin's ewes. He pays a hundred and fifty " +
      'gold to see three of them driven off.',
    objectives: [
      {
        kind: 'kill',
        monster: 'bandit',
        count: 3,
        text: 'Drive three bandits off the coast road',
      },
      { kind: 'talk', npc: 'villager-man', text: 'Tell Old Tobin at his farm gate' },
    ],
    reward: { gold: 150, xp: 2400 },
  },
  'goblins-in-the-hills': {
    id: 'goblins-in-the-hills',
    title: 'Goblins in the Hills',
    text:
      'Maren has seen goblin scouts on the slope below the hills where the north road ends. ' +
      'Two of them driven off is worth eighty gold to her.',
    objectives: [
      {
        kind: 'kill',
        monster: 'goblin-scout',
        count: 2,
        text: 'Hunt two goblin scouts below the hills',
      },
      { kind: 'talk', npc: 'villager-woman', text: 'Tell Maren by the well' },
    ],
    reward: { gold: 80, xp: 1200 },
  },
  'the-old-halls': {
    id: 'the-old-halls',
    title: 'The Old Halls',
    text:
      'The dead come up out of the old halls under the goblin hills, through the cave where ' +
      'the north road ends, and walk on the headland by night. Old Tobin pays three hundred ' +
      'gold to have five of them put back in the ground and whatever drives them put down.',
    objectives: [
      {
        kind: 'kill',
        monster: 'skeleton-warrior',
        count: 5,
        text: 'Put down five of the walking dead, in the old halls or on the headland',
      },
      {
        kind: 'kill',
        monster: 'skeleton-warden',
        count: 1,
        text: 'Put down their warden in the deepest hall, behind the locked door',
      },
      { kind: 'talk', npc: 'villager-man', text: 'Tell Old Tobin at his farm gate' },
    ],
    reward: { gold: 300, xp: 5600 },
  },
  // The three of the town's errands (DESIGN.md 17.20): one carried, one walked, one fought.
  'a-letter-for-garrick': {
    id: 'a-letter-for-garrick',
    title: 'A Letter for Garrick',
    text:
      'Ida at the stalls has written to Garrick the woodcutter, whose glade lies off the west ' +
      'track past the crossroads. She pays sixty gold to see her letter in his hands and nobody ' +
      "else's.",
    objectives: [
      {
        kind: 'deliver',
        item: 'letter',
        npc: 'woodcutter',
        text: "Carry Ida's letter to Garrick at the woodcutter's glade, off the west track",
        label: 'A letter from Ida',
        reply:
          'From Ida? Give it here. Hm. Hm. Well. You need not stand there while I read it twice. ' +
          'Tell her... no. Tell her I will come down to the square myself, cart or no cart, ' +
          'and say it. Go on. And thank you.',
      },
      { kind: 'talk', npc: 'ida', text: 'Tell Ida at the stalls that Garrick has it' },
    ],
    reward: { gold: 60, xp: 960 },
    gives: ['letter'],
  },
  'the-fire-at-the-stones': {
    id: 'the-fire-at-the-stones',
    title: 'The Fire at the Stones',
    text:
      "Wen the fisher's brother has seen a fire among the standing stones in the west wood, " +
      'three nights running, and shapes about it. Wen pays forty gold to know what burns there.',
    objectives: [
      {
        kind: 'reach',
        point: 'stones',
        text: 'Go up the west track from the crossroads to the standing stones and see what burns there',
      },
      { kind: 'talk', npc: 'fisher', text: 'Tell Wen on the quay' },
    ],
    reward: { gold: 40, xp: 800 },
  },
  'the-brigands-camp': {
    id: 'the-brigands-camp',
    title: "The Brigands' Camp",
    text:
      'With the bandits driven off the coast road, their betters have come down from the city ' +
      'to take it back: brigands, camped where the road ends under the western ridge. Reeve ' +
      'Halloran pays two hundred and fifty gold of the town’s for three of them.',
    objectives: [
      {
        kind: 'kill',
        monster: 'brigand',
        count: 3,
        text: 'Put down three brigands at the far end of the coast road, under the western ridge',
      },
      { kind: 'talk', npc: 'reeve', text: 'Tell Reeve Halloran on the square' },
    ],
    reward: { gold: 250, xp: 4800 },
  },
  // Harrowmere's five (DESIGN.md 17.22): the shire's troubles, dearer than Gullhaven's.
  'the-nomads-camp': {
    id: 'the-nomads-camp',
    title: "The Nomads' Camp",
    text:
      'Horse people off the eastern downs have camped on Harrow’s common and take what they ' +
      'like from the drovers. Alderman Pell pays three hundred gold of the town’s to see their ' +
      'chieftain dead and the camp broken.',
    objectives: [
      {
        kind: 'kill',
        monster: 'nomad-chieftain',
        count: 1,
        text: 'Kill the nomads’ chieftain at their camp on the down, east along the track',
      },
      { kind: 'talk', npc: 'alderman', text: 'Tell Alderman Pell on Harrow’s square' },
    ],
    reward: { gold: 300, xp: 6400 },
  },
  'hesks-parcel': {
    id: 'hesks-parcel',
    title: 'Hesk’s Parcel',
    text:
      'Mother Hesk has a wrapped parcel for Goodman Oswy at the Grange, at the coast road’s ' +
      'end under the western ridge, and no one spare to carry it. Eighty gold when he has it.',
    objectives: [
      {
        kind: 'deliver',
        item: 'parcel',
        npc: 'granger',
        text: 'Carry Hesk’s parcel to Goodman Oswy at the Grange, west along the coast road',
        label: 'A parcel from Hesk',
        reply:
          'From Hesk? Then it is the new blade for the reaper, and a month before it is due. ' +
          'Tell her the Grange pays its debts at harvest, as it always has, and that she has ' +
          'my thanks before then. You will have hers, I think; she is fairer than she looks.',
      },
      { kind: 'talk', npc: 'herbwife', text: 'Tell Mother Hesk by the armourer’s' },
    ],
    reward: { gold: 80, xp: 1200 },
    gives: ['parcel'],
  },
  'tams-cart': {
    id: 'tams-cart',
    title: 'Tam’s Cart',
    text:
      'Bandits at a halt on the down road took Tam the Drover’s cart and his season’s wool. He ' +
      'pays a hundred and twenty gold for three of them put down.',
    objectives: [
      {
        kind: 'kill',
        monster: 'bandit',
        count: 3,
        text: 'Put down three bandits at their halt on the down road, under the beeches',
      },
      { kind: 'talk', npc: 'drover', text: 'Tell Tam at the stables' },
    ],
    reward: { gold: 120, xp: 2400 },
  },
  'the-barrow-knights': {
    id: 'the-barrow-knights',
    title: 'The Barrow Knights',
    text:
      'Two of the old kings’ knights have come up out of the barrows on the downs in their ' +
      'iron, and the dead walk after them. The Temple of Harrow pays four hundred gold to see ' +
      'the knights laid again.',
    objectives: [
      {
        kind: 'kill',
        monster: 'skeleton-knight',
        count: 2,
        text: 'Lay the two barrow knights at the mounds, at the down road’s end',
      },
      { kind: 'talk', npc: 'novice', text: 'Tell Sister Wyn on the temple lane' },
    ],
    reward: { gold: 400, xp: 8000 },
  },
  'black-orrin': {
    id: 'black-orrin',
    title: 'Black Orrin',
    text:
      'The smugglers in the cove have turned thieves under one Black Orrin and emptied the ' +
      'Grange’s granary. Goodman Oswy pays five hundred gold for Orrin dead in his den.',
    objectives: [
      {
        kind: 'kill',
        monster: 'bandit-captain',
        count: 1,
        text: 'Kill Black Orrin in the Thieves’ Den, through the smugglers’ cave at the cove',
      },
      { kind: 'talk', npc: 'granger', text: 'Tell Goodman Oswy at the Grange' },
    ],
    reward: { gold: 500, xp: 9600 },
  },
  // The campaign's thread through Gullhaven (docs/CAMPAIGN.md steps 3 and 4).
  'the-seal-and-the-stone': {
    id: 'the-seal-and-the-stone',
    title: 'The Seal and the Stone',
    text:
      'The Warden of the Halls wore a bronze seal with a door cut in it. Brother Anselm would ' +
      'read it against the lettered stone; he pays two hundred gold of his own for the chance.',
    objectives: [
      {
        kind: 'deliver',
        item: 'seal-of-the-halls',
        npc: 'anselm',
        text: 'Bring the Warden’s seal to Brother Anselm on the temple lane',
        label: 'The Warden’s seal',
        reply:
          'Bronze, and a door cut in it, one door. So the stone was not raving: the halls are ' +
          'the first of the seven, and this was their warden’s. I will keep it under the altar, ' +
          'where the dead cannot come for it. Now hear me: Sister Wyn in Harrowmere copies the ' +
          'stones, and the second stone is hers. Three days west along the coast road. Tell her ' +
          'what you carried, and what you killed to carry it. Two hundred gold for the telling, ' +
          'and the first thing I have ever been sure of.',
      },
    ],
    reward: { gold: 200, xp: 4000 },
  },
  'the-goblin-king': {
    id: 'the-goblin-king',
    title: 'The Goblin King',
    text:
      'The scouts came from somewhere: a warren in the second hill, up a track from the goblins’ ' +
      'camp, where one Grik calls himself lord of it. Maren and the mothers of Gullhaven have put ' +
      'together three hundred and fifty gold to see him dead.',
    objectives: [
      {
        kind: 'kill',
        monster: 'goblin-grik',
        count: 1,
        text: 'Kill Grik the Warren-Lord in the goblins’ warren, up the track from their camp',
      },
      { kind: 'talk', npc: 'villager-woman', text: 'Tell Maren by the well' },
    ],
    reward: { gold: 350, xp: 7200 },
  },
  // Harrowmere's stretch of the thread (docs/CAMPAIGN.md steps 5 to 7).
  'the-chart': {
    id: 'the-chart',
    title: 'The Sea Kings’ Chart',
    text:
      'The Grange kept a chart on sealskin from the old days, the coast and seven marks on it, ' +
      'until the smugglers took it with the grain. Sister Wyn would read it against the stones; ' +
      'she pays what the temple can spare, two hundred and fifty gold.',
    objectives: [
      {
        kind: 'deliver',
        item: 'sea-kings-chart',
        npc: 'novice',
        text: 'Bring the Sea Kings’ chart, from the smugglers’ den under the cove, to Sister Wyn',
        label: 'The Sea Kings’ chart',
        reply:
          'Sealskin, and the coast on it, our coast, with seven marks along it from the sea. ' +
          'Count them: the first on your headland at Gullhaven, under the ruin; the second here, ' +
          'under the oldest barrow; the third north, under the mere in the Mire, where the ' +
          'abbey stood. Doors, all of them, and the stone said the first is under the last star. ' +
          'Two hundred and fifty gold, and the priest can say what he likes.',
      },
    ],
    reward: { gold: 250, xp: 4800 },
  },
  'the-second-seal': {
    id: 'the-second-seal',
    title: 'The Second Seal',
    text:
      'The Barrow King wore an iron seal with two doors cut in it, the second warden’s. Sister ' +
      'Wyn will keep it with the chart and send word of it to Brother Anselm; she pays three ' +
      'hundred gold, and knows where the party must go next.',
    objectives: [
      {
        kind: 'deliver',
        item: 'seal-of-the-barrow',
        npc: 'novice',
        text: 'Bring the Barrow King’s seal to Sister Wyn on the temple lane',
        label: 'The Barrow King’s seal',
        reply:
          'Iron, and two doors cut in it. Two of three, then, and the third under the mere. I ' +
          'will send this to Anselm by the first carter I trust; he has the altar and the first. ' +
          'Now go north: the down road ends at the barrows, but a pass climbs the ridge behind ' +
          'them to the Mire, two days through the reeds. Fenwick is the village; ask for Brother ' +
          'Oddo at the ruined abbey’s gate. He has the last of the lore, and he has been afraid ' +
          'of it for twenty years. Three hundred gold, and come back whole.',
      },
    ],
    reward: { gold: 300, xp: 6400 },
  },
  // The Mire's stretch of the thread and its errands (docs/CAMPAIGN.md steps 8 to 10).
  'the-reed-holt': {
    id: 'the-reed-holt',
    title: 'The Reavers’ Holt',
    text:
      'Reavers hold the fen’s one knoll north-east of the mere and take the eel-boats as they ' +
      'please; a woman they call the Reed Queen leads them. Reeve Aldith pays six hundred gold ' +
      'of Fenwick’s to see her dead in her holt.',
    objectives: [
      {
        kind: 'kill',
        monster: 'reed-queen',
        count: 1,
        text: 'Kill the Reed Queen in the reavers’ holt, up the shore track past the mere',
      },
      { kind: 'talk', npc: 'fen-reeve', text: 'Tell Reeve Aldith before the Reed and Lantern' },
    ],
    reward: { gold: 600, xp: 12000 },
  },
  'the-lantern-road': {
    id: 'the-lantern-road',
    title: 'The Lantern Road',
    text:
      'The ferry’s far light at the causeway’s end has burnt untended since the drowned came ' +
      'up; Hob the ferryman wants to know whether his hut still stands. A hundred and fifty ' +
      'gold for the walk.',
    objectives: [
      {
        kind: 'reach',
        point: 'far-light',
        text: 'Walk the lantern road east along the shore to the far light at the causeway’s end',
      },
      { kind: 'talk', npc: 'ferryman', text: 'Tell Hob on the quay' },
    ],
    reward: { gold: 150, xp: 3200 },
  },
  'a-cure-for-the-ague': {
    id: 'a-cure-for-the-ague',
    title: 'A Cure for the Ague',
    text:
      'Hob the ferryman shakes with the fen ague and will not come up from his quay for a ' +
      'cure. Mother Gefa has brewed it; she pays a hundred and twenty gold to see it drunk.',
    objectives: [
      {
        kind: 'deliver',
        item: 'remedy',
        npc: 'ferryman',
        text: 'Carry Gefa’s remedy to Hob on the quay below the temple',
        label: 'Gefa’s remedy',
        reply:
          'From Gefa? Then it will be foul, and it will work. Give it here. Hah. Hah, that is ' +
          'bad. Tell her I drank it to the dregs and I am a new man and I hate her. And tell ' +
          'her thank you, since she will not hear it from me.',
      },
      { kind: 'talk', npc: 'wisewoman', text: 'Tell Mother Gefa by the well' },
    ],
    reward: { gold: 120, xp: 2400 },
    gives: ['remedy'],
  },
  'the-causeway-thugs': {
    id: 'the-causeway-thugs',
    title: 'The Causeway Thugs',
    text:
      'Hired men off the Harrowmere road hold the causeway from the pass and tax what comes ' +
      'down it; Pim the chandler has had two carts turned back. He pays two hundred and fifty ' +
      'gold for three of them put in the fen.',
    objectives: [
      {
        kind: 'kill',
        monster: 'thug',
        count: 3,
        text: 'Put down three of the thugs on the causeway between the pass and the village',
      },
      { kind: 'talk', npc: 'chandler', text: 'Tell Pim before his chandlery' },
    ],
    reward: { gold: 250, xp: 4800 },
  },
  'the-drowned-abbey': {
    id: 'the-drowned-abbey',
    title: 'The Drowned Abbey',
    text:
      'The brothers who stayed in the ruined abbey when the mere rose turned to the doors, and ' +
      'their Abbot has been opening them from his crypt for twenty years. Brother Oddo, the one ' +
      'who left, pays seven hundred gold to see him stopped.',
    objectives: [
      {
        kind: 'kill',
        monster: 'the-abbot',
        count: 1,
        text: 'Kill the Abbot in the crypt under the ruined abbey, through the cave at its gate',
      },
      { kind: 'talk', npc: 'brother', text: 'Tell Brother Oddo at the abbey’s gate' },
    ],
    reward: { gold: 700, xp: 14400 },
  },
  'the-confession': {
    id: 'the-confession',
    title: 'The Abbot’s Confession',
    text:
      'The Abbot wrote down what he learnt of the doors and what waits behind the first. ' +
      'Brother Oddo would read it, though he dreads it; two hundred gold for the pages.',
    objectives: [
      {
        kind: 'deliver',
        item: 'abbots-confession',
        npc: 'brother',
        text: 'Bring the Abbot’s confession to Brother Oddo at the abbey’s gate',
        label: 'The Abbot’s confession',
        reply:
          'His hand. I knew it at once; I copied under him for nine years. Give me a moment. ' +
          'Yes. The Sea Kings did not raise the doors to keep something in. They raised them to ' +
          'keep the sea out: the seventh door is the sea itself, and the first holds the rest. ' +
          'Behind the First Door sits the king who made them, and he has been waiting to be let ' +
          'out since before Gullhaven had a name. Here, two hundred gold, and I am sorry I read ' +
          'it to you.',
      },
    ],
    reward: { gold: 200, xp: 4800 },
  },
  'the-sunken-hall': {
    id: 'the-sunken-hall',
    title: 'The Sunken Hall',
    text:
      'The third door is the Sunken Hall under the mere, and its warden has come awake since ' +
      'the Abbot’s work. Brother Oddo pays nine hundred gold of the abbey’s buried silver to ' +
      'see the Warden of the Deep laid.',
    objectives: [
      {
        kind: 'kill',
        monster: 'the-drowned-warden',
        count: 1,
        text: 'Lay the Warden of the Deep in the Sunken Hall, through the cave on the mere’s north shore',
      },
      { kind: 'talk', npc: 'brother', text: 'Tell Brother Oddo at the abbey’s gate' },
    ],
    reward: { gold: 900, xp: 17600 },
  },
  'the-third-seal': {
    id: 'the-third-seal',
    title: 'The Third Seal',
    text:
      'The Warden of the Deep wore a seal of green stone with three doors cut in it. Brother ' +
      'Oddo will send it west with the party’s word to Brother Anselm in Gullhaven, where the ' +
      'First Door waits; four hundred gold for the carrying so far.',
    objectives: [
      {
        kind: 'deliver',
        item: 'seal-of-the-deep',
        npc: 'brother',
        text: 'Bring the Warden of the Deep’s seal to Brother Oddo at the abbey’s gate',
        label: 'The Warden of the Deep’s seal',
        reply:
          'Green stone, and three doors cut in it. Three of three. I will not keep this a night ' +
          'in the Mire; it goes west with you, and I will write to Anselm by the carter so he ' +
          'knows what you carry. Back down the pass, through Harrowmere, along the coast road ' +
          'to Gullhaven: the First Door is under the ruin on your headland, and the three seals ' +
          'open it. Four hundred gold, and whatever prayers a gatekeeper of nothing can say.',
      },
    ],
    reward: { gold: 400, xp: 8000 },
  },
  // The thread's end (docs/CAMPAIGN.md step 11).
  'the-first-door': {
    id: 'the-first-door',
    title: 'The First Door',
    text:
      'Three seals under the temple’s altar, and the First Door under the ruin on the headland, ' +
      'where a watchtower was built over what the Sea Kings shut. Brother Anselm gives the ' +
      'seals back and asks the party to go down and shut it for good: the Sea King waits behind ' +
      'it. Two thousand gold, every coin the three temples could find, and the coast’s thanks.',
    objectives: [
      {
        kind: 'kill',
        monster: 'the-sea-king',
        count: 1,
        text: 'Lay the Sea King in his throne hall behind the three doors of the Headland Undercroft',
      },
      { kind: 'talk', npc: 'anselm', text: 'Tell Brother Anselm on the temple lane' },
    ],
    reward: { gold: 2000, xp: 48000 },
    gives: ['seal-of-the-halls', 'seal-of-the-barrow', 'seal-of-the-deep'],
  },
  'the-barrow-king': {
    id: 'the-barrow-king',
    title: 'The Barrow King',
    text:
      'The knights were his. Under the oldest mound the Barrow King sits in his iron and sends ' +
      'the dead up; Sister Wyn says the temple will pay eight hundred gold, and the shire its ' +
      'thanks, to have him laid for good.',
    objectives: [
      {
        kind: 'kill',
        monster: 'barrow-king',
        count: 1,
        text: 'Lay the Barrow King in his chamber under the oldest mound, through the barrow cave',
      },
      { kind: 'talk', npc: 'novice', text: 'Tell Sister Wyn on the temple lane' },
    ],
    reward: { gold: 800, xp: 16000 },
  },
};

/** Where a quest stands with the one who gives it. */
export type QuestStage = 'offer' | 'active' | 'ready' | 'done';

/**
 * When a topic is on offer (DESIGN.md 17.20): only while a quest is untaken, under way or done,
 * so what people say changes with what the party has done. A topic without one is always there.
 */
export interface TopicCondition {
  quest: string;
  is: 'untaken' | 'active' | 'done';
}

export type Topic =
  | {
      kind: 'say';
      id: string;
      label: string;
      text: string;
      /** The note the party makes of it in its book of notes (src/ui/books-model.ts). */
      note?: string;
      when?: TopicCondition;
    }
  | { kind: 'rumours'; id: string; label: string; lines: string[]; when?: TopicCondition }
  | {
      kind: 'quest';
      id: string;
      quest: string;
      label: string;
      /** Said at each stage; the offer starts the quest, the ready line ends it and pays. */
      offer: string;
      active: string;
      ready: string;
      done: string;
      /** The greeting while the party comes back with the quest done. */
      greetReady: string;
      when?: TopicCondition;
    };

/** Said when a quest hands over a thing and no pack has room for it; the quest is not taken. */
export const NO_ROOM_FOR_IT =
  'You have no room for it in any pack. Make some, and come back; it will keep.';

export interface DialogueDef {
  npc: string;
  /** What they are, under their name: Farmer, Goodwife. */
  role: string;
  greeting: string;
  topics: Topic[];
}

export const DIALOGUES: Record<string, DialogueDef> = {
  'villager-man': {
    npc: 'villager-man',
    role: 'Farmer',
    greeting:
      'Travellers, is it? Off the boat, by the salt on you. Few stop at a farm gate. Speak up; ' +
      'I am not deaf yet.',
    topics: [
      {
        kind: 'quest',
        id: 'sheep',
        quest: 'tobins-sheep',
        label: 'The sheep',
        offer:
          'Bandits took two of my ewes off the coast road last week, bold as magistrates, and ' +
          'the reeve does nothing. Drive them off the road, three of them at the least, and I ' +
          'will pay a hundred and fifty gold. That is a season of wool, so do not think me cheap.',
        active:
          'Three of them, mind. West along the coast road, past the woods. I will know by the ' +
          'quiet whether you have earned it.',
        ready:
          'Three of them, you say? Then the road is mine again and the ewes can graze down to ' +
          'the shore. Here, a hundred and fifty gold, as I said; and you eat at my table any ' +
          'night you pass this gate.',
        done: 'The flock is back on the shore grass and I sleep with both eyes shut. You are welcome here.',
        greetReady: 'Back already? I heard the shouting from the coast road. Well? Tell me.',
      },
      {
        kind: 'say',
        id: 'hills',
        label: 'The hills',
        text:
          'The north road ends below the hills, and the hills belong to the goblins now. There ' +
          'is a cave on the slope. My grandfather said it went down to halls older than the ' +
          'town, but the roof came in before I was born.',
        note:
          'A cave on the slope under the goblin hills, where the north road ends. Old Tobin’s ' +
          'grandfather spoke of halls beneath it, older than Gullhaven; its roof has fallen in.',
      },
      {
        kind: 'quest',
        id: 'halls',
        quest: 'the-old-halls',
        label: 'The old halls',
        offer:
          'My grandfather went down that cave on the slope once and came back white. He said ' +
          'there were halls under the hills older than the town, and something in the deepest ' +
          'of them that would not lie still. Now the dead come up onto the headland by night. ' +
          'Put five of them back in the ground, and whatever drives them with them, and I will ' +
          'pay three hundred gold, which is all I have.',
        active:
          'The dead come up through the cave where the north road ends; the goblins hold the ' +
          'mouth of it. Five of them, and the one that drives them, down in the deepest hall. ' +
          'Go by day if you have any sense; they walk at night.',
        ready:
          'Five, and the one below, and you came back on your own feet. My grandfather would ' +
          'have stood you a drink. Three hundred gold, as I said, and keep the torch.',
        done: 'The headland is quiet at night now. I can hear the sea again.',
        greetReady: 'You smell of the grave. Did you go up there? Tell me.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'Something walks on the headland at night. Bones, they say, in old armour. Nobody goes ' +
            'up the track to the ruin any more.',
          'Maren at the well talks more than she draws water, but she hears everything.',
          'The smith buys any sword you bring him and asks no questions. Mind, he pays for the ' +
            'steel, not the story.',
        ],
      },
    ],
  },
  'villager-woman': {
    npc: 'villager-woman',
    role: 'Goodwife',
    greeting:
      'Good day to you. The well is sweet, for all the sea is at our door; drink your fill. ' +
      'It has never once failed us.',
    topics: [
      {
        kind: 'quest',
        id: 'goblins',
        quest: 'goblins-in-the-hills',
        label: 'The goblins',
        offer:
          'Goblin scouts, on the slope below the hills where the north road ends. Little ones ' +
          'with long ears and longer knives. They watch the town by night, and where scouts go a ' +
          'band follows. Two of them I have seen. Drive them off and I will give you eighty gold ' +
          'of my own, and my thanks, which are worth more.',
        active:
          'Two of them, up the north road past the shrine. Watch the slope at dusk; that is when ' +
          'they come close.',
        ready:
          'Two scouts driven off and the hills quiet since dawn. Here, eighty gold, every coin of ' +
          'it earned. You will have every mother in Gullhaven praying for you.',
        done: 'The children play on the north road again. I shall not forget it.',
        greetReady: 'You came back! And the hills quiet since dawn. Tell me it was you.',
      },
      {
        kind: 'quest',
        id: 'king',
        quest: 'the-goblin-king',
        label: 'The goblin king',
        when: { quest: 'goblins-in-the-hills', is: 'done' },
        offer:
          'The scouts are gone, and more will come, because they come from somewhere: a warren ' +
          'in the second hill, up a track from the camp at the cave, and one of them calls ' +
          'himself Grik, lord of it. The mothers of this town have put together three hundred ' +
          'and fifty gold, which is every spare coin in Gullhaven, to have him dead. Will you?',
        active:
          'Up the north road to the cave, then the track over the hill behind it; the warren’s ' +
          'mouth is on the second hill. Grik keeps the deepest hole, they say, behind old stone.',
        ready:
          'Dead in his own hole! Then the scouts have no one to send them. Three hundred and ' +
          'fifty gold, from every mother in Gullhaven, and not one of us begrudges a coin.',
        done: 'No goblin has been seen below the hills since. The children go up the north road alone.',
        greetReady: 'There is goblin blood on your boots, and a great deal of it. Grik? Tell me.',
      },
      {
        kind: 'say',
        id: 'town',
        label: 'Gullhaven',
        text:
          'The inn faces the trader across the square, and the training hall stands at the ' +
          'inn’s shoulder. The temple is up on its knoll over the west end of the street, by ' +
          'the stables; the smithy is at the east end. Old Tobin farms up the north road, and ' +
          'the coast road runs west to the city.',
        note:
          'Gullhaven: the inn faces the trader across the square, the training hall beside the ' +
          'inn, the temple on its knoll over the west end by the stables, the smithy at the east ' +
          'end. Tobin’s farm is up the north road; the coast road runs west to the city.',
      },
      {
        kind: 'say',
        id: 'temple',
        label: 'The temple',
        text:
          'The temple keeps a candle lit for those who go to sea. The priest heals for a price ' +
          'and prays for nothing; go in with gold and come out with both.',
        note: 'The temple of Gullhaven heals the sick and the wounded, for gold.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'Old Tobin lost two ewes to the bandits and talks of nothing else. He pays, though; ' +
            'the farm does well.',
          'There is a cave in the goblin hills. Nobody from here goes in, and nothing good has ' +
            'come out.',
          'The dead walk on the headland. My husband saw their lights from the boat, the night ' +
            'before he stopped going out.',
        ],
      },
    ],
  },
  reeve: {
    npc: 'reeve',
    role: 'Reeve',
    greeting:
      'Halloran, reeve of Gullhaven, for what the title is worth these days. If you have come to ' +
      'complain about the road, you are the fourth today.',
    topics: [
      {
        kind: 'say',
        id: 'road',
        label: 'The coast road',
        when: { quest: 'tobins-sheep', is: 'untaken' },
        text:
          'Bandits on the coast road since the spring, and the city sends no soldiers. The ' +
          'town’s chest is empty, so I cannot pay to have them moved; but Old Tobin up the ' +
          'north road has lost sheep to them, and he pays. Go and see him, if you have the ' +
          'stomach for it.',
        note:
          'Reeve Halloran: the town’s chest is empty; Old Tobin at his farm up the north road ' +
          'pays to have the coast road cleared of bandits.',
      },
      {
        kind: 'say',
        id: 'road-working',
        label: 'The coast road',
        when: { quest: 'tobins-sheep', is: 'active' },
        text:
          'You have taken Tobin’s coin for the bandits, I hear. Good. When the road is clear ' +
          'come and tell me; there may be more work, and better paid.',
      },
      {
        kind: 'quest',
        id: 'brigands',
        quest: 'the-brigands-camp',
        label: 'The brigands',
        when: { quest: 'tobins-sheep', is: 'done' },
        offer:
          'The bandits are off the road, and I thank you for it; but their betters have come ' +
          'down from the city to take it back. Brigands, proper ones, with steel and a fire of ' +
          'their own, camped at the road’s end under the western ridge. The town has found two ' +
          'hundred and fifty gold for whoever puts three of them down. It took some finding.',
        active:
          'Three of them, at the far end of the coast road, where it runs out under the ridge. ' +
          'They are not the bandits’ sort; go together, and go by day.',
        ready:
          'Three brigands dead and the road open to the city for the first time since spring. ' +
          'Two hundred and fifty gold, counted out of the town’s own chest; and Gullhaven owes ' +
          'you more than that.',
        done: 'The carts are running to the city again. The whole street says it was you.',
        greetReady:
          'I heard it from the carters before I heard it from you. Three of them? Tell me.',
      },
      {
        kind: 'say',
        id: 'town',
        label: 'The town',
        text:
          'Gullhaven is a hundred souls and a quay. Fish and wool go west to the city; salt and ' +
          'bad news come back. The temple keeps the west end, the smith the east, and I keep ' +
          'the square, which is to say I listen to it.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'Garrick the woodcutter has not come to the stalls in a fortnight. Ida at the market ' +
            'has noticed, whatever she says.',
          'Wen’s brother saw lights among the standing stones in the west wood. Wen has not ' +
            'slept since.',
          'Brother Anselm says the old oak at the crossroads is holier than the temple. The ' +
            'priest does not care for that.',
        ],
      },
    ],
  },
  fisher: {
    npc: 'fisher',
    role: 'Fisher',
    greeting:
      'Mind the nets. You are off the boat, I would say; I saw her come in. Wen, I am. The ' +
      'catch is poor this week and the talk is worse.',
    topics: [
      {
        kind: 'quest',
        id: 'stones',
        quest: 'the-fire-at-the-stones',
        label: 'The fire at the stones',
        offer:
          'My brother Col fishes the west shore and comes home over the downs. Three nights ' +
          'running he has seen a fire among the standing stones in the wood past the ' +
          'crossroads, and shapes about it. He will not go up, and I cannot leave the boat. Go ' +
          'and look, and I will give you forty gold for the telling of it. I want to know what ' +
          'burns up there.',
        active:
          'Up the north road to the crossroads, then the west track into the wood; the stones ' +
          'stand in a glade north of the track. Look, and come back whole.',
        ready:
          'Goblins, then, and not the dead. Col will sleep, and so shall I. Forty gold; a poor ' +
          'week’s catch, but you have earned it.',
        done: 'Col fishes the west shore again and comes home by the road like a sensible man.',
        greetReady: 'You have been up to the stones; it is on your boots. What burns there?',
      },
      {
        kind: 'say',
        id: 'sea',
        label: 'The sea',
        text:
          'The bay is kind and the sea past the headland is not. Nothing comes round the point ' +
          'now but weather; the city’s boats stopped calling when the dead began to walk on the ' +
          'headland. You can see their lights from the water at night.',
        note:
          'Wen the fisher: the city’s boats no longer call at Gullhaven since the dead began to ' +
          'walk on the headland; their lights show from the water at night.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'The reeve has gold in the town’s chest for anyone who clears the coast road, whatever ' +
            'he says about it being empty.',
          'There is a stone in the west wood with writing on it older than the town. Brother ' +
            'Anselm goes to look at it and comes back quiet.',
          'The smith’s special shelf is where the armour is. Ask for it; he does not offer.',
        ],
      },
    ],
  },
  ida: {
    npc: 'ida',
    role: 'Stallholder',
    greeting:
      'Eggs, cheese, and whatever the boats bring. You are the ones from the ship; everyone is ' +
      'talking. Well, buy something, or talk to me; it is a slow day.',
    topics: [
      {
        kind: 'quest',
        id: 'letter',
        quest: 'a-letter-for-garrick',
        label: 'A letter',
        offer:
          'There is a woodcutter, Garrick, in the glade off the west track past the crossroads. ' +
          'He has not come down to the stalls in a fortnight, and I would have a letter reach ' +
          'him, and reach him only; my father need not hear of it. Sixty gold when it is in his ' +
          'hands. I have been saving.',
        active:
          'The west track leaves the crossroads under the old oak and runs into the wood; his ' +
          'lane turns off it before the track climbs. Have you given it to him? Then go.',
        ready:
          'He has it? And read it there, in front of you? Then I know what he will say, and he ' +
          'has only to come down and say it. Sixty gold, as promised, and my thanks, which I ' +
          'cannot price.',
        done: 'He came down to the stalls this morning. Buy some eggs; I am in a giving mood.',
        greetReady:
          'You have been to the glade; I can tell by your face. Did he read it? Tell me everything.',
      },
      {
        kind: 'say',
        id: 'market',
        label: 'The market',
        text:
          'The market keeps the square alive: fish from the quay, wool from Tobin’s, bread from ' +
          'the inn’s oven. The trader across the way has everything else, and charges for it.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'Maren by the well knows every birth in Gullhaven before the mother does.',
          'The reeve has been talking to the smith about swords. That is never good.',
          'They say whoever drinks from our well is lucky. My mother drank from it every day of ' +
            'her life and married my father, so judge for yourself.',
        ],
      },
    ],
  },
  anselm: {
    npc: 'anselm',
    role: 'Lay Brother',
    greeting:
      'Peace to you. I keep the shrine on the lane, and the one at the crossroads when the ' +
      'priest lets me out. You have the look of people with questions.',
    topics: [
      {
        kind: 'say',
        id: 'shrine',
        label: 'The shrines',
        text:
          'The lane’s shrine is the temple’s and takes a prayer any day. The one at the ' +
          'crossroads under the old oak is older than the temple, and I will tell you a thing ' +
          'the priest would not: it hears prayers in January, and whoever prays there comes ' +
          'away harder to kill. The first year most of all.',
        note:
          'Brother Anselm: the shrine under the old oak at the crossroads hears prayers in ' +
          'January and hardens those who pray there, the first year most of all.',
      },
      {
        kind: 'say',
        id: 'stone',
        label: 'The old stone',
        text:
          'West of the crossroads, by the ring of standing stones in the wood, stands a pillar ' +
          'with letters cut in it, older than the ring. I have read them a hundred times and ' +
          'understand nothing. I believe it is one piece of a longer saying, and that there are ' +
          'others, far from here. Read it if you go; it costs nothing.',
        note:
          'Brother Anselm: a lettered pillar stands by the standing stones west of the ' +
          'crossroads, one piece of a longer saying; others stand far away.',
      },
      {
        kind: 'quest',
        id: 'seal',
        quest: 'the-seal-and-the-stone',
        label: 'The Warden’s seal',
        when: { quest: 'the-old-halls', is: 'done' },
        offer:
          'You put the warden of the halls back in the ground, Tobin says, and he wore ' +
          'something: a disc of bronze, with a door cut in it. I have read the stone a hundred ' +
          'times and never had a thing to read it against. Bring me the seal and I will pay two ' +
          'hundred gold of my own, which is all a lay brother has.',
        active: 'The Warden’s seal, bronze, a door cut in it. It will be on what is left of him.',
        ready: 'You have it. Let me see it.',
        done: 'The seal is under the altar. The stone makes sense at last, and I wish it did not.',
        greetReady: 'There is bronze in your hand. Let me see it.',
      },
      {
        kind: 'quest',
        id: 'door',
        quest: 'the-first-door',
        label: 'The First Door',
        when: { quest: 'the-third-seal', is: 'done' },
        offer:
          'Three seals: bronze from the halls, iron from the barrow, green stone from the deep, ' +
          'and Oddo’s letter with the last of them. The First Door is under the ruin on our own ' +
          'headland; the watchtower was built over it by men who did not know. The cave is in ' +
          'the headland’s flank below the ruin. Take the seals; each opens its door, and behind ' +
          'the last the Sea King waits to be let out onto a coast that has forgotten him. Shut ' +
          'him in for good. The three temples have found two thousand gold between them, and ' +
          'every soul from here to the Mire will owe you the rest.',
        active:
          'The cave below the ruin, east along the headland track from the crossroads. Gorrak’s ' +
          'hobgoblins hold the gate cave; the bronze door first, the iron, then the stair and ' +
          'the green. Go with your spells ready and your clerics rested. I will keep the candle lit.',
        ready:
          'The Sea King laid, and the door shut on him with his own seals. Then it is over, and ' +
          'the coast is only a coast again. Two thousand gold from three temples, and this: the ' +
          'stones have nothing more to say. Rest. You have earned the right to be ordinary.',
        done: 'The headland is quiet. I go up some evenings and sit on the ruin, and nothing walks.',
        greetReady: 'The sea went flat at noon from here to the headland. He is laid. Tell me.',
      },
      {
        kind: 'say',
        id: 'west',
        label: 'The road west',
        when: { quest: 'the-seal-and-the-stone', is: 'done' },
        text:
          'Harrowmere is three days west along the coast road, past the brigands if they still ' +
          'hold it. Sister Wyn keeps the temple lane there as I keep this one; she has copied ' +
          'their stone a dozen times. Tell her of the seal. She will know the next door from it, ' +
          'or know who does.',
        note:
          'Brother Anselm keeps the Warden’s seal under the temple’s altar; Sister Wyn in ' +
          'Harrowmere, three days west, is to hear of it and read her stone against it.',
      },
      {
        kind: 'say',
        id: 'dead',
        label: 'The dead',
        when: { quest: 'the-old-halls', is: 'untaken' },
        text:
          'The dead on the headland are not the temple’s to lay; they are somebody’s sword’s. ' +
          'The priest prays. Old Tobin, I hear, pays.',
      },
      {
        kind: 'say',
        id: 'dead-working',
        label: 'The dead',
        when: { quest: 'the-old-halls', is: 'active' },
        text:
          'You have gone up against them? Then go by day, and carry a light into the halls; ' +
          'the dead see well enough in the dark, and you do not.',
      },
      {
        kind: 'say',
        id: 'dead-laid',
        label: 'The dead',
        when: { quest: 'the-old-halls', is: 'done' },
        text:
          'The headland is quiet. I went up yesterday and said a word over the bones. Whatever ' +
          'you did down there, it was well done.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'The well in the square is sweet because the temple’s spring feeds it, so the priest ' +
            'says. The old women say otherwise.',
          'The goblins light fires at the standing stones. I think they are afraid of the pillar.',
          'The priest heals for gold and prays for nothing; both are true.',
        ],
      },
    ],
  },
  woodcutter: {
    npc: 'woodcutter',
    role: 'Woodcutter',
    greeting:
      'Hold there. I have an axe in my hand and no reason to think well of strangers in my ' +
      'glade; bandits took my cart last month. Say what you want.',
    topics: [
      {
        kind: 'say',
        id: 'wood',
        label: 'The wood',
        text:
          'I fell for the town: planks for the quay, wood for the forge, and the inn’s oven ' +
          'eats a tree a week. The west wood is mine as far as the stones; past them it is the ' +
          'goblins’, and they have been bolder since the spring.',
        note:
          'Garrick the woodcutter: the west wood past the standing stones belongs to the ' +
          'goblins now; they have been bolder since spring.',
      },
      {
        kind: 'say',
        id: 'town',
        label: 'Gullhaven',
        text:
          'I go down to the square when I have wood to sell, and I have not since my cart went. ' +
          'Ida at the stalls... the market, I mean, wants for nothing. Neither do I.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'The bandits camp on the coast road where it bends under the cliffs. They drink there ' +
            'in the afternoons.',
          'The dead on the headland do not come past the crossroads. The old oak, Anselm says. ' +
            'I say they do not like the road.',
        ],
      },
    ],
  },
  // ── Harrowmere (DESIGN.md 17.22) ────────────────────────────────────────────────────────
  alderman: {
    npc: 'alderman',
    role: 'Alderman',
    greeting:
      'Pell, alderman of Harrow, and the emporium is mine too; I do not pretend otherwise. You ' +
      'have come up from Gullhaven by the look of you. Three days, and the road what it is. ' +
      'Well?',
    topics: [
      {
        kind: 'quest',
        id: 'nomads',
        quest: 'the-nomads-camp',
        label: 'The horse people',
        offer:
          'Nomads off the eastern downs, forty of them with their horses, camped on the town’s ' +
          'own common east along the track. They take a sheep when they want one and a cart when ' +
          'they want that, and their chieftain laughs at the reeve. Three hundred gold from the ' +
          'town’s chest for his head, and I will put it there with my own hands.',
        active:
          'East along the track from the forge, over the down. Their chieftain keeps to the ' +
          'middle of the camp with the archers about him; the raiders will come at you first.',
        ready:
          'Dead, and the camp broken up by morning: the drovers watched them go. Three hundred ' +
          'gold, counted, and Harrow’s market is yours at the townsman’s price from this day.',
        done: 'The common is a common again. I have had the stones they fired on carted off.',
        greetReady: 'The down is quiet and the drovers are grinning. Their chieftain? Tell me.',
      },
      {
        kind: 'say',
        id: 'town',
        label: 'Harrow',
        text:
          'Harrow is the shire’s market: wool and grain come down off the downs, fish comes up ' +
          'from the cove, and the city buys it all at the Grange’s price. The forge is at the ' +
          'east end, Hesk’s armoury across from me, the Hall of Arms by the Drovers’ Rest, the ' +
          'Guild of Fire beside it. The temple is up the lane on the Harrow.',
        note:
          'Harrow: the Drovers’ Rest, the Hall of Arms and the Guild of Fire on the square’s ' +
          'north side, Pell’s Emporium and Hesk’s armoury across, the forge at the east end, the ' +
          'temple up the lane on the hill.',
      },
      {
        kind: 'say',
        id: 'road',
        label: 'The coast road',
        when: { quest: 'the-brigands-camp', is: 'untaken' },
        text:
          'Brigands hold the coast road between here and Gullhaven, where it runs under the ' +
          'ridge. The carters go in threes now. If Gullhaven’s reeve ever finds the gold to do ' +
          'something about it, tell him Harrow will match it.',
      },
      {
        kind: 'say',
        id: 'road-open',
        label: 'The coast road',
        when: { quest: 'the-brigands-camp', is: 'done' },
        text:
          'The carters say the brigands are gone off the road under the ridge, and that it was ' +
          'you. Harrow owes you for that as well as Gullhaven; drink at the Rest on my account.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'The smugglers in the cove have stopped smuggling and started stealing. Oswy at the ' +
            'Grange lost a granary to them.',
          'Hesk’s daughter beats better steel than the forge does, and the smith knows it.',
          'There is a stone with letters on it up on the down. Sister Wyn copies them out and ' +
            'understands nothing, she says.',
        ],
      },
    ],
  },
  herbwife: {
    npc: 'herbwife',
    role: 'Armourer',
    greeting:
      'Hesk. My daughter is at the forge and I keep the shop. If you want armour you will find ' +
      'none better between here and the city, and I say that having seen the city’s.',
    topics: [
      {
        kind: 'quest',
        id: 'parcel',
        quest: 'hesks-parcel',
        label: 'A parcel',
        offer:
          'I have a parcel for Goodman Oswy at the Grange, at the coast road’s end under the ' +
          'ridge, and nobody to carry it but my daughter, who is worth more at the anvil. It is ' +
          'a blade for his reaping machine and it is heavy. Eighty gold when he has it in his ' +
          'hands, and mind the road; the halt on the down is not the only place they lie up.',
        active:
          'West along the coast road past the last house, over the rise, and the Grange is at ' +
          'the road’s end under the ridge. Has he got it? Then why are you here?',
        ready:
          'He has it, and he said harvest, did he? He always says harvest. Eighty gold, and ' +
          'come to me first when you want steel on your backs; I will not rob you.',
        done: 'Oswy sent a ham. I shall not have to eat my own cooking for a week.',
        greetReady: 'You have been to the Grange; there is chalk to your knees. Did he take it?',
      },
      {
        kind: 'say',
        id: 'steel',
        label: 'Armour',
        text:
          'Leather for the quick, chain for the sensible, plate for those who can carry it and ' +
          'pay for it. Look at the shelf behind me: that is the common run. Ask for the special ' +
          'and I will show you what my daughter made last month.',
        note: 'Hesk the armourer in Harrow keeps better pieces on her special shelf; ask for it.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'Pell calls the common the town’s and the market his. The nomads call both theirs.',
          'The old kings in the barrows wore iron. Two of them walked out in it this spring.',
          'Tam the drover has sworn off the down road since the bandits took his cart. He has ' +
            'not sworn off the Rest.',
        ],
      },
    ],
  },
  drover: {
    npc: 'drover',
    role: 'Drover',
    greeting:
      'Tam. I drive the shire’s sheep down to Gullhaven and the shire’s grain up to the city, ' +
      'or I did while I had a cart. You are the ones off the Gullhaven boat; the whole road has ' +
      'talked of nothing else.',
    topics: [
      {
        kind: 'quest',
        id: 'cart',
        quest: 'tams-cart',
        label: 'The cart',
        offer:
          'Bandits at the halt on the down road, under the beeches a mile up, took my cart and ' +
          'the season’s wool in it, and left me my boots out of kindness. Three of them put ' +
          'down and I will give you a hundred and twenty gold, which is what the wool was worth ' +
          'and more than my pride is.',
        active:
          'Up the down road from the square, a mile, where the beeches close over it. Three of ' +
          'them, and they sleep in the afternoon.',
        ready:
          'Three of them, and the cart still standing there with its wheels on? Then I shall ' +
          'fetch it at dawn. A hundred and twenty gold, and the next flock I drive to Gullhaven ' +
          'carries your packs for nothing.',
        done: 'The cart is back in the stables’ yard and I have a new whip. Mind the road.',
        greetReady: 'You smell of beech smoke. The halt? Tell me.',
      },
      {
        kind: 'say',
        id: 'roads',
        label: 'The roads',
        text:
          'The coast road runs east to Gullhaven, three days with a herd; the down road climbs ' +
          'north to the barrows and nowhere after; the track from the forge goes east over the ' +
          'down to where the nomads sit; the lane by the last house drops to the cove. Past the ' +
          'Grange the road ends under the ridge. There is no way west but the sea.',
        note:
          'Harrowmere’s ways: the coast road east to Gullhaven (three days), the down road north to ' +
          'the barrows, the track east over the down to the nomads’ camp, the lane to the cove; ' +
          'the road ends at the Grange under the western ridge.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'The nomads’ chieftain rides a grey horse and keeps to the middle of the camp.',
          'Black Orrin was a Gullhaven fisher before he was a thief, they say. The cove knows him.',
          'The Guild of Fire sells its books dearer here than the air guild does in Gullhaven, ' +
            'and the fire is worth it.',
        ],
      },
    ],
  },
  novice: {
    npc: 'novice',
    role: 'Novice',
    greeting:
      'Peace. I am Wyn, of the temple; I keep the lane’s shrine and copy the old stones for the ' +
      'priest, who does not read them. You have come a long way to be standing on our lane.',
    topics: [
      {
        kind: 'quest',
        id: 'knights',
        quest: 'the-barrow-knights',
        label: 'The barrow knights',
        offer:
          'Two knights of the old kings have come up out of the barrows on the downs in their ' +
          'iron, and the dead walk after them, as they did under the kings. The priest prays and ' +
          'the shire buries its dead twice. The temple has four hundred gold, given for the ' +
          'poor, that it will give instead to whoever lays the two knights again. I think the ' +
          'poor would agree.',
        active:
          'Up the down road to its end, at the mounds. The knights stand before the oldest ' +
          'barrow with the warriors about them. Go by day; they are slower in the sun.',
        ready:
          'Laid, both of them, and the warriors with them. The dead stay in the barrows tonight ' +
          'for the first night since spring. Four hundred gold; the poor will have the next.',
        done: 'The downs are quiet at night. I sleep with the window open.',
        greetReady: 'There is grave dust on you. The knights? Tell me.',
      },
      {
        kind: 'quest',
        id: 'king',
        quest: 'the-barrow-king',
        label: 'The Barrow King',
        when: { quest: 'the-barrow-knights', is: 'done' },
        offer:
          'The knights were his. Under the oldest mound, through the cave in its flank, the ' +
          'Barrow King sits in his iron on the seat his people cut for him, and sends his dead ' +
          'up the stair every spring. The priest says leave him be. I say the temple has eight ' +
          'hundred gold it would rather spend than bury the shire twice a year. Lay him, and it ' +
          'is yours.',
        active:
          'In at the cave in the mound’s south flank, through the ante-cave, into the kings’ ' +
          'hall. The stair down is locked; the western king was buried with the key. He curses, ' +
          'they say; keep a clear head and a cleric’s hands.',
        ready:
          'Laid. Then the shire is done burying its dead twice, and I can copy my stones in ' +
          'peace. Eight hundred gold; it is the temple’s and it has never been better spent.',
        done: 'The mounds are only mounds now. Sheep graze on the oldest.',
        greetReady:
          'The downs were silent all night for the first time in my life. The king? Tell me.',
      },
      {
        kind: 'quest',
        id: 'chart',
        quest: 'the-chart',
        label: 'The old chart',
        when: { quest: 'the-seal-and-the-stone', is: 'done' },
        offer:
          'Anselm’s seal, with a door cut in it; so he has one, at last. Then hear what I have: ' +
          'the Grange kept a chart on sealskin from the kings’ days, our coast with seven marks ' +
          'along it, and the smugglers took it off Oswy with his grain. It will be in their den ' +
          'under the cove, with the rest of what they stole. Bring it to me and I will count ' +
          'the doors from the sea, as the stone says. The temple can spare two hundred and fifty.',
        active:
          'The den is through the smugglers’ cave at the cove, south-east of the town; Black ' +
          'Orrin keeps the last room, and what he values with him. The chart will be there.',
        ready: 'You have it? Give it here, give it here.',
        done: 'The chart is under the altar with the priest’s silver. He has not noticed.',
        greetReady: 'You have been in the den; I can smell the sea cave on you. The chart?',
      },
      {
        kind: 'quest',
        id: 'seal',
        quest: 'the-second-seal',
        label: 'The second seal',
        when: { quest: 'the-chart', is: 'done' },
        offer:
          'The chart says the second door is under the oldest barrow, and the Barrow King is ' +
          'its warden as the one in the halls was. He will wear a seal like Anselm’s. Lay him ' +
          'and bring it to me; I will keep it with the chart and send word west. Three hundred ' +
          'gold, which is more than the temple has, so I shall have to find it.',
        active:
          'The Barrow King sits in his chamber under the oldest mound, behind the locked stair. ' +
          'Bring me what he wears.',
        ready: 'You have it. Let me see it.',
        done: 'The seal went west with a carter I trust. Anselm will have both under his altar.',
        greetReady: 'You came down off the downs with the king’s iron on you. Let me see.',
      },
      {
        kind: 'say',
        id: 'north',
        label: 'The pass north',
        when: { quest: 'the-second-seal', is: 'done' },
        text:
          'Behind the barrows a pass climbs the ridge; the drovers used it before the Mire went ' +
          'bad. Two days through the reeds to Fenwick. Brother Oddo keeps the ruined abbey’s ' +
          'gate there; what the cult did in that abbey woke the doors, I think, and he knows it. ' +
          'Find the third seal under the mere and bring it to Gullhaven; Anselm will know the rest.',
        note:
          'Sister Wyn: a pass behind Harrowmere’s barrows climbs the ridge to the Mire, two days; ' +
          'Brother Oddo at the ruined abbey’s gate in Fenwick keeps the last of the lore; the third ' +
          'seal lies under the mere.',
      },
      {
        kind: 'say',
        id: 'shrine',
        label: 'The shrines',
        text:
          'The lane’s shrine is the temple’s and takes a prayer any day. The one before the ' +
          'barrows is older, and I will tell you what I told nobody but the priest: it hears a ' +
          'prayer in June, and whoever prays there is quicker on their feet after. The first ' +
          'year most of all.',
        note:
          'Sister Wyn: the shrine before the barrows on Harrowmere’s downs hears prayers in June ' +
          'and quickens those who pray, the first year most of all.',
      },
      {
        kind: 'say',
        id: 'stone',
        label: 'The old stone',
        text:
          'There is a pillar on the open down west of the down road, with letters cut in it ' +
          'older than the barrows. I have copied them a dozen times. They speak of a star that ' +
          'does not turn and of doors counted from the sea, and I believe there are other stones ' +
          'that say the rest. Gullhaven has one, a carter told me. Read ours if you go up.',
        note:
          'Sister Wyn: a lettered pillar stands on the open down west of Harrowmere’s down road; ' +
          'it speaks of a star that does not turn and doors counted from the sea.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'The barrow cave goes in under the oldest mound and stops. The priest says it was ' +
            'sealed on purpose, and that we should be glad.',
          'The well in the square is hard water off the chalk. Whoever drinks it is the ' +
            'stronger for it, the old women say.',
          'Pell gives to the temple every quarter day and asks every quarter day what it bought him.',
        ],
      },
    ],
  },
  granger: {
    npc: 'granger',
    role: 'Granger',
    greeting:
      'Oswy, of the Grange. The road ends here; so does the shire, at that ridge. If you have ' +
      'come for grain you are too late; the smugglers had it. If you have come for work, speak.',
    topics: [
      {
        kind: 'quest',
        id: 'orrin',
        quest: 'black-orrin',
        label: 'Black Orrin',
        offer:
          'The smugglers in the cove were honest thieves once: they landed the city’s wine by ' +
          'night and nobody asked. Then Black Orrin came out of Gullhaven with a knife and a ' +
          'grudge, and now they take. My granary, emptied in a night, forty carts of it. Five ' +
          'hundred gold for Orrin dead in his own den, and the Grange does not promise lightly.',
        active:
          'The cove is south-east of the town, down the lane by the last house. The cave in the ' +
          'bank is theirs; the lookouts sit in the mouth, the den is cut into the chalk behind, ' +
          'and Orrin keeps the last room. He uses poison; carry something for it.',
        ready:
          'Dead in his den. Then the cove will go back to wine and the shire to sleep. Five ' +
          'hundred gold, as the Grange promised, and the Grange’s table is yours at any harvest.',
        done: 'The smugglers landed wine last night and nothing else. I did not call the reeve.',
        greetReady: 'You came down the cove lane, and alone. Orrin? Tell me.',
      },
      {
        kind: 'say',
        id: 'grange',
        label: 'The Grange',
        text:
          'The Grange has stood since the shire was a wood: the house, the barn, the orchard, ' +
          'the long fields down to the road. It feeds Harrow and the city both, when it is let ' +
          'to. Past the ridge there is nothing but the sea; the kings who lie in the barrows ' +
          'came over it, and nobody since.',
        note:
          'The Grange: a manor farm at the coast road’s end under Harrowmere’s western ridge; the ' +
          'barrows’ kings came over the sea beyond it.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'Hesk’s daughter has been seen at the Grange gate more than armour accounts for.',
          'The nomads will not come west of the down road. They say the barrows are cursed, and ' +
            'they are not wrong.',
          'The brigands on the coast road under the ridge pay Orrin a share. Cut the head off and ' +
            'the hands go slack.',
        ],
      },
    ],
  },
  // ── The Mire (DESIGN.md 17.25) ──────────────────────────────────────────────────────────
  'fen-reeve': {
    npc: 'fen-reeve',
    role: 'Reeve',
    greeting:
      'Aldith, reeve of Fenwick, and you are the first strangers down the pass since the ' +
      'drovers stopped coming. Wipe your boots on the rise; the fen keeps the rest of you.',
    topics: [
      {
        kind: 'quest',
        id: 'holt',
        quest: 'the-reed-holt',
        label: 'The reavers',
        offer:
          'Reavers hold the knoll north-east of the mere, the one dry place out there, and ' +
          'they take the eel-boats as they please and the eelers with them twice. A woman leads ' +
          'them; they call her the Reed Queen and she shoots a bow better than any man in the ' +
          'fen. Six hundred gold of Fenwick’s to see her dead in her holt, and that is the ' +
          'village’s whole chest.',
        active:
          'The shore track from the street’s east end runs north past the mere to the knoll; ' +
          'their holt is a cave in its top, with a lane up to it. Her archers see far over the ' +
          'reeds; go in the mist if you can.',
        ready:
          'Dead in her holt and her reavers scattered into the reeds, the eelers say. Six ' +
          'hundred gold, and the first eel-boat out tomorrow is named for you.',
        done: 'The eel-boats go out at dawn again. Fenwick eats.',
        greetReady: 'The eelers came in shouting. The Reed Queen? Tell me.',
      },
      {
        kind: 'say',
        id: 'village',
        label: 'Fenwick',
        text:
          'Fenwick stands on the one rise at the mere’s west shore. The Reed and Lantern on the ' +
          'square, the Hall of the Fen at its shoulder, the Guild of Spirit at the other, Pim’s ' +
          'chandlery across; the smith at the street’s west end, the temple at its east end over ' +
          'the quay. Everything beyond the rise is wet, and most of it is worse than wet.',
        note:
          'Fenwick: the Reed and Lantern, the Hall of the Fen and the Guild of Spirit on the ' +
          'square, Pim’s chandlery across, the smith at the street’s west end, the temple over ' +
          'the quay at the east.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'Hob has not taken the ferry out since the drowned came up. He sits on his quay and ' +
            'shakes, and says it is the ague.',
          'Brother Oddo left the abbey twenty years ago and has not been inside since. He keeps ' +
            'its gate like a dog that will not go into the house.',
          'There is a stone on the fen’s edge west of the pass road, half sunk. Gefa says it talks.',
        ],
      },
    ],
  },
  ferryman: {
    npc: 'ferryman',
    role: 'Ferryman',
    greeting:
      'Hob. The ferry is mine, and it does not run, so I am a ferryman the way Oddo is a monk. ' +
      'Sit if you like; the quay is dry.',
    topics: [
      {
        kind: 'quest',
        id: 'light',
        quest: 'the-lantern-road',
        label: 'The far light',
        offer:
          'My light at the causeway’s end, where the ferry put in from the far shore, has burnt ' +
          'untended since the drowned came up out of the mere. My hut is there, and my nets, and ' +
          'I cannot go, because I shake. Walk the lantern road east along the shore and tell me ' +
          'whether the hut stands. A hundred and fifty gold, which is what the nets are worth.',
        active:
          'East from the quay along the shore, the causeway with the lanterns; the far light is ' +
          'at its end. Reavers walk it at dusk, drawn by the lamp.',
        ready:
          'Standing? And the light still burning? Then I have a hut and a reason. A hundred and ' +
          'fifty gold, and when the ferry runs again you ride for nothing.',
        done: 'I walked out to the hut myself yesterday. I shook the whole way, and I did it.',
        greetReady: 'You have reed-mud to the knee and lantern-soot on your hands. The hut?',
      },
      {
        kind: 'say',
        id: 'mere',
        label: 'The mere',
        text:
          'The mere is the sea come inland, salt at the mouth and brackish by the quay. Under ' +
          'the knoll on its north shore there was a hall before the mere was, the old folk say, ' +
          'and the drowned come up from it. They walk the shores at night and stand in the ' +
          'shallows by day. I have seen them from this quay with the water to their chests, ' +
          'waiting.',
        note:
          'Hob the ferryman: a hall lay under the Mire’s mere before the mere was, under the knoll ' +
          'on its north shore; the drowned come up from it.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'Gefa’s remedies cure you or kill you, and she says the fen decides which.',
          'The reavers pay no one and fear nothing but the drowned, and the drowned are getting closer.',
          'Pim will sell you a rope and a candle and a prayer, and only the prayer is cheap.',
        ],
      },
    ],
  },
  wisewoman: {
    npc: 'wisewoman',
    role: 'Wise Woman',
    greeting:
      'Gefa. Mother Gefa, the village says, though I mothered nobody. You are hurt; everybody ' +
      'who comes down the pass is hurt. Sit on the well’s edge, I shall see to it after.',
    topics: [
      {
        kind: 'quest',
        id: 'ague',
        quest: 'a-cure-for-the-ague',
        label: 'The ferryman’s ague',
        offer:
          'Hob on the quay shakes with the fen ague and calls it fear, and it is both, and I ' +
          'have brewed the cure for both. He will not come up the street for it; he has not ' +
          'left that quay in a month. Take him this horn and see him drink it, all of it, and ' +
          'come and tell me his face. A hundred and twenty gold; I charge him double.',
        active:
          'Down the street east past the temple to the quay. Make him drink it to the dregs; ' +
          'the dregs are the cure.',
        ready:
          'He said he hates me? Then it worked; he always does when it works. A hundred and ' +
          'twenty gold, and sit down now and let me see that arm.',
        done: 'Hob walked out to his far light yesterday. He shook the whole way. Good.',
        greetReady: 'Well? Did he drink it? Did he make the face?',
      },
      {
        kind: 'say',
        id: 'stone',
        label: 'The talking stone',
        text:
          'On the fen’s edge west of the pass road, half sunk in the peat, there is a pillar ' +
          'with letters cut in it. I cannot read, but Oddo can, and he came back from it grey. ' +
          'It says the sea is a door, he told me, and I said everyone in the fen knows that.',
        note:
          'Mother Gefa: a lettered pillar stands half sunk on the Mire’s edge west of the pass ' +
          'road; Brother Oddo read it and came back grey.',
      },
      {
        kind: 'say',
        id: 'well',
        label: 'The well',
        text:
          'The well on the square is peat-brown and iron-cold and the best water in the fen. ' +
          'Whoever drinks from it the first time is the hardier for it, once; after that it is ' +
          'only water, and good water.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'The witches in the reeds north of the village were Fenwick girls once. The fen took them.',
          'Aldith has six hundred gold in the village chest and would spend every coin on the ' +
            'Reed Queen’s head.',
          'The brothers who stayed in the abbey when the mere rose are not brothers now, Oddo says.',
        ],
      },
    ],
  },
  brother: {
    npc: 'brother',
    role: 'Brother',
    greeting:
      'Oddo. I was a brother of this abbey, and I keep its gate, which is to say I stand before ' +
      'a cave in a ruin and tell people not to go in. You have the look of people who will go in.',
    topics: [
      {
        kind: 'quest',
        id: 'abbey',
        quest: 'the-drowned-abbey',
        label: 'The abbey',
        offer:
          'When the mere rose and drowned the abbey’s cellars, most of us left. Some stayed, and ' +
          'the Abbot stayed, and they found the door under the crypt and began to study it, and ' +
          'then to open it. The dead walk out of the mere because of him. I have seven hundred ' +
          'gold of the abbey’s silver that I dug up myself, and I will give every coin to see ' +
          'him stopped. He was my teacher.',
        active:
          'In at the cave here at the gate, down to the crypt. The acolytes will come at you ' +
          'with fire; the cultists curse; the Abbot keeps the lowest chamber, and he is the ' +
          'cleverest man I ever knew.',
        ready:
          'Dead. Then it is finished, and I am the last of the abbey. Seven hundred gold, as I ' +
          'said. Did he write anything? He always wrote.',
        done: 'The abbey is empty for the first time in twenty years. I may go in one day.',
        greetReady: 'You came up out of the cave. I did not think you would. The Abbot?',
      },
      {
        kind: 'quest',
        id: 'confession',
        quest: 'the-confession',
        label: 'The Abbot’s writings',
        when: { quest: 'the-drowned-abbey', is: 'done' },
        offer:
          'If he wrote down what he learnt of the doors, and he will have, I must read it, ' +
          'though I would rather not. Two hundred gold for the pages, if you have them, or if ' +
          'you will go down again for them.',
        active: 'The pages will be on him, or in his chamber. Bring them to me.',
        ready: 'You have them. Give them to me.',
        done: 'I have burnt the pages. I remember every word.',
        greetReady: 'You have paper in your hands with his writing on it. Give it to me.',
      },
      {
        kind: 'quest',
        id: 'sunken',
        quest: 'the-sunken-hall',
        label: 'The Sunken Hall',
        when: { quest: 'the-drowned-abbey', is: 'done' },
        offer:
          'The third door is the Sunken Hall under the mere, through the cave on the knoll on ' +
          'the north shore, and its warden is awake since the Abbot’s work; the drowned you see ' +
          'on the shores are his. Nine hundred gold more of the abbey’s silver to lay him. Then ' +
          'the mere will be only water again.',
        active:
          'The shore track north from the street’s east end to the knoll on the mere’s north ' +
          'shore; the cave is in its side. The hall is under the water; the stair is long.',
        ready: 'The Warden of the Deep laid. The mere is quiet tonight. Nine hundred gold.',
        done: 'The drowned have not come up since. Hob says the mere is only water.',
        greetReady: 'The water went still at noon. I saw it from the gate. The warden?',
      },
      {
        kind: 'quest',
        id: 'seal',
        quest: 'the-third-seal',
        label: 'The third seal',
        when: { quest: 'the-sunken-hall', is: 'done' },
        offer:
          'The warden will have worn a seal, green stone, three doors cut in it, as the first ' +
          'wore bronze and the second iron. Bring it to me and I will tell you where it goes.',
        active: 'The seal of green stone. It was on him.',
        ready: 'You have it. Let me see.',
        done: 'Three seals, and the First Door is in Gullhaven. Go west. Anselm knows.',
        greetReady: 'There is green stone in your hand. Let me see it.',
      },
      {
        kind: 'say',
        id: 'doors',
        label: 'The doors',
        text:
          'The Sea Kings raised seven doors along this coast and set a warden at each. The ' +
          'stones say where the first is and that it holds the rest. The Abbot believed the ' +
          'doors kept something in. I think I know better now, and I wish I did not.',
        note:
          'Brother Oddo: the Sea Kings raised seven doors along the coast with a warden at each; ' +
          'the first holds the rest.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'The Abbot was the kindest man in the abbey. That is what frightens me.',
          'The Reed Queen was an eeler’s daughter. The fen takes everyone eventually.',
          'Gefa says the talking stone says the sea is a door. Gefa cannot read, and she is right.',
        ],
      },
    ],
  },
  chandler: {
    npc: 'chandler',
    role: 'Chandler',
    greeting:
      'Pim. Candles, rope, salt, lamp oil and anything else the fen eats. You will want all ' +
      'of it before you are done here; everyone does.',
    topics: [
      {
        kind: 'quest',
        id: 'thugs',
        quest: 'the-causeway-thugs',
        label: 'The causeway',
        offer:
          'Hired men off the Harrowmere road sit on the causeway between the pass and the ' +
          'village and tax what comes down it, and what comes down it is mostly mine. Two carts ' +
          'turned back this month. Two hundred and fifty gold for three of them put in the fen, ' +
          'and I will throw in the rope.',
        active:
          'South along the causeway toward the pass; they lie up where it narrows over the ' +
          'reeds. Big men, slow, and they hit to stun.',
        ready:
          'Three in the fen and the rest gone up the pass. My carts came through this morning. ' +
          'Two hundred and fifty gold, and the rope is on the counter.',
        done: 'Trade comes down the pass again. I have put the prices up.',
        greetReady: 'The causeway is clear; my carter said so. Was it you?',
      },
      {
        kind: 'say',
        id: 'trade',
        label: 'Trade',
        text:
          'Fenwick sells eels and salt and buys everything else, so I am the richest man in the ' +
          'village and the poorest chandler in the shire. My shelf is the best north of ' +
          'Harrow; the fen eats candles.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'The Guild of Spirit sells the only books in the fen, and dearer than Harrow’s fire.',
          'Oddo keeps his abbey’s silver buried under his hut and gives it away by the hundred.',
          'The Hall of the Fen will train you higher than any hall on the coast. Ask what it costs first.',
        ],
      },
    ],
  },
};
