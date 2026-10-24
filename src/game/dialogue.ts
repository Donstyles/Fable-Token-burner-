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
      'The dead walk in the halls under the hills and on the headland by night. Old Tobin ' +
      'pays three hundred gold to have five of them put back in the ground.',
    objectives: [
      {
        kind: 'kill',
        monster: 'skeleton-warrior',
        count: 5,
        text: 'Put down five of the walking dead, in the halls or on the headland',
      },
      { kind: 'talk', npc: 'villager-man', text: 'Tell Old Tobin at his farm gate' },
    ],
    reward: { gold: 300, xp: 700 },
  },
};

/** Where a quest stands with the one who gives it. */
export type QuestStage = 'offer' | 'active' | 'ready' | 'done';

export type Topic =
  | {
      kind: 'say';
      id: string;
      label: string;
      text: string;
      /** The note the party makes of it in its book of notes (src/ui/books-model.ts). */
      note?: string;
    }
  | { kind: 'rumours'; id: string; label: string; lines: string[] }
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
    };

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
          'is a cave on the slope that goes a long way down. My grandfather said there were halls ' +
          'under there, older than the town.',
        note:
          'A cave on the slope under the goblin hills, where the north road ends, goes a long ' +
          'way down. Old Tobin’s grandfather spoke of halls beneath it, older than Gullhaven.',
      },
      {
        kind: 'quest',
        id: 'halls',
        quest: 'the-old-halls',
        label: 'The old halls',
        offer:
          'My grandfather went down that cave on the slope once. He came back white and would ' +
          'not say what walked there. Now the dead come up onto the headland by night. Put five ' +
          'of them back in the ground and I will pay three hundred gold, which is all I have.',
        active:
          'Five of the dead, in the halls under the hills or up on the headland. Take a torch; ' +
          'my grandfather said the dark down there is older than the town.',
        ready:
          'Five, and you came back on your own feet. My grandfather would have stood you a ' +
          'drink. Three hundred gold, as I said, and keep the torch.',
        done: 'The headland is quiet at night now. I can hear the sea again.',
        greetReady: 'You smell of the grave. Did you go down there? Tell me.',
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
          'The inn faces the trader across the square. The temple stands on its knoll at the ' +
          'west end of the street; the smithy is at the east end, past the stables. Old Tobin ' +
          'farms up the north road, and the coast road runs west to the city.',
        note:
          'Gullhaven: the inn faces the trader across the square, the temple stands on its knoll ' +
          'at the west end of the street, the smithy at the east end past the stables. Tobin’s ' +
          'farm is up the north road; the coast road runs west to the city.',
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
};
