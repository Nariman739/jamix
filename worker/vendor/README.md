# vendor/baileys-7.0.0-rc14-fix2765.tgz

Форк Baileys `doryani-ai/Baileys`, ветка `fix/companion-reg-refresh` (PR WhiskeySockets/Baileys#2765, коммит 4f263f0, 10.08.2026),
собранный `npm run build && npm pack`. Нужен, потому что с 28.07.2026 WhatsApp шлёт `companion_reg_refresh` после скана QR,
и без обработчика новые номера не привязываются («Couldn't link device»). Апстрим на 12.10.2026 фикс не слил.

Проверено 12.10.2026: на 6.7.24 привязка не завершалась, на этом tgz — connected за 10 секунд.

Когда PR сольют и выйдет релиз — заменить на `npm i baileys@<версия>` и удалить tgz.
