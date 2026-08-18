import { describe, expect, it } from 'vitest'
import { getNameIndexLetter } from './name-index'

describe('getNameIndexLetter', () => {
  it('maps latin and digits', () => {
    expect(getNameIndexLetter('Alice')).toBe('A')
    expect(getNameIndexLetter('bob')).toBe('B')
    expect(getNameIndexLetter('123')).toBe('#')
  })

  it('maps common Chinese surnames', () => {
    expect(getNameIndexLetter('张三')).toBe('Z')
    expect(getNameIndexLetter('李四')).toBe('L')
    expect(getNameIndexLetter('王五')).toBe('W')
    expect(getNameIndexLetter('欧阳锋')).toBe('O')
    expect(getNameIndexLetter('曾小贤')).toBe('Z')
  })
})
