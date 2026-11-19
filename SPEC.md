# 系统解剖学学习站 — 构建规范（团队共享）

项目根目录：`C:\Users\zhuiming\Desktop\解剖学习站`
目标用户：护理专业本科生，备战《系统解剖学》期末（名词解释 / 简答 / 填空 / 选择 / 英译汉）。
成品要求：**纯静态站点，双击 index.html 即可用（file:// 直开）**，同时适配手机（底部标签栏、触摸友好、PWA 可离线）。
技术约束：**不要用 ES module、不要 fetch、不要构建工具**。全部 `window.ANAT.*` 全局数据 + 普通 `<script>` 标签。所有图片必须落地到本地 `assets/img/`，不引用外链。

数据来源（已抽取为纯文本，读取它们，不要再去解析 docx/doc）：
- `C:\Users\zhuiming\anatomy-src\docA.txt` —— 最全的分章节题库：英译汉 / 名词解释 / 填空题 / 最佳选择题（带答案）/ 问答题 共 8 章
- `C:\Users\zhuiming\anatomy-src\docB.txt` —— 带★的重点名词解释 + 问答题 + 英译汉
- `C:\Users\zhuiming\anatomy-src\系统解剖学.txt` —— 复习重点（名词解释 + 问答题 + 英译汉 + 神经损伤表）
- `C:\Users\zhuiming\anatomy-src\系解题库（简答题） (1).txt` —— 42 道简答/论述（传导通路类）
- `C:\Users\zhuiming\anatomy-src\系解名词解释.txt` —— 2371–2470 混合条目
- `C:\Users\zhuiming\anatomy-src\系解题库（名词解释） (1).txt` —— 70 条名词解释
- 原始 docx/doc 在 `D:\WeChat\...\F\1..6`（仅核对用，不必再读）

## 章节 id（全站唯一口径，不得新增/改名）

| id | 名称 |
|---|---|
| `intro` | 绪论与总则 |
| `osteo` | 骨学 |
| `arthro` | 关节学 |
| `myo` | 肌学 |
| `digest` | 消化系统 |
| `resp` | 呼吸系统 |
| `urinary` | 泌尿系统 |
| `male` | 男性生殖系统 |
| `female` | 女性生殖系统 |
| `peritoneum` | 腹膜 |
| `cardio` | 心血管系统 |
| `lymph` | 淋巴系统 |
| `sensory` | 感觉器 |
| `nervous` | 神经系统 |
| `endocrine` | 内分泌系统 |

粗章节到细章节的映射：docA「第一章 运动系统」按内容拆到 `osteo/arthro/myo`；「第四章 泌尿及生殖系统」拆到 `urinary/male/female`；「第六章 脉管系统」拆到 `cardio/lymph`；其余一一对应。

## 数据文件（每个文件都是一行 `window.ANAT = window.ANAT || {};` 之后追加一个数组）

### 1. `assets/js/data/terms.js` — 名词解释
```js
window.ANAT = window.ANAT || {};
window.ANAT.terms = [
  { id:"t001", term:"胸骨角", en:"sternal angle", chapter:"osteo",
    def:"胸骨柄与胸骨体的连接处，形成微向前凸的横嵴，可在体表摸到；第2肋恰与胸骨角侧方相连接，故胸骨角是计数肋的重要标志。",
    tags:["骨性标志","计数肋"],
    clozes:["胸骨柄","胸骨体","第2肋","计数肋"] }
];
```
- `def`：把多份资料里同一条目的表述**合并成一句最完整、最准确**的话；来源互相矛盾时以教材通行说法为准，改不动的就保留原句。**不得自行编造解剖学事实**。
- `clozes`：2–5 个可以挖空的关键词（必须是 `def` 中真实出现的连续子串，用于「挖空背诵」）。
- 全部条目按章节排序；`id` 用 `t001` 递增，全局唯一。
- `en` 有就填（来自英译汉表），没有就省略该字段。

### 2. `assets/js/data/qa.js` — 简答/问答
```js
window.ANAT = window.ANAT || {};
window.ANAT.qa = [
  { id:"q001", q:"关节的基本结构和辅助结构有哪些？", chapter:"arthro", star:3,
    a:"关节的基本结构包括关节面、关节囊和关节腔。关节的辅助结构包括韧带、关节盘和关节唇。",
    points:[{k:"关节面",t:"基本结构"},{k:"关节囊",t:"基本结构"},{k:"关节腔",t:"基本结构"},
            {k:"韧带",t:"辅助结构"},{k:"关节盘",t:"辅助结构"},{k:"关节唇",t:"辅助结构"}],
    tags:["高频","★"] }
];
```
- `star`：1–3，优先按 ★/★★ 标注与出现频次给分（多份资料都有的给 3）。
- `points`：3–8 个**采分点关键词** `k`（简短、能在原文中检出）+ 一句说明 `t`（可为空串）。这是「默写自评」和「逐点揭示」的依据，务必准确。
- 同题多份资料重复时只保留一条，答案用最完整版本（可整合）。
- `a` 保留完整答案原文，**不要压缩掉细节**。

### 3. `assets/js/data/mcq.js` — 最佳选择题
```js
window.ANAT = window.ANAT || {};
window.ANAT.mcq = [
  { id:"m001", q:"参与形成肋弓的是", chapter:"arthro",
    opts:["第6~10肋软骨前端","第7~10肋软骨前端","第8~10肋软骨前端","第9~10肋软骨前端","第9~12肋软骨前端"],
    ans:2, exp:"肋弓由第8~10肋软骨前端依次相连而成。" }
];
```
- `opts` 去掉 A./B./C. 前缀，保持原顺序；`ans` 是**正确项下标**（0 起）。
- `exp`：一句解析（≤60 字）。**只有十分确定时才写**，不确定就省略字段（前端会自动隐藏）。
- 五选项题保持五项；若原文只有四项就四项。

### 4. `assets/js/data/fill.js` — 填空题
```js
window.ANAT = window.ANAT || {};
window.ANAT.fill = [
  { id:"f001", chapter:"intro", text:"运动系包括{骨}、{骨骼肌}和{关节}三部分。" }
];
```
- 用 `{答案}` 标记每个空；同一个空允许多种写法时用 `{骨|骨骼}`。
- 题干其余文字保留原样，标点用中文全角。

### 5. `assets/js/data/vocab.js` — 英译汉
```js
window.ANAT = window.ANAT || {};
window.ANAT.vocab = [
  { en:"sternal angle", zh:"胸骨角", chapter:"osteo" }
];
```
- 合并 docA/docB/系统解剖学.txt 三处英译汉表，去重（大小写不敏感），`en` 用小写正体、单词间单空格。
- 原文个别中英错配（如 `Conjunctiva 晶状体` 实为「结膜」）请按解剖学常识修正，并在 `note` 字段写一句说明。

## 质量红线

1. **不许编造**：任何解剖学内容必须能在来源文本中找到依据。来源里的错别字可改（如「愕舌弓」→「腭舌弓」、「键索」→「腱索」、「ji脐周」→「脐周」），但事实不许改。
2. 每条 `id` 唯一；`chapter` 必须是上表 15 个 id 之一。
3. 文件必须是**合法 JavaScript**（不是 JSON），UTF-8 无 BOM。
4. 写完自检：用 node 依次 `require` 各文件后打印数组长度，确认无语法错误、id 无重复、chapter 合法。
   示例：`node -e "global.window={};require('./assets/js/data/terms.js');const a=window.ANAT.terms;console.log(a.length,new Set(a.map(x=>x.id)).size)"`
5. 数量目标（下限）：terms ≥ 85，qa ≥ 55，mcq ≥ 95，fill ≥ 60，vocab ≥ 80。

## 分工与写入范围（互不越界）

- **lead**：`index.html`、`assets/css/app.css`、`assets/js/app.js`、`assets/js/data/core.js`、`assets/js/data/tips.js`、`sw.js`、`manifest.webmanifest`、README
- **data-smith**：`assets/js/data/terms.js|qa.js|mcq.js|fill.js|vocab.js`
- **img-hunter**：`assets/img/**`、`assets/js/data/images.js`
