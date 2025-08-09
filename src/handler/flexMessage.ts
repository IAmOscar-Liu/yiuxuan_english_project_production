import { messagingApi } from "@line/bot-sdk";
import client from "../lib/client";
import { formatDateToLocal } from "../lib/formatter";
import { handleTextMessage } from "./textMessage";

function buildLearningSummaryFlexMessage({
  id,
  summaryJson,
  updatedAt,
}: {
  [field: string]: any;
}) {
  const starCount = summaryJson.score ? Math.round(summaryJson.score) : 0;
  const lightStarUrl =
    "https://developers-resource.landpress.line.me/fx/img/review_gold_star_28.png";
  const darkStarUrl =
    "https://developers-resource.landpress.line.me/fx/img/review_gray_star_28.png";

  const flexMessageJson: messagingApi.FlexContainer = {
    type: "bubble",
    hero: {
      type: "image",
      url: "https://developers-resource.landpress.line.me/fx/img/01_1_cafe.png",
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "cover",
      action: {
        type: "uri",
        uri: "https://line.me/",
      },
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: summaryJson.topic ?? "N/A",
          weight: "bold",
          size: "xl",
        },
        {
          type: "text",
          text: summaryJson.involvedKnowledge ?? "N/A", // <-- Add your subtitle text here
          size: "sm",
          color: "#888888",
          margin: "md",
        },
        {
          type: "box",
          layout: "baseline",
          margin: "md",
          contents: [
            {
              type: "icon",
              size: "sm",
              url: starCount >= 1 ? lightStarUrl : darkStarUrl,
            },
            {
              type: "icon",
              size: "sm",
              url: starCount >= 2 ? lightStarUrl : darkStarUrl,
            },
            {
              type: "icon",
              size: "sm",
              url: starCount >= 3 ? lightStarUrl : darkStarUrl,
            },
            {
              type: "icon",
              size: "sm",
              url: starCount >= 4 ? lightStarUrl : darkStarUrl,
            },
            {
              type: "icon",
              size: "sm",
              url: starCount >= 5 ? lightStarUrl : darkStarUrl,
            },
            {
              type: "text",
              text:
                typeof summaryJson.score === "number"
                  ? String(summaryJson.score.toFixed(1))
                  : "N/A",
              size: "sm",
              color: "#999999",
              margin: "md",
              flex: 0,
            },
          ],
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "評語",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 1,
                },
                {
                  type: "text",
                  text: summaryJson.comment ?? "N/A",
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5,
                },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "完成時間",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2,
                  maxLines: 1,
                  wrap: false,
                },
                {
                  type: "text",
                  text: updatedAt
                    ? formatDateToLocal(new Date(updatedAt.seconds * 1000))
                    : "N/A",
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5,
                },
              ],
            },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "link",
          height: "sm",
          action: {
            type: "uri",
            label: "查看細節",
            uri: `${process.env.LINE_LIFF_URL}/chat-details.html?threadId=${id}`,
          },
        },
        {
          type: "box",
          layout: "vertical",
          contents: [],
          margin: "sm",
        },
      ],
      flex: 0,
    },
  };

  return flexMessageJson;
}

export function handleLearningSummaryFlexMessage({
  replyToken,
  data,
}: {
  replyToken?: string;
  data: {
    [field: string]: any;
  };
}) {
  if (!replyToken) return Promise.resolve(null);

  // Create the message object to be sent
  const message: messagingApi.Message = {
    type: "flex",
    altText: "您的學習成果圖卡",
    contents: buildLearningSummaryFlexMessage(data),
  };

  return client.replyMessage({
    replyToken,
    messages: [message],
  });
}

export function handleLearningSummaryCarouselMessage({
  replyToken,
  chats,
}: {
  replyToken?: string;
  chats: {
    [key: string]: any;
  }[];
}) {
  if (!replyToken) return Promise.resolve(null);
  if (chats.length === 0)
    return handleTextMessage({
      replyToken,
      text: "您目前沒有學習成果圖卡，趕快開始一個新任務吧！",
    });

  const echo: messagingApi.Message = {
    type: "text",
    text: `以下是您近${chats.length}次的學習成果圖卡`,
  };

  const message: messagingApi.Message = {
    type: "flex",
    altText: `以下是您近${chats.length}次的學習成果圖卡`,
    contents: {
      type: "carousel",
      contents: chats.map(buildLearningSummaryFlexMessage),
    },
  };

  return client.replyMessage({
    replyToken,
    messages: [echo, message],
  });
}
