/**
 * Basic four-function calculator used only by the optional on-page exam tools.
 * Deliberately uses a small arithmetic parser, never eval or Function.
 */
export function evaluateScratchExpression(input: string): number {
  if (typeof input !== 'string' || input.length > 100 || !input.trim()) {
    throw new Error('请输入算式')
  }
  const expression = input.replace(/[×]/g, '*').replace(/[÷]/g, '/').replace(/[−]/g, '-').replace(/\s+/g, '')
  if (!/^[0-9.+\-*/()%]+$/.test(expression)) throw new Error('算式包含不支持的字符')
  let position = 0
  const fail = (): never => { throw new Error('算式格式不正确') }
  const primary = (): number => {
    if (expression[position] === '(') {
      position++
      const value = addSub()
      if (expression[position] !== ')') return fail()
      position++
      return value
    }
    const match = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(expression.slice(position))
    if (!match) return fail()
    position += match[0].length
    return Number(match[0])
  }
  const unary = (): number => {
    if (expression[position] === '+') { position++; return unary() }
    if (expression[position] === '-') { position++; return -unary() }
    let value = primary()
    while (expression[position] === '%') { position++; value /= 100 }
    return value
  }
  const multiplyDivide = (): number => {
    let value = unary()
    while (expression[position] === '*' || expression[position] === '/') {
      const operator = expression[position++]
      const right = unary()
      if (operator === '/' && right === 0) throw new Error('不能除以零')
      value = operator === '*' ? value * right : value / right
    }
    return value
  }
  const addSub = (): number => {
    let value = multiplyDivide()
    while (expression[position] === '+' || expression[position] === '-') {
      const operator = expression[position++]
      const right = multiplyDivide()
      value = operator === '+' ? value + right : value - right
    }
    return value
  }
  const result = addSub()
  if (position !== expression.length) return fail()
  if (!Number.isFinite(result) || Math.abs(result) > 1e15) throw new Error('结果超出计算范围')
  return Object.is(result, -0) ? 0 : result
}

export function formatScratchResult(value: number): string {
  if (!Number.isFinite(value)) throw new Error('结果超出计算范围')
  return String(Number(value.toPrecision(12)))
}
