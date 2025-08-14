import { messagingApi } from "@line/bot-sdk";
import client from "../lib/client";

export function handleLearningSummaryMessage({
  replyToken,
  text,
  threadId,
}: {
  replyToken?: string;
  text: string;
  threadId: string;
}) {
  if (!replyToken) return Promise.resolve(null);

  const echo: messagingApi.Message = {
    type: "text",
    text,
  };

  const templateMessage: messagingApi.Message = {
    type: "template",
    altText: "您想要檢視本次學習的成果圖卡嗎？",
    template: {
      type: "confirm",
      text: "您想要檢視本次學習的成果圖卡嗎？",
      actions: [
        {
          type: "postback",
          label: "是",
          data: `user_request_learning_summary_card:${threadId}`,
        },
        {
          type: "postback",
          label: "否",
          data: "user_not_request_learning_summary_card",
        },
      ],
    },
  };

  return client.replyMessage({
    replyToken,
    messages: [echo, templateMessage],
  });
}
