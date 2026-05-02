import { Anime } from '../types/anime';

// Helper function to generate placeholder image URLs
const getPoster = (id: number) => `https://images.unsplash.com/photo-${1500000000000 + id}?auto=format&fit=crop&w=600&h=900&q=80`;
const getBanner = (id: number) => `https://images.unsplash.com/photo-${1500000000000 + id}?auto=format&fit=crop&w=1920&h=1080&q=80`;

// We use specific Unsplash photos that look cinematic/artsy as placeholders
const posters = [
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&h=900&q=80",
  "https://images.unsplash.com/photo-1613376023733-f542095cc613?auto=format&fit=crop&w=600&h=900&q=80",
  "https://images.unsplash.com/photo-1541562232579-51fca3bb1bb3?auto=format&fit=crop&w=600&h=900&q=80",
  "https://images.unsplash.com/photo-1580477651819-3f309a4773c2?auto=format&fit=crop&w=600&h=900&q=80",
  "https://images.unsplash.com/photo-1559186648-5221b223d611?auto=format&fit=crop&w=600&h=900&q=80",
];

const banners = [
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1920&h=1080&q=80",
  "https://images.unsplash.com/photo-1613376023733-f542095cc613?auto=format&fit=crop&w=1920&h=1080&q=80",
  "https://images.unsplash.com/photo-1541562232579-51fca3bb1bb3?auto=format&fit=crop&w=1920&h=1080&q=80",
  "https://images.unsplash.com/photo-1580477651819-3f309a4773c2?auto=format&fit=crop&w=1920&h=1080&q=80",
  "https://images.unsplash.com/photo-1559186648-5221b223d611?auto=format&fit=crop&w=1920&h=1080&q=80",
];

export const animeData: Anime[] = Array.from({ length: 20 }).map((_, index) => ({
  id: (index + 1).toString(),
  title: [
    "Neon Genesis: Legacy",
    "Blade of the Crimson Sky",
    "Cyberpunk: Shadows",
    "Tale of the Forgotten King",
    "Steel Alchemist",
    "Wandering Spirits",
    "Demon Hunter: Zero",
    "Astral Journey",
    "The Last Shinobi",
    "Echoes of the Past",
    "Tokyo Neon",
    "Dragon's Roar",
    "Vampire's Requiem",
    "Ghost in the System",
    "Titan's Fall",
    "Hero's Journey",
    "Magic Knight Academy",
    "Sword Art: Online",
    "Dark Fantasy World",
    "Mecha Assault"
  ][index],
  description: [
    "To save humanity from mysterious alien threats, a reluctant teenager must pilot a colossal bio-machine. But the hardest battle might be within his own mind.",
    "A legendary swordsman with a dark past roams a war-torn land. When he meets a girl with a mysterious power, his blood-soaked destiny changes forever.",
    "In a neon-drenched metropolis controlled by mega-corporations, a street-smart mercenary takes on a job that could burn the entire city to the ground.",
    "A fallen monarch awakens centuries after his kingdom's ruin. To reclaim his throne, he must navigate a world that has forgotten his name.",
    "Two brothers use forbidden magic in a desperate attempt to resurrect their mother. Now, they must search for a legendary stone to restore their shattered bodies.",
    "A young girl crosses into a spirit realm to save her parents. To survive, she must work in a bathhouse for the gods and remember her true name.",
    "When his family is slaughtered by creatures of the night, a kind-hearted boy joins a secret society of warriors to cure his demon-cursed sister.",
    "A crew of cosmic bounty hunters traverses the galaxy, outrunning their troubled pasts while chasing down the solar system's most dangerous criminals.",
    "The last surviving ninja of a forgotten clan infiltrates a modern metropolis to dismantle the criminal syndicate that destroyed his home.",
    "A time-traveling detective tries to stop a catastrophic event, only to discover that altering the past awakens an even deadlier future.",
    "In the chaotic streets of neo-Tokyo, rival gangs fight for control using illegal cybernetic enhancements. Only one rogue cop can stop the madness.",
    "A loud-mouthed teenager discovers he possesses the spirit of a legendary dragon. To master his fiery powers, he enters an elite magic academy.",
    "A brooding vampire hunter is forced into an uneasy alliance with a sorceress to stop Dracula's army from plunging humanity into eternal darkness.",
    "A cyborg federal agent hunts a mysterious hacker known only as 'The Puppet Master' in a futuristic society where the line between human and machine is blurred.",
    "Humanity survives behind massive walls to protect themselves from giant, man-eating monsters. When the wall falls, a young soldier vows to kill them all.",
    "A boy born without magic in a world where magic is everything dreams of becoming the ultimate wizard king. He won't let anything stand in his way.",
    "Teenage girls are drafted into a specialized military academy to pilot mechs. They must learn to work together before a monstrous threat wipes them out.",
    "Ten thousand players are trapped in a virtual reality MMORPG where dying in the game means dying in real life. The only way out is to beat it.",
    "A ruthless mercenary joins a charismatic leader's mercenary band, unaware that their quest for glory will lead them straight into a demonic nightmare.",
    "Earth's last line of defense against an alien armada is a squad of teenage pilots and their highly advanced mechanized combat suits."
  ][index],
  posterImage: `https://picsum.photos/seed/rikoanime${index}/600/900`,
  bannerImage: `https://picsum.photos/seed/rikoanimebanner${index}/1920/1080`,
  rating: Number((Math.random() * 2 + 7.5).toFixed(1)), // 7.5 - 9.5
  year: 2020 + Math.floor(Math.random() * 5),
  status: Math.random() > 0.5 ? "Airing" : "Completed",
  genres: [
    ["Action", "Sci-Fi", "Drama"],
    ["Fantasy", "Adventure", "Magic"],
    ["Cyberpunk", "Action", "Thriller"],
    ["Historical", "Action", "Drama"],
    ["Action", "Comedy", "Fantasy"]
  ][index % 5],
  episodes: Math.floor(Math.random() * 24) + 12, // 12 - 35
  type: Math.random() > 0.2 ? "TV" : "Movie",
  trendingScore: Math.floor(Math.random() * 100),
}));

export const getTrendingAnime = () => [...animeData].sort((a, b) => b.trendingScore - a.trendingScore);
export const getPopularAnime = () => [...animeData].sort((a, b) => b.rating - a.rating);
export const getNewReleases = () => [...animeData].sort((a, b) => b.year - a.year);
export const getAnimeById = (id: string) => animeData.find(a => a.id === id);
