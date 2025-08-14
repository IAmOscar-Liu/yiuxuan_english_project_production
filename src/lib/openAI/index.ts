import OpenAI from "openai";
import {
  createChat,
  deleteThreadOrRunId,
  insertConversationToChat,
  setThreadOrRunId,
} from "../firebase_admin";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});

const assistantId = process.env.OPENAI_ASSISTANT_ID as string; // Your Assistant ID

type OpenAIResult = { threadId?: string } & (
  | { success: true; data: string }
  | { success: false; error: any }
);

export class OpenAILib {
  static async chat(params: {
    user: {
      [field: string]: any;
    };
    message: string;
    timeout?: number;
    shouldCreateChat?: boolean;
    shouldSaveConversation?: boolean;
  }): Promise<OpenAIResult> {
    await setThreadOrRunId(params.user.id, { runId: "creating" });
    return new OpenAILib()._chat(params).then((result) => {
      if (result.threadId && params.shouldSaveConversation) {
        insertConversationToChat(result.threadId, {
          role: "assistant",
          text: result.success
            ? result.data
            : `很抱歉，系統目前無法回覆你的訊息 - ${result.error}`,
        });
      }
      return result;
    });
  }

  async _chat({
    user,
    message,
    timeout = 60 * 1000,
    shouldCreateChat = false,
    shouldSaveConversation = false,
  }: {
    user: {
      [field: string]: any;
    };
    message: string;
    timeout?: number;
    shouldCreateChat?: boolean;
    shouldSaveConversation?: boolean;
  }): Promise<OpenAIResult> {
    const userId = user.id;
    let timeoutHandle: NodeJS.Timeout | null = null;
    let timedOut = false;
    let threadId: string | undefined;

    console.log(`User ${userId} request for AI - ${message}`);
    try {
      // Get or create thread for user
      console.log(`Get or create thread for user ${userId}`);
      // let threadId = userThreads[userId];
      threadId = user.threadId;
      if (!threadId) {
        const thread = await openai.beta.threads.create();
        threadId = thread.id;
        if (shouldCreateChat) await createChat(threadId, userId);
        // userThreads[userId] = threadId;
        await setThreadOrRunId(userId, { threadId });
      }
      if (shouldSaveConversation)
        await insertConversationToChat(threadId, {
          role: "user",
          text: message,
        });

      // Check if there is an active run for this user/thread
      // let runId = userRuns[userId];ƒ
      let runId = user.runId;
      if (runId) {
        try {
          const runStatus = await openai.beta.threads.runs.retrieve(runId, {
            thread_id: threadId,
          });
          if (
            runStatus.status !== "completed" &&
            runStatus.status !== "failed" &&
            runStatus.status !== "cancelled"
          ) {
            return {
              success: false,
              threadId,
              error: "Previous request is still being processed. Please wait.",
            };
          }
        } catch (e) {
          // If error retrieving run, ignore and continue (maybe run expired)
        }
      }

      // Send user message to thread
      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: message,
      });

      // Run the assistant
      console.log(`Run the assistant for user ${user.id}`);
      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      });
      // userRuns[userId] = run.id;
      await setThreadOrRunId(userId, { runId: run.id });

      // Set up a 60s timeout to cancel the run if it takes too long
      timeoutHandle = setTimeout(async () => {
        timedOut = true;
        try {
          await openai.beta.threads.runs.cancel(run.id, {
            thread_id: threadId!,
          });
        } catch (e) {
          // Ignore errors from cancel
        }
        // delete userRuns[userId];
        await deleteThreadOrRunId(userId, { runId: true });
      }, timeout);

      // Wait for completion
      let runStatus: Awaited<
        ReturnType<typeof openai.beta.threads.runs.retrieve>
      >;
      do {
        runStatus = await openai.beta.threads.runs.retrieve(run.id, {
          thread_id: threadId,
        });
        if (runStatus.status === "failed") {
          // Clean up run tracking on failure
          if (timeoutHandle) clearTimeout(timeoutHandle);
          // delete userRuns[userId];
          await deleteThreadOrRunId(userId, { runId: true });
          return { success: false, threadId, error: "Assistant run failed" };
        }
        if (runStatus.status !== "completed") {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (timedOut) {
          return {
            success: false,
            threadId,
            error: "Request timed out. The run was cancelled.",
          };
        }
      } while (runStatus.status !== "completed");
      // console.log(runStatus);
      // Clean up run tracking on completion
      if (timeoutHandle) clearTimeout(timeoutHandle);
      // delete userRuns[userId];
      await deleteThreadOrRunId(userId, { runId: true });

      // Get assistant's reply
      const messages = await openai.beta.threads.messages.list(threadId);
      const latest = messages.data[0];
      let reply = "";
      if (
        latest &&
        latest.content &&
        latest.content[0] &&
        "text" in latest.content[0]
      ) {
        reply = (latest.content[0] as { text: { value: string } }).text.value;
        console.log(`Successfully get AI response`);
      } else {
        reply = "No assistant reply found.";
      }
      return { success: true, threadId, data: reply };
    } catch (err) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      console.error("AI Error:", err);
      return { success: false, threadId, error: "Internal server error" };
    }
  }

  static async deleteChat(user: {
    [field: string]: any;
  }): Promise<OpenAIResult> {
    const userId = user.id;
    // const threadId = userThreads[userId];
    const threadId = user.threadId;
    if (!threadId) {
      return { success: false, error: "No thread found for this user" };
    }

    try {
      // Delete the thread from OpenAI
      await openai.beta.threads.delete(threadId);

      // Remove from in-memory stores
      // delete userThreads[userId];
      // delete userRuns[userId];
      await deleteThreadOrRunId(userId, { threadId: true, runId: true });

      return { success: true, data: "Conversation deleted." };
    } catch (err) {
      console.error("Error deleting thread:", err);
      return { success: false, error: "Failed to delete conversation" };
    }
  }

  static async getJsonSummary(summary: string) {
    try {
      console.log("Generate json summary");
      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          {
            role: "assistant",
            content:
              "請將以下文字統整成JSON，欄位必需要有:學習主題(string or null)、涉及知識點(string or null)、評分(number or null)、評語(string or null)",
          },
          // {
          //   role: "user",
          //   content:
          //     "### 學習紀錄 - **學習主題**：被動語態 - **涉及知識點**：被動語態基本結構、主動與被動句型轉換 ### 本次亮點 - 成功理解和應用被動語態的基本句型。 - 能夠將主動句正確地轉換為被動句，反之亦然。 ### 章節進度條 - **被動語態學習進度**：██████████ 100% - 你已經完成被動語態的基本學習。 ### 整體評分 - **評分**：4.5 / 5 - **評語**：你對被動語態概念的理解非常到位，能夠靈活應用所學知識，為進一步學習做好了良好基礎。 ### 下一關挑戰引導 - 接著學習被動語態在不同時態中的應用，例如：現在完成式和過去完成式被動語態。 - 探討被動語態在不同情境中的運用，幫助提升寫作與表達能力。 隨時準備好迎接新的挑戰時，請告訴我，我將會在這裡支持你！",
          // },
          {
            role: "user",
            content: summary,
          },
        ],
        response_format: { type: "json_object" }, // Makes the response strictly JSON (no explanation or markdown)
      });

      // console.log(chatCompletion.choices[0].message.content);
      const json = JSON.parse(
        chatCompletion.choices[0].message.content ?? "{}"
      );
      console.log(`Json summary - ${json}`);
      return {
        topic: json["學習主題"] ? String(json["學習主題"]) : null,
        involvedKnowledge: json["涉及知識點"]
          ? String(json["涉及知識點"])
          : null,
        score: json["評分"] ? Number(json["評分"]) : null,
        comment: json["評語"] ? String(json["評語"]) : null,
      };
    } catch (error) {
      console.error(`Fail to get JSON summary - ${error}`);
      return undefined;
    }
  }
}
