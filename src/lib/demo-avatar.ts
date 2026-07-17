export type DemoAvatarGender = 'male' | 'female'

const BG = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf'

/** 短发为主，偏男性观感 */
const MALE_TOP = [
  'shortHairShortFlat',
  'shortHairTheCaesar',
  'shortHairShortRound',
  'shortHairShortWaved',
  'shortHairDreads01',
  'shortHairSides',
  'shortHairTheCaesarSidePart',
].join(',')

/** 长发为主，偏女性观感 */
const FEMALE_TOP = [
  'longHairBob',
  'longHairStraight',
  'longHairStraight2',
  'longHairCurly',
  'longHairNotTooLong',
  'longHairMiaWallace',
  'longHairBigHair',
  'longHairBun',
].join(',')

/**
 * 用姓名生成稳定头像。
 * DiceBear 无 gender 开关，用发型 + 胡须概率区分观感。
 */
export function getDemoAvatarUrl(
  seed: string,
  gender: DemoAvatarGender = 'male',
  options?: { mature?: boolean },
): string {
  const params = new URLSearchParams({
    seed,
    backgroundColor: BG,
  })

  if (gender === 'female') {
    params.set('top', FEMALE_TOP)
    params.set('facialHairProbability', '0')
  } else {
    params.set('top', MALE_TOP)
    params.set('facialHairProbability', options?.mature ? '70' : '20')
  }

  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`
}

/** 示例联系人姓名 → 性别（用于补种旧数据） */
const SAMPLE_NAME_GENDER: Record<string, DemoAvatarGender> = {
  王德福: 'male',
  赵桂英: 'female',
  王建国: 'male',
  李秀兰: 'female',
  王浩然: 'male',
  王雅琴: 'female',
  林晓萱: 'female',
  张明: 'male',
  李雨桐: 'female',
  陈思远: 'male',
  刘佳宁: 'female',
  赵晓峰: 'male',
  周曼婷: 'female',
  孙宇航: 'male',
  吴思琪: 'female',
  郑博文: 'male',
  'Emily Chen': 'female',
  'Kenji Sato': 'male',
  'Sophie Martin': 'female',
}

const MATURE_MALE_NAMES = new Set(['王德福', '王建国'])

export function getSampleContactAvatar(name: string): string {
  const gender = SAMPLE_NAME_GENDER[name] ?? 'male'
  return getDemoAvatarUrl(name, gender, {
    mature: MATURE_MALE_NAMES.has(name),
  })
}

export function inferSampleGender(name: string): DemoAvatarGender | null {
  return SAMPLE_NAME_GENDER[name] ?? null
}
