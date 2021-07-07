import {
  EditMessage,
  endpoints,
  rest,
  startBot,
} from "https://deno.land/x/discordeno@11.2.0/mod.ts";
import { Embed } from "https://deno.land/x/discordeno@11.2.0/src/types/mod.ts";

const countryCode = Deno.env.get("COUNTRY") ?? "JP";
const footer = "Powered by Songlink/Odesli (and @aiotter)";
const songUrlRegexList = [
  /https?:\/\/.*?spotify\.com\/\S*/g,
  /https?:\/\/music\.amazon\.com\/\S*/g,
  /https?:\/\/.*?music\.apple\.com\/\S*/g,
];

type Response = {
  entityUniqueId: string;
  userCountry: string;
  pageUrl: string;
  linksByPlatform: {
    [platform in Platform]: {
      entityUniqueId: string;
      url: string;
      nativeAppUriMobile?: string;
      nativeAppUriDesktop?: string;
    };
  };

  entitiesByUniqueId: {
    [entityUniqueId: string]: Entry;
  };
};

type Entry = {
  id: string;
  type: "song" | "album";
  title?: string;
  artistName?: string;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  apiProvider: APIProvider;
  platforms: Platform[];
};

type Platform =
  | "spotify"
  | "itunes"
  | "appleMusic"
  | "youtube"
  | "youtubeMusic"
  | "google"
  | "googleStore"
  | "pandora"
  | "deezer"
  | "tidal"
  | "amazonStore"
  | "amazonMusic"
  | "soundcloud"
  | "napster"
  | "yandex"
  | "spinrilla"
  | "audius";

type APIProvider =
  | "spotify"
  | "itunes"
  | "youtube"
  | "google"
  | "pandora"
  | "deezer"
  | "tidal"
  | "amazon"
  | "soundcloud"
  | "napster"
  | "yandex"
  | "spinrilla"
  | "audius";

function getThumbnailUrl(song: Response) {
  // sort in thumbnail image height and returns the largest image's url
  const entities = Array.from(Object.values(song.entitiesByUniqueId));
  entities.sort((a, b) => (a.thumbnailHeight ?? 0) - (b.thumbnailHeight ?? 0));
  return entities.pop()?.thumbnailUrl;
}

function getSongTitle(song: Response) {
  for (const entry of Object.values(song.entitiesByUniqueId)) {
    if (entry?.title) return entry.title;
  }
}

startBot({
  token: Deno.env.get("TOKEN") as string,
  intents: ["Guilds", "GuildMessages"],
  eventHandlers: {
    ready() {
      console.log("Successfully connected to gateway");
    },

    messageCreate(message) {
      if (message.isBot) return;
      let songUrls: string[] = [];
      songUrlRegexList.forEach((regex) => {
        const matched = message.content.match(regex);
        if (matched) songUrls = songUrls.concat(matched);
      });

      songUrls.forEach(async (songUrl) => {
        const response = await fetch(
          `https://api.song.link/v1-alpha.1/links?url=${
            encodeURIComponent(songUrl)
          }&userCountry=${countryCode}`,
        );
        const song: Response = await response.json();
        const markDownOfSongUrls = [];

        if (song.linksByPlatform?.amazonMusic) {
          markDownOfSongUrls.push(
            `[Amazon Music](${song.linksByPlatform.amazonMusic.url})`,
          );
        }

        if (song.linksByPlatform?.appleMusic) {
          markDownOfSongUrls.push(
            `[Apple Music](${song.linksByPlatform.appleMusic.url})`,
          );
        }

        if (song.linksByPlatform?.spotify) {
          markDownOfSongUrls.push(
            `[Spotify](${song.linksByPlatform.spotify.url})`,
          );
        }

        if (song.linksByPlatform?.youtube) {
          markDownOfSongUrls.push(
            `[YouTube](${song.linksByPlatform.youtube.url})`,
          );
        }

        if (markDownOfSongUrls.length === 0) {
          markDownOfSongUrls.push(`[Other platforms](${song.pageUrl})`);
        } else {
          markDownOfSongUrls.push(`... [and more](${song.pageUrl})`);
        }

        const thumbnailUrl = getThumbnailUrl(song);
        const embed: Embed = {
          title: getSongTitle(song),
          description: markDownOfSongUrls.join("\n"),
          footer: { text: footer },
          thumbnail: { url: thumbnailUrl },
        };

        await message.reply({ embeds: [embed] }, false).catch(console.error);
        if (song.linksByPlatform.youtube) {
          await message.channel?.send(song.linksByPlatform.youtube.url);
        }

        // FIXME: `message.edit` is not working now. Needs upstream bugfix.
        // await message.edit({ flags: 4 }).catch(console.error);  // clear embeds
        await rest.runMethod(
          "patch",
          endpoints.CHANNEL_MESSAGE(message.channelId, message.id),
          { flags: 4 }, // clear embeds
        ).catch(console.error);
      });
    },
  },
});
