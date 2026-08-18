import type { Contact } from '../types/contact'
import { createEmptyContact } from '../types/contact'
import {
  createKinship,
  normalizeSpousePair,
  type Kinship,
  type ParentRole,
} from '../types/kinship'
import { getDemoAvatarUrl, getSampleContactAvatar } from '../lib/demo/demo-avatar'

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
    tags: ['示例', '族谱'],
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
  const domestic = [
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
  ]

  return [...family, ...domestic, ...createSampleGlobalContacts()]
}

/** 海外示例：现居地覆盖各大洲，便于地图全球视角演示 */
export function createSampleGlobalContacts(): Contact[] {
  const g = (
    id: string,
    name: string,
    extra: Omit<Partial<Contact>, 'name' | 'avatar' | 'id'> & { tags?: string[] },
  ) =>
    person(name, {
      id: `sample-global-${id}`,
      tags: [...new Set(['示例', '海外', ...(extra.tags ?? [])])],
      ...extra,
    })

  return [
    // 北美
    g('emily-chen', 'Emily Chen', {
      phones: ['+1-415-555-0101'],
      emails: ['emily.chen@example.com'],
      company: 'Stripe',
      title: 'Product Designer',
      tags: ['同学'],
      notes: '本科同学，现居旧金山湾区',
      hometown: locIntl('Taipei', 'Taiwan', 25.033, 121.5654),
      birthplace: locIntl('Taipei', 'Taiwan', 25.033, 121.5654),
      currentLocation: locIntl('San Francisco', 'United States', 37.7749, -122.4194, 'California'),
    }),
    g('marcus-johnson', 'Marcus Johnson', {
      phones: ['+1-212-555-0142'],
      emails: ['marcus.j@example.com'],
      company: 'Bloomberg',
      title: 'Data Engineer',
      tags: ['同事'],
      hometown: locIntl('Chicago', 'United States', 41.8781, -87.6298, 'Illinois'),
      currentLocation: locIntl('New York', 'United States', 40.7128, -74.006, 'New York'),
    }),
    g('sofia-ramirez', 'Sofía Ramírez', {
      phones: ['+1-416-555-0198'],
      company: 'Shopify',
      title: 'UX Researcher',
      tags: ['朋友'],
      hometown: locIntl('Mexico City', 'Mexico', 19.4326, -99.1332),
      currentLocation: locIntl('Toronto', 'Canada', 43.6532, -79.3832, 'Ontario'),
    }),

    // 南美
    g('lucas-oliveira', 'Lucas Oliveira', {
      phones: ['+55-11-95555-0103'],
      company: 'Nubank',
      title: 'Mobile Engineer',
      tags: ['同事'],
      hometown: locIntl('Belo Horizonte', 'Brazil', -19.9167, -43.9345),
      currentLocation: locIntl('São Paulo', 'Brazil', -23.5505, -46.6333),
    }),
    g('camila-rossi', 'Camila Rossi', {
      phones: ['+54-11-5555-0188'],
      company: 'Mercado Libre',
      title: 'Product Manager',
      tags: ['朋友'],
      hometown: locIntl('Córdoba', 'Argentina', -31.4201, -64.1888),
      currentLocation: locIntl('Buenos Aires', 'Argentina', -34.6037, -58.3816),
    }),

    // 欧洲
    g('sophie-martin', 'Sophie Martin', {
      phones: ['+33-6-12-34-56-78'],
      company: 'Spotify',
      tags: ['朋友'],
      hometown: locIntl('Lyon', 'France', 45.764, 4.8357),
      currentLocation: locIntl('London', 'United Kingdom', 51.5074, -0.1278),
    }),
    g('lars-bergstrom', 'Lars Bergström', {
      phones: ['+46-70-555-0121'],
      company: 'Spotify',
      title: 'Backend Engineer',
      tags: ['同事'],
      hometown: locIntl('Gothenburg', 'Sweden', 57.7089, 11.9746),
      currentLocation: locIntl('Stockholm', 'Sweden', 59.3293, 18.0686),
    }),
    g('anna-mueller', 'Anna Müller', {
      phones: ['+49-30-555-0177'],
      company: 'SAP',
      title: 'Solutions Consultant',
      tags: ['同学'],
      hometown: locIntl('Munich', 'Germany', 48.1351, 11.582),
      currentLocation: locIntl('Berlin', 'Germany', 52.52, 13.405),
    }),
    g('diego-fernandez', 'Diego Fernández', {
      phones: ['+34-91-555-0133'],
      company: 'Cabify',
      title: 'Growth Lead',
      tags: ['朋友'],
      hometown: locIntl('Valencia', 'Spain', 39.4699, -0.3763),
      currentLocation: locIntl('Madrid', 'Spain', 40.4168, -3.7038),
    }),
    g('irina-petrova', 'Irina Petrova', {
      phones: ['+7-495-555-0166'],
      company: 'Yandex',
      title: 'ML Engineer',
      tags: ['同事'],
      hometown: locIntl('Saint Petersburg', 'Russia', 59.9311, 30.3609),
      currentLocation: locIntl('Moscow', 'Russia', 55.7558, 37.6173),
    }),

    // 非洲
    g('amara-okafor', 'Amara Okafor', {
      phones: ['+234-801-555-0109'],
      company: 'Flutterwave',
      title: 'Fintech Analyst',
      tags: ['朋友'],
      hometown: locIntl('Enugu', 'Nigeria', 6.5244, 7.5105),
      currentLocation: locIntl('Lagos', 'Nigeria', 6.5244, 3.3792),
    }),
    g('thabo-molefe', 'Thabo Molefe', {
      phones: ['+27-21-555-0144'],
      company: 'Naspers',
      title: 'Security Engineer',
      tags: ['同事'],
      hometown: locIntl('Johannesburg', 'South Africa', -26.2041, 28.0473),
      currentLocation: locIntl('Cape Town', 'South Africa', -33.9249, 18.4241),
    }),
    g('aisha-hassan', 'Aisha Hassan', {
      phones: ['+254-712-555-0155'],
      company: 'Safaricom',
      title: 'Product Designer',
      tags: ['同学'],
      hometown: locIntl('Mombasa', 'Kenya', -4.0435, 39.6682),
      currentLocation: locIntl('Nairobi', 'Kenya', -1.2921, 36.8219),
    }),
    g('youssef-nabil', 'Youssef Nabil', {
      phones: ['+20-100-555-0120'],
      company: 'Careem',
      title: 'iOS Engineer',
      tags: ['朋友'],
      hometown: locIntl('Alexandria', 'Egypt', 31.2001, 29.9187),
      currentLocation: locIntl('Cairo', 'Egypt', 30.0444, 31.2357),
    }),

    // 中东
    g('layla-al-rashid', 'Layla Al-Rashid', {
      phones: ['+971-50-555-0180'],
      company: 'Emirates NBD',
      title: 'Risk Analyst',
      tags: ['同事'],
      hometown: locIntl('Riyadh', 'Saudi Arabia', 24.7136, 46.6753),
      currentLocation: locIntl('Dubai', 'United Arab Emirates', 25.2048, 55.2708),
    }),
    g('noa-cohen', 'Noa Cohen', {
      phones: ['+972-50-555-0112'],
      company: 'Wix',
      title: 'Frontend Engineer',
      tags: ['朋友'],
      hometown: locIntl('Haifa', 'Israel', 32.794, 34.9896),
      currentLocation: locIntl('Tel Aviv', 'Israel', 32.0853, 34.7818),
    }),

    // 南亚 / 东南亚
    g('arjun-mehta', 'Arjun Mehta', {
      phones: ['+91-98765-55011'],
      company: 'Flipkart',
      title: 'Staff Engineer',
      tags: ['同事'],
      hometown: locIntl('Pune', 'India', 18.5204, 73.8567),
      currentLocation: locIntl('Bengaluru', 'India', 12.9716, 77.5946),
    }),
    g('priya-sharma', 'Priya Sharma', {
      phones: ['+91-98200-55022'],
      company: 'Razorpay',
      title: 'Product Manager',
      tags: ['同学'],
      hometown: locIntl('Jaipur', 'India', 26.9124, 75.7873),
      currentLocation: locIntl('Mumbai', 'India', 19.076, 72.8777),
    }),
    g('wei-ling-tan', 'Wei Ling Tan', {
      phones: ['+65-9123-5501'],
      company: 'Grab',
      title: 'Data Scientist',
      tags: ['朋友'],
      hometown: locIntl('Penang', 'Malaysia', 5.4141, 100.3288),
      currentLocation: locIntl('Singapore', 'Singapore', 1.3521, 103.8198),
    }),
    g('siriwan-chay', 'Siriwan Chaiyawan', {
      phones: ['+66-81-555-0134'],
      company: 'LINE MAN',
      title: 'Marketing Lead',
      tags: ['朋友'],
      hometown: locIntl('Chiang Mai', 'Thailand', 18.7883, 98.9853),
      currentLocation: locIntl('Bangkok', 'Thailand', 13.7563, 100.5018),
    }),
    g('budi-santoso', 'Budi Santoso', {
      phones: ['+62-812-555-0167'],
      company: 'Gojek',
      title: 'Android Engineer',
      tags: ['同事'],
      hometown: locIntl('Surabaya', 'Indonesia', -7.2575, 112.7521),
      currentLocation: locIntl('Jakarta', 'Indonesia', -6.2088, 106.8456),
    }),

    // 东亚
    g('kenji-sato', 'Kenji Sato', {
      phones: ['+81-90-1234-5678'],
      emails: ['kenji.sato@example.com'],
      company: 'Mercari',
      title: 'Software Engineer',
      tags: ['同事'],
      hometown: locIntl('Osaka', 'Japan', 34.6937, 135.5023),
      birthplace: locIntl('Osaka', 'Japan', 34.6937, 135.5023),
      currentLocation: locIntl('Tokyo', 'Japan', 35.6762, 139.6503),
    }),
    g('min-ji-park', 'Min-ji Park', {
      phones: ['+82-10-5555-0190'],
      company: 'Naver',
      title: 'Content Strategist',
      tags: ['同学'],
      hometown: locIntl('Busan', 'South Korea', 35.1796, 129.0756),
      currentLocation: locIntl('Seoul', 'South Korea', 37.5665, 126.978),
    }),
    g('ching-wan-ho', 'Ching Wan Ho', {
      phones: ['+852-9123-5508'],
      company: 'Cathay Pacific',
      title: 'Ops Analyst',
      tags: ['朋友'],
      hometown: locIntl('Macau', 'Macao', 22.1987, 113.5439),
      currentLocation: locIntl('Hong Kong', 'Hong Kong', 22.3193, 114.1694),
    }),

    // 大洋洲
    g('oliver-bennett', 'Oliver Bennett', {
      phones: ['+61-412-555-015'],
      company: 'Atlassian',
      title: 'Platform Engineer',
      tags: ['同事'],
      hometown: locIntl('Melbourne', 'Australia', -37.8136, 144.9631),
      currentLocation: locIntl('Sydney', 'Australia', -33.8688, 151.2093),
    }),
    g('maia-ngata', 'Maia Ngata', {
      phones: ['+64-21-555-017'],
      company: 'Xero',
      title: 'Customer Success',
      tags: ['朋友'],
      hometown: locIntl('Christchurch', 'New Zealand', -43.5321, 172.6362),
      currentLocation: locIntl('Auckland', 'New Zealand', -36.8509, 174.7645),
    }),
  ]
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
