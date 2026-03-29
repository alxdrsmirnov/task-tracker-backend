import { Injectable } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'

/**
 * Держит в области запроса объект открытой БД-транзакции, чтобы все репозитории
 * выполняли запросы внутри одной и той же транзакции без передачи `trx` параметром через
 * каждый метод.
 */
@Injectable()
export class TransactionContext<T> {
  constructor(private readonly cls: ClsService) {}

  private readonly trxKey = Symbol('TransactionContext')

  set(client: T): void {
    this.cls.set(this.trxKey, client)
  }

  get(): T | undefined {
    return this.cls.get(this.trxKey) as T | undefined
  }

  clear(): void {
    this.cls.set(this.trxKey, undefined)
  }
}
