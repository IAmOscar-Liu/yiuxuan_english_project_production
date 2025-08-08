import { messagingApi } from "@line/bot-sdk";

export const richMenuAArea: messagingApi.RichMenuArea[] = [
  {
    bounds: { x: 0, y: 0, width: 833, height: 843 },
    action: { type: "message", text: "體驗文法任務" },
  },
  {
    bounds: { x: 834, y: 0, width: 833, height: 843 },
    action: { type: "message", text: "加入完整任務" },
  },
  {
    bounds: { x: 1667, y: 0, width: 833, height: 843 },
    action: { type: "message", text: "我的身分" },
  },
  {
    bounds: { x: 0, y: 844, width: 833, height: 843 },
    action: { type: "message", text: "使用記錄查詢" },
  },
  {
    bounds: { x: 834, y: 844, width: 833, height: 843 },
    action: { type: "message", text: "常見問題" },
  },
  {
    bounds: { x: 1667, y: 844, width: 833, height: 843 },
    action: { type: "message", text: "聯絡客服" },
  },
];

export const richMenuBArea: messagingApi.RichMenuArea[] = [
  {
    bounds: { x: 0, y: 0, width: 833, height: 843 },
    action: { type: "message", text: "開始/結束任務" },
  },
  {
    bounds: { x: 834, y: 0, width: 833, height: 843 },
    action: { type: "message", text: "任務記錄" },
  },
  {
    bounds: { x: 1667, y: 0, width: 833, height: 843 },
    action: { type: "message", text: "我的成果圖卡" },
  },
  {
    bounds: { x: 0, y: 844, width: 833, height: 843 },
    action: { type: "message", text: "我的帳號" },
  },
  {
    bounds: { x: 834, y: 844, width: 833, height: 843 },
    action: { type: "message", text: "重設任務" },
  },
  {
    bounds: { x: 1667, y: 844, width: 833, height: 843 },
    action: { type: "message", text: "問題回報" },
  },
];
