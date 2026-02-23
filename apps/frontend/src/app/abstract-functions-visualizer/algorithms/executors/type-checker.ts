/**
 * TypeChecker - утилиты для определения типов значений
 */

/**
 * Набор утилит для проверки типов значений и их свойств
 */
export class TypeChecker {
  /**
   * Возвращает строковое описание типа значения
   */
  static getType(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'symbol') return 'symbol';
    if (typeof value === 'bigint') return 'bigint';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'function') return 'function';
    return 'unknown';
  }

  /**
   * Проверяет, является ли значение объектом (но не null)
   */
  static isObject(value: unknown): boolean {
    return value !== null && typeof value === 'object';
  }

  /**
   * Проверяет, является ли значение примитивом (не объектом)
   */
  static isPrimitive(value: unknown): boolean {
    return !this.isObject(value);
  }

  /**
   * Проверяет, является ли значение callable функцией
   */
  static isCallable(value: unknown): boolean {
    return typeof value === 'function';
  }

  /**
   * Проверяет, является ли значение Symbol или BigInt
   */
  static isSymbolOrBigInt(value: unknown): boolean {
    return typeof value === 'symbol' || typeof value === 'bigint';
  }
}
