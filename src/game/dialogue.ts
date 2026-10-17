/**
 * The villagers' talk and the first quests (DESIGN.md 16.7). A dialogue is a greeting and a
 * list of topics, as MM6's NPC windows were: a line of plain talk, a rumour that changes each
 * time, or a quest, which the topic itself carries through its stages: offered on the first
 * asking, open while the party works at it, ready when the party comes back with it done,
 * and over once the reward is paid. The prose is the game's voice; keep it short, spoken
 * and particular to this valley, never generic.
 */
import type { QuestDef } from './quests';

export const QUESTS: Record<string, QuestDef> = {
  'henriks-sheep': {
    id: 'henriks-sheep',
    title: "Henrik's Sheep",
    text:
      "Bandits on the valley road took two of Old Henrik's ewes. He pays a hundred and fifty " +
      'gold to see three of them driven off.',
    objectives: [
      {
        kind: 'kill',
        monster: 'bandit',
        count: 3,
        text: 'Drive three bandits off the valley road',
      },
      { kind: 'talk', npc: 'villager-man', text: 'Tell Old Henrik at his farm gate' },
    ],
    reward: { gold: 150, xp: 300 },
  },
  'goblins-at-the-edge': {
    id: 'goblins-at-the-edge',
    title: 'Goblins at the Forest Edge',
    text:
      'Greta has seen goblin scouts where the road past the smithy meets the trees. Two of ' +
      'them driven off is worth eighty gold to her.',
    objectives: [
      {
        kind: 'kill',
        monster: 'goblin-scout',
        count: 2,
        text: 'Hunt two goblin scouts past the smithy',
      },
      { kind: 'talk', npc: 'villager-woman', text: 'Tell Greta by the well' },
    ],
    reward: { gold: 80, xp: 150 },
  },
};

/** Where a quest stands with the one who gives it. */
export type QuestStage = 'offer' | 'active' | 'ready' | 'done';

export type Topic =
  | { kind: 'say'; id: string; label: string; text: string }
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
      'Travellers, is it? Few come down the road these days, and fewer stop at a farm gate. ' +
      'Speak up; I am not deaf yet.',
    topics: [
      {
        kind: 'quest',
        id: 'sheep',
        quest: 'henriks-sheep',
        label: 'The sheep',
        offer:
          'Bandits took two of my ewes off the road last week, bold as magistrates, and the ' +
          'reeve does nothing. Drive them off the valley road, three of them at the least, and ' +
          'I will pay a hundred and fifty gold. That is a season of wool, so do not think me cheap.',
        active:
          'Three of them, mind. I will know by the quiet on the road whether you have earned it.',
        ready:
          'Three of them, you say? Then the road is mine again and the ewes can graze down to ' +
          'the ford. Here, a hundred and fifty gold, as I said; and you eat at my table any night ' +
          'you pass this gate.',
        done: 'The flock is back at the ford and I sleep with both eyes shut. You are welcome here.',
        greetReady: 'Back already? I heard the shouting from the road. Well? Tell me.',
      },
      {
        kind: 'say',
        id: 'pass',
        label: 'The pass',
        text:
          'The pass is open from the thaw to the first snows. Beyond it the land dries to sand ' +
          'in a day of walking. Nomads ride there; they trade at the oasis and rob everywhere else.',
      },
      {
        kind: 'say',
        id: 'barn',
        label: 'The barn',
        text:
          'That barn has stood forty winters. My father raised it with oak from the forest, ' +
          'before the goblins came back to it. Forty-one winters, if they keep away.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'They say the old halls under the ravine were a temple once, before the hill folk ' +
            'were driven out of them.',
          'Greta at the well talks more than she draws water, but she hears everything.',
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
      'Good day to you. The well is sweet; drink your fill. The water comes down from the ' +
      'snows and has never once failed us.',
    topics: [
      {
        kind: 'quest',
        id: 'goblins',
        quest: 'goblins-at-the-edge',
        label: 'The goblins',
        offer:
          'Goblin scouts, past the smithy where the road meets the trees. Little ones with long ' +
          'ears and longer knives. They watch the village by night, and where scouts go a band ' +
          'follows. Two of them I have seen. Drive them off and I will give you eighty gold of my ' +
          'own, and my thanks, which are worth more.',
        active:
          'Two of them, past the smithy. Watch the forest edge at dusk; that is when they come close.',
        ready:
          'Two scouts driven off and the forest quiet since dawn. Here, eighty gold, every coin ' +
          'of it earned. You will have every mother in the village praying for you.',
        done: 'The children play at the forest edge again. I shall not forget it.',
        greetReady: 'You came back! And the forest edge quiet since dawn. Tell me it was you.',
      },
      {
        kind: 'say',
        id: 'village',
        label: 'The village',
        text:
          'The inn and the trader face each other across the square. The temple stands on its ' +
          'knoll up the lane behind the cottages; the smithy is at the far end of the street ' +
          "toward the forest, and Old Henrik's farm the other way, past the cottages.",
      },
      {
        kind: 'say',
        id: 'temple',
        label: 'The temple',
        text:
          'The temple keeps a candle lit for those who go up to the pass. The priest heals for a ' +
          'price and prays for nothing; go in with gold and come out with both.',
      },
      {
        kind: 'rumours',
        id: 'rumours',
        label: 'Rumours',
        lines: [
          'Old Henrik lost two ewes to the bandits and talks of nothing else. He pays, though; ' +
            'the farm does well.',
          'There is a cave at the head of the ravine, above the falls. Nobody from here goes in, ' +
            'and nothing good has come out.',
          'The road over the pass goes down into the desert. The nomads there trade at the ' +
            'oasis and rob everywhere else.',
        ],
      },
    ],
  },
};
