import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Higher quality than the default, still a reasonable file size for texting.
Config.setCrf(18);

export {};
