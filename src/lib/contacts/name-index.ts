/** 通讯录字母索引：不依赖 pinyin-pro 词典，控制包体积 */

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/**
 * 常见姓氏 → 首字母（覆盖绝大多数中文姓名场景）
 * 多音字按最常见姓氏读音（如「曾」Z、「仇」Q）
 */
const SURNAME_INITIAL: Record<string, string> = {
  阿: 'A', 艾: 'A', 安: 'A', 敖: 'A',
  白: 'B', 包: 'B', 鲍: 'B', 贝: 'B', 毕: 'B', 边: 'B', 卞: 'B', 卜: 'B',
  蔡: 'C', 曹: 'C', 岑: 'C', 柴: 'C', 昌: 'C', 常: 'C', 车: 'C', 陈: 'C', 成: 'C', 程: 'C', 池: 'C', 充: 'C', 仇: 'Q', 楚: 'C', 储: 'C', 褚: 'C', 崔: 'C',
  戴: 'D', 单: 'S', 党: 'D', 邓: 'D', 狄: 'D', 刁: 'D', 丁: 'D', 董: 'D', 窦: 'D', 杜: 'D', 端: 'D', 段: 'D',
  鄂: 'E',
  樊: 'F', 范: 'F', 方: 'F', 房: 'F', 费: 'F', 丰: 'F', 封: 'F', 冯: 'F', 凤: 'F', 扶: 'F', 符: 'F', 傅: 'F', 富: 'F',
  甘: 'G', 高: 'G', 戈: 'G', 葛: 'G', 耿: 'G', 龚: 'G', 巩: 'G', 宫: 'G', 勾: 'G', 苟: 'G', 古: 'G', 谷: 'G', 顾: 'G', 关: 'G', 管: 'G', 桂: 'G', 郭: 'G',
  哈: 'H', 海: 'H', 韩: 'H', 杭: 'H', 郝: 'H', 何: 'H', 贺: 'H', 衡: 'H', 弘: 'H', 洪: 'H', 侯: 'H', 后: 'H', 胡: 'H', 花: 'H', 华: 'H', 怀: 'H', 桓: 'H', 黄: 'H', 惠: 'H', 霍: 'H',
  嵇: 'J', 吉: 'J', 纪: 'J', 季: 'J', 贾: 'J', 简: 'J', 江: 'J', 姜: 'J', 蒋: 'J', 焦: 'J', 金: 'J', 靳: 'J', 荆: 'J', 井: 'J', 景: 'J', 鞠: 'J', 居: 'J',
  阚: 'K', 康: 'K', 柯: 'K', 空: 'K', 孔: 'K', 寇: 'K', 匡: 'K', 奎: 'K', 坤: 'K',
  赖: 'L', 兰: 'L', 郎: 'L', 劳: 'L', 乐: 'Y', 雷: 'L', 冷: 'L', 黎: 'L', 李: 'L', 里: 'L', 理: 'L', 连: 'L', 廉: 'L', 梁: 'L', 廖: 'L', 林: 'L', 蔺: 'L', 凌: 'L', 刘: 'L', 柳: 'L', 龙: 'L', 隆: 'L', 娄: 'L', 卢: 'L', 鲁: 'L', 陆: 'L', 路: 'L', 吕: 'L', 栾: 'L', 罗: 'L', 洛: 'L',
  马: 'M', 买: 'M', 满: 'M', 毛: 'M', 梅: 'M', 孟: 'M', 米: 'M', 苗: 'M', 明: 'M', 莫: 'M', 牟: 'M', 穆: 'M',
  那: 'N', 南: 'N', 倪: 'N', 年: 'N', 聂: 'N', 宁: 'N', 牛: 'N', 农: 'N',
  欧: 'O', 欧阳: 'O',
  潘: 'P', 庞: 'P', 裴: 'P', 彭: 'P', 皮: 'P', 平: 'P', 蒲: 'P', 浦: 'P',
  戚: 'Q', 齐: 'Q', 祁: 'Q', 钱: 'Q', 强: 'Q', 乔: 'Q', 秦: 'Q', 邱: 'Q', 裘: 'Q', 屈: 'Q', 瞿: 'Q', 全: 'Q',
  冉: 'R', 饶: 'R', 任: 'R', 荣: 'R', 容: 'R', 戎: 'R', 茹: 'R', 阮: 'R',
  萨: 'S', 赛: 'S', 桑: 'S', 沙: 'S', 山: 'S', 陕: 'S', 商: 'S', 邵: 'S', 佘: 'S', 申: 'S', 沈: 'S', 盛: 'S', 师: 'S', 施: 'S', 石: 'S', 时: 'S', 史: 'S', 寿: 'S', 舒: 'S', 束: 'S', 双: 'S', 水: 'S', 司: 'S', 宋: 'S', 苏: 'S', 孙: 'S',
  邰: 'T', 谈: 'T', 谭: 'T', 汤: 'T', 唐: 'T', 陶: 'T', 滕: 'T', 田: 'T', 童: 'T', 涂: 'T',
  万: 'W', 汪: 'W', 王: 'W', 危: 'W', 韦: 'W', 卫: 'W', 魏: 'W', 温: 'W', 文: 'W', 闻: 'W', 翁: 'W', 沃: 'W', 乌: 'W', 邬: 'W', 吴: 'W', 伍: 'W', 武: 'W',
  奚: 'X', 习: 'X', 席: 'X', 夏: 'X', 仙: 'X', 咸: 'X', 相: 'X', 向: 'X', 项: 'X', 肖: 'X', 萧: 'X', 谢: 'X', 辛: 'X', 邢: 'X', 幸: 'X', 熊: 'X', 徐: 'X', 许: 'X', 宣: 'X', 薛: 'X',
  严: 'Y', 言: 'Y', 阎: 'Y', 颜: 'Y', 晏: 'Y', 燕: 'Y', 杨: 'Y', 阳: 'Y', 姚: 'Y', 叶: 'Y', 伊: 'Y', 易: 'Y', 殷: 'Y', 尹: 'Y', 印: 'Y', 应: 'Y', 英: 'Y', 雍: 'Y', 尤: 'Y', 游: 'Y', 于: 'Y', 余: 'Y', 俞: 'Y', 虞: 'Y', 禹: 'Y', 郁: 'Y', 喻: 'Y', 元: 'Y', 袁: 'Y', 岳: 'Y', 云: 'Y',
  宰: 'Z', 臧: 'Z', 曾: 'Z', 翟: 'Z', 詹: 'Z', 张: 'Z', 章: 'Z', 长: 'Z', 赵: 'Z', 甄: 'Z', 郑: 'Z', 支: 'Z', 钟: 'Z', 仲: 'Z', 周: 'Z', 朱: 'Z', 诸: 'Z', 祝: 'Z', 庄: 'Z', 卓: 'Z', 宗: 'Z', 邹: 'Z', 祖: 'Z', 左: 'Z',
}

/** 拼音序边界字（用于 localeCompare 回退估算） */
const PINYIN_EDGES = '阿八嚓咑鹅发旮铪讥咔垃妈拿哦妑七呥仨他挖夕丫匝'
const PINYIN_LETTERS = 'ABCDEFGHJKLMNOPQRSTWXYZ'

function supportsPinyinCollation(): boolean {
  try {
    // 拼音排序下「八」应接近 B，「张」接近 Z；若与默认排序结果相同则可能不支持
    const a = '八'.localeCompare('张', 'zh-CN-u-co-pinyin')
    const b = '八'.localeCompare('张', 'zh')
    return a !== 0 && a !== b
  } catch {
    return false
  }
}

const HAS_PINYIN_COLLATION = supportsPinyinCollation()

function hanInitialByCollation(char: string): string | null {
  if (!HAS_PINYIN_COLLATION) return null
  try {
    for (let i = PINYIN_EDGES.length - 1; i >= 0; i--) {
      if (char.localeCompare(PINYIN_EDGES[i], 'zh-CN-u-co-pinyin') >= 0) {
        return PINYIN_LETTERS[i]
      }
    }
    return 'A'
  } catch {
    return null
  }
}

export function getNameIndexLetter(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '#'

  // 复姓优先
  if (trimmed.length >= 2) {
    const compound = trimmed.slice(0, 2)
    const compoundLetter = SURNAME_INITIAL[compound]
    if (compoundLetter) return compoundLetter
  }

  const first = trimmed[0]
  if (/[A-Za-z]/.test(first)) return first.toUpperCase()
  if (/[0-9]/.test(first)) return '#'

  const fromSurname = SURNAME_INITIAL[first]
  if (fromSurname) return fromSurname

  if (/[\u3400-\u9fff]/.test(first)) {
    return hanInitialByCollation(first) ?? '#'
  }

  return '#'
}

export function getIndexLetters(available: Set<string>): string[] {
  const letters = LETTERS.filter((letter) => available.has(letter))
  if (available.has('#')) {
    letters.push('#')
  }
  return letters
}
