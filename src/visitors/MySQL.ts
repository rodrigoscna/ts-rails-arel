import Limit from '../nodes/Limit'
import SQLLiteral from '../nodes/SQLLiteral'
import Union from '../nodes/Union'

import ToSQL from './ToSQL'
import {
  AND,
  BINARY,
  COMMA,
  CONCAT,
  DUAL,
  ORDER_BY,
  SET,
  SPACE,
  UNION,
  UPDATE,
  WHERE,
} from './constants'

import type Collector from '../collectors/Collector'

import type Bin from '../nodes/Bin'
import type Concat from '../nodes/Concat'
import type SelectCore from '../nodes/SelectCore'
import type SelectStatement from '../nodes/SelectStatement'
import type UpdateStatement from '../nodes/UpdateStatement'

export default class MySQL extends ToSQL {
  protected visitBin(thing: Bin, col: Collector): Collector {
    let collector = col

    collector.append(BINARY)

    collector = this.visit(thing.expr, collector)

    return collector
  }

  protected visitConcat(thing: Concat, col: Collector): Collector {
    let collector = col

    collector.append(CONCAT)
    collector.append('(')

    collector = this.visit(thing.left, collector)
    collector.append(COMMA)
    collector = this.visit(thing.right, collector)

    collector.append(')')
    collector.append(SPACE)

    return collector
  }

  protected visitSelectCore(thing: SelectCore, col: Collector): Collector {
    if (!thing.from) {
      // eslint-disable-next-line no-param-reassign
      thing.from = new SQLLiteral(DUAL)
    }

    return super.visitSelectCore(thing, col)
  }

  protected visitSelectStatement(
    thing: SelectStatement,
    col: Collector,
  ): Collector {
    if (thing.offset && !thing.limit) {
      /**
       * https://dev.mysql.com/doc/refman/8.0/en/select.html
       * To retrieve all rows from a certain offset up to the end of the result
       * set, you can use some large number for the second parameter.
       */
      // eslint-disable-next-line no-param-reassign
      thing.limit = new Limit(new SQLLiteral('18446744073709551615'))
    }

    return super.visitSelectStatement(thing, col)
  }

  protected visitUnion(
    thing: Union,
    col: Collector,
    suppressParens = false,
  ): Collector {
    let collector = col

    if (!suppressParens) {
      collector.append('(')
      collector.append(SPACE)
    }

    if (thing.left instanceof Union) {
      collector = this.visitUnion(thing.left, collector, true)
    } else {
      collector = this.visit(thing.left, collector)
    }

    collector.append(UNION)

    if (thing.right instanceof Union) {
      collector = this.visitUnion(thing.right, collector, true)
    } else {
      collector = this.visit(thing.right, collector)
    }

    if (!suppressParens) {
      collector.append(SPACE)
      collector.append(')')
    }

    return collector
  }

  protected visitUpdateStatement(
    thing: UpdateStatement,
    col: Collector,
  ): Collector {
    let collector = col

    collector.append(UPDATE)

    collector = this.visit(thing.relation, collector)

    if (thing.values.length > 0) {
      collector.append(SET)
      collector = this.injectJoin(thing.values, collector, COMMA)
    }

    if (thing.wheres.length > 0) {
      collector.append(WHERE)
      collector = this.injectJoin(thing.wheres, collector, AND)
    }

    if (thing.orders.length > 0) {
      collector.append(SPACE)
      collector.append(ORDER_BY)
      collector.append(SPACE)
      collector = this.injectJoin(thing.orders, collector, COMMA)
    }

    collector = this.maybeVisit(thing.limit, collector)

    return collector
  }
}
