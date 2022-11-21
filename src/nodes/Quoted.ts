import Unary from './Unary'

export default class Quoted extends Unary<any> {
  protected isInfinite(): boolean {
    return this.value === Infinity || this.value === -Infinity
  }
}
