# Telegram-бот «Чотири тенденції»

Бот проводить україномовний тест «Чотири тенденції»: 22 твердження, чотири нормалізовані результати, що разом дають 100%, та опис провідної тенденції. Це не медичний чи психологічний діагноз.

## Встановлення

Потрібен Python 3.11 або новіший.

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env
```

Відкрийте `.env` і вкажіть токен бота.

Щоб отримати токен, відкрийте в Telegram [@BotFather](https://t.me/BotFather), виконайте `/newbot`, задайте ім'я та username бота. BotFather надішле токен — зберігайте його в `.env` і не публікуйте.

## Запуск

```bash
python bot.py
```

Користувацькі повідомлення та кнопки бота — українською мовою. Історія результатів зберігається в `data/results.sqlite3`. Для MVP використовується `MemoryStorage`; у production його слід замінити на `RedisStorage`.

## Тести

```bash
pytest tests/
```
