import { messagingApi } from "@line/bot-sdk";
import "dotenv/config";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

manualLinkRichMenu({
  userId: "U8a4e9ad0021ae7b716ea668fe81d6bfc",
  richMenuId: "richmenu-a552b0592f689a17a2f1895a3c788e36",
});

async function manualLinkRichMenu({
  userId,
  richMenuId,
}: {
  userId: string;
  richMenuId: string;
}) {
  // client.unlinkRichMenuIdFromUser("U8a4e9ad0021ae7b716ea668fe81d6bfc");
  await client.linkRichMenuIdToUser(userId, richMenuId);

  console.log(
    `RichMenuId '${richMenuId}' has been manually linked to user '${userId}'`
  );
}
