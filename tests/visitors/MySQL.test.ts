import '../helper.js'

import SQLString from '../../src/collectors/SQLString.js'

import SelectManager from '../../src/managers/SelectManager.js'
import UpdateManager from '../../src/managers/UpdateManager.js'

import Assignment from '../../src/nodes/Assignment.js'
import IsDistinctFrom from '../../src/nodes/IsDistinctFrom.js'
import IsNotDistinctFrom from '../../src/nodes/IsNotDistinctFrom.js'
import Limit from '../../src/nodes/Limit.js'
import Lock from '../../src/nodes/Lock.js'
import Offset from '../../src/nodes/Offset.js'
import SQLLiteral from '../../src/nodes/SQLLiteral.js'
import SelectStatement from '../../src/nodes/SelectStatement.js'
import Union from '../../src/nodes/Union.js'
import UnqualifiedColumn from '../../src/nodes/UnqualifiedColumn.js'
import UpdateStatement from '../../src/nodes/UpdateStatement.js'
import buildQuoted from '../../src/nodes/buildQuoted.js'

import MySQL from '../../src/visitors/MySQL.js'
import Visitable from '../../src/visitors/Visitable.js'
import Visitor from '../../src/visitors/Visitor.js'

import SequelAST from '../../src/SequelAST.js'
import Table from '../../src/Table.js'

const scope: { visitor: Visitor } = {
  visitor: new (class extends Visitor {})(),
}

function compile(node: Visitable): string {
  return scope.visitor.accept(node, new SQLString()).value
}

describe('MySQL Visitor', () => {
  beforeEach(() => {
    if (SequelAST.engine) {
      scope.visitor = new MySQL(SequelAST.engine.connection)
    }
  })

  test('squashes parenthesis on multiple unions', () => {
    const subnode1 = new Union(new SQLLiteral('left'), new SQLLiteral('right'))
    const node1 = new Union(subnode1, new SQLLiteral('topright'))

    expect(compile(node1).match(/\(/g)).toHaveLength(1)

    const subnode2 = new Union(new SQLLiteral('left'), new SQLLiteral('right'))
    const node2 = new Union(new SQLLiteral('topleft'), subnode2)

    expect(compile(node2).match(/\(/g)).toHaveLength(1)
  })

  test('defaults limit to 18446744073709551615', () => {
    const stmt = new SelectStatement()
    stmt.offset = new Offset(1)

    expect(compile(stmt)).toStrictEqual(
      `SELECT FROM DUAL LIMIT 18446744073709551615 OFFSET 1`,
    )
  })

  test('should escape limit', () => {
    const stmt = new UpdateStatement()
    stmt.relation = new Table('users')
    stmt.limit = new Limit(buildQuoted('omg'))

    expect(compile(stmt)).toStrictEqual(`UPDATE "users" LIMIT 'omg'`)
  })

  test('uses DUAL for empty from', () => {
    const stmt = new SelectStatement()

    expect(compile(stmt)).toStrictEqual(`SELECT FROM DUAL`)
  })

  test('should visit Assignment', () => {
    const table = new Table('users')

    const column = table.get('id')

    const node = new Assignment(
      new UnqualifiedColumn(column),
      new UnqualifiedColumn(column),
    )

    expect(compile(node)).toStrictEqual(`"users"."id" = "users"."id"`)
  })

  describe('locking', () => {
    test('defaults to FOR UPDATE when locking', () => {
      const node = new Lock(new SQLLiteral('FOR UPDATE'))

      expect(compile(node)).toStrictEqual(`FOR UPDATE`)
    })

    test('allows a custom string to be used as a lock', () => {
      const node = new Lock(new SQLLiteral('LOCK IN SHARE MODE'))

      expect(compile(node)).toStrictEqual(`LOCK IN SHARE MODE`)
    })
  })

  describe('concat', () => {
    test('concats columns', () => {
      const table = new Table('users')

      const query = table.get('name').concat(table.get('name'))

      expect(compile(query)).toMatch(`CONCAT("users"."name", "users"."name")`)
    })

    test('concats a string', () => {
      const table = new Table('users')

      const query = table.get('name').concat(buildQuoted('abc'))

      expect(compile(query)).toMatch(`CONCAT("users"."name", 'abc')`)
    })
  })

  describe('SelectManager', () => {
    test('accepts strings as SQLLiterals', () => {
      const table = new Table('users')

      const manager = new SelectManager()
      manager.from(table)
      manager.project(table.get('id'))

      expect(compile(manager)).toMatch(`SELECT "users"."id" FROM "users"`)
    })
  })

  describe('UpdateManager', () => {
    test('takes values', () => {
      const table = new Table('users')

      const um = new UpdateManager()
      um.table(table)
      um.set(new SQLLiteral('foo = bar'))

      expect(compile(um.ast)).toStrictEqual(`UPDATE "users" SET foo = bar`)
    })

    test('generates an order clause', () => {
      const table = new Table('users')

      const um = new UpdateManager()
      um.table(table)
      um.order(table.get('id'))

      expect(compile(um.ast)).toStrictEqual(
        `UPDATE "users" ORDER BY "users"."id"`,
      )
    })

    test('generates a where clause', () => {
      const table = new Table('users')

      const um = new UpdateManager()
      um.table(table)
      um.where(table.get('id').eq(1))

      expect(compile(um.ast)).toStrictEqual(
        `UPDATE "users" WHERE "users"."id" = 1`,
      )
    })
  })

  describe('IsDistinctFrom', () => {
    test('should handle column names on both sides', () => {
      const relation = new Table('users')

      const node = relation
        .get('first_name')
        .isDistinctFrom(relation.get('last_name'))

      expect(compile(node)).toStrictEqual(
        `NOT "users"."first_name" <=> "users"."last_name"`,
      )
    })

    test('should handle null', () => {
      const relation = new Table('users')

      const node = new IsDistinctFrom(
        relation.get('name'),
        buildQuoted(null, relation.get('active')),
      )

      expect(compile(node)).toStrictEqual(`NOT "users"."name" <=> NULL`)
    })
  })

  describe('IsNotDistinctFrom', () => {
    test('should construct a valid generic SQL statement', () => {
      const relation = new Table('users')

      const node = relation.get('name').isNotDistinctFrom('Aaron Patterson')

      expect(compile(node)).toStrictEqual(
        `"users"."name" <=> 'Aaron Patterson'`,
      )
    })

    test('should handle column names on both sides', () => {
      const relation = new Table('users')

      const node = relation
        .get('first_name')
        .isNotDistinctFrom(relation.get('last_name'))

      expect(compile(node)).toStrictEqual(
        `"users"."first_name" <=> "users"."last_name"`,
      )
    })

    test('should handle null', () => {
      const relation = new Table('users')

      const node = new IsNotDistinctFrom(
        relation.get('name'),
        buildQuoted(null, relation.get('active')),
      )

      expect(compile(node)).toStrictEqual(`"users"."name" <=> NULL`)
    })
  })
})
