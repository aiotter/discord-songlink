import { DenonConfig } from "https://deno.land/x/denon@2.4.7/mod.ts";
import { config as dotenv } from "https://deno.land/x/dotenv@v2.0.0/mod.ts";

const config: DenonConfig = {
  scripts: {
    start: {
      cmd: "deno run mod.ts",
      desc: "Make the bot online",
      allow: ["env", "write", "read", "net"],
      unstable: true,
      env: dotenv(),
    },
  },
};

export default config;
