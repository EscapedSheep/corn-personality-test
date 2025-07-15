export interface Question {
  id: number;
  text: string;
  options: string[];
  dimension: string;
}

export interface Dimension {
  id: string;
  name: string;
  subtitle: string;
}

export const dimensions: Dimension[] = [
  { id: 'order', name: 'Life OCD & Order', subtitle: 'Logic-driven or chaos artist?' },
  { id: 'sensory', name: 'Weird Senses & Quirks', subtitle: 'Which strange human species are you?' },
  { id: 'social', name: 'Unhinged Social Moments', subtitle: 'Life of the party or invisible ghost?' },
];

export const questions: Question[] = [
  { id: 1,  text: 'How do you eat corn on the cob?',              options: ['Row by row, typewriter style', 'Round and round, spiral style 🌀', 'Break it in half first', 'Cut it off with a knife like a civilized person'], dimension: 'order' },
  { id: 2,  text: 'After finishing a bottle of water, do you screw the cap back on?', options: ['Always. It belongs there', 'Never. Cap goes wherever', 'Only if someone is watching', 'I lose the cap immediately'], dimension: 'order' },
  { id: 3,  text: 'How are the apps on your phone organized?',    options: ['Everything in labeled folders 📁', 'A few folders, mostly loose', 'Completely scattered across pages', 'I just use search'], dimension: 'order' },
  { id: 4,  text: 'How do you open a bag of chips?',              options: ['Follow the serrated edge carefully', 'Rip it open from the top', 'Use scissors', "I don't open it — someone else does"], dimension: 'order' },
  { id: 5,  text: 'Where do your socks go when you sleep?',       options: ['Folded neatly next to the bed', "Socks? I'm wearing them to bed", 'One under the bed, one somewhere mysterious', "I don't even remember taking them off"], dimension: 'order' },

  { id: 11, text: "What's the first thing you wash in the shower?", options: ['Head first, top-down logic', 'Body first, head is last', 'Face first, gotta wake up', 'I just stand there for 5 minutes first 🧘'], dimension: 'sensory' },
  { id: 12, text: 'Walking past a pillar — do you touch it as you pass?', options: ['Every time. It calls to me', "Never. That's weird", 'Only the smooth metal ones', 'I high-five it loudly'], dimension: 'sensory' },
  { id: 13, text: 'How do you eat soup and rice together?',      options: ['Mix them together into a porridge', 'Strictly separate, soup on the side', 'Dip the rice into the soup bite by bite', "I don't eat soup and rice together"], dimension: 'sensory' },
  { id: 14, text: 'When falling asleep, do your legs need to hold something?', options: ['Yes, a pillow, blanket, or another human 🦵', 'No, I lie like a straight plank', 'I wrap myself into a burrito', 'I move so much nothing stays in place'], dimension: 'sensory' },
  { id: 15, text: 'You have a healing scab. What do you do?',    options: ['Pick it immediately', 'Leave it alone', 'Pick it, regret it, pick it again', "What scab? It's already gone"], dimension: 'sensory' },

  { id: 21, text: 'You open a door, someone is 10 meters behind you. What do you do?', options: ['Hold the door and wait awkwardly', 'Hold it for 2 seconds then let go', 'Close it. They can open their own door', "Pretend I didn't see them 👻"], dimension: 'social' },
  { id: 22, text: 'Alone in an elevator with a mirror. You:',    options: ['Make faces at myself', 'Check my teeth and pores', 'Stare at the floor numbers', 'Pose like a photoshoot'], dimension: 'social' },
  { id: 23, text: 'How do you sneeze?',                           options: ['Loud and proud: AAACHOOO', 'Suppressed tiny ...choo', 'Into my elbow like a responsible adult', 'I hold it in and my soul leaves my body'], dimension: 'social' },
  { id: 24, text: 'The last piece of meat is on the plate. You:', options: ["Ask everyone: 'Anyone want this?'", 'Silently claim it while avoiding eye contact', 'Cut it in half to share', 'I already ate it 5 minutes ago 🤫'], dimension: 'social' },
  { id: 25, text: "Someone is taking a selfie and you're in the background. You:", options: ['Pop in with a peace sign', 'Walk faster to escape the frame', 'Stand still like an NPC', 'Photobomb dramatically'], dimension: 'social' },
];

export function pickQuestions(dimension: string, count = 5): Question[] {
  const pool = questions.filter(q => q.dimension === dimension);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export interface UserAnswer {
  questionId: number;
  answer: string;
}

export interface PersonalityResult {
  title: string;
  subtitle: string;
  description: string;
  traits: string[];
  emoji: string;
  dimension: string;
}

export function generateResult(dimension: string, answers: UserAnswer[]): PersonalityResult {
  const dimQuestions = questions.filter(q => q.dimension === dimension);
  let score = 0;
  for (const a of answers) {
    const q = dimQuestions.find(q => q.id === a.questionId);
    if (!q) continue;
    const idx = q.options.indexOf(a.answer);
    if (idx >= 0) score += idx;
  }
  const maxScore = answers.length * 3;
  const ratio = score / Math.max(1, maxScore);

  if (dimension === 'order') {
    if (ratio < 0.35) {
      return { title: 'The Royal Accountant 👑', subtitle: 'Order is your religion', description: "You probably fold your toilet paper into a square. Your life runs on spreadsheets — literal or metaphorical. You don't just prefer order, you need it.", traits: ['Folder-labeling enthusiast', 'Safety in structure', 'Organized to a fault'], emoji: '📋', dimension };
    } else if (ratio > 0.65) {
      return { title: 'Chaos Artist, Blessed by a Cat 🐱', subtitle: 'Your mess has meaning', description: "Your desk looks like a tornado hit it, but you know where everything is. You do things entirely by vibe. Chaos isn't your enemy — it's your creative medium.", traits: ['Vibe-driven', 'Creative chaos', 'Knows where everything is... probably'], emoji: '🎨', dimension };
    }
    return { title: 'Intermittent Effort Patient 🎢', subtitle: 'Sometimes monk, sometimes menace', description: "Some days you're organizing spice racks alphabetically. Other days you're eating cereal over the sink at 2 PM in yesterday's clothes. Monday is always the reset button.", traits: ['Oscillating discipline', 'Monday resetter', 'Spice rack enthusiast'], emoji: '🔄', dimension };
  }

  if (dimension === 'sensory') {
    if (ratio < 0.35) {
      return { title: 'A Giraffe Reincarnated 🦒', subtitle: 'Sensitive soul, noble spirit', description: "Highly attuned to touch and warmth. Wrapping your legs around a pillow isn't weird — it's ancestral memory. Touching pillars as you walk? Forest instinct. You find comfort in the physical world where others don't even look.", traits: ['Tactile sensitivity', 'Pillar-toucher', 'Burrito sleeper'], emoji: '🦒', dimension };
    } else if (ratio > 0.65) {
      return { title: 'Factory Settings Robot 🤖', subtitle: 'Efficiency above all', description: 'Showering is a subroutine. Eating is fuel intake. You genuinely struggle to understand why people have so many feelings about things. Everything has a correct procedure and you follow it.', traits: ['Maximum efficiency', 'Emotions on mute', 'Straight-line thinker'], emoji: '🤖', dimension };
    }
    return { title: 'Walking Destruction Goblin 👹', subtitle: 'Curiosity with a body count', description: 'An unstoppable urge to explore how things work — by taking them apart. Scabs, chip bags, electronics. Nothing is safe. You probably took apart a radio as a kid.', traits: ['Curiosity-driven chaos', 'Professional picker', 'Disassembly expert'], emoji: '🔧', dimension };
  }

  if (dimension === 'social') {
    if (ratio < 0.35) {
      return { title: 'Human Sunshine ☀️', subtitle: "Everyone's favorite person", description: "Deeply attuned to the feelings of everyone around you. Holding the door for someone 10 meters away? That's you. Offering the last piece of meat to the entire table? Also you. Exhausting, but people genuinely love having you around.", traits: ['Empathy radar', 'Door-holder extraordinaire', 'Last-bite martyr'], emoji: '☀️', dimension };
    } else if (ratio > 0.65) {
      return { title: 'Social Menace, Handcrafted by Chaos 🤪', subtitle: "If I'm not embarrassed, no one is", description: 'Awkwardness is a choice, and you simply decline. Elevator mirror? Your runway. Loud sneeze? Your signature sound. A level of self-confidence that is genuinely enviable.', traits: ['Shameless performer', 'Elevator superstar', 'Chaotic confidence'], emoji: '🤡', dimension };
    }
    return { title: 'Zen Passerby 🩴', subtitle: 'Not my circus, not my monkeys', description: "There are two things in the world: things that concern you, and things that don't. You'll close the door behind you without checking. You'll dodge selfies like crossfire. Not rude — just running on minimal social battery.", traits: ['Social battery saver', 'Door-closing specialist', 'Selfie-evasion expert'], emoji: '🦥', dimension };
  }

  return { title: 'Mystery Corn 🌽', subtitle: 'Ungroupable', description: 'You defy classification. The questions couldn\'t pin you down. Congratulations — you are uniquely, inexplicably yourself.', traits: ['Uncategorizable', 'Free spirit', 'Question-evader'], emoji: '🌽', dimension };
}
