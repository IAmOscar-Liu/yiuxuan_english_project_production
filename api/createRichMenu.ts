import * as fs from "fs";
import * as path from "path";
import { messagingApi } from "@line/bot-sdk";
import "dotenv/config";
import { richMenuAArea, richMenuBArea } from "./constants/richMenuArea";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

const blobClient = new messagingApi.MessagingApiBlobClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

async function createRichMenu({
  richMenu,
  filename,
  richMenuAliasId,
}: {
  richMenu: messagingApi.RichMenuRequest;
  filename: string;
  richMenuAliasId: string;
}) {
  // Create the rich menu
  const richMenuId = (await client.createRichMenu(richMenu)).richMenuId;

  // Upload the image
  const imagePath = path.join(__dirname, "assets", filename);
  const imageBuffer = fs.readFileSync(imagePath);

  await blobClient.setRichMenuImage(
    richMenuId,
    new Blob([imageBuffer], { type: "image/jpeg" })
  );

  const aliasList = await client.getRichMenuAliasList();
  if (!!aliasList.aliases.find((a) => a.richMenuAliasId === richMenuAliasId)) {
    await client.deleteRichMenuAlias(richMenuAliasId);
  }
  await client.createRichMenuAlias({
    richMenuId,
    richMenuAliasId: richMenuAliasId,
  });
  console.log(`richMenuAliasId '${richMenuAliasId}' is set`);
  return richMenuId;
}

// async function createRichMenuA(filename: string) {
//   // Define the rich menu structure
//   const richMenu: messagingApi.RichMenuRequest = {
//     size: { width: 2500, height: 1686 }, // compact size
//     selected: true,
//     name: "Compact Menu A",
//     chatBarText: "主選單",
//     areas: richMenuAArea,
//   };

//   // Create the rich menu
//   const richMenuId = (await client.createRichMenu(richMenu)).richMenuId;

//   // Upload the image
//   const imagePath = path.join(__dirname, "assets", filename);
//   const imageBuffer = fs.readFileSync(imagePath);

//   await blobClient.setRichMenuImage(
//     richMenuId,
//     new Blob([imageBuffer], { type: "image/jpeg" })
//   );

//   const aliasList = await client.getRichMenuAliasList();
//   if (
//     !!aliasList.aliases.find((a) => a.richMenuAliasId === "richmenu-alias-a")
//   ) {
//     await client.deleteRichMenuAlias("richmenu-alias-a");
//   }
//   await client.createRichMenuAlias({
//     richMenuId,
//     richMenuAliasId: "richmenu-alias-a",
//   });
//   console.log("richMenuAliasId 'richmenu-alias-a' is set");
//   return richMenuId;
// }

// async function createRichMenuB(filename: string) {
//   // Define the rich menu structure
//   const richMenu: messagingApi.RichMenuRequest = {
//     size: { width: 2500, height: 1686 }, // compact size
//     selected: true,
//     name: "Compact Menu B",
//     chatBarText: "主選單",
//     areas: richMenuBArea,
//   };

//   // Create the rich menu
//   const richMenuId = (await client.createRichMenu(richMenu)).richMenuId;

//   // Upload the image
//   const imagePath = path.join(__dirname, "assets", filename);
//   const imageBuffer = fs.readFileSync(imagePath);

//   await blobClient.setRichMenuImage(
//     richMenuId,
//     new Blob([imageBuffer], { type: "image/jpeg" })
//   );

//   const aliasList = await client.getRichMenuAliasList();
//   if (
//     !!aliasList.aliases.find((a) => a.richMenuAliasId === "richmenu-alias-b")
//   ) {
//     await client.deleteRichMenuAlias("richmenu-alias-b");
//   }
//   await client.createRichMenuAlias({
//     richMenuId,
//     richMenuAliasId: "richmenu-alias-b",
//   });
//   console.log("richMenuAliasId 'richmenu-alias-b' is set");
//   return richMenuId;
// }

async function main() {
  const richMenuAId = await createRichMenu({
    richMenu: {
      size: { width: 2500, height: 1686 }, // compact size
      selected: true,
      name: "Compact Menu A",
      chatBarText: "主選單",
      areas: richMenuAArea,
    },
    richMenuAliasId: "richmenu-alias-a",
    filename: "richmenu_1753452577497.jpg",
  });
  const richMenuBId = await createRichMenu({
    richMenu: {
      size: { width: 2500, height: 1686 }, // compact size
      selected: true,
      name: "Compact Menu B",
      chatBarText: "主選單",
      areas: richMenuBArea,
    },
    richMenuAliasId: "richmenu-alias-b",
    filename: "richmenu_1754533767864.jpg",
  });

  // Save the rich menu IDs to a JSON file
  const outputPath = path.join(__dirname, "richMenuIds.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ richMenuAId, richMenuBId }, null, 2),
    "utf-8"
  );
  console.log("Rich menu IDs saved to:", outputPath);

  // Set the rich menu as the default
  await client.setDefaultRichMenu(richMenuAId);
  client.linkRichMenuIdToUser;

  console.log("Rich menu created and set as default:", richMenuAId);
}

main();
