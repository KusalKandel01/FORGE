/**
 * FORGE exercise tutor dataset. Static data, ships with the app,
 * works fully offline. Every entry is a real movement with a real
 * step by step tutorial written for a home beginner.
 *
 * MET values are approximations from the Compendium of Physical
 * Activities and only feed the calorie estimate in the coach.
 *
 * The shared types live in ./exercises-types so the category data
 * packs can be written and compiled independently of this file.
 */
import type {
  Exercise,
  ExerciseCategory,
  Program,
  ProgramBlock,
} from "./exercises-types";
import {
  WEIGHTS_EXERCISES,
  WEIGHTS_PROGRAMS,
} from "./exercises-weights";
import {
  MACHINES_KB_EXERCISES,
  MACHINES_KB_PROGRAMS,
} from "./exercises-machines-kb";
import {
  BAND_PLYO_EXERCISES,
  BAND_PLYO_PROGRAMS,
} from "./exercises-band-plyo";
import {
  SKILLS_CORE_EXERCISES,
  SKILLS_CORE_PROGRAMS,
} from "./exercises-skills-core";
import {
  YOGA_STRETCH_EXERCISES,
  YOGA_STRETCH_PROGRAMS,
} from "./exercises-yoga-stretch";
import {
  HOME_COND_EXERCISES,
  HOME_COND_PROGRAMS,
} from "./exercises-home-conditioning";

export type {
  Difficulty,
  Exercise,
  ExerciseCategory,
  Program,
  ProgramBlock,
} from "./exercises-types";

/* ------------------------------------------------------------------ */
/* Home, bodyweight strength                                           */
/* ------------------------------------------------------------------ */

const HOME: Exercise[] = [
  {
    id: "push-up",
    name: "Push-up",
    category: "Home",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Chest", "Triceps", "Front shoulders"],
    secondary: ["Core"],
    met: 8,
    steps: [
      "Place your hands on the floor slightly wider than your shoulders, arms straight.",
      "Walk your feet back until your body forms one straight line from head to heels.",
      "Squeeze your stomach and glutes so your hips do not sag or pike up.",
      "Bend your elbows and lower your chest until it is a fist height from the floor.",
      "Keep your elbows at about 45 degrees to your body, not flared straight out.",
      "Press the floor away until your arms are straight again. That is one rep.",
    ],
    tips: [
      "Imagine your body is a rigid plank being lowered and raised as one piece.",
      "Spread your fingers and grip the floor for a more stable base.",
      "Too hard at first? Drop your knees to the floor and keep the same straight line.",
    ],
    mistakes: [
      "Hips sagging toward the floor, which strains the lower back.",
      "Head poking forward before the chest moves.",
    ],
    breathing: "Inhale on the way down, exhale as you press up.",
    prescription: { sets: "3 to 4 sets", reps: "8 to 15 reps", rest: "60 to 90 sec" },
    sessionDefault: { mode: "reps", reps: 10, restSec: 60 },
  },
  {
    id: "knee-push-up",
    name: "Knee push-up",
    category: "Home",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Chest", "Triceps"],
    secondary: ["Core"],
    met: 6,
    steps: [
      "Kneel on the floor and place your hands slightly wider than your shoulders.",
      "Shift your weight forward so your shoulders sit over your wrists.",
      "Cross your ankles or keep them down, whichever feels stable.",
      "Lower your chest toward the floor with your elbows at 45 degrees.",
      "Stop when your chest is a fist height from the floor, then press back up.",
    ],
    tips: [
      "Keep a straight line from your head to your knees the whole time.",
      "This is the main stepping stone to full push-ups. Add reps each week.",
    ],
    mistakes: [
      "Letting the hips sag, which removes the core training effect.",
      "Bouncing the chest off the floor instead of controlling the lowering.",
    ],
    breathing: "Inhale down, exhale up.",
    prescription: { sets: "3 sets", reps: "10 to 15 reps", rest: "60 sec" },
    sessionDefault: { mode: "reps", reps: 12, restSec: 60 },
  },
  {
    id: "incline-push-up",
    name: "Incline push-up",
    category: "Home",
    equipment: "Bench, table or sturdy chair",
    difficulty: "Beginner",
    primary: ["Chest", "Triceps"],
    secondary: ["Core", "Shoulders"],
    met: 7,
    steps: [
      "Place your hands on a stable raised surface like a bench, table or counter.",
      "Walk your feet back until your body is a straight diagonal line.",
      "Brace your core and squeeze your glutes.",
      "Bend your elbows and lower your chest to the edge of the surface.",
      "Press back up until your arms are straight.",
    ],
    tips: [
      "The higher the surface, the easier the rep. Lower it over time to progress.",
      "A wall is the easiest version, a low bench is the hardest.",
    ],
    mistakes: [
      "Using a wobbly surface, which is a safety risk.",
      "Letting the elbows flare out to a full 90 degrees.",
    ],
    breathing: "Inhale down, exhale up.",
    prescription: { sets: "3 sets", reps: "10 to 15 reps", rest: "60 sec" },
    sessionDefault: { mode: "reps", reps: 12, restSec: 60 },
  },
  {
    id: "pike-push-up",
    name: "Pike push-up",
    category: "Home",
    equipment: "None",
    difficulty: "Intermediate",
    primary: ["Shoulders", "Triceps"],
    secondary: ["Upper chest", "Core"],
    met: 8,
    steps: [
      "Start in a push-up position, then walk your feet toward your hands.",
      "Lift your hips high so your body forms an upside down V.",
      "Keep your head between your arms, looking back toward your feet.",
      "Bend your elbows and lower the top of your head toward the floor.",
      "Press back up until your arms are straight, keeping the hips high.",
    ],
    tips: [
      "The more vertical your torso, the more the shoulders work.",
      "This builds toward handstand push-ups. Elevate your feet on a chair to progress.",
    ],
    mistakes: [
      "Dropping the hips and turning it into a normal push-up.",
      "Crashing the head into the floor instead of lowering under control.",
    ],
    breathing: "Inhale down, exhale up.",
    prescription: { sets: "3 sets", reps: "6 to 12 reps", rest: "75 sec" },
    sessionDefault: { mode: "reps", reps: 8, restSec: 75 },
  },
  {
    id: "squat",
    name: "Bodyweight squat",
    category: "Home",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Quads", "Glutes"],
    secondary: ["Hamstrings", "Core"],
    met: 5.5,
    steps: [
      "Stand with feet about shoulder width apart, toes turned out slightly.",
      "Reach your arms forward for balance and push your hips back like sitting into a chair.",
      "Bend your knees and lower until your thighs are parallel to the floor or as deep as is comfortable.",
      "Keep your weight spread across the whole foot and your chest up.",
      "Push through your heels and stand back up, squeezing your glutes at the top.",
    ],
    tips: [
      "Your knees can travel forward over your toes, that is normal and safe.",
      "Heels lifting? Widen your stance a little and work on ankle mobility.",
      "Place a chair behind you and tap it lightly to learn the depth.",
    ],
    mistakes: [
      "Rounding the lower back at the bottom of the rep.",
      "Knees caving inward as you stand up.",
    ],
    breathing: "Inhale as you lower, exhale as you stand.",
    prescription: { sets: "3 to 4 sets", reps: "12 to 20 reps", rest: "60 sec" },
    sessionDefault: { mode: "reps", reps: 15, restSec: 60 },
  },
  {
    id: "jump-squat",
    name: "Jump squat",
    category: "Home",
    equipment: "None",
    difficulty: "Intermediate",
    primary: ["Quads", "Glutes", "Calves"],
    secondary: ["Hamstrings", "Core"],
    met: 8,
    steps: [
      "Set your feet shoulder width apart and sit back into a quarter squat.",
      "Explosively jump straight up, swinging your arms back for momentum.",
      "Land softly on the balls of your feet with bent knees.",
      "Sink straight back into the quarter squat and repeat.",
    ],
    tips: [
      "Land quiet. Noise is a sign you are slamming your joints.",
      "Master the bodyweight squat first, then add the jump.",
    ],
    mistakes: [
      "Landing with stiff, straight legs.",
      "Letting the knees collapse inward on landing.",
    ],
    breathing: "Exhale on the jump, inhale on the landing.",
    prescription: { sets: "3 sets", reps: "10 to 15 reps", rest: "75 sec" },
    sessionDefault: { mode: "time", workSec: 30, restSec: 60 },
  },
  {
    id: "lunge",
    name: "Lunge",
    category: "Home",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Quads", "Glutes"],
    secondary: ["Hamstrings", "Calves", "Core"],
    met: 6,
    steps: [
      "Stand tall with your feet hip width apart.",
      "Step one foot forward about two feet and plant it flat.",
      "Lower your back knee toward the floor until both knees are near 90 degrees.",
      "Keep your front shin close to vertical and your torso upright.",
      "Push through the front heel to stand back up and switch legs.",
    ],
    tips: [
      "Hold a wall or chair for balance while you learn the pattern.",
      "Shorter step hits the quads more, longer step hits the glutes more.",
    ],
    mistakes: [
      "Front knee shooting far past the toes with the heel lifting.",
      "Leaning the torso far forward.",
    ],
    breathing: "Inhale down, exhale up.",
    prescription: { sets: "3 sets", reps: "10 to 12 per leg", rest: "60 sec" },
    sessionDefault: { mode: "reps", reps: 10, restSec: 60 },
  },
  {
    id: "wall-sit",
    name: "Wall sit",
    category: "Home",
    equipment: "Wall",
    difficulty: "Beginner",
    primary: ["Quads"],
    secondary: ["Glutes", "Calves"],
    met: 4,
    steps: [
      "Stand with your back against a wall, feet about two feet out.",
      "Slide down until your knees are bent at 90 degrees.",
      "Keep your whole back flat against the wall and knees over your ankles.",
      "Hold that position for the target time, breathing steadily.",
    ],
    tips: [
      "Put your hands on your thighs. If you push on them you are cheating.",
      "Your thighs will burn, that is the point. Stay tall through the chest.",
    ],
    mistakes: [
      "Resting your hands on your legs to take load off.",
      "Sliding up the wall as the set gets hard.",
    ],
    breathing: "Slow, steady breaths through the hold.",
    prescription: { sets: "3 sets", reps: "30 to 60 sec hold", rest: "60 sec" },
    sessionDefault: { mode: "time", workSec: 40, restSec: 60 },
  },
  {
    id: "glute-bridge",
    name: "Glute bridge",
    category: "Home",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Glutes"],
    secondary: ["Hamstrings", "Core"],
    met: 3.8,
    steps: [
      "Lie on your back with knees bent and feet flat, hip width apart.",
      "Place your arms by your sides, palms down.",
      "Press through your heels and lift your hips until your body is a straight line from shoulders to knees.",
      "Squeeze your glutes hard at the top for one second.",
      "Lower your hips back down with control, lightly touching the floor, then repeat.",
    ],
    tips: [
      "Tuck your chin slightly and keep your ribs down so the lower back does not arch.",
      "If you feel it in the hamstrings, walk your feet a little closer to your body.",
    ],
    mistakes: [
      "Overarching the lower back at the top instead of squeezing the glutes.",
      "Pushing through the toes instead of the heels.",
    ],
    breathing: "Exhale as you lift, inhale as you lower.",
    prescription: { sets: "3 sets", reps: "12 to 20 reps", rest: "45 sec" },
    sessionDefault: { mode: "reps", reps: 15, restSec: 45 },
  },
  {
    id: "hip-thrust",
    name: "Hip thrust",
    category: "Home",
    equipment: "Bench or couch edge",
    difficulty: "Intermediate",
    primary: ["Glutes"],
    secondary: ["Hamstrings"],
    met: 4.5,
    steps: [
      "Sit on the floor with your upper back against a bench or couch edge.",
      "Roll a pad or towel across your hips if you use weight, then hold it there.",
      "Plant your feet flat, about hip width, knees bent.",
      "Drive through your heels and push your hips up until your torso is level.",
      "Squeeze the glutes at the top, then lower under control.",
    ],
    tips: [
      "Keep your chin tucked and look at your knees so the back stays neutral.",
      "This is the strongest glute builder you can do at home with a backpack for load.",
    ],
    mistakes: [
      "Hyperextending the lower back at the top.",
      "Feet too far away, which shifts work to the hamstrings.",
    ],
    breathing: "Exhale up, inhale down.",
    prescription: { sets: "3 to 4 sets", reps: "10 to 15 reps", rest: "75 sec" },
    sessionDefault: { mode: "reps", reps: 12, restSec: 75 },
  },
  {
    id: "step-up",
    name: "Step-up",
    category: "Home",
    equipment: "Stairs, step or sturdy box",
    difficulty: "Beginner",
    primary: ["Quads", "Glutes"],
    secondary: ["Calves", "Core"],
    met: 6,
    steps: [
      "Stand facing a stair, step or stable platform at knee height.",
      "Place one whole foot on the step.",
      "Press through that foot and lift your body up until the standing leg is straight.",
      "Do not push off the back foot. Let the front leg do the work.",
      "Lower yourself back down with control and repeat, then switch legs.",
    ],
    tips: [
      "Higher step, harder rep. Start low and progress.",
      "Keep your torso tall, resist the urge to lean forward.",
    ],
    mistakes: [
      "Bouncing off the bottom leg for momentum.",
      "Letting the knee of the working leg cave inward.",
    ],
    breathing: "Exhale up, inhale down.",
    prescription: { sets: "3 sets", reps: "10 to 12 per leg", rest: "60 sec" },
    sessionDefault: { mode: "reps", reps: 10, restSec: 60 },
  },
  {
    id: "calf-raise",
    name: "Calf raise",
    category: "Home",
    equipment: "None, wall for balance",
    difficulty: "Beginner",
    primary: ["Calves"],
    secondary: [],
    met: 4,
    steps: [
      "Stand tall with fingertips resting lightly on a wall or chair for balance.",
      "Rise up onto the balls of your feet as high as you can.",
      "Pause at the top for one second and feel the calf squeeze.",
      "Lower your heels slowly back to the floor.",
    ],
    tips: [
      "Slow lowers build more strength than fast reps.",
      "Do them on a stair edge with heels hanging off for a bigger range.",
    ],
    mistakes: [
      "Bouncing quickly without pausing at the top.",
      "Bending the knees to help, which takes work off the calves.",
    ],
    breathing: "Exhale up, inhale down.",
    prescription: { sets: "3 sets", reps: "15 to 25 reps", rest: "45 sec" },
    sessionDefault: { mode: "reps", reps: 20, restSec: 45 },
  },
  {
    id: "superman",
    name: "Superman",
    category: "Home",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Lower back"],
    secondary: ["Glutes", "Upper back"],
    met: 3,
    steps: [
      "Lie face down with arms extended overhead and legs straight.",
      "Keep your neck neutral by looking at the floor.",
      "Lift your arms, chest and legs a few inches off the floor at the same time.",
      "Hold for two seconds, feeling your back and glutes work.",
      "Lower everything back down with control and repeat.",
    ],
    tips: [
      "Small lifts are enough. Height does not matter, tension does.",
      "Reach long instead of lifting high to protect the lower back.",
    ],
    mistakes: [
      "Cranking the neck up to look forward.",
      "Jerking up fast and dropping down fast.",
    ],
    breathing: "Exhale as you lift, inhale as you lower.",
    prescription: { sets: "3 sets", reps: "10 to 15 reps", rest: "45 sec" },
    sessionDefault: { mode: "reps", reps: 12, restSec: 45 },
  },
  {
    id: "tricep-dip",
    name: "Chair tricep dip",
    category: "Home",
    equipment: "Sturdy chair or bench",
    difficulty: "Beginner",
    primary: ["Triceps"],
    secondary: ["Chest", "Front shoulders"],
    met: 6,
    steps: [
      "Sit on the edge of a stable chair and grip the edge beside your hips.",
      "Walk your feet out and slide your hips off the seat, arms straight.",
      "Keep your back close to the chair as you bend your elbows.",
      "Lower until your elbows reach about 90 degrees.",
      "Press through your palms back up to straight arms.",
    ],
    tips: [
      "Keep the chair against a wall so it cannot slide.",
      "Bend your knees and bring your feet closer to make it easier.",
    ],
    mistakes: [
      "Letting the hips drift far from the chair.",
      "Lowering past 90 degrees, which irritates the shoulders.",
    ],
    breathing: "Inhale down, exhale up.",
    prescription: { sets: "3 sets", reps: "10 to 15 reps", rest: "60 sec" },
    sessionDefault: { mode: "reps", reps: 12, restSec: 60 },
  },
  {
    id: "pull-up",
    name: "Pull-up",
    category: "Home",
    equipment: "Pull-up bar",
    difficulty: "Advanced",
    primary: ["Lats", "Biceps"],
    secondary: ["Upper back", "Core", "Forearms"],
    met: 8,
    steps: [
      "Grip the bar with hands slightly wider than your shoulders, palms facing away.",
      "Hang with straight arms and pull your shoulder blades down to start.",
      "Pull your elbows down toward your ribs and lift your chest to the bar.",
      "Clear the bar with your chin, then lower under control to a full hang.",
    ],
    tips: [
      "No rep yet? Do slow negatives: jump to the top and lower for 5 seconds.",
      "Flexing your glutes and abs stops body swing.",
    ],
    mistakes: [
      "Kipping and swinging when the set gets hard.",
      "Stopping short of a full hang between reps.",
    ],
    breathing: "Exhale pulling up, inhale lowering down.",
    prescription: { sets: "3 to 5 sets", reps: "3 to 10 reps", rest: "90 sec" },
    sessionDefault: { mode: "reps", reps: 5, restSec: 90 },
  },
  {
    id: "inverted-row",
    name: "Inverted row",
    category: "Home",
    equipment: "Table, bar or low sturdy surface",
    difficulty: "Intermediate",
    primary: ["Upper back", "Lats", "Biceps"],
    secondary: ["Core", "Rear shoulders"],
    met: 6,
    steps: [
      "Lie under a sturdy table edge or low bar and grip it with straight arms.",
      "Walk your feet forward until your body hangs in a straight line, heels on the floor.",
      "Pull your chest up to the edge, driving your elbows back and down.",
      "Squeeze your shoulder blades together at the top.",
      "Lower under control until your arms are straight again.",
    ],
    tips: [
      "The more horizontal your body, the harder it gets. Raise the surface to scale down.",
      "This is the best partner exercise to push-ups for balanced strength.",
    ],
    mistakes: [
      "Hips sagging toward the floor.",
      "Shrugging the shoulders up to the ears instead of pulling the blades down.",
    ],
    breathing: "Exhale up, inhale down.",
    prescription: { sets: "3 sets", reps: "8 to 12 reps", rest: "75 sec" },
    sessionDefault: { mode: "reps", reps: 10, restSec: 75 },
  },
  {
    id: "burpee",
    name: "Burpee",
    category: "Home",
    equipment: "None",
    difficulty: "Intermediate",
    primary: ["Full body"],
    secondary: ["Heart and lungs"],
    met: 8,
    steps: [
      "Stand tall, then squat down and place your hands on the floor.",
      "Jump or step your feet back into a push-up position.",
      "Lower your chest to the floor for a push-up, or skip that part to scale down.",
      "Jump or step your feet back toward your hands.",
      "Stand up explosively and reach your arms overhead, then repeat.",
    ],
    tips: [
      "Step back and step in instead of jumping to make it low impact.",
      "Pace yourself. Burpees are a marathon inside a sprint.",
    ],
    mistakes: [
      "Letting the hips sag in the plank part of the movement.",
      "Snaking the chest up before the hips when standing.",
    ],
    breathing: "Exhale on the jump up, keep breathing through the flow.",
    prescription: { sets: "3 to 5 sets", reps: "8 to 15 reps", rest: "60 sec" },
    sessionDefault: { mode: "time", workSec: 30, restSec: 45 },
  },
];

/* ------------------------------------------------------------------ */
/* Gym, weighted strength                                              */
/* ------------------------------------------------------------------ */

const GYM: Exercise[] = [
  {
    id: "back-squat",
    name: "Barbell back squat",
    category: "Gym",
    equipment: "Barbell and rack",
    difficulty: "Intermediate",
    primary: ["Quads", "Glutes"],
    secondary: ["Hamstrings", "Core", "Upper back"],
    met: 6,
    steps: [
      "Set the bar in the rack at upper chest height and duck under it.",
      "Rest the bar on your upper traps, grip it tight and lift it out.",
      "Step back, set your feet shoulder width and brace your core like taking a punch.",
      "Push your hips back and bend your knees, descending until thighs hit parallel.",
      "Keep the bar path straight over your mid foot as you drive back up.",
    ],
    tips: [
      "Take a big breath at the top and hold it through the rep, exhale at the top.",
      "Wrist and shoulder pain? Try a wider grip or use a high bar position instead.",
    ],
    mistakes: [
      "Heels lifting off the floor at the bottom.",
      "The chest dropping and the bar drifting forward.",
    ],
    breathing: "Big breath in at the top, hold down, exhale up.",
    prescription: { sets: "3 to 5 sets", reps: "5 to 10 reps", rest: "2 to 3 min" },
    sessionDefault: { mode: "reps", reps: 8, restSec: 120 },
  },
  {
    id: "deadlift",
    name: "Deadlift",
    category: "Gym",
    equipment: "Barbell",
    difficulty: "Advanced",
    primary: ["Hamstrings", "Glutes", "Lower back"],
    secondary: ["Upper back", "Grip", "Core"],
    met: 6.5,
    steps: [
      "Set the bar over the middle of your feet, shins about an inch away.",
      "Hinge at the hips, bend your knees and grip the bar just outside your legs.",
      "Pull your hips down until your back is flat and your chest is up.",
      "Drag the bar up your shins, keeping it in contact with your legs the whole way.",
      "Stand tall by driving your hips forward, squeezing the glutes at the top.",
      "Return the bar by pushing your hips back first, then bending the knees.",
    ],
    tips: [
      "It is a push through the floor, not a pull with the arms. Arms are just hooks.",
      "Start lighter than you think. Form first, plates later.",
    ],
    mistakes: [
      "Rounded lower back, the most common and most dangerous error.",
      "Yanking the bar off the floor instead of building tension first.",
    ],
    breathing: "Brace and hold your breath through the pull, exhale at the top.",
    prescription: { sets: "3 to 5 sets", reps: "3 to 6 reps", rest: "2 to 3 min" },
    sessionDefault: { mode: "reps", reps: 5, restSec: 150 },
  },
  {
    id: "romanian-deadlift",
    name: "Romanian deadlift",
    category: "Gym",
    equipment: "Barbell or dumbbells",
    difficulty: "Intermediate",
    primary: ["Hamstrings", "Glutes"],
    secondary: ["Lower back", "Grip"],
    met: 6,
    steps: [
      "Hold the bar or dumbbells at hip height with straight arms.",
      "Soften the knees a little and keep them there.",
      "Push your hips straight back and slide the weight down your thighs.",
      "Lower until you feel a strong hamstring stretch, usually mid shin height.",
      "Drive your hips forward to stand back up, keeping the back flat throughout.",
    ],
    tips: [
      "The bar stays glued to your legs. Any gap means your hips are too far forward.",
      "Stop the descent where your back starts to round, not lower.",
    ],
    mistakes: [
      "Squatting the weight down instead of hinging at the hips.",
      "Letting the lower back round at the bottom.",
    ],
    breathing: "Inhale down, exhale up.",
    prescription: { sets: "3 sets", reps: "8 to 12 reps", rest: "90 sec" },
    sessionDefault: { mode: "reps", reps: 10, restSec: 90 },
  },
  {
    id: "bench-press",
    name: "Barbell bench press",
    category: "Gym",
    equipment: "Barbell and bench",
    difficulty: "Intermediate",
    primary: ["Chest"],
    secondary: ["Triceps", "Front shoulders"],
    met: 6,
    steps: [
      "Lie on the bench with your eyes under the bar and feet planted on the floor.",
      "Squeeze your shoulder blades together and down, creating a shelf for your back.",
      "Grip the bar slightly wider than your shoulders and un rack it over your chest.",
      "Lower the bar to your mid chest, elbows tucked at about 45 to 60 degrees.",
      "Press the bar back up and slightly back toward your shoulders.",
    ],
    tips: [
      "Keep your feet planted and your glutes on the bench for the whole set.",
      "Use a spotter or safety pins when the weight gets heavy.",
    ],
    mistakes: [
      "Bouncing the bar off the chest.",
      "Flaring the elbows straight out to the sides.",
    ],
    breathing: "Inhale at the top, lower, then exhale as you press.",
    prescription: { sets: "3 to 5 sets", reps: "5 to 10 reps", rest: "2 min" },
    sessionDefault: { mode: "reps", reps: 8, restSec: 120 },
  },
  {
    id: "overhead-press",
    name: "Overhead press",
    category: "Gym",
    equipment: "Barbell or dumbbells",
    difficulty: "Intermediate",
    primary: ["Shoulders"],
    secondary: ["Triceps", "Core", "Upper chest"],
    met: 5.5,
    steps: [
      "Stand with feet hip width and the bar resting on your front shoulders.",
      "Grip just outside shoulder width with wrists stacked over elbows.",
      "Brace your glutes and abs so your ribs do not flare.",
      "Press the bar straight up, moving your head back slightly to let it pass.",
      "Lock out overhead with the bar over the middle of your body, then lower to the shoulders.",
    ],
    tips: [
      "Squeeze your glutes hard. It locks the lower back into a safe position.",
      "At the top, your biceps should be near your ears.",
    ],
    mistakes: [
      "Leaning far back and turning it into a standing incline press.",
      "Pressing around the head instead of moving the head out of the way.",
    ],
    breathing: "Inhale at the bottom, exhale through the press.",
    prescription: { sets: "3 to 4 sets", reps: "6 to 10 reps", rest: "2 min" },
    sessionDefault: { mode: "reps", reps: 8, restSec: 120 },
  },
  {
    id: "barbell-row",
    name: "Barbell row",
    category: "Gym",
    equipment: "Barbell",
    difficulty: "Intermediate",
    primary: ["Upper back", "Lats"],
    secondary: ["Biceps", "Lower back", "Rear shoulders"],
    met: 6,
    steps: [
      "Hinge forward to about 45 degrees with the bar hanging at arm's length.",
      "Keep your back flat and knees softly bent.",
      "Row the bar toward your lower ribs, driving your elbows up and back.",
      "Squeeze your shoulder blades at the top for a beat.",
      "Lower the bar under control without rounding.",
    ],
    tips: [
      "Your torso angle should stay fixed. If you rise up each rep, the weight is too heavy.",
      "Think of pulling with your elbows, not your hands.",
    ],
    mistakes: [
      "Jerking the weight with the lower back.",
      "Rounding the upper back and shrugging at the top.",
    ],
    breathing: "Brace, exhale on the row, inhale on the lower.",
    prescription: { sets: "3 to 4 sets", reps: "8 to 12 reps", rest: "90 sec" },
    sessionDefault: { mode: "reps", reps: 10, restSec: 90 },
  },
  {
    id: "lat-pulldown",
    name: "Lat pulldown",
    category: "Gym",
    equipment: "Pulldown machine",
    difficulty: "Beginner",
    primary: ["Lats"],
    secondary: ["Biceps", "Upper back"],
    met: 5.5,
    steps: [
      "Grip the bar wider than your shoulders with palms facing away.",
      "Sit with your thighs locked under the pads.",
      "Lean your torso back about 15 degrees and lift your chest.",
      "Pull the bar down to your upper chest, driving your elbows down and back.",
      "Control the bar back up until your arms are fully stretched.",
    ],
    tips: [
      "Start each rep by dropping the shoulder blades, not by bending the arms.",
      "Leaning back slightly is fine. Rowing the weight with big body English is not.",
    ],
    mistakes: [
      "Pulling behind the neck, which is hard on the shoulders.",
      "Using momentum from the torso to yank the bar down.",
    ],
    breathing: "Exhale on the pull, inhale on the way up.",
    prescription: { sets: "3 sets", reps: "10 to 12 reps", rest: "75 sec" },
    sessionDefault: { mode: "reps", reps: 10, restSec: 75 },
  },
  {
    id: "cable-row",
    name: "Seated cable row",
    category: "Gym",
    equipment: "Cable machine",
    difficulty: "Beginner",
    primary: ["Upper back", "Lats"],
    secondary: ["Biceps", "Rear shoulders"],
    met: 5.5,
    steps: [
      "Sit tall with feet on the platform and a slight knee bend.",
      "Grab the handle and let your arms stretch forward with a flat back.",
      "Row the handle into your stomach, elbows brushing your sides.",
      "Squeeze the shoulder blades together, then let the handle travel back out.",
      "Allow a gentle stretch at the front, then row again.",
    ],
    tips: [
      "Imagine a string pulling your chest toward the machine on every rep.",
      "Keep the movement slow. Cable rows punish momentum.",
    ],
    mistakes: [
      "Rocking back and forth from the lower back.",
      "Shrugging the shoulders up during the pull.",
    ],
    breathing: "Exhale on the row, inhale on the return.",
    prescription: { sets: "3 sets", reps: "10 to 12 reps", rest: "75 sec" },
    sessionDefault: { mode: "reps", reps: 12, restSec: 75 },
  },
  {
    id: "leg-press",
    name: "Leg press",
    category: "Gym",
    equipment: "Leg press machine",
    difficulty: "Beginner",
    primary: ["Quads", "Glutes"],
    secondary: ["Hamstrings", "Calves"],
    met: 5.5,
    steps: [
      "Sit in the machine with your back and hips flat against the pad.",
      "Place your feet shoulder width, flat in the middle of the platform.",
      "Press the platform away and release the safety catches.",
      "Lower the weight until your knees reach about 90 degrees.",
      "Press back up through your whole foot without locking the knees hard.",
    ],
    tips: [
      "Never let your lower back curl off the pad at the bottom. Stop before it does.",
      "Higher feet hit glutes and hamstrings more, lower feet hit quads more.",
    ],
    mistakes: [
      "Slamming into a full lockout on every rep.",
      "Butt lifting off the seat at the bottom.",
    ],
    breathing: "Inhale down, exhale up.",
    prescription: { sets: "3 to 4 sets", reps: "10 to 15 reps", rest: "90 sec" },
    sessionDefault: { mode: "reps", reps: 12, restSec: 90 },
  },
  {
    id: "chest-fly",
    name: "Dumbbell chest fly",
    category: "Gym",
    equipment: "Dumbbells and bench",
    difficulty: "Beginner",
    primary: ["Chest"],
    secondary: ["Front shoulders", "Biceps"],
    met: 4.5,
    steps: [
      "Lie on a bench holding dumbbells above your chest, palms facing each other.",
      "Keep a soft bend in your elbows and hold it the whole set.",
      "Open your arms out to the sides in a wide arc until you feel a chest stretch.",
      "Squeeze your chest to bring the weights back together above you.",
    ],
    tips: [
      "Lighter weight than you think. This is a stretch and squeeze movement.",
      "Hug a tree is the cue. The arc stays wide, the elbows stay soft.",
    ],
    mistakes: [
      "Turning it into a press by bending the elbows more as you get tired.",
      "Going so deep that the shoulders pinch.",
    ],
    breathing: "Inhale as you open, exhale as you close.",
    prescription: { sets: "3 sets", reps: "10 to 15 reps", rest: "75 sec" },
    sessionDefault: { mode: "reps", reps: 12, restSec: 75 },
  },
  {
    id: "bicep-curl",
    name: "Dumbbell bicep curl",
    category: "Gym",
    equipment: "Dumbbells",
    difficulty: "Beginner",
    primary: ["Biceps"],
    secondary: ["Forearms"],
    met: 4,
    steps: [
      "Stand tall with a dumbbell in each hand, palms facing forward.",
      "Keep your elbows pinned to your sides.",
      "Curl the weights up by bending only at the elbows.",
      "Squeeze the biceps at the top without letting the shoulders lift.",
      "Lower slowly to straight arms, resisting all the way down.",
    ],
    tips: [
      "A slow 3 second lowering phase doubles the value of every rep.",
      "If your body swings, the weight is too heavy. Drop it and stay strict.",
    ],
    mistakes: [
      "Swinging the torso to heave the weight up.",
      "Cutting the bottom half of the range short.",
    ],
    breathing: "Exhale up, inhale down.",
    prescription: { sets: "3 sets", reps: "10 to 15 reps", rest: "60 sec" },
    sessionDefault: { mode: "reps", reps: 12, restSec: 60 },
  },
  {
    id: "lateral-raise",
    name: "Lateral raise",
    category: "Gym",
    equipment: "Dumbbells",
    difficulty: "Beginner",
    primary: ["Side shoulders"],
    secondary: ["Traps"],
    met: 4,
    steps: [
      "Stand with a light dumbbell in each hand at your sides.",
      "Slight bend in the elbows and a small forward lean of the torso.",
      "Raise both arms out to the sides until they reach shoulder height.",
      "Lead with the elbows, pinkies slightly up, like pouring water.",
      "Lower the weights slowly back to your sides.",
    ],
    tips: [
      "Go lighter than you think. Strict form with 2 to 5 kg beats swinging 10 kg.",
      "Pause a beat at the top for a stronger burn.",
    ],
    mistakes: [
      "Shrugging the traps up toward the ears.",
      "Swinging the weights with body momentum.",
    ],
    breathing: "Exhale up, inhale down.",
    prescription: { sets: "3 sets", reps: "12 to 20 reps", rest: "60 sec" },
    sessionDefault: { mode: "reps", reps: 15, restSec: 60 },
  },
];

/* ------------------------------------------------------------------ */
/* Cardio                                                              */
/* ------------------------------------------------------------------ */

const CARDIO: Exercise[] = [
  {
    id: "walking",
    name: "Brisk walk",
    category: "Cardio",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Heart and lungs", "Legs"],
    secondary: [],
    met: 3.5,
    steps: [
      "Walk at a pace where talking is possible but singing is not.",
      "Keep your head up, shoulders relaxed and arms swinging naturally.",
      "Roll from heel to toe with each step.",
      "Aim for blocks of 10 minutes or more to count as quality cardio.",
    ],
    tips: [
      "Track your steps in the FORGE steps card to watch the total climb.",
      "A light hill turns a walk into real leg training.",
    ],
    mistakes: [
      "Strolling so slowly that breathing never changes.",
      "Looking down at your phone the whole time.",
    ],
    breathing: "Steady nasal breathing works for most of the pace range.",
    prescription: { sets: "1 session", reps: "20 to 60 min", rest: "None" },
    sessionDefault: { mode: "time", workSec: 1200, restSec: 0 },
  },
  {
    id: "running",
    name: "Run",
    category: "Cardio",
    equipment: "Running shoes",
    difficulty: "Intermediate",
    primary: ["Heart and lungs", "Quads", "Calves"],
    secondary: ["Hamstrings", "Glutes", "Core"],
    met: 9.8,
    steps: [
      "Start with 5 minutes of brisk walking as a warm-up.",
      "Run at a pace where you can still speak short sentences.",
      "Aim for quick, light steps landing under your hips, not way out in front.",
      "Keep your torso tall and arms swinging at about 90 degrees.",
      "Finish with 5 minutes of walking to cool down.",
    ],
    tips: [
      "Most of your running should feel easy. Save sprints for separate sessions.",
      "Increase weekly distance by no more than about 10 percent to stay injury free.",
    ],
    mistakes: [
      "Overstriding with a hard heel strike far ahead of the body.",
      "Starting every run too fast and burning out in 10 minutes.",
    ],
    breathing: "Rhythmic breathing, try inhale for 2 steps, exhale for 2 steps.",
    prescription: { sets: "1 session", reps: "15 to 45 min", rest: "None" },
    sessionDefault: { mode: "time", workSec: 1500, restSec: 0 },
  },
  {
    id: "jump-rope",
    name: "Jump rope",
    category: "Cardio",
    equipment: "Jump rope",
    difficulty: "Intermediate",
    primary: ["Heart and lungs", "Calves"],
    secondary: ["Shoulders", "Core", "Coordination"],
    met: 12.3,
    steps: [
      "Hold the handles at hip height, elbows close to your body.",
      "Spin the rope from the wrists, not the whole arm.",
      "Jump about 2 to 3 cm off the floor, just enough for the rope to pass.",
      "Land softly on the balls of your feet with slightly bent knees.",
      "Start with 30 second rounds and build up as your timing improves.",
    ],
    tips: [
      "Slow the rope down before speeding up. Timing beats speed.",
      "Rope length check: stand on the middle, handles should reach your armpits.",
    ],
    mistakes: [
      "Jumping too high, which wrecks the calves and rhythm.",
      "Swinging with the whole arm and tiring the shoulders early.",
    ],
    breathing: "Small steady breaths, stay relaxed.",
    prescription: { sets: "5 to 10 rounds", reps: "30 to 90 sec each", rest: "30 sec" },
    sessionDefault: { mode: "time", workSec: 45, restSec: 30 },
  },
  {
    id: "stair-climb",
    name: "Stair climb",
    category: "Cardio",
    equipment: "Stairs",
    difficulty: "Intermediate",
    primary: ["Glutes", "Quads", "Heart and lungs"],
    secondary: ["Calves", "Core"],
    met: 8.8,
    steps: [
      "Find a staircase with at least 10 steps.",
      "Walk up at speed, placing your whole foot on each step.",
      "Drive through the heel of the top leg each stride.",
      "Walk back down carefully to recover, then repeat.",
    ],
    tips: [
      "Skipping steps makes it a strength move, single steps make it cardio.",
      "Use the rail on the way down, descending is where most slips happen.",
    ],
    mistakes: [
      "Running the descent, which punishes the knees.",
      "Leaning far forward from the waist on the climb.",
    ],
    breathing: "Strong exhales on each push up the stairs.",
    prescription: { sets: "6 to 10 climbs", reps: "One flight per climb", rest: "Walk down" },
    sessionDefault: { mode: "time", workSec: 60, restSec: 60 },
  },
  {
    id: "cycling",
    name: "Cycling",
    category: "Cardio",
    equipment: "Bike or stationary bike",
    difficulty: "Beginner",
    primary: ["Heart and lungs", "Quads"],
    secondary: ["Glutes", "Calves"],
    met: 7.5,
    steps: [
      "Set the saddle so your knee has a soft bend at the bottom of the pedal stroke.",
      "Start pedaling in an easy gear for 5 minutes to warm up.",
      "Hold a steady cadence around 70 to 90 revolutions per minute.",
      "Keep light pressure on the handlebars and a neutral spine.",
      "Cool down 5 minutes with easy spinning.",
    ],
    tips: [
      "Knee pain at the front usually means the saddle is too low.",
      "Indoors or outdoors both count, the FORGE log does not care which.",
    ],
    mistakes: [
      "Grinding huge gears at a very slow cadence.",
      "Riding with the saddle far too low.",
    ],
    breathing: "Steady and rhythmic, deepen it as effort rises.",
    prescription: { sets: "1 session", reps: "20 to 60 min", rest: "None" },
    sessionDefault: { mode: "time", workSec: 1200, restSec: 0 },
  },
  {
    id: "rowing-machine",
    name: "Rowing machine",
    category: "Cardio",
    equipment: "Rower",
    difficulty: "Intermediate",
    primary: ["Heart and lungs", "Back", "Legs"],
    secondary: ["Arms", "Core"],
    met: 7,
    steps: [
      "Strap your feet in and take the handle with straight arms.",
      "Start each stroke by driving with the legs, keeping the arms straight.",
      "Then hinge back slightly with the torso.",
      "Finish by pulling the handle to your lower ribs with the arms.",
      "Reverse the order to recover: arms out, hinge forward, then bend the knees.",
    ],
    tips: [
      "Legs, body, arms on the drive. Arms, body, legs on the recovery.",
      "Damper setting around 4 to 6 suits most people.",
    ],
    mistakes: [
      "Bending the arms before the legs finish driving.",
      "Yanking with the lower back at the end of the stroke.",
    ],
    breathing: "Exhale on the drive, inhale on the recovery.",
    prescription: { sets: "1 session", reps: "10 to 30 min", rest: "None" },
    sessionDefault: { mode: "time", workSec: 900, restSec: 0 },
  },
  {
    id: "swimming",
    name: "Swimming",
    category: "Cardio",
    equipment: "Pool",
    difficulty: "Intermediate",
    primary: ["Heart and lungs", "Full body"],
    secondary: ["Back", "Shoulders", "Core"],
    met: 8.3,
    steps: [
      "Warm up with 2 easy lengths of any stroke.",
      "For freestyle, reach forward and pull your hand back along your body.",
      "Turn your head to the side to breathe, do not lift it forward.",
      "Kick small and fast from the hips, not the knees.",
      "Rest at the wall as needed and build up your total lengths.",
    ],
    tips: [
      "Exhale underwater the whole time so the turn to breathe is quick.",
      "Swimming is joint friendly, making it ideal when you feel beat up.",
    ],
    mistakes: [
      "Lifting the head forward to breathe, which sinks the hips.",
      "Kicking from the knees with a big scissor motion.",
    ],
    breathing: "Bilateral breathing every 3 strokes balances the stroke.",
    prescription: { sets: "1 session", reps: "15 to 40 min", rest: "Wall rests" },
    sessionDefault: { mode: "time", workSec: 1200, restSec: 0 },
  },
  {
    id: "mountain-climbers",
    name: "Mountain climbers",
    category: "Cardio",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Heart and lungs", "Core", "Hip flexors"],
    secondary: ["Shoulders", "Quads"],
    met: 8,
    steps: [
      "Start in a high plank, hands under your shoulders, body in one line.",
      "Drive one knee toward your chest.",
      "Switch legs quickly, like running with your hands planted.",
      "Keep your hips low and level, resist the urge to bounce them up.",
      "Stay on the balls of your feet for smooth, fast switches.",
    ],
    tips: [
      "Slow it down and hold each knee up for 2 seconds to make it a core move.",
      "Shoulders over wrists the whole time to protect them.",
    ],
    mistakes: [
      "Hips rising into a pike position.",
      "Feet slamming down loudly instead of soft landings.",
    ],
    breathing: "Quick steady breaths matching the leg rhythm.",
    prescription: { sets: "3 to 5 sets", reps: "20 to 40 sec", rest: "30 to 45 sec" },
    sessionDefault: { mode: "time", workSec: 30, restSec: 30 },
  },
  {
    id: "jumping-jack",
    name: "Jumping jack",
    category: "Cardio",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Heart and lungs", "Legs", "Shoulders"],
    secondary: [],
    met: 8,
    steps: [
      "Stand with feet together and arms by your sides.",
      "Jump your feet out wide while raising your arms overhead.",
      "Jump your feet back together as your arms come down.",
      "Keep a light bend in the knees and land on the balls of your feet.",
    ],
    tips: [
      "Step one foot out at a time for a zero impact version.",
      "Great as a warm-up finisher or a HIIT station.",
    ],
    mistakes: [
      "Stiff knee landings on a hard floor.",
      "Arms stopping at shoulder height instead of finishing overhead.",
    ],
    breathing: "Steady rhythm, one breath cycle per few reps.",
    prescription: { sets: "3 to 5 sets", reps: "30 to 60 sec", rest: "30 sec" },
    sessionDefault: { mode: "time", workSec: 40, restSec: 30 },
  },
];

/* ------------------------------------------------------------------ */
/* Core                                                                */
/* ------------------------------------------------------------------ */

const CORE: Exercise[] = [
  {
    id: "plank",
    name: "Plank",
    category: "Core",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Deep core"],
    secondary: ["Shoulders", "Glutes"],
    met: 3.8,
    steps: [
      "Set your forearms on the floor with elbows under your shoulders.",
      "Extend your legs back and rest on your toes.",
      "Squeeze your glutes and brace your stomach like you are about to be poked.",
      "Keep one straight line from head to heels, neck neutral.",
      "Hold while breathing steadily, then rest before the next set.",
    ],
    tips: [
      "Quality beats duration. A hard 30 second plank beats a sloppy 2 minute one.",
      "Tuck your pelvis slightly to feel the abs more and the back less.",
    ],
    mistakes: [
      "Hips sagging toward the floor.",
      "Butt in the air turning it into a rest position.",
    ],
    breathing: "Slow breaths behind the brace, never hold your breath.",
    prescription: { sets: "3 sets", reps: "20 to 60 sec hold", rest: "45 sec" },
    sessionDefault: { mode: "time", workSec: 40, restSec: 45 },
  },
  {
    id: "side-plank",
    name: "Side plank",
    category: "Core",
    equipment: "None",
    difficulty: "Intermediate",
    primary: ["Obliques"],
    secondary: ["Deep core", "Shoulders", "Glutes"],
    met: 3.8,
    steps: [
      "Lie on your side with your elbow under your shoulder, forearm on the floor.",
      "Stack your feet and lift your hips so your body is a straight line.",
      "Reach your top arm to the ceiling or rest it on your hip.",
      "Hold, keeping the hips high, then switch sides.",
    ],
    tips: [
      "Drop the bottom knee to the floor for an easier version.",
      "Push the floor away actively with the bottom arm.",
    ],
    mistakes: [
      "Hips drifting toward the floor.",
      "Rolling the chest toward the ground.",
    ],
    breathing: "Steady and controlled through the hold.",
    prescription: { sets: "2 to 3 sets per side", reps: "20 to 45 sec hold", rest: "45 sec" },
    sessionDefault: { mode: "time", workSec: 30, restSec: 30 },
  },
  {
    id: "crunch",
    name: "Crunch",
    category: "Core",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Abs"],
    secondary: [],
    met: 3.8,
    steps: [
      "Lie on your back with knees bent and feet flat on the floor.",
      "Place fingertips behind your ears without pulling on your neck.",
      "Curl your shoulder blades off the floor by squeezing your abs.",
      "Hold at the top for a beat, then lower slowly back down.",
    ],
    tips: [
      "Only lift until the shoulder blades clear the floor. Small is correct.",
      "Chin stays off the chest, imagine holding an apple under your chin.",
    ],
    mistakes: [
      "Yanking the head forward with the hands.",
      "Rising all the way to a sit-up with the hip flexors doing the work.",
    ],
    breathing: "Exhale on the curl up, inhale on the way down.",
    prescription: { sets: "3 sets", reps: "15 to 25 reps", rest: "45 sec" },
    sessionDefault: { mode: "reps", reps: 15, restSec: 45 },
  },
  {
    id: "bicycle-crunch",
    name: "Bicycle crunch",
    category: "Core",
    equipment: "None",
    difficulty: "Intermediate",
    primary: ["Abs", "Obliques"],
    secondary: ["Hip flexors"],
    met: 5,
    steps: [
      "Lie on your back with fingertips behind your ears and legs lifted, knees bent at 90 degrees.",
      "Curl your upper back off the floor.",
      "Bring one elbow toward the opposite knee while extending the other leg long.",
      "Switch sides in a smooth pedaling motion.",
      "Keep the lower back pressed toward the floor the whole time.",
    ],
    tips: [
      "Slow reps with a real twist beat fast flailing reps every time.",
      "Extend the bottom leg only as far as you can while keeping the back flat.",
    ],
    mistakes: [
      "Pulling the head with the hands.",
      "Rushing so fast that the torso never actually rotates.",
    ],
    breathing: "Exhale on each rotation.",
    prescription: { sets: "3 sets", reps: "12 to 20 per side", rest: "45 sec" },
    sessionDefault: { mode: "reps", reps: 16, restSec: 45 },
  },
  {
    id: "leg-raise",
    name: "Lying leg raise",
    category: "Core",
    equipment: "None",
    difficulty: "Intermediate",
    primary: ["Lower abs", "Hip flexors"],
    secondary: ["Deep core"],
    met: 3.8,
    steps: [
      "Lie flat with your legs straight and hands under your hips or by your sides.",
      "Press your lower back into the floor.",
      "Raise both straight legs until your hips reach 90 degrees.",
      "Lower slowly, stopping right before your heels touch the floor.",
      "Repeat while keeping the back glued down.",
    ],
    tips: [
      "If the lower back arches, bend the knees slightly to shorten the lever.",
      "Pause 1 second at the top for a stronger lower ab contraction.",
    ],
    mistakes: [
      "Letting the lower back arch off the floor at the bottom.",
      "Dropping the legs fast and bouncing.",
    ],
    breathing: "Exhale up, inhale down.",
    prescription: { sets: "3 sets", reps: "10 to 15 reps", rest: "60 sec" },
    sessionDefault: { mode: "reps", reps: 12, restSec: 60 },
  },
  {
    id: "russian-twist",
    name: "Russian twist",
    category: "Core",
    equipment: "Optional weight",
    difficulty: "Beginner",
    primary: ["Obliques"],
    secondary: ["Abs", "Hip flexors"],
    met: 4,
    steps: [
      "Sit with knees bent and heels lightly touching the floor.",
      "Lean back to about 45 degrees and brace your core.",
      "Hold your hands together or hold a light weight at your chest.",
      "Rotate your torso to one side, then to the other, moving from the ribs up.",
      "Feet stay still, or lift them for a harder version.",
    ],
    tips: [
      "Rotate the shoulders, not just the arms swinging side to side.",
      "Tap the floor lightly beside your hip as a target for each rep.",
    ],
    mistakes: [
      "Swinging the arms while the torso stays still.",
      "Rounding the lower back into a heavy slump.",
    ],
    breathing: "Exhale on each rotation.",
    prescription: { sets: "3 sets", reps: "16 to 24 taps", rest: "45 sec" },
    sessionDefault: { mode: "reps", reps: 20, restSec: 45 },
  },
  {
    id: "dead-bug",
    name: "Dead bug",
    category: "Core",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Deep core"],
    secondary: ["Hip flexors"],
    met: 3,
    steps: [
      "Lie on your back with arms straight up over your shoulders.",
      "Lift your legs and bend your knees to 90 degrees over your hips.",
      "Press your lower back gently into the floor.",
      "Slowly lower one arm overhead and extend the opposite leg long.",
      "Return to center and repeat on the other side.",
    ],
    tips: [
      "The floor contact with your lower back must not change. That is the whole exercise.",
      "Move slowly. If you rush it, it stops training the deep core.",
    ],
    mistakes: [
      "Lower back lifting off the floor as the leg extends.",
      "Holding your breath.",
    ],
    breathing: "Exhale as the limbs extend, inhale as they return.",
    prescription: { sets: "3 sets", reps: "8 to 12 per side", rest: "45 sec" },
    sessionDefault: { mode: "reps", reps: 10, restSec: 45 },
  },
  {
    id: "bird-dog",
    name: "Bird dog",
    category: "Core",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Deep core", "Lower back"],
    secondary: ["Glutes", "Upper back"],
    met: 3,
    steps: [
      "Start on all fours with hands under shoulders and knees under hips.",
      "Keep your back flat like you are balancing a glass of water on it.",
      "Extend one arm straight forward and the opposite leg straight back.",
      "Hold 2 seconds at full reach, keeping the hips level.",
      "Return to all fours and switch sides.",
    ],
    tips: [
      "Imagine kicking a wall behind you with the extended heel.",
      "Place a water bottle on your lower back as a wobble check.",
    ],
    mistakes: [
      "Hips rotating as the leg lifts.",
      "Arching the lower back to reach higher.",
    ],
    breathing: "Exhale as you extend, inhale as you return.",
    prescription: { sets: "3 sets", reps: "8 to 10 per side", rest: "45 sec" },
    sessionDefault: { mode: "reps", reps: 10, restSec: 45 },
  },
  {
    id: "hanging-knee-raise",
    name: "Hanging knee raise",
    category: "Core",
    equipment: "Pull-up bar",
    difficulty: "Intermediate",
    primary: ["Lower abs", "Hip flexors"],
    secondary: ["Grip", "Lats"],
    met: 4.5,
    steps: [
      "Hang from a pull-up bar with straight arms and shoulders active.",
      "Keep your torso still, no swinging.",
      "Raise your knees toward your chest until your hips are fully flexed.",
      "Curl the pelvis slightly at the top to squeeze the abs.",
      "Lower the legs slowly back to a dead hang.",
    ],
    tips: [
      "Start each rep from a still hang. Swing means wasted reps.",
      "Too hard? Do them lying instead with the leg raise, then come back here.",
    ],
    mistakes: [
      "Swinging and kipping the knees up with momentum.",
      "Only lifting the knees without curling the pelvis, which is mostly hip flexors.",
    ],
    breathing: "Exhale as the knees rise, inhale as they lower.",
    prescription: { sets: "3 sets", reps: "8 to 15 reps", rest: "75 sec" },
    sessionDefault: { mode: "reps", reps: 10, restSec: 75 },
  },
];

/* ------------------------------------------------------------------ */
/* Mobility                                                            */
/* ------------------------------------------------------------------ */

const MOBILITY: Exercise[] = [
  {
    id: "downward-dog",
    name: "Downward dog",
    category: "Mobility",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Hamstrings", "Calves", "Shoulders"],
    secondary: ["Lats", "Feet"],
    met: 2.5,
    steps: [
      "Start on all fours with hands under shoulders, knees under hips.",
      "Tuck your toes and lift your hips up and back.",
      "Press your chest toward your thighs and your heels toward the floor.",
      "Let your head hang relaxed between your arms.",
      "Pedal your heels gently to explore the stretch, hold 20 to 30 seconds.",
    ],
    tips: [
      "Bent knees are fine. Focus on a long spine, not straight knees.",
      "Spread your fingers wide and push the floor away.",
    ],
    mistakes: [
      "Rounding the back to force the heels down.",
      "Shoulders collapsing toward the ears.",
    ],
    breathing: "Slow deep breaths into the back of the ribs.",
    prescription: { sets: "2 to 3 rounds", reps: "20 to 30 sec hold", rest: "15 sec" },
    sessionDefault: { mode: "time", workSec: 30, restSec: 15 },
  },
  {
    id: "childs-pose",
    name: "Child's pose",
    category: "Mobility",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Lower back", "Lats"],
    secondary: ["Hips", "Shoulders"],
    met: 1.5,
    steps: [
      "Kneel on the floor with big toes touching and knees wide.",
      "Sit your hips back toward your heels.",
      "Fold forward and rest your forehead on the floor.",
      "Reach your arms long overhead or rest them by your sides.",
      "Breathe deeply into your back for 30 to 60 seconds.",
    ],
    tips: [
      "A pillow under the hips or forehead makes it much more comfortable.",
      "This is your rest position in any stretch session, take it whenever needed.",
    ],
    mistakes: [
      "Forcing the hips down when the knees hurt, widen them instead.",
    ],
    breathing: "Long exhales, let the back expand with each breath.",
    prescription: { sets: "1 to 2 rounds", reps: "30 to 60 sec hold", rest: "None" },
    sessionDefault: { mode: "time", workSec: 45, restSec: 10 },
  },
  {
    id: "cat-cow",
    name: "Cat cow",
    category: "Mobility",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Spine"],
    secondary: ["Core", "Neck"],
    met: 2,
    steps: [
      "Start on all fours with hands under shoulders and knees under hips.",
      "For cow: drop your belly, lift your chest and tailbone, look gently forward.",
      "For cat: round your whole spine toward the ceiling and tuck your chin.",
      "Move slowly between the two, following your breath.",
      "One full cycle takes about 5 seconds.",
    ],
    tips: [
      "Imagine one vertebra moving at a time, from tail to neck.",
      "This is the best first movement of any morning or warm-up.",
    ],
    mistakes: [
      "Rushing through it like a cardio move.",
      "Only moving the mid back while the neck and tail stay stiff.",
    ],
    breathing: "Inhale into cow, exhale into cat.",
    prescription: { sets: "1 to 2 rounds", reps: "8 to 10 cycles", rest: "None" },
    sessionDefault: { mode: "time", workSec: 45, restSec: 10 },
  },
  {
    id: "cobra-stretch",
    name: "Cobra stretch",
    category: "Mobility",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Abs", "Chest"],
    secondary: ["Hip flexors", "Lower back"],
    met: 2,
    steps: [
      "Lie face down with hands under your shoulders, elbows tucked.",
      "Press the tops of your feet and hips into the floor.",
      "Lift your chest by straightening your arms only as far as feels easy.",
      "Keep the shoulders down away from the ears.",
      "Hold 15 to 20 seconds, breathe, then lower down.",
    ],
    tips: [
      "Height does not matter. A gentle lift with no pain is the goal.",
      "Perfect counter stretch after any ab workout.",
    ],
    mistakes: [
      "Crunching the neck backward to look at the ceiling.",
      "Lifting the hips off the floor to go higher.",
    ],
    breathing: "Deep breaths, expand the chest with each inhale.",
    prescription: { sets: "2 rounds", reps: "15 to 20 sec hold", rest: "15 sec" },
    sessionDefault: { mode: "time", workSec: 20, restSec: 15 },
  },
  {
    id: "hamstring-stretch",
    name: "Seated hamstring stretch",
    category: "Mobility",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Hamstrings"],
    secondary: ["Lower back", "Calves"],
    met: 2.3,
    steps: [
      "Sit on the floor with both legs straight out in front of you.",
      "Hinge forward from the hips, reaching for your shins, ankles or toes.",
      "Keep the back as long as you can, do not round hard to reach further.",
      "Hold where you feel a deep but tolerable stretch for 20 to 30 seconds.",
      "Rise back up slowly.",
    ],
    tips: [
      "A soft knee bend is fine and often makes the stretch feel better.",
      "Fold a towel under your hips if tight hamstrings pull you backward.",
    ],
    mistakes: [
      "Bouncing to force range.",
      "Rounding the spine and yanking the head down.",
    ],
    breathing: "Exhale into the fold, relax a little more with each breath.",
    prescription: { sets: "2 rounds", reps: "20 to 30 sec hold", rest: "15 sec" },
    sessionDefault: { mode: "time", workSec: 30, restSec: 15 },
  },
  {
    id: "hip-flexor-stretch",
    name: "Kneeling hip flexor stretch",
    category: "Mobility",
    equipment: "Soft floor or pad",
    difficulty: "Beginner",
    primary: ["Hip flexors"],
    secondary: ["Quads"],
    met: 2.3,
    steps: [
      "Kneel on one knee with the other foot planted in front at 90 degrees.",
      "Keep your torso tall and tuck your tailbone slightly under.",
      "Squeeze the glute of the down leg.",
      "Shift your whole body gently forward until you feel the front of the hip open.",
      "Hold 20 to 30 seconds, then switch sides.",
    ],
    tips: [
      "Reaching the same side arm overhead adds a bigger stretch.",
      "If you sit a lot, this one is non negotiable daily.",
    ],
    mistakes: [
      "Arching the lower back instead of tucking the pelvis.",
      "Letting the front knee travel way past the toes.",
    ],
    breathing: "Slow breaths, exhale and sink a touch deeper.",
    prescription: { sets: "2 rounds per side", reps: "20 to 30 sec hold", rest: "15 sec" },
    sessionDefault: { mode: "time", workSec: 30, restSec: 15 },
  },
  {
    id: "figure-4-stretch",
    name: "Figure 4 glute stretch",
    category: "Mobility",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Glutes"],
    secondary: ["Outer hips", "Lower back"],
    met: 2.3,
    steps: [
      "Lie on your back with knees bent and feet flat.",
      "Cross one ankle over the opposite thigh, making a figure 4 shape.",
      "Thread your hands behind the bottom thigh and pull it toward your chest.",
      "Keep the head and shoulders relaxed on the floor.",
      "Hold 20 to 30 seconds, then switch sides.",
    ],
    tips: [
      "The further the crossed knee moves away from you, the deeper it gets.",
      "Great for runners and desk workers with tight hips.",
    ],
    mistakes: [
      "Craning the neck up toward the legs.",
      "Twisting the lower back instead of keeping hips square.",
    ],
    breathing: "Long exhales to let the hip release.",
    prescription: { sets: "2 rounds per side", reps: "20 to 30 sec hold", rest: "15 sec" },
    sessionDefault: { mode: "time", workSec: 30, restSec: 15 },
  },
  {
    id: "worlds-greatest-stretch",
    name: "World's greatest stretch",
    category: "Mobility",
    equipment: "None",
    difficulty: "Intermediate",
    primary: ["Hip flexors", "Hamstrings", "Thoracic spine"],
    secondary: ["Shoulders", "Groin", "Calves"],
    met: 3,
    steps: [
      "Step one foot forward into a deep lunge, both hands inside the front foot.",
      "Drop the back knee toward the floor and let the hips sink.",
      "Place the same side elbow as the front foot down inside it.",
      "Then rotate the opposite arm up to the ceiling, following it with your eyes.",
      "Return the hand down, then rock back to straighten the front leg and stretch its hamstring.",
      "Return to standing and repeat on the other side.",
    ],
    tips: [
      "This is five stretches in one. It is the best single warm-up movement that exists.",
      "Move slowly through every piece rather than rushing reps.",
    ],
    mistakes: [
      "Front heel lifting off the floor.",
      "Skipping the rotation and only doing the lunge part.",
    ],
    breathing: "Exhale into each position change.",
    prescription: { sets: "2 rounds per side", reps: "1 slow flow", rest: "15 sec" },
    sessionDefault: { mode: "time", workSec: 40, restSec: 15 },
  },
];

/* ------------------------------------------------------------------ */
/* Warm-up                                                             */
/* ------------------------------------------------------------------ */

const WARMUP: Exercise[] = [
  {
    id: "arm-circles",
    name: "Arm circles",
    category: "Warm-up",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Shoulders"],
    secondary: ["Upper back"],
    met: 2.8,
    steps: [
      "Stand tall with arms straight out to the sides.",
      "Make small circles forward, growing them to full size over 10 reps.",
      "Reverse direction for another 10 reps.",
      "Finish with 5 big circles at full speed.",
    ],
    tips: [
      "Keep the arms long the whole time for a fuller range.",
      "Do them before any pressing or pulling session.",
    ],
    mistakes: [
      "Shrugging the shoulders up during the circles.",
    ],
    breathing: "Relaxed steady breathing.",
    prescription: { sets: "1 set", reps: "20 to 30 circles", rest: "None" },
    sessionDefault: { mode: "time", workSec: 30, restSec: 10 },
  },
  {
    id: "leg-swings",
    name: "Leg swings",
    category: "Warm-up",
    equipment: "Wall for balance",
    difficulty: "Beginner",
    primary: ["Hips", "Hamstrings"],
    secondary: ["Groin", "Glutes"],
    met: 3,
    steps: [
      "Stand side on to a wall and hold it with one hand.",
      "Swing the outer leg forward and back like a pendulum, 10 to 15 times.",
      "Then turn to face the wall and swing the leg across your body side to side, 10 to 15 times.",
      "Keep the swings controlled, let range grow gradually.",
      "Switch legs and repeat.",
    ],
    tips: [
      "Start small. The first swings are shorter, the last ones fuller.",
      "Perfect before running, lunges and squats.",
    ],
    mistakes: [
      "Kicking as high as possible with a jerky motion.",
      "Locking the standing knee hard.",
    ],
    breathing: "One breath per few swings.",
    prescription: { sets: "1 set per leg", reps: "10 to 15 each way", rest: "None" },
    sessionDefault: { mode: "time", workSec: 40, restSec: 10 },
  },
  {
    id: "hip-circles",
    name: "Hip circles",
    category: "Warm-up",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Hips"],
    secondary: ["Core", "Lower back"],
    met: 2.8,
    steps: [
      "Stand with hands on your hips, feet shoulder width.",
      "Circle your hips in a big smooth ring, 8 times one way.",
      "Reverse for 8 times the other way.",
      "Then do 8 small fast circles each way.",
    ],
    tips: [
      "Move from the hip joints, not just the lower back.",
      "Add ankle circles at the same time for a two for one.",
    ],
    mistakes: [
      "Tiny stiff circles with the whole torso leaning.",
    ],
    breathing: "Continuous relaxed breathing.",
    prescription: { sets: "1 set", reps: "16 to 24 circles", rest: "None" },
    sessionDefault: { mode: "time", workSec: 30, restSec: 10 },
  },
  {
    id: "butt-kicks",
    name: "Butt kicks",
    category: "Warm-up",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Hamstrings", "Quads"],
    secondary: ["Heart and lungs", "Calves"],
    met: 5,
    steps: [
      "Jog in place, kicking each heel up toward your glutes.",
      "Stay light on the balls of your feet.",
      "Keep your knees pointing down toward the floor.",
      "Pump the arms like a slow run.",
    ],
    tips: [
      "Standard warm-up before any run or leg day.",
      "20 to 30 seconds is plenty to feel warm.",
    ],
    mistakes: [
      "Leaning back while kicking.",
      "Heavy flat-footed landings.",
    ],
    breathing: "Light and quick.",
    prescription: { sets: "1 to 2 sets", reps: "20 to 30 sec", rest: "15 sec" },
    sessionDefault: { mode: "time", workSec: 25, restSec: 15 },
  },
  {
    id: "inchworm",
    name: "Inchworm",
    category: "Warm-up",
    equipment: "None",
    difficulty: "Beginner",
    primary: ["Hamstrings", "Core", "Shoulders"],
    secondary: ["Calves", "Lower back"],
    met: 4,
    steps: [
      "Stand tall, then fold forward and place your hands on the floor.",
      "Walk your hands out until you reach a high plank.",
      "Do one push-up if you want extra work, or skip it.",
      "Walk your feet toward your hands with mostly straight legs.",
      "Stand up and repeat for 5 to 8 worms.",
    ],
    tips: [
      "Keep the knees as straight as your hamstrings allow.",
      "The inchworm alone can be your entire warm-up on busy days.",
    ],
    mistakes: [
      "Hips sagging in the plank position.",
      "Bending the knees fully to make the walk in easy.",
    ],
    breathing: "Exhale walking out, inhale walking in.",
    prescription: { sets: "1 set", reps: "5 to 8 worms", rest: "None" },
    sessionDefault: { mode: "reps", reps: 6, restSec: 20 },
  },
];

/* ------------------------------------------------------------------ */
/* All exercises                                                       */
/* ------------------------------------------------------------------ */

export const EXERCISES: Exercise[] = [
  ...WARMUP,
  ...HOME,
  ...CORE,
  ...GYM,
  ...CARDIO,
  ...MOBILITY,
  ...WEIGHTS_EXERCISES,
  ...MACHINES_KB_EXERCISES,
  ...BAND_PLYO_EXERCISES,
  ...SKILLS_CORE_EXERCISES,
  ...YOGA_STRETCH_EXERCISES,
  ...HOME_COND_EXERCISES,
];

export const CATEGORIES: ExerciseCategory[] = [
  "Warm-up",
  "Home",
  "Core",
  "Gym",
  "Dumbbell",
  "Barbell",
  "Machine",
  "Kettlebell",
  "Band",
  "Calisthenics",
  "Plyometric",
  "Cardio",
  "Conditioning",
  "Yoga",
  "Stretching",
  "Mobility",
];

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return byId.get(id);
}

/**
 * Calorie estimate from MET values: kcal = MET x 3.5 x kg / 200 x minutes.
 * Standard published formula, scaled by the user's real body weight.
 */
export function estimateCalories(met: number, weightKg: number, minutes: number): number {
  return Math.round(((met * 3.5 * weightKg) / 200) * minutes);
}

/* ------------------------------------------------------------------ */
/* Coach helpers                                                       */
/* ------------------------------------------------------------------ */

/** One set inside a coached session, flattened in play order. */
export interface CoachStep {
  exercise: Exercise;
  blockIndex: number;
  blockTotal: number;
  setNum: number;
  setTotal: number;
  mode: "reps" | "time";
  reps?: number;
  workSec?: number;
  restSec: number;
  isFirstOfExercise: boolean;
}

export function buildCoachSteps(blocks: ProgramBlock[]): CoachStep[] {
  const steps: CoachStep[] = [];
  blocks.forEach((b, bi) => {
    const ex = getExercise(b.exerciseId);
    if (!ex) return;
    for (let s = 1; s <= b.sets; s += 1) {
      steps.push({
        exercise: ex,
        blockIndex: bi,
        blockTotal: blocks.length,
        setNum: s,
        setTotal: b.sets,
        mode: b.workSec ? "time" : "reps",
        reps: b.reps,
        workSec: b.workSec,
        restSec: b.restSec,
        isFirstOfExercise: s === 1,
      });
    }
  });
  return steps;
}

/** Total working seconds of one block (reps estimated at 3 sec per rep). */
export function blockWorkSeconds(b: ProgramBlock): number {
  if (b.workSec) return b.workSec * b.sets;
  return (b.reps ?? 0) * 3 * b.sets;
}

/** Rough total session length including rests, for the "about N min" line. */
export function plannedSeconds(blocks: ProgramBlock[]): number {
  let total = 0;
  blocks.forEach((b, i) => {
    total += blockWorkSeconds(b);
    if (i < blocks.length - 1) total += b.restSec * b.sets;
  });
  return Math.round(total);
}

/** Build one session block from an exercise's sensible defaults. */
export function blockFromExercise(ex: Exercise, sets = 3): ProgramBlock {
  const d = ex.sessionDefault;
  return d.mode === "time"
    ? { exerciseId: ex.id, sets, workSec: d.workSec ?? 30, restSec: d.restSec }
    : { exerciseId: ex.id, sets, reps: d.reps ?? 10, restSec: d.restSec };
}

/** Human summary like "3 sets of 10 reps" or "3 sets of 40 sec". */
export function blockSummary(b: ProgramBlock): string {
  return b.workSec
    ? `${b.sets} x ${b.workSec} sec`
    : `${b.sets} x ${b.reps ?? 0} reps`;
}

/* ------------------------------------------------------------------ */
/* Ready made coached programs                                         */
/* ------------------------------------------------------------------ */

export const PROGRAMS: Program[] = [
  ...WEIGHTS_PROGRAMS,
  ...MACHINES_KB_PROGRAMS,
  ...BAND_PLYO_PROGRAMS,
  ...SKILLS_CORE_PROGRAMS,
  ...YOGA_STRETCH_PROGRAMS,
  ...HOME_COND_PROGRAMS,
  {
    id: "home-full-body",
    name: "Full body home starter",
    level: "Beginner",
    focus: "Whole body, no equipment",
    description:
      "The classic beginner routine. Six moves, nothing to buy, every major muscle covered.",
    blocks: [
      { exerciseId: "push-up", sets: 3, reps: 10, restSec: 60 },
      { exerciseId: "squat", sets: 3, reps: 15, restSec: 60 },
      { exerciseId: "glute-bridge", sets: 3, reps: 15, restSec: 45 },
      { exerciseId: "lunge", sets: 3, reps: 10, restSec: 60 },
      { exerciseId: "plank", sets: 3, workSec: 30, restSec: 45 },
      { exerciseId: "superman", sets: 3, reps: 12, restSec: 45 },
    ],
  },
  {
    id: "hiit-home",
    name: "20 minute home HIIT",
    level: "Intermediate",
    focus: "Fat burn, conditioning",
    description:
      "Work hard for 40 seconds, breathe for 20. Six rounds of pure home cardio.",
    blocks: [
      { exerciseId: "jumping-jack", sets: 3, workSec: 40, restSec: 20 },
      { exerciseId: "mountain-climbers", sets: 3, workSec: 40, restSec: 20 },
      { exerciseId: "jump-squat", sets: 3, workSec: 40, restSec: 20 },
      { exerciseId: "burpee", sets: 3, workSec: 40, restSec: 20 },
      { exerciseId: "plank", sets: 3, workSec: 40, restSec: 20 },
    ],
  },
  {
    id: "core-crusher",
    name: "Core crusher",
    level: "Intermediate",
    focus: "Abs and obliques",
    description:
      "A focused ab session from every angle. Finish it and your midsection will know.",
    blocks: [
      { exerciseId: "plank", sets: 3, workSec: 45, restSec: 40 },
      { exerciseId: "bicycle-crunch", sets: 3, reps: 16, restSec: 40 },
      { exerciseId: "leg-raise", sets: 3, reps: 12, restSec: 45 },
      { exerciseId: "russian-twist", sets: 3, reps: 20, restSec: 40 },
      { exerciseId: "dead-bug", sets: 3, reps: 10, restSec: 40 },
      { exerciseId: "side-plank", sets: 2, workSec: 30, restSec: 30 },
    ],
  },
  {
    id: "upper-gym",
    name: "Upper body gym session",
    level: "Intermediate",
    focus: "Chest, back, shoulders, arms",
    description:
      "A balanced push and pull session for the gym. Covers the big five upper body lifts.",
    blocks: [
      { exerciseId: "bench-press", sets: 4, reps: 8, restSec: 120 },
      { exerciseId: "barbell-row", sets: 4, reps: 8, restSec: 120 },
      { exerciseId: "overhead-press", sets: 3, reps: 8, restSec: 120 },
      { exerciseId: "lat-pulldown", sets: 3, reps: 10, restSec: 90 },
      { exerciseId: "bicep-curl", sets: 3, reps: 12, restSec: 60 },
      { exerciseId: "lateral-raise", sets: 3, reps: 15, restSec: 60 },
    ],
  },
  {
    id: "morning-mobility",
    name: "Morning mobility flow",
    level: "Beginner",
    focus: "Joints, spine, hips",
    description:
      "Ten easy minutes to undo a night of sleep and a desk full of stiffness.",
    blocks: [
      { exerciseId: "cat-cow", sets: 2, workSec: 45, restSec: 10 },
      { exerciseId: "worlds-greatest-stretch", sets: 2, workSec: 40, restSec: 15 },
      { exerciseId: "downward-dog", sets: 2, workSec: 30, restSec: 15 },
      { exerciseId: "hip-flexor-stretch", sets: 2, workSec: 30, restSec: 15 },
      { exerciseId: "hamstring-stretch", sets: 2, workSec: 30, restSec: 15 },
      { exerciseId: "childs-pose", sets: 1, workSec: 45, restSec: 10 },
    ],
  },
  {
    id: "leg-day-home",
    name: "Leg day at home",
    level: "Beginner",
    focus: "Quads, glutes, calves",
    description:
      "No barbell needed. Six movements that leave your legs shaking anyway.",
    blocks: [
      { exerciseId: "squat", sets: 4, reps: 15, restSec: 60 },
      { exerciseId: "lunge", sets: 3, reps: 12, restSec: 60 },
      { exerciseId: "wall-sit", sets: 3, workSec: 45, restSec: 60 },
      { exerciseId: "glute-bridge", sets: 3, reps: 15, restSec: 45 },
      { exerciseId: "step-up", sets: 3, reps: 10, restSec: 60 },
      { exerciseId: "calf-raise", sets: 3, reps: 20, restSec: 45 },
    ],
  },
];
