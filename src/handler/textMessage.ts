import { messagingApi } from "@line/bot-sdk";
import client from "../lib/client";

export function handleTextMessage({
  text,
  replyToken,
}: {
  text: string;
  replyToken?: string;
}) {
  if (!replyToken) return Promise.resolve(null);
  // create an echoing text message
  const echo: messagingApi.Message = {
    type: "text",
    text,
  };

  // use reply API
  return client.replyMessage({
    replyToken,
    messages: [echo],
  });
}
