// Map survey name -> file path inside the bucket
export const SURVEY_PATHS: Record<
  string,
  { title: string; file: string; baseFolder: string }
> = {
  profile: {
    title: "填寫個人基本資料",
    file: "surveys/1_基本資料/survey_template.json",
    baseFolder: "surveys/1_基本資料",
  },
  formal_scale_sections: {
    title: "填寫量表內容",
    file: "surveys/2_正式量表內容/formal_scale_sections.json",
    baseFolder: "surveys/2_正式量表內容",
  },
};

export const VIDEO_PATHS: Record<
  string,
  { title: string; jsonPath: string; videoPath: string }
> = {
  chapter_1: {
    title: "Introduction to Simple Present Tense",
    jsonPath: "videos/chapter_1.json",
    videoPath: "videos/chapter_1.mp4",
  },
  chapter_2: {
    title: "Introduction to Past Simple Tense",
    jsonPath: "videos/chapter_2.json",
    videoPath: "videos/chapter_2.mp4",
  },
  chapter_3: {
    title: "Introduction to Future Tense",
    jsonPath: "videos/chapter_3.json",
    videoPath: "videos/chapter_3.mp4",
  },
  chapter_4: {
    title: "Introduction to Present Continuous Tense",
    jsonPath: "videos/chapter_4.json",
    videoPath: "videos/chapter_4.mp4",
  },
};
