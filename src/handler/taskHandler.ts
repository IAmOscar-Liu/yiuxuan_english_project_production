import { SURVEY_PATHS, VIDEO_PATHS } from "../constants/courseInfo";
import { handleLiffButtonMessage } from "./LiffButtonMessage";
import { handleTextMessage } from "./textMessage";

export async function taskHandler({
  replyToken,
  user,
}: {
  replyToken?: string;
  user: { [key: string]: any };
}) {
  const noTaskMessage =
    "您目前沒有任務在身，點選主選單『開始/結束課程』開始學習吧！";

  if (!replyToken) return Promise.resolve(null);
  //   if (user.role != "student")
  //     return handleTextMessage({ text: noTaskMessage, replyToken });
  if (!isSurveyCompleted(user))
    return handleLiffButtonMessage({
      replyToken,
      liffUrl: process.env.LINE_LIFF_URL! + "/survey-list.html",
      title: "您有尚未完成的問卷",
      label: "填寫問卷",
    });
  if (!isVideoCourseCompleted(user))
    return handleLiffButtonMessage({
      replyToken,
      liffUrl: process.env.LINE_LIFF_URL! + "/video-list.html",
      title: "您有尚未完成的影片課程",
      label: "前往課程",
    });
  return handleTextMessage({ text: noTaskMessage, replyToken });
}

export function isSurveyCompleted(user: { [key: string]: any }) {
  const completedSurveys = user.completedSurveys;
  if (!Array.isArray(completedSurveys) || completedSurveys.length === 0)
    return false;
  const nameSet = new Set(completedSurveys.map((survey) => survey.name));
  return Object.keys(SURVEY_PATHS).every((name) => nameSet.has(name));
}

export function isVideoCourseCompleted(user: { [key: string]: any }) {
  const completedVideos = user.completedVideos;
  if (!Array.isArray(completedVideos) || completedVideos.length === 0)
    return false;
  const nameSet = new Set(completedVideos.map((video) => video.name));
  return Object.keys(VIDEO_PATHS).every((name) => nameSet.has(name));
}

export function hasUncompletedTask(user: { [key: string]: any }) {
  // if (user.role != "student") return false;
  if (!isSurveyCompleted(user) || !isVideoCourseCompleted(user)) return true;
  return false;
}
