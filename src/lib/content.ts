export type ViewingPath = {
  platform: string;
  type: "订阅" | "租赁/购买" | "实体发行" | "网盘" | "磁力" | "资料来源";
  note: string;
  // 观看/购买链接（可选）。可来自 TMDB watch providers、官方发行页，或人工整理的网盘分享。
  // 无链接时前端不渲染「复制链接」按钮。
  url?: string;
};

export type VersionSignal = {
  label: string;
  value: string;
  verdict: "强推荐" | "推荐" | "够用" | "待确认";
};

/**
 * 海报主色调色板（由后台 node-vibrant 从本地海报取色后落库，前端只读）。
 *
 * 六个字段对应 node-vibrant 的六个标准 swatch，均为可选——某个色族在图中找不到时缺省。
 * 前端用这些色值合成详情页顶部的氛围光晕背景（见 PosterAmbientGlow）。
 */
export type MoviePalette = {
  vibrant?: string;
  darkVibrant?: string;
  lightVibrant?: string;
  muted?: string;
  darkMuted?: string;
  lightMuted?: string;
};

export type Movie = {
  slug: string;
  tmdbId?: number;
  imdbId?: string;
  title: string;
  originalTitle: string;
  year: string;
  genres: string[];
  director: string;
  cast: string[];
  runtime: string;
  // 客观影片资料（由后台 TMDB 同步入库，前端只读；缺省时详情页不渲染对应行）
  writers?: string[]; // 编剧
  countries?: string[]; // 制片国家/地区
  languages?: string[]; // 语言
  releaseDate?: string; // 上映日期（YYYY-MM-DD 或人工录入文案）
  aka?: string[]; // 又名 / 别名
  rating: string;
  ratings?: {
    douban: string;
    imdb: string;
    rottenTomatoes: string;
  };
  posterTone: string;
  posterUrl?: string;
  backdropUrl?: string;
  sourcePosterUrl?: string;
  sourceBackdropUrl?: string;
  palette?: MoviePalette;
  summary: string;
  verdict: string;
  bestWay: string;
  idealScene: string;
  notFor: string;
  viewingPaths: ViewingPath[];
  versionSignals: VersionSignal[];
  deviceAdvice: string[];
  related: string[];
};

export type Collection = {
  slug: string;
  title: string;
  kicker: string;
  description: string;
  movies: string[];
};

export type KnowledgeEntry = {
  slug: string;
  term: string;
  summary: string;
  misconception: string;
};

export const defaultMovies: Movie[] = [
  {
    slug: "blade-runner-2049",
    title: "银翼杀手 2049",
    originalTitle: "Blade Runner 2049",
    year: "2017",
    genres: ["科幻", "新黑色", "视觉奇观"],
    director: "丹尼斯·维伦纽瓦",
    cast: ["瑞恩·高斯林", "哈里森·福特", "安娜·德·阿玛斯"],
    runtime: "164 分钟",
    rating: "8.3 / 10",
    ratings: { douban: "8.3", imdb: "8.0", rottenTomatoes: "88%" },
    posterTone: "from-cyan-300 via-indigo-500 to-amber-400",
    summary:
      "一部慢热、冷峻且高度依赖画面层次的科幻续作，适合愿意沉浸在声音、空间和霓虹雾气中的观众。",
    verdict: "值得大屏观看",
    bestWay: "4K HDR + OLED 电视或投影 + 独立音响",
    idealScene: "周末夜晚，关灯，完整看完",
    notFor: "只想轻松下饭或对慢节奏不耐烦的观众",
    viewingPaths: [
      { platform: "Apple TV", type: "租赁/购买", note: "适合作为高清流媒体观看路径参考" },
      { platform: "Amazon Prime Video", type: "租赁/购买", note: "地区可用性需以平台实时结果为准" },
      { platform: "4K UHD Blu-ray", type: "实体发行", note: "适合家庭影院用户优先考虑" },
    ],
    versionSignals: [
      { label: "4K", value: "有", verdict: "强推荐" },
      { label: "HDR", value: "HDR10 / Dolby Vision 版本可见", verdict: "强推荐" },
      { label: "Blu-ray", value: "有实体发行", verdict: "推荐" },
      { label: "移动端观看", value: "可看但浪费视听设计", verdict: "够用" },
    ],
    deviceAdvice: ["OLED 电视优先", "投影可获得空间感", "建议使用音响或好耳机", "不建议碎片化观看"],
    related: ["沙丘", "降临", "银翼杀手"],
  },
  {
    slug: "dune-part-two",
    title: "沙丘 2",
    originalTitle: "Dune: Part Two",
    year: "2024",
    genres: ["科幻", "史诗", "IMAX"],
    director: "丹尼斯·维伦纽瓦",
    cast: ["提莫西·查拉梅", "赞达亚", "丽贝卡·弗格森"],
    runtime: "166 分钟",
    rating: "8.6 / 10",
    ratings: { douban: "8.2", imdb: "8.5", rottenTomatoes: "92%" },
    posterTone: "from-orange-200 via-stone-500 to-black",
    summary:
      "更接近巨幕宗教史诗的科幻续章，影像、低频和沙漠尺度是主要价值。",
    verdict: "优先选择大屏版本",
    bestWay: "IMAX / 4K HDR / 高动态范围显示设备",
    idealScene: "影院复映、家庭影院或周末沉浸观看",
    notFor: "没有看过前作、只想快速获得剧情刺激的观众",
    viewingPaths: [
      { platform: "院线/复映信息", type: "资料来源", note: "关注官方排片与影展放映" },
      { platform: "Apple TV", type: "租赁/购买", note: "留意 4K 与 HDR 标识" },
      { platform: "4K UHD Blu-ray", type: "实体发行", note: "适合追求音画规格的用户" },
    ],
    versionSignals: [
      { label: "4K", value: "有", verdict: "强推荐" },
      { label: "IMAX 画幅", value: "重点关注", verdict: "强推荐" },
      { label: "杜比视界", value: "以平台和发行版本为准", verdict: "推荐" },
      { label: "普通高清", value: "能看，但削弱尺度感", verdict: "够用" },
    ],
    deviceAdvice: ["大屏优先", "低频表现很重要", "适合投影", "建议先补前作"],
    related: ["沙丘", "银翼杀手 2049", "疯狂的麦克斯：狂暴之路"],
  },
  {
    slug: "in-the-mood-for-love",
    title: "花样年华",
    originalTitle: "In the Mood for Love",
    year: "2000",
    genres: ["爱情", "作者电影", "修复版"],
    director: "王家卫",
    cast: ["梁朝伟", "张曼玉"],
    runtime: "98 分钟",
    rating: "8.7 / 10",
    ratings: { douban: "8.8", imdb: "8.1", rottenTomatoes: "91%" },
    posterTone: "from-red-700 via-rose-400 to-yellow-200",
    summary:
      "色彩、布料、走廊和时间感组成的私人记忆，高清修复的价值来自细节和胶片质感。",
    verdict: "适合高质量修复版",
    bestWay: "修复版 Blu-ray / 正版流媒体高清版本",
    idealScene: "安静夜晚，独自观看或双人慢看",
    notFor: "期待强剧情推进或明确情节答案的观众",
    viewingPaths: [
      { platform: "Criterion / 发行厂牌信息", type: "实体发行", note: "关注修复版与套装信息" },
      { platform: "MUBI / 艺术电影平台", type: "订阅", note: "地区片库以平台为准" },
      { platform: "豆瓣 / IMDb", type: "资料来源", note: "用于交叉查看资料与评价" },
    ],
    versionSignals: [
      { label: "修复版", value: "优先关注", verdict: "强推荐" },
      { label: "4K", value: "以发行版本为准", verdict: "推荐" },
      { label: "Blu-ray", value: "适合收藏", verdict: "推荐" },
      { label: "手机观看", value: "可看但不理想", verdict: "够用" },
    ],
    deviceAdvice: ["色彩准确的屏幕更重要", "音量不必大但要安静", "适合夜晚", "适合修复版对比"],
    related: ["重庆森林", "一代宗师", "2046"],
  },
];

export const collections: Collection[] = [
  {
    slug: "oled-night-watchlist",
    title: "适合 OLED 电视的夜晚片单",
    kicker: "黑位、霓虹与暗部细节",
    description: "选择暗部层次丰富、色彩控制强、适合关灯观看的影片。",
    movies: ["银翼杀手 2049", "沙丘 2"],
  },
  {
    slug: "restored-cinema",
    title: "值得关注修复版的电影",
    kicker: "不是更清楚，而是更接近原貌",
    description: "关注胶片质感、色彩校准和发行厂牌，让经典电影重新获得观看价值。",
    movies: ["花样年华"],
  },
  {
    slug: "sound-system-tests",
    title: "适合测试音响系统的电影",
    kicker: "低频、空间与动态范围",
    description: "用真正有声音设计的影片判断设备，而不是只听爆炸声。",
    movies: ["沙丘 2", "银翼杀手 2049"],
  },
];

export const knowledgeEntries: KnowledgeEntry[] = [
  {
    slug: "what-is-hdr",
    term: "HDR",
    summary: "HDR 重点不是更亮，而是让亮部、暗部和色彩层次同时保留更多信息。",
    misconception: "不是所有标着 HDR 的版本都一定更好，片源、平台码率和显示设备同样重要。",
  },
  {
    slug: "bluray-vs-webdl",
    term: "BluRay vs WEB-DL",
    summary: "BluRay 通常来自实体发行，WEB-DL 通常来自流媒体源；二者差异主要体现在码率、压缩和音轨。",
    misconception: "分辨率相同不代表观感相同，压缩质量往往比数字更关键。",
  },
  {
    slug: "what-is-remux",
    term: "REMUX",
    summary: "REMUX 通常指保留原盘主要视频和音频流、重新封装后的版本，适合追求高规格片库的用户理解。",
    misconception: "REMUX 不是所有人都需要；如果设备、存储和播放链路不匹配，收益会很有限。",
  },
];

export const movies = defaultMovies;

export function getDefaultMovie(slug: string) {
  return defaultMovies.find((movie) => movie.slug === slug);
}

export function getMovie(slug: string) {
  return getDefaultMovie(slug);
}
