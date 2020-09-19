import '../helper.js'

import False from '../../src/nodes/False.js'
import Node from '../../src/nodes/Node.js'

describe('False', () => {
  describe('equality', () => {
    test('equality with same ivars', () => {
      const array = [new False(), new False()]

      expect(array[1]).toStrictEqual(array[0])
    })

    test('inequality with different ivars', () => {
      const array = [new False(), new Node()]

      expect(array[1]).not.toStrictEqual(array[0])
    })
  })
})
