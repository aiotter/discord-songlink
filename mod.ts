import { startBot } from "https://deno.land/x/discordeno@11.2.0/mod.ts";
import { Embed } from "https://deno.land/x/discordeno@11.2.0/src/types/mod.ts";

const footer = "Powered by Songlink/Odesli (and @aiotter)";
const songUrlRegexList = [
  /https?:\/\/.*?spotify\.com\/\S*/g,
  /https?:\/\/music\.amazon\.com\/\S*/g,
  /https?:\/\/.*?music\.apple\.com\/\S*/g,
];

interface Music {
  entityUniqueId: string;
  linksByPlatform: LinksByPlatform;
  pageUrl: string;
  userCountry: string;
}

interface LinksByPlatform {
  amazonMusic?: MusicPlatform;
  amazonStore?: MusicPlatform;
  deezer?: MusicPlatform;
  appleMusic?: MusicPlatform;
  itunes?: MusicPlatform;
  napster?: MusicPlatform;
  pandora?: MusicPlatform;
  soundcloud?: MusicPlatform;
  spotify?: MusicPlatform;
  tidal?: MusicPlatform;
  yandex?: MusicPlatform;
  youtube?: MusicPlatform;
  youtubeMusic?: MusicPlatform;
}

interface MusicPlatform {
  country: string;
  url: string;
  entityUniqueId: string;
}

startBot({
  token: Deno.env.get("TOKEN") as string,
  intents: ["Guilds", "GuildMessages"],
  eventHandlers: {
    ready() {
      console.log("Successfully connected to gateway");
    },

    messageCreate(message) {
      let songUrls: string[] = [];
      songUrlRegexList.forEach((regex) => {
        const matched = message.content.match(regex);
        if (matched) songUrls = songUrls.concat(matched);
      });

      songUrls.forEach(async (songUrl) => {
        const response = await fetch(
          `https://api.song.link/v1-alpha.1/links?url=${
            encodeURIComponent(songUrl)
          }&userCountry=JP`,
        );
        const song: Music = await response.json();
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

        const embed: Embed = {
          description: markDownOfSongUrls.join("\n"),
          footer: { text: footer },
        };

        await message.reply({ embed: embed }, false).catch(console.error);
      });
    },
  },
});
