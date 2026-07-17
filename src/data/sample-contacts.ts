import type { Contact } from '../types/contact'
import { createEmptyContact } from '../types/contact'
import {
  createKinship,
  normalizeSpousePair,
  type Kinship,
  type ParentRole,
} from '../types/kinship'
import { getDemoAvatarUrl, getSampleContactAvatar } from '../lib/demo-avatar'

function loc(
  province: string,
  city: string,
  latitude: number,
  longitude: number,
  district?: string,
  country = '中国',
) {
  return {
    country,
    province,
    city,
    district,
    latitude,
    longitude,
    geocodedAt: Date.now(),
  }
}

function locIntl(
  city: string,
  country: string,
  latitude: number,
  longitude: number,
  province?: string,
) {
  return {
    country,
    province,
    city,
    latitude,
    longitude,
    geocodedAt: Date.now(),
  }
}

function person(
  name: string,
  extra: Omit<Partial<Contact>, 'name' | 'avatar'> & { tags?: string[]; id?: string },
): Contact {
  return createEmptyContact({
    source: '示例数据',
    tags: ['示例'],
    avatar: getSampleContactAvatar(name),
    name,
    ...extra,
  })
}

/** 示例族谱固定 id，便于 kinships 稳定关联 */
export const SAMPLE_FAMILY_IDS = {
  grandfather: 'sample-family-wang-defu',
  grandmother: 'sample-family-zhao-guiying',
  father: 'sample-family-wang-jianguo',
  mother: 'sample-family-li-xiulan',
  son: 'sample-family-wang-haoran',
  daughter: 'sample-family-wang-yaqin',
  sonSpouse: 'sample-family-lin-xiaoxuan',
} as const

type FamilyKey = keyof typeof SAMPLE_FAMILY_IDS

function familyPerson(
  key: FamilyKey,
  name: string,
  extra: Omit<Partial<Contact>, 'name' | 'avatar' | 'id'> & { tags?: string[] },
): Contact {
  return person(name, {
    id: SAMPLE_FAMILY_IDS[key],
    tags: ['示例', '家人'],
    ...extra,
  })
}

/** 示例族谱成员（三代） */
export function createSampleFamilyContacts(): Contact[] {
  return [
    familyPerson('grandfather', '王德福', {
      phones: ['13800002001'],
      title: '退休',
      notes: '爷爷，绵阳老家',
      hometown: loc('四川', '绵阳', 31.4675, 104.6796),
      birthplace: loc('四川', '绵阳', 31.4675, 104.6796),
      currentLocation: loc('四川', '成都', 30.5728, 104.0668, '锦江区'),
    }),
    familyPerson('grandmother', '赵桂英', {
      phones: ['13800002002'],
      notes: '奶奶',
      hometown: loc('四川', '绵阳', 31.4675, 104.6796),
      birthplace: loc('四川', '德阳', 31.127, 104.398),
      currentLocation: loc('四川', '成都', 30.5728, 104.0668, '锦江区'),
    }),
    familyPerson('father', '王建国', {
      phones: ['13800002003'],
      company: '成都铁路局',
      title: '工程师',
      notes: '父亲',
      hometown: loc('四川', '绵阳', 31.4675, 104.6796),
      birthplace: loc('四川', '绵阳', 31.4675, 104.6796),
      currentLocation: loc('四川', '成都', 30.5728, 104.0668, '武侯区'),
    }),
    familyPerson('mother', '李秀兰', {
      phones: ['13800002004'],
      company: '小学教师',
      notes: '母亲',
      // 籍贯与父系不同，便于对照「优先父系」推断
      hometown: loc('重庆', '重庆', 29.563, 106.5516),
      birthplace: loc('重庆', '重庆', 29.563, 106.5516),
      currentLocation: loc('四川', '成都', 30.5728, 104.0668, '武侯区'),
    }),
    familyPerson('son', '王浩然', {
      phones: ['13800001003'],
      company: '自由职业',
      notes: '示例族谱本代；籍贯留空，可演示从父亲推断',
      // 故意不填籍贯，打开详情可见「推断自：王建国」
      birthplace: loc('四川', '绵阳', 31.4675, 104.6796),
      currentLocation: loc('四川', '成都', 30.5728, 104.0668, '武侯区'),
    }),
    familyPerson('daughter', '王雅琴', {
      phones: ['13800002005'],
      emails: ['wangyaqin@example.com'],
      company: '成都某医院',
      title: '护士',
      notes: '妹妹',
      hometown: loc('四川', '绵阳', 31.4675, 104.6796),
      birthplace: loc('四川', '成都', 30.5728, 104.0668),
      currentLocation: loc('四川', '成都', 30.5728, 104.0668, '高新区'),
    }),
    familyPerson('sonSpouse', '林晓萱', {
      phones: ['13800002006'],
      emails: ['linxiaoxuan@example.com'],
      company: '设计工作室',
      title: '设计师',
      notes: '王浩然的配偶',
      hometown: loc('四川', '乐山', 29.5523, 103.7656),
      birthplace: loc('四川', '乐山', 29.5523, 103.7656),
      currentLocation: loc('四川', '成都', 30.5728, 104.0668, '武侯区'),
    }),
  ]
}

/**
 * 根据联系人姓名匹配示例族谱关系。
 * 优先用固定 SAMPLE_FAMILY_IDS；若老数据是同名随机 id，则按姓名解析。
 */
export function createSampleKinships(contacts: Contact[]): Kinship[] {
  const byId = new Map(contacts.map((c) => [c.id, c]))
  const byName = new Map(contacts.map((c) => [c.name, c]))

  const resolve = (key: FamilyKey, name: string): string | undefined => {
    const fixed = SAMPLE_FAMILY_IDS[key]
    if (byId.has(fixed)) return fixed
    return byName.get(name)?.id
  }

  const id = {
    grandfather: resolve('grandfather', '王德福'),
    grandmother: resolve('grandmother', '赵桂英'),
    father: resolve('father', '王建国'),
    mother: resolve('mother', '李秀兰'),
    son: resolve('son', '王浩然'),
    daughter: resolve('daughter', '王雅琴'),
    sonSpouse: resolve('sonSpouse', '林晓萱'),
  }

  const kinships: Kinship[] = []
  const addParent = (childId: string | undefined, parentId: string | undefined, role: ParentRole) => {
    if (!childId || !parentId) return
    kinships.push(
      createKinship({
        id: `sample-kin-parent-${childId}-${parentId}`,
        fromId: childId,
        toId: parentId,
        type: 'parent',
        role,
      }),
    )
  }
  const addSpouse = (a: string | undefined, b: string | undefined) => {
    if (!a || !b) return
    const pair = normalizeSpousePair(a, b)
    kinships.push(
      createKinship({
        id: `sample-kin-spouse-${pair.fromId}-${pair.toId}`,
        fromId: pair.fromId,
        toId: pair.toId,
        type: 'spouse',
      }),
    )
  }

  // 祖辈 ↔ 父辈
  addParent(id.father, id.grandfather, 'father')
  addParent(id.father, id.grandmother, 'mother')
  addSpouse(id.grandfather, id.grandmother)

  // 父辈 ↔ 本代
  addParent(id.son, id.father, 'father')
  addParent(id.son, id.mother, 'mother')
  addParent(id.daughter, id.father, 'father')
  addParent(id.daughter, id.mother, 'mother')
  addSpouse(id.father, id.mother)

  // 本代配偶
  addSpouse(id.son, id.sonSpouse)

  return kinships
}

/** 新用户注册后导入的示例联系人，已预置坐标、头像与族谱成员 */
export function createSampleContacts(): Contact[] {
  const family = createSampleFamilyContacts()
  const others = [
    person('张明', {
      phones: ['13800001001'],
      emails: ['zhangming@example.com'],
      company: '阿里云',
      title: '产品经理',
      tags: ['示例', '同学', '杭州老乡'],
      notes: '大学室友，毕业后去了上海',
      hometown: loc('浙江', '杭州', 30.2741, 120.1551),
      birthplace: loc('浙江', '杭州', 30.2741, 120.1551),
      currentLocation: loc('上海', '上海', 31.2304, 121.4737, '浦东新区'),
    }),
    person('李雨桐', {
      phones: ['13800001002'],
      emails: ['liyutong@example.com'],
      company: '字节跳动',
      title: '前端工程师',
      tags: ['示例', '同事'],
      hometown: loc('北京', '北京', 39.9042, 116.4074, '海淀区'),
      birthplace: loc('北京', '北京', 39.9042, 116.4074),
      currentLocation: loc('北京', '北京', 39.9042, 116.4074, '朝阳区'),
    }),
    person('陈思远', {
      phones: ['13800001004', '021-88886666'],
      emails: ['chensiyuan@example.com'],
      company: '腾讯',
      tags: ['示例', '同学', '广州老乡'],
      hometown: loc('广东', '广州', 23.1291, 113.2644),
      birthplace: loc('广东', '广州', 23.1291, 113.2644),
      currentLocation: loc('广东', '深圳', 22.5431, 114.0579, '南山区'),
    }),
    person('刘佳宁', {
      phones: ['13800001005'],
      emails: ['liujianing@example.com'],
      company: '网易',
      title: '运营总监',
      tags: ['示例', '同事', '杭州老乡'],
      hometown: loc('江苏', '南京', 32.0603, 118.7969),
      birthplace: loc('江苏', '南京', 32.0603, 118.7969),
      currentLocation: loc('浙江', '杭州', 30.2741, 120.1551, '余杭区'),
    }),
    person('赵晓峰', {
      phones: ['13800001006'],
      tags: ['示例', '同学'],
      hometown: loc('湖北', '武汉', 30.5928, 114.3055),
      birthplace: loc('湖北', '武汉', 30.5928, 114.3055),
      currentLocation: loc('湖北', '武汉', 30.5928, 114.3055, '洪山区'),
    }),
    person('周曼婷', {
      phones: ['13800001007'],
      emails: ['zhoumanting@example.com'],
      company: '美团',
      tags: ['示例', '朋友'],
      hometown: loc('陕西', '西安', 34.3416, 108.9398),
      birthplace: loc('陕西', '西安', 34.3416, 108.9398),
      currentLocation: loc('北京', '北京', 39.9042, 116.4074, '海淀区'),
    }),
    person('孙宇航', {
      phones: ['13800001008'],
      tags: ['示例', '同学', '青岛老乡'],
      hometown: loc('山东', '青岛', 36.0671, 120.3826),
      birthplace: loc('山东', '青岛', 36.0671, 120.3826),
      currentLocation: loc('上海', '上海', 31.2304, 121.4737, '徐汇区'),
    }),
    person('吴思琪', {
      phones: ['13800001009'],
      emails: ['wusiqi@example.com'],
      company: '华为',
      title: '解决方案架构师',
      tags: ['示例', '同事'],
      hometown: loc('湖南', '长沙', 28.2282, 112.9388),
      birthplace: loc('湖南', '长沙', 28.2282, 112.9388),
      currentLocation: loc('广东', '深圳', 22.5431, 114.0579, '龙岗区'),
    }),
    person('郑博文', {
      phones: ['13800001010'],
      tags: ['示例', '朋友', '西安老乡'],
      notes: '高中同学，在厦门读书',
      hometown: loc('陕西', '西安', 34.3416, 108.9398),
      birthplace: loc('陕西', '西安', 34.3416, 108.9398),
      currentLocation: loc('福建', '厦门', 24.4798, 118.0894, '思明区'),
    }),
    person('Emily Chen', {
      phones: ['+1-415-555-0101'],
      emails: ['emily.chen@example.com'],
      company: 'Stripe',
      title: 'Product Designer',
      tags: ['示例', '海外', '同学'],
      notes: '本科同学，现居旧金山',
      hometown: locIntl('Taipei', 'Taiwan', 25.033, 121.5654),
      birthplace: locIntl('Taipei', 'Taiwan', 25.033, 121.5654),
      currentLocation: locIntl('San Francisco', 'United States', 37.7749, -122.4194, 'California'),
    }),
    person('Kenji Sato', {
      phones: ['+81-90-1234-5678'],
      emails: ['kenji.sato@example.com'],
      company: 'Mercari',
      title: 'Software Engineer',
      tags: ['示例', '海外', '同事'],
      hometown: locIntl('Osaka', 'Japan', 34.6937, 135.5023),
      birthplace: locIntl('Osaka', 'Japan', 34.6937, 135.5023),
      currentLocation: locIntl('Tokyo', 'Japan', 35.6762, 139.6503),
    }),
    person('Sophie Martin', {
      phones: ['+33-6-12-34-56-78'],
      company: 'Spotify',
      tags: ['示例', '海外', '朋友'],
      hometown: locIntl('Lyon', 'France', 45.764, 4.8357),
      currentLocation: locIntl('London', 'United Kingdom', 51.5074, -0.1278),
    }),
  ]

  return [...family, ...others]
}

export const SAMPLE_PROFILE = {
  bio: 'GeoContacts 新用户，正在探索人脉地图',
  hometown: loc('浙江', '杭州', 30.2741, 120.1551),
  birthplace: loc('浙江', '温州', 28.0006, 120.6721),
  currentLocation: loc('浙江', '杭州', 30.2741, 120.1551, '西湖区'),
}

export function getSampleProfileAvatar(displayName: string): string {
  return getDemoAvatarUrl(displayName || 'GeoContacts', 'male')
}
