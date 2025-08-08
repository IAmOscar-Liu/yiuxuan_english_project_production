import client from "../lib/client";

export async function handleLinkRichMenuIdToUser({
  userId,
  richMenuId,
  replyToken,
  successMsg,
  failureMsg,
}: {
  userId?: string;
  richMenuId: string;
  replyToken?: string;
  successMsg?: string;
  failureMsg?: string;
}) {
  if (!replyToken || !userId) return Promise.resolve(null);

  try {
    await client.linkRichMenuIdToUser(userId, richMenuId);

    return client.replyMessage({
      replyToken,
      messages: [
        {
          type: "text",
          text:
            successMsg ||
            `Successfully link richMenuId ${richMenuId} to user ${userId}`,
        },
      ],
    });
  } catch (error) {
    console.error(`Failed to link richMenuId to user: ${error}`);
    return client.replyMessage({
      replyToken,
      messages: [
        {
          type: "text",
          text:
            failureMsg ||
            `Failed to link richMenuId ${richMenuId} to user ${userId}`,
        },
      ],
    });
  }
}

export async function handleUnLinkRichMenuIdToUser({
  userId,
  replyToken,
  successMsg,
  failureMsg,
}: {
  userId?: string;
  replyToken?: string;
  successMsg: string;
  failureMsg: string;
}) {
  if (!replyToken || !userId) return Promise.resolve(null);

  try {
    await client.unlinkRichMenuIdFromUser(userId);

    return client.replyMessage({
      replyToken,
      messages: [
        {
          type: "text",
          text:
            successMsg || `Successfully unlink richMenuId to user ${userId}`,
        },
      ],
    });
  } catch (error) {
    console.error(`Failed to link richMenuId to user: ${error}`);
    return client.replyMessage({
      replyToken,
      messages: [
        {
          type: "text",
          text: failureMsg || `Failed to unlink richMenuId to user ${userId}`,
        },
      ],
    });
  }
}
