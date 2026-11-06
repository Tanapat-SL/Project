const artworkByGame: Record<string, string> = {
  valorant: 'https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/fullportrait.png',
  'apex legends': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/header.jpg',
  cs2: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
  'counter-strike 2': 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
  'overwatch 2': 'https://cdn.cloudflare.steamstatic.com/steam/apps/2357570/header.jpg',
};

export function getGameArtwork(gameName?: string | null) {
  return artworkByGame[gameName?.trim().toLowerCase() || ''] || artworkByGame.valorant;
}
