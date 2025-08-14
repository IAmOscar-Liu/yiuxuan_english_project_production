import { messagingApi } from "@line/bot-sdk";
import client from "../lib/client";

export function handleLearningSummaryTargetQuickReply({
  replyToken,
  userId,
  associatedStudents,
}: {
  replyToken?: string;
  userId: string;
  associatedStudents: Array<{ id: string; name: string }>;
}) {
  if (!replyToken) return Promise.resolve(null);

  const templateMessage: messagingApi.Message = {
    type: "text",
    text: "請選擇您想查看的對象",
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "postback",
            label: "自己",
            data: `user_request_learning_summary_carousel:${JSON.stringify({
              id: userId,
            })}`,
          },
        },
        ...associatedStudents.map(
          ({ id, name }) =>
            ({
              type: "action",
              action: {
                type: "postback",
                label: `學生-${name}`,
                data: `user_request_learning_summary_carousel:${JSON.stringify({
                  id,
                  name,
                })}`,
              },
            } as messagingApi.QuickReplyItem)
        ),
      ],
    },
  };

  // use reply API
  return client.replyMessage({
    replyToken,
    messages: [templateMessage],
  });
}

export function handleLearningQuickReply({
  replyToken,
  user,
}: {
  replyToken?: string;
  user: {
    [field: string]: any;
  };
}) {
  if (!replyToken) return Promise.resolve(null);

  const echo: messagingApi.Message = {
    type: "text",
    text: `Hello ${user.nickName}，您即將開始今天的任務，在任務開始前，請先確定網路順暢，如需結束，請再次點選主選單『開始/結束任務』，祝您學習愉快！`,
  };
  //   // create an echoing text message
  // create an echoing text message
  const templateMessage: messagingApi.Message = {
    type: "text",
    text: "請問你今天想學習什麼呢？",
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "postback",
            label: "文法A",
            data: "user_want_learn_grammar",
          },
        },
        {
          type: "action",
          action: {
            type: "postback",
            label: "文法B",
            data: "user_want_learn_grammar",
          },
        },
        {
          type: "action",
          action: {
            type: "postback",
            label: "文法C",
            data: "user_want_learn_grammar",
          },
        },
      ],
    },
  };

  // use reply API
  return client.replyMessage({
    replyToken,
    messages: [echo, templateMessage],
  });
}
