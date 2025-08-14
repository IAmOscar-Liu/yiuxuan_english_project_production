import { middleware, webhook } from "@line/bot-sdk";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { richMenuAArea, richMenuBArea } from "./constants/richMenuArea";
import { handleConfirmMessage } from "./handler/confirmMessage";
import {
  handleLearningSummaryCarouselMessage,
  handleLearningSummaryFlexMessage,
} from "./handler/flexMessage";
import { handleJoin } from "./handler/join";
import { handleLiffButtonMessage } from "./handler/LiffButtonMessage";
import {
  handleLinkRichMenuIdToUser,
  handleUnLinkRichMenuIdToUser,
} from "./handler/linkRichMenuIdToUser";
import { handleLearningSummaryMessage } from "./handler/others";
import {
  handleLearningQuickReply,
  handleLearningSummaryTargetQuickReply,
} from "./handler/quickReply";
import { handleTextMessage } from "./handler/textMessage";
import {
  addSummaryToChat,
  getChatDocumentById,
  getChatDocumentsByUserId,
  getUserDocumentById,
  linkStudentToParent,
  logInUser,
  logOutUser,
} from "./lib/firebase_admin";
import { formatUserRole } from "./lib/formatter";
import { isFuzzyMatch } from "./lib/isFuzzyMatch";
import { OpenAILib } from "./lib/openAI";
import { limiter } from "./lib/rateLimit";
import { readRichMenuBId } from "./lib/readRichMenuId";

// create LINE SDK config from env variables
const lineMiddleware = middleware({
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
});

console.log(process.env.NODE_ENV);
console.log(process.env.LINE_CHANNEL_SECRET);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

const corsOptions = {
  origin: "*", // Your Netlify domain
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // Allow sending cookies/authorization headers
}; // Use the cors middleware

app.get("/api/test", (req, res) => {
  res.json({ result: "success" });
});

app.post(
  "/api/link-student-to-parent",
  cors(corsOptions),
  express.json(),
  async (req, res) => {
    // Make the function async
    const { userId, userName, parentId } = req.body;

    if (!userId || !userName || !parentId) {
      return res.status(400).send({
        error: "Missing userId, userName or parentId in request body.",
      });
    }

    const result = await linkStudentToParent({ userId, userName, parentId });
    return res.status(200).send({
      success: result,
      message: result
        ? `Successfully link student ${userId} to parent: ${parentId}`
        : `Failed to link student ${userId} to parent: ${parentId}`,
    });
  }
);

app.post(
  "/api/push-message",
  cors(corsOptions),
  express.json(),
  async (req, res) => {
    // Make the function async
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res
        .status(400)
        .send({ error: "Missing userId or message in request body." });
    }

    try {
      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Ensure LINE_CHANNEL_ACCESS_TOKEN is set in your environment variables
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: userId,
          messages: [
            {
              type: "text",
              text: message,
            },
          ],
        }),
      });

      // Check if the LINE API request was successful
      if (response.ok) {
        console.log(`Push message sent to ${userId}`);
        res
          .status(200)
          .send({ success: true, message: "Push message sent successfully." });
      } else {
        const errorData = await response.json();
        console.error(`Failed to send push message to ${userId}:`, errorData);
        res.status(response.status).send({ success: false, error: errorData });
      }
    } catch (error) {
      console.error("Error sending push message:", error);
      res.status(500).send({ success: false, error: "Internal server error." });
    }
  }
);

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post("/api/callback", lineMiddleware, (req, res) => {
  console.log("Received events:", req.body.events);
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// The type of `event` is `line.messagingApi.WebhookEvent` from the @line/bot-sdk package.
function handleEvent(event: webhook.Event) {
  if (event.type === "join" || event.type === "follow")
    return handleJoin({ replyToken: event.replyToken });
  if (event.type === "message" && event.message.type === "text") {
    if (event.message.text.trim().toLocaleLowerCase() === "help")
      return handleConfirmMessage({
        replyToken: event.replyToken,
        text: "Need help?",
        actions: [
          { type: "postback", label: "yes", data: "user_need_help" },
          { type: "postback", label: "no", data: "user_no_need_help" },
        ],
      });
    if (event.message.text === "我的身分") {
      return getUserDocumentById(event.source?.userId ?? "").then((user) => {
        if (!user)
          return handleLiffButtonMessage({
            replyToken: event.replyToken,
            liffUrl: process.env.LINE_LIFF_URL!,
            title: "您尚未擁有帳號，點此開始註冊",
            label: "註冊",
          });
        if (user.isLoggedIn) return Promise.resolve(null);
        return handleConfirmMessage({
          replyToken: event.replyToken,
          text: `您的身分為『${formatUserRole(user.role)}』，請問是否登入？`,
          actions: [
            { type: "postback", label: "是", data: "user_need_login" },
            { type: "postback", label: "否", data: "user_no_need_login" },
          ],
        });
      });
    }
    if (event.message.text === "我的帳號") {
      return getUserDocumentById(event.source?.userId ?? "").then((user) => {
        if (!user || !user.isLoggedIn) return Promise.resolve(null);
        return handleConfirmMessage({
          replyToken: event.replyToken,
          text: "我的帳號",
          actions: [
            {
              type: "uri",
              label: "查看",
              uri: process.env.LINE_LIFF_URL! + "/account.html",
            },
            { type: "postback", label: "登出", data: "user_need_logout" },
          ],
        });
      });
    }
    if (event.message.text === "開始/結束任務") {
      return getUserDocumentById(event.source?.userId ?? "").then((user) => {
        if (!user || !user.isLoggedIn) return Promise.resolve(null);
        if (user.threadId) {
          return handleConfirmMessage({
            replyToken: event.replyToken,
            text: "是否結束目前任務？",
            actions: [
              { type: "postback", label: "是", data: "user_cancel_task" },
              { type: "postback", label: "否", data: "user_not_cancel_task" },
            ],
          });
        }
        return handleConfirmMessage({
          replyToken: event.replyToken,
          text: "是否開始新任務？",
          actions: [
            { type: "postback", label: "是", data: "user_initiate_task" },
            { type: "postback", label: "否", data: "user_not_initiate_task" },
          ],
        });
      });
    }
    if (event.message.text === "我的成果圖卡")
      return getUserDocumentById(event.source?.userId ?? "").then(
        async (user) => {
          if (!user || !user.isLoggedIn) return Promise.resolve(null);
          if (
            user.role === "parent" &&
            Array.isArray(user.associated_students) &&
            user.associated_students.length > 0
          ) {
            return handleLearningSummaryTargetQuickReply({
              replyToken: event.replyToken,
              userId: user.id,
              associatedStudents: user.associated_students,
            });
          }
          const chatDocs = await getChatDocumentsByUserId(user.id);
          return handleLearningSummaryCarouselMessage({
            replyToken: event.replyToken,
            chats: chatDocs,
          });
        }
      );
    if (event.message.text === "任務記錄")
      return getUserDocumentById(event.source?.userId ?? "").then((user) => {
        if (!user || !user.isLoggedIn) return Promise.resolve(null);
        return handleLiffButtonMessage({
          replyToken: event.replyToken,
          liffUrl: process.env.LINE_LIFF_URL! + "/chats.html",
          title: "點此查看您的任務記錄",
          label: "查看",
        });
      });
    if (event.message.text === "問題回報")
      return getUserDocumentById(event.source?.userId ?? "").then((user) => {
        if (!user || !user.isLoggedIn) return Promise.resolve(null);
        return handleLiffButtonMessage({
          replyToken: event.replyToken,
          liffUrl: process.env.LINE_LIFF_URL! + "/report.html",
          title: "點此回報您的問題",
          label: "回報",
        });
      });

    // handle user click richMenu
    const textMessage = event.message.text;
    if (
      richMenuAArea.find(
        (area) =>
          area.action?.type === "message" && area.action.text === textMessage
      ) ||
      richMenuBArea.find(
        (area) =>
          area.action?.type === "message" && area.action.text === textMessage
      )
    ) {
      return handleTextMessage({
        replyToken: event.replyToken,
        text: "此功能正在開發，敬請期待！",
      });
    }

    // handle user send text message
    return getUserDocumentById(event.source?.userId ?? "").then(
      async (user) => {
        if (user && user.isLoggedIn) {
          if (user.runId || !limiter.canExecute(user.id))
            return handleTextMessage({
              replyToken: event.replyToken,
              text: "系統正在回覆您的訊息，請稍後......",
            });
          if (user.threadId) {
            if (isFuzzyMatch(textMessage, "Let's call it a day")) {
              return handleConfirmMessage({
                replyToken: event.replyToken,
                text: "是否結束目前任務？",
                actions: [
                  { type: "postback", label: "是", data: "user_cancel_task" },
                  {
                    type: "postback",
                    label: "否",
                    data: "user_not_cancel_task",
                  },
                ],
              });
            }
            const openAIResult = await OpenAILib.chat({
              user,
              message: textMessage,
              shouldSaveConversation: true,
            });
            const text = openAIResult.success
              ? openAIResult.data
              : `很抱歉，系統目前無法回覆你的訊息 - ${openAIResult.error}`;
            return handleTextMessage({
              replyToken: event.replyToken,
              text,
            });
          }
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      }
    );
  }
  if (event.type === "postback") {
    if (event.postback.data === "user_need_help") {
      return handleTextMessage({
        replyToken: event.replyToken,
        text: "Sorry! I can't help you.",
      });
    }
    if (event.postback.data === "user_need_login") {
      return getUserDocumentById(event.source?.userId ?? "").then((user) => {
        if (!user) return Promise.resolve(null);
        logInUser(user.id);
        return handleLinkRichMenuIdToUser({
          richMenuId: readRichMenuBId("richMenuBId"),
          userId: user.id,
          replyToken: event.replyToken,
          successMsg: "您已成功登入",
          failureMsg: "登入失敗，請重新再試",
        });
      });
    }
    if (event.postback.data === "user_need_logout") {
      return getUserDocumentById(event.source?.userId ?? "").then((user) => {
        if (!user) return Promise.resolve(null);
        logOutUser(user.id);
        return handleUnLinkRichMenuIdToUser({
          userId: user.id,
          replyToken: event.replyToken,
          successMsg: "您已成功登出",
          failureMsg: "登出失敗，請重新再試",
        });
      });
    }
    if (event.postback.data === "user_initiate_task") {
      return getUserDocumentById(event.source?.userId ?? "").then((user) => {
        if (!user || !user.isLoggedIn) return Promise.resolve(null);
        if (user.threadId)
          return handleTextMessage({
            replyToken: event.replyToken,
            text: "任務已開始",
          });
        return handleLearningQuickReply({
          replyToken: event.replyToken,
          user,
        });
      });
    }
    if (event.postback.data === "user_cancel_task") {
      return getUserDocumentById(event.source?.userId ?? "").then(
        async (user) => {
          if (!user || !user.isLoggedIn) return Promise.resolve(null);
          if (!user.threadId)
            return handleTextMessage({
              replyToken: event.replyToken,
              text: "任務已結束",
            });
          const chatDoc = await getChatDocumentById(user.threadId, {
            showDebug: true,
          });
          // 如果聊天訊息少於10條, 直接結束任務
          if (
            !chatDoc ||
            !Array.isArray(chatDoc.data) ||
            chatDoc.data.length < 10
          ) {
            await OpenAILib.deleteChat(user);
            return handleTextMessage({
              replyToken: event.replyToken,
              text: "任務結束",
            });
          }
          return handleConfirmMessage({
            replyToken: event.replyToken,
            text: `是否要總結本次的學習成果？`,
            actions: [
              {
                type: "postback",
                label: "是",
                data: "user_require_learning_summary",
              },
              {
                type: "postback",
                label: "否",
                data: "user_not_require_learning_summary",
              },
            ],
          });
        }
      );
    }
    if (
      event.postback.data === "user_require_learning_summary" ||
      event.postback.data === "user_not_require_learning_summary"
    ) {
      return getUserDocumentById(event.source?.userId ?? "").then(
        async (user) => {
          if (!user || !user.isLoggedIn) return Promise.resolve(null);
          if (!user.threadId)
            return handleTextMessage({
              replyToken: event.replyToken,
              text: "任務已結束",
            });
          if (user.runId || !limiter.canExecute(user.id))
            return handleTextMessage({
              replyToken: event.replyToken,
              text: "系統正在回覆您的訊息，請稍後......",
            });
          let text = "任務結束";
          if (event.postback.data === "user_require_learning_summary") {
            const openAIResult = await OpenAILib.chat({
              user,
              message:
                "Let's call it a day.\n請給我成果回顧，例如學習紀錄，本次亮點、章節進度條、整體評分(0~5)&下一關挑戰引導",
            });
            if (openAIResult.success) {
              text = openAIResult.data;
              const json = await OpenAILib.getJsonSummary(openAIResult.data);
              if (openAIResult.threadId) {
                await addSummaryToChat(openAIResult.threadId, { text, json });
                await OpenAILib.deleteChat(user);
                return handleLearningSummaryMessage({
                  replyToken: event.replyToken,
                  text,
                  threadId: openAIResult.threadId,
                });
              }
            } else {
              text = `很抱歉，系統目前無法回覆你的訊息 - ${openAIResult.error}`;
            }
          }
          await OpenAILib.deleteChat(user);
          return handleTextMessage({
            replyToken: event.replyToken,
            text,
          });
        }
      );
    }
    if (event.postback.data === "user_want_learn_grammar") {
      return getUserDocumentById(event.source?.userId ?? "").then(
        async (user) => {
          if (!user || !user.isLoggedIn) return Promise.resolve(null);
          if (user.threadId)
            return handleTextMessage({
              replyToken: event.replyToken,
              text: "任務已開始",
            });
          const openAIResult = await OpenAILib.chat({
            user,
            message: "我要學文法",
            shouldCreateChat: true,
            shouldSaveConversation: true,
          });
          const text = openAIResult.success
            ? openAIResult.data
            : `很抱歉，系統目前無法回覆你的訊息 - ${openAIResult.error}`;
          return handleTextMessage({
            replyToken: event.replyToken,
            text,
          });
        }
      );
    }
    if (event.postback.data.startsWith("user_request_learning_summary_card:"))
      return getUserDocumentById(event.source?.userId ?? "").then(
        async (user) => {
          if (!user || !user.isLoggedIn) return Promise.resolve(null);
          const threadId = event.postback.data.replace(
            "user_request_learning_summary_card:",
            ""
          );
          const chatDoc = await getChatDocumentById(threadId);
          if (!chatDoc)
            return handleTextMessage({
              replyToken: event.replyToken,
              text: "成果圖卡不存在",
            });
          return handleLearningSummaryFlexMessage({
            replyToken: event.replyToken,
            data: chatDoc,
          });
        }
      );
    if (
      event.postback.data.startsWith("user_request_learning_summary_carousel:")
    )
      return getUserDocumentById(event.source?.userId ?? "").then(
        async (user) => {
          if (!user || !user.isLoggedIn) return Promise.resolve(null);
          const payloadString = event.postback.data.replace(
            "user_request_learning_summary_carousel:",
            ""
          );
          const { id, name } = JSON.parse(payloadString || "{}");
          if (!id) return Promise.resolve(null);
          const chatDocs = await getChatDocumentsByUserId(id);
          return handleLearningSummaryCarouselMessage({
            replyToken: event.replyToken,
            chats: chatDocs,
            userName: name ? `學生-${name}` : undefined,
          });
        }
      );
  }

  return Promise.resolve(null);
}

if (process.env.NODE_ENV === "development") {
  // Set static folder
  app.use(express.static(__dirname + "/../liff/"));

  // Handle SPA
  app.get(/.*/, (_, res) => res.sendFile(__dirname + "/../liff/index.html"));
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
