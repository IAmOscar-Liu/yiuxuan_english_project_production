import { messagingApi } from "@line/bot-sdk";
import client from "../lib/client";

export function handleLiffButtonMessage({
  replyToken,
  liffUrl,
  title,
  label,
}: {
  replyToken?: string;
  liffUrl: string;
  title: string;
  label: string;
}) {
  if (!replyToken) return Promise.resolve(null);

  const message: messagingApi.Message = {
    type: "template",
    altText: title,
    template: {
      type: "buttons",
      text: title,
      actions: [
        {
          type: "uri",
          label,
          uri: liffUrl,
        },
      ],
    },
  };

  return client.replyMessage({
    replyToken,
    messages: [message],
  });
}
