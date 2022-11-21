import '../helper'

import Node from '../../src/nodes/Node'
import True from '../../src/nodes/True'

describe('True', () => {
  describe('equality', () => {
    test('equality with same ivars', () => {
      const array = [new True(), new True()]

      expect(array[1]).toStrictEqual(array[0])
    })

    test('inequality with different ivars', () => {
      const array = [new True(), new Node()]

      expect(array[1]).not.toStrictEqual(array[0])
    })
  })
})
