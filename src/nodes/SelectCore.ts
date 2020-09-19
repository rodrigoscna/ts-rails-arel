import JoinSource from './JoinSource.js'
import Node from './Node.js'

export default class SelectCore extends Node {
  public comment: any = null

  public groups: any[] = []

  public havings: any[] = []

  public optimizerHints: any = null

  public projections: any[] = []

  public setQuantifier: any = null

  public source: JoinSource = new JoinSource(null)

  public wheres: any[] = []

  public windows: any[] = []

  get from(): any {
    return this.source.left
  }

  set from(val: any) {
    this.source.left = val
  }

  get froms(): any {
    return this.from
  }

  set froms(val: any) {
    this.from = val
  }
}
