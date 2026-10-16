/**
 * Emoji data for the picker.
 * Each entry is [emoji, label, optional search keywords].
 * Paste this over your existing EMOJI_OPTIONS / REACTION_OPTIONS in
 * "@/constants/team-chat-constants" (keep your other exports in that file).
 */
export type EmojiOption = readonly [emoji: string, label: string, keywords?: string];

export interface EmojiCategory {
  id: string;
  label: string;
  /** Emoji shown on the category tab. */
  icon: string;
  emojis: readonly EmojiOption[];
}

// One line per emoji: emoji|label|keywords. Parsed once at load.
const parse = (raw: string): EmojiOption[] =>
  raw
    .trim()
    .split("\n")
    .map((line) => {
      const [emoji, label, keywords] = line.split("|").map((part) => part.trim());
      return [emoji, label, keywords] as const;
    });

const SMILEYS = parse(`
😀|grinning face|happy smile
😃|smiley|happy smile
😄|grinning face with smiling eyes|happy
😁|beaming face|grin
😆|laughing|haha
😅|grinning face with sweat|relief nervous
🤣|rolling on the floor laughing|rofl lol
😂|joy|tears laugh lol
🙂|slightly smiling face|smile
🙃|upside-down face|silly
😉|wink|flirt
😊|blush|smile happy
😇|angel|halo innocent
🥰|smiling face with hearts|love adore
😍|heart eyes|love
🤩|star-struck|wow amazing
😘|blowing a kiss|kiss love
😗|kissing face|kiss
😚|kissing face with closed eyes|kiss
😙|kissing face with smiling eyes|kiss
😋|yum|delicious tasty
😛|face with tongue|playful
😜|winking face with tongue|crazy joke
🤪|zany face|crazy wild
😝|squinting face with tongue|silly
🤑|money-mouth face|rich cash
🤗|hugging face|hug
🤭|hand over mouth|oops giggle
🤫|shushing face|quiet secret
🤔|thinking|hmm
🤐|zipper-mouth face|secret
🤨|raised eyebrow|suspicious doubt
😐|neutral face|meh
😑|expressionless face|blank
😶|face without mouth|speechless
😏|smirk|sly
😒|unamused|annoyed
🙄|rolling eyes|whatever
😬|grimacing|awkward
🤥|lying face|liar
😌|relieved|calm
😔|pensive|sad
😪|sleepy|tired
🤤|drooling|want
😴|sleeping|zzz
😷|medical mask|sick
🤒|thermometer face|fever sick
🤕|bandaged head|hurt injured
🤢|nauseated|sick
🤮|vomiting|sick
🤧|sneezing|cold
🥵|hot face|heat
🥶|cold face|freezing
🥴|woozy|drunk dizzy
😵|dizzy face|knocked out
🤯|exploding head|mind blown
🤠|cowboy hat|yeehaw
🥳|partying face|celebrate birthday
😎|cool|sunglasses
🤓|nerd|geek
🧐|monocle|inspect
😕|confused|unsure
😟|worried|concerned
🙁|slightly frowning face|sad
😮|open mouth|surprised
😯|hushed|surprised
😲|astonished|shocked
😳|flushed|embarrassed
🥺|pleading|puppy eyes please
😦|frowning with open mouth|shocked
😧|anguished|distress
😨|fearful|scared
😰|anxious with sweat|nervous
😥|sad but relieved|phew
😢|sad|cry tear
😭|loudly crying|sob
😱|screaming in fear|shock
😖|confounded|frustrated
😣|persevering|struggle
😞|disappointed|sad
😓|downcast with sweat|tired
😩|weary|exhausted
😫|tired face|exhausted
🥱|yawning|bored sleepy
😤|steam from nose|determined angry
😡|angry|mad rage
😠|angry face|mad
🤬|cursing|swearing
😈|smiling devil|mischief
👿|angry devil|evil
💀|skull|dead
💩|poop|funny
🤡|clown|joke
👻|ghost|halloween
👽|alien|ufo
🤖|robot|bot
🙈|see-no-evil monkey|shy
🙉|hear-no-evil monkey|deaf
🙊|speak-no-evil monkey|oops
`);

const PEOPLE = parse(`
👍|thumbs up|like yes ok
👎|thumbs down|dislike no
👌|ok hand|perfect
✌️|victory hand|peace
🤞|crossed fingers|luck hope
🤟|love-you gesture|rock
🤘|rock on|metal
🤙|call me|shaka
👈|point left|direction
👉|point right|direction
👆|point up|direction
👇|point down|direction
☝️|index pointing up|one
✋|raised hand|stop high five
🤚|raised back of hand|stop
🖐️|hand with fingers splayed|five
🖖|vulcan salute|spock
👋|waving hand|hello bye
🤝|handshake|deal agreement
👏|clap|applause
🙌|raising hands|celebrate praise
👐|open hands|hug
🤲|palms up|offer
🙏|folded hands|pray thanks please
✍️|writing hand|write
💪|flexed biceps|strong muscle
💅|nail polish|beauty
🙋|person raising hand|question
🙆|person gesturing ok|ok
🙅|person gesturing no|no
🙇|person bowing|sorry respect
🤦|facepalm|oh no
🤷|shrug|dunno
🤳|selfie|photo
👀|eyes|look watching
👁️|eye|see
🧠|brain|smart think
👅|tongue|taste
👄|mouth|lips
👶|baby|child
👦|boy|child
👧|girl|child
👨|man|person
👩|woman|person
👴|old man|elder
👵|old woman|elder
`);

const NATURE = parse(`
🐶|dog face|puppy pet
🐱|cat face|kitten pet
🐭|mouse face|animal
🐹|hamster|pet
🐰|rabbit face|bunny
🦊|fox|animal
🐻|bear|animal
🐼|panda|animal
🐨|koala|animal
🐯|tiger face|animal
🦁|lion|animal
🐮|cow face|animal
🐷|pig face|animal
🐸|frog|animal
🐵|monkey face|animal
🐔|chicken|animal
🐧|penguin|animal
🐦|bird|animal
🐤|baby chick|animal
🦆|duck|animal
🦅|eagle|bird
🦉|owl|bird wise
🦇|bat|animal
🐺|wolf|animal
🐴|horse face|animal
🦄|unicorn|magic
🐝|bee|insect honey
🐛|bug|insect
🦋|butterfly|insect
🐌|snail|slow
🐞|lady beetle|insect
🐢|turtle|slow
🐍|snake|reptile
🐙|octopus|sea
🦀|crab|sea
🐠|tropical fish|sea
🐬|dolphin|sea
🐳|whale|sea
🦈|shark|sea
🐘|elephant|animal
🦒|giraffe|animal
🐑|sheep|animal
🐕|dog|pet
🐈|cat|pet
🐇|rabbit|bunny
🌸|cherry blossom|flower
💐|bouquet|flowers
🌹|rose|flower love
🌻|sunflower|flower
🌷|tulip|flower
🌱|seedling|plant grow
🌲|evergreen tree|tree
🌳|deciduous tree|tree
🌴|palm tree|tropical
🌵|cactus|desert
🍀|four leaf clover|luck
🍁|maple leaf|autumn
🌍|globe|earth world
🌙|crescent moon|night
⭐|star|favorite
🌟|glowing star|shine
✨|sparkles|magic shine
⚡|lightning|electric fast
🔥|fire|hot lit
🌈|rainbow|colors
☀️|sun|sunny
☁️|cloud|weather
🌧️|rain cloud|weather
❄️|snowflake|winter cold
💧|droplet|water
🌊|wave|ocean sea
`);

const FOOD = parse(`
🍎|red apple|fruit
🍐|pear|fruit
🍊|tangerine|orange fruit
🍋|lemon|fruit
🍌|banana|fruit
🍉|watermelon|fruit
🍇|grapes|fruit
🍓|strawberry|fruit
🍒|cherries|fruit
🍑|peach|fruit
🥭|mango|fruit
🍍|pineapple|fruit
🥥|coconut|fruit
🍅|tomato|vegetable
🥑|avocado|fruit
🥕|carrot|vegetable
🌽|corn|vegetable
🌶️|hot pepper|spicy chilli
🥦|broccoli|vegetable
🍄|mushroom|food
🥜|peanuts|nuts
🍞|bread|toast
🥐|croissant|bread
🧀|cheese|food
🍳|fried egg|cooking breakfast
🥞|pancakes|breakfast
🥓|bacon|breakfast
🍔|hamburger|burger
🍟|french fries|chips
🍕|pizza|food
🌭|hot dog|food
🥪|sandwich|food
🌮|taco|food
🌯|burrito|food
🍝|spaghetti|pasta
🍜|steaming bowl|noodles ramen
🍲|pot of food|stew
🍛|curry rice|food
🍣|sushi|japanese
🍱|bento box|japanese
🥟|dumpling|food
🍤|fried shrimp|food
🍙|rice ball|japanese
🍚|cooked rice|food
🍦|soft ice cream|dessert
🍩|doughnut|dessert
🍪|cookie|dessert
🎂|birthday cake|celebration
🍰|shortcake|dessert
🧁|cupcake|dessert
🍫|chocolate bar|sweet
🍬|candy|sweet
🍭|lollipop|sweet
🍯|honey pot|sweet
☕|hot beverage|coffee tea
🍵|teacup|tea
🥛|glass of milk|drink
🍺|beer mug|drink
🍻|clinking beer mugs|cheers
🥂|clinking glasses|cheers toast
🍷|wine glass|drink
🍸|cocktail|drink
🥤|cup with straw|soda drink
`);

const ACTIVITY = parse(`
⚽|soccer ball|football sport
🏀|basketball|sport
🏈|american football|sport
⚾|baseball|sport
🎾|tennis|sport
🏐|volleyball|sport
🏉|rugby|sport
🏓|ping pong|table tennis
🏸|badminton|sport
🥊|boxing glove|sport
⛳|flag in hole|golf
🎣|fishing pole|hobby
🏆|trophy|win champion
🥇|gold medal|first win
🥈|silver medal|second
🥉|bronze medal|third
🏅|sports medal|award
🎮|video game|gaming controller
🕹️|joystick|gaming
🎲|game die|dice
🎯|direct hit|target bullseye
🎳|bowling|sport
🎨|artist palette|art paint
🎬|clapper board|movie film
🎤|microphone|sing karaoke
🎧|headphone|music
🎸|guitar|music
🎹|musical keyboard|piano
🥁|drum|music
🎺|trumpet|music
🎻|violin|music
`);

const TRAVEL = parse(`
🚗|car|automobile
🚕|taxi|cab
🚌|bus|transport
🚑|ambulance|emergency
🚒|fire engine|emergency
🚚|delivery truck|transport
🛵|motor scooter|bike
🏍️|motorcycle|bike
🚲|bicycle|bike
✈️|airplane|flight travel
🚀|rocket|launch fast
🚁|helicopter|flight
⛵|sailboat|boat
🚢|ship|boat
🚂|locomotive|train
🚆|train|transport
🚇|metro|subway
🏠|house|home
🏡|house with garden|home
🏢|office building|work
🏥|hospital|health
🏦|bank|money
🏫|school|education
🏨|hotel|stay
🏪|convenience store|shop
🏰|castle|building
🗼|tokyo tower|landmark
⛪|church|building
🕌|mosque|building
🌅|sunrise|morning
🌆|cityscape at dusk|evening
🌃|night with stars|city
🗺️|world map|travel
🧭|compass|direction
⛰️|mountain|nature
🏝️|desert island|beach holiday
🏖️|beach|holiday vacation
`);

const OBJECTS = parse(`
⌚|watch|time
📱|mobile phone|smartphone
💻|laptop|computer work
⌨️|keyboard|computer
🖥️|desktop computer|pc
🖱️|computer mouse|pc
💾|floppy disk|save
📷|camera|photo
📸|camera with flash|photo
🎥|movie camera|video
📞|telephone receiver|call
☎️|telephone|call
📺|television|tv
📻|radio|music
⏰|alarm clock|time wake
⏳|hourglass|waiting time
💡|light bulb|idea
🔦|flashlight|light
💸|money with wings|spend
💵|dollar banknote|money cash
💰|money bag|rich
💳|credit card|payment
💎|gem stone|diamond
🔧|wrench|tool fix
🔨|hammer|tool
⚙️|gear|settings
🔒|locked|security
🔓|unlocked|security
🔑|key|access
📦|package|box delivery
📧|e-mail|mail
✉️|envelope|mail
📝|memo|note write
📁|file folder|documents
📂|open file folder|documents
📅|calendar|date schedule
📌|pushpin|pin
📎|paperclip|attach
✂️|scissors|cut
📏|straight ruler|measure
📊|bar chart|stats data
📈|chart increasing|growth up
📉|chart decreasing|down
🗑️|wastebasket|delete trash
🎁|wrapped gift|present
🎈|balloon|party
🎀|ribbon|gift
🔔|bell|notification
🔕|bell with slash|mute
🔍|magnifying glass|search
🔬|microscope|science
💊|pill|medicine
💉|syringe|vaccine
🧪|test tube|science
🛒|shopping cart|buy
🧹|broom|clean
`);

const SYMBOLS = parse(`
❤️|red heart|love
🧡|orange heart|love
💛|yellow heart|love
💚|green heart|love
💙|blue heart|love
💜|purple heart|love
🖤|black heart|love
🤍|white heart|love
🤎|brown heart|love
💔|broken heart|sad heartbreak
❣️|heart exclamation|love
💕|two hearts|love
💞|revolving hearts|love
💓|beating heart|love
💗|growing heart|love
💖|sparkling heart|love
💘|heart with arrow|love cupid
💝|heart with ribbon|love gift
💯|hundred points|perfect
✅|check mark button|done yes
✔️|check mark|done
❌|cross mark|no wrong
❓|question mark|help
❗|exclamation mark|important
‼️|double exclamation|important
⚠️|warning|caution alert
🚫|prohibited|no ban
⭕|hollow red circle|ok
🔴|red circle|status
🟠|orange circle|status
🟡|yellow circle|status
🟢|green circle|status online
🔵|blue circle|status
🟣|purple circle|status
➕|plus|add
➖|minus|remove
➡️|right arrow|next
⬅️|left arrow|back
⬆️|up arrow|up
⬇️|down arrow|down
🔁|repeat|loop
🔄|counterclockwise arrows|refresh
▶️|play button|start
⏸️|pause button|stop
🔊|speaker high volume|sound
🔇|muted speaker|silent
🎵|musical note|music
🎶|musical notes|music
💤|zzz|sleep
💢|anger symbol|mad
💥|collision|boom
💦|sweat droplets|water
💨|dashing away|fast
💫|dizzy|stars
💬|speech balloon|chat message
💭|thought balloon|thinking
🆗|ok button|ok
🆕|new button|new
🆓|free button|free
🎉|party popper|celebration congratulations
🎊|confetti ball|celebration
`);

export const EMOJI_CATEGORIES: readonly EmojiCategory[] = [
  { id: "smileys", label: "Smileys", icon: "😀", emojis: SMILEYS },
  { id: "people", label: "People and gestures", icon: "👍", emojis: PEOPLE },
  { id: "nature", label: "Animals and nature", icon: "🐶", emojis: NATURE },
  { id: "food", label: "Food and drink", icon: "🍔", emojis: FOOD },
  { id: "activity", label: "Activities", icon: "⚽", emojis: ACTIVITY },
  { id: "travel", label: "Travel and places", icon: "🚗", emojis: TRAVEL },
  { id: "objects", label: "Objects", icon: "💡", emojis: OBJECTS },
  { id: "symbols", label: "Symbols", icon: "❤️", emojis: SYMBOLS },
];

/** Flat list of every emoji: [emoji, label, keywords]. Kept for existing imports. */
export const EMOJI_OPTIONS: readonly EmojiOption[] = EMOJI_CATEGORIES.flatMap(
  (category) => category.emojis,
);

/** Reactions supported by the chat message composer. */
export const REACTION_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];