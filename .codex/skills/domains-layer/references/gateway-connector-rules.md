# Gateway And Connector Rules

## Структура

```text
src/domains/{domain}/gateways/
  connectors/
    types/
    {platform}.connector.ts
  types/
  {concept}.gateway.ts
```

- Создавай `gateways/` только когда домен обращается к внешней системе.
- Создавай вложенный `connectors/` для transport implementation существующего Gateway.
- Не создавай Gateway без Connector и Connector без Gateway.
- Используй один Connector для нескольких gateways одной платформы при общем auth/transport contract.

## Ответственность

Gateway:

- Называй методы по business intention, а не по HTTP verb.
- Принимай domain/business arguments.
- Вызывай Connector и преобразуй wire data в domain object, read model, scalar или business result.
- Не оркестрируй feature use case и не импортируй `@app/*`, `@http/*` или `@ws/*`.

Connector:

- Создавай и настраивай HTTP/SDK client.
- Инкапсулируй auth headers, token refresh, retry, rate limit, timeout и connection pooling.
- Возвращай Gateway transport data, но не выпускай raw client/response в app layer.
- Не добавляй business guards и feature orchestration.

## Types И Mapping

- Клади request/response/envelope wire shapes в `gateways/types`.
- Клади client/config/auth/pool/retry shapes в `gateways/connectors/types`.
- Используй `Api`-префикс для upstream shapes, если он устраняет неоднозначность.
- Не экспортируй wire и connector types через основной domain barrel.
- Используй `toDomain` для одной target model и `toDomain{Target}` для нескольких targets.
- Не создавай mapper для scalar, `void` или совпадающей формы без преобразования.
- Делай явный mapping при rename, normalization, masking, nullable/default handling и local context.

## Ошибки

- Нормализуй ожидаемое transport state внутри Gateway в typed business result или semantics операции.
- Не заставляй app service проверять HTTP client errors и status codes.
- Пробрасывай неизвестную infrastructure error без подмены фиктивным success.
- Не создавай custom error только для копирования сообщения внешней системы.

## Проверка

- Проверь обязательную пару Gateway/Connector.
- Проверь отсутствие raw transport details в app/domain API.
- Проверь owner-local wire types и точное mapping behavior.
- Проверь, что Gateway не содержит application orchestration.
