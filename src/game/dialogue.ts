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
    reward: { gold: 150, xp: 300 },
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
    reward: { gold: 80, xp: 150 },
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
    reward: { gold: 300, xp: 700 },
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
    reward: { gold: 60, xp: 120 },
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
    reward: { gold: 40, xp: 100 },
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
    reward: { gold: 250, xp: 600 },
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
};
