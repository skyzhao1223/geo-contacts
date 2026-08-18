import { describe, expect, it } from 'vitest'
import { sortTagsForDisplay, SYSTEM_FAMILY_TAG, uniqueTags } from './system-tags'

describe('system-tags helpers', () => {
  it('dedupes and trims tags', () => {
    expect(uniqueTags([' 族谱 ', '朋友', '朋友', ''])).toEqual(['族谱', '朋友'])
  })

  it('sorts system family tag to the front', () => {
    expect(sortTagsForDisplay(['同事', SYSTEM_FAMILY_TAG, '朋友'])[0]).toBe(SYSTEM_FAMILY_TAG)
  })
})
