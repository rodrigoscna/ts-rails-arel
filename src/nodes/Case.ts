import Else from './Else'
import NodeExpression from './NodeExpression'
import When from './When'
import buildQuoted from './buildQuoted'

import type AliasPredication from '../mixins/AliasPredication'

class Case extends NodeExpression {
  public case: any

  public conditions: When[] = []

  public default: any

  constructor(expression: any = null, defaultVal: any = null) {
    super()

    this.default = defaultVal
    this.case = expression
  }

  else(expression: any): Case {
    this.default = new Else(buildQuoted(expression))

    return this
  }

  then(expression: any): Case {
    this.conditions[this.conditions.length - 1].right = buildQuoted(expression)

    return this
  }

  when(condition: any, expression: any = null): Case {
    this.conditions.push(new When(buildQuoted(condition), expression))

    return this
  }
}

interface Case extends AliasPredication {}

export default Case
