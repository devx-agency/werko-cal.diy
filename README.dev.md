# Lokální vývoj: podpůrné služby pro SSO

Docker spouští PostgreSQL, Redis (pro Cal.diy), Authentik (server + worker) a Mailpit.
Cal.diy samotné běží na hostiteli přes `yarn dev`.

| Služba | Adresa (jen localhost) |
|---|---|
| PostgreSQL | `127.0.0.1:5432` (DB `calendiy` a `authentik`) |
| Redis | `127.0.0.1:6379` |
| Authentik | http://localhost:9000 |
| Mailpit UI / SMTP | http://localhost:8025 / `127.0.0.1:1025` |

## Spuštění

```bash
cp .env.dev.example .env.dev      # vyplň hesla a AUTHENTIK_SECRET_KEY
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d
docker compose -f docker-compose.dev.yml --env-file .env.dev ps   # všechny služby mají být "healthy"
```

První start Authentiku trvá cca minutu (migrace). Přihlášení: `akadmin` s heslem
`AUTHENTIK_BOOTSTRAP_PASSWORD` na http://localhost:9000.

## Konfigurace Authentiku pro Cal.diy

Tento postup vytvoří v Authentiku OIDC aplikaci/providera a testovací identity.
Cal.diy tím ještě nezačne používat SSO; jeho připojení jako OIDC klienta je samostatný krok.
Názvy položek v UI se mohou lišit podle překladu Authentiku.

### Aplikace a OIDC provider

1. Přihlaste se do administrace Authentiku a otevřete **Applications → Applications → New Application**.
2. Vytvořte aplikaci, například s názvem `werko` a slugem `werko`.
3. Jako typ providera vyberte **OAuth2/OpenID Connect**.
4. Nastavte provider:
   - Název například `Werko OIDC`.
   - Typ klienta **Confidential**.
   - V povolených grant types ponechte Authorization Code; implicit a hybrid granty pro tuto konfiguraci nepovolujte.
   - Povolte přesnou striktní OIDC callback adresu `http://localhost:3000/api/auth/callback/authentik`.
   - Nahraďte dřívější post-logout adresu přesnou striktní návratovou adresou `http://localhost:3000/auth/login` pro návrat do Cal.diy po odhlášení.
   - Nastavte **Invalidation Flow** na `default-invalidation-flow`, aby se odhlásila také Authentik SSO session a prohlížeč pokračoval na post-logout adresu.
   - Požadované OIDC scopes nastavte na `openid`, `profile`, `email` a `offline_access`, aby mohl Cal.diy obnovit access token pro pravidelné ověření členství. Podrobný postup je v části [Zapnutí `offline_access`](#zapnutí-offline_access). Nepřidávejte samostatný scope `groups`.
   - Ponechte výchozí per-provider issuer mode a stabilní identifikátor uživatele (`sub`); nepoužívejte e-mail ani uživatelské jméno jako `sub`.
5. Uložte aplikaci a provider. Client ID a Client Secret si bezpečně uložte mimo repozitář. Do dokumentace, `.env.dev` ani do chatu je nevkládejte.
6. Po zapnutí `offline_access` se v Cal.diy odhlaste a znovu přihlaste, aby se účet propojil s nově vydaným refresh tokenem.

Pokud se v UI objeví stejná striktní návratová adresa dvakrát, zkontrolujte, že obě položky jsou identické; nesmí být přidána žádná širší adresa ani wildcard.

### Zapnutí `offline_access`

Refresh token vydá Authentik pouze tehdy, když o něj požádá klient a provider má povolené odpovídající scope mapping. Cal.diy už při přihlášení posílá scope `offline_access`; v Authentiku proto povolte jeho mapping:

1. V Authentiku otevřete **Applications → Providers** a upravte OIDC provider `Werko OIDC` propojený s aplikací `werko`.
2. V části **Scopes** / **Scope mappings** najděte mapping, jehož scope je přesně `offline_access` (v seznamu může být pojmenovaný jako výchozí Authentik mapping pro OpenID `offline_access`) a přidejte ho mezi mappingy provideru. Pokud ho v seznamu nenajdete, nevytvářejte náhradní mapping naslepo; ověřte dostupnost vestavěného mappingu pro svoji verzi Authentiku.
3. Uložte změny provideru. Implicit ani hybrid grant kvůli refresh tokenu nezapínejte; Cal.diy používá Authorization Code flow.
4. V Cal.diy se odhlaste a znovu přihlaste. Již existující propojený účet mohl být vytvořen bez refresh tokenu; nové přihlášení uloží tokeny vydané podle aktuální konfigurace.
5. Ověřte pouze to, že nové propojení má refresh token uložený na serveru. Token nevypisujte, nekopírujte do prohlížeče ani neposílejte do chatu. Pokud mapping chybí nebo Authentik refresh token nevydá, po 15 minutách Cal.diy bezpečně nastaví roli `USER`, když nedokáže znovu ověřit skupinu.

### Skupina a testovací identity

1. V **Directory → Groups** vytvořte skupinu `cal-admins`. Nepovolujte jí superuser oprávnění Authentiku a nepřiřazujte role.
2. V **Directory → Users** vytvořte dva interní, aktivní účty, například `cal-user` a `cal-admin`, s odlišnými lokálními e-mailovými adresami.
3. Heslo nastavte po vytvoření uživatele akcí **Reset password**.
4. Přidejte pouze `cal-admin` do `cal-admins`. Cal.diy používá toto členství k určení role `ADMIN`; skupina sama nepřiděluje žádná oprávnění v Authentiku.

### Claim `groups`

V **Customization → Property Mappings** otevřete výchozí mapping `authentik default OAuth Mapping: OpenID 'profile'` a ověřte, že vrací claim `groups` ze skupin uživatele. Ve výchozím mappingu Authentiku je tento claim součástí scope `profile`; proto se scope `groups` nepřidává. V providerovi ponechte toto mapování přiřazené ke scope `profile`.

### Ověření e-mailové adresy

Authentik od verze 2025.10 vrací ve výchozím email mappingu `email_verified: false`. Pro testovací uživatele proto nakonfigurujte potvrzení adresy e-mailem a vlastní email scope mapping.

1. V **Customization → Property Mappings → New Property Mapping** vytvořte typ **Scope Mapping**. Nastavte název, například `Werko verified email`, **Scope name** `email` a tento výraz:

   ```python
   email = request.user.email
   verified_address = request.user.attributes.get("email_verified_address")

   return {
       "email": email,
       "email_verified": bool(email and verified_address == email),
   }
   ```

2. V **Applications → Providers → Werko OIDC → Edit → Scopes** nahraďte výchozí `authentik default OAuth Mapping: OpenID 'email'` tímto vlastním mappingem. Nenechávejte přiřazená obě email mapování; `openid` a `profile` ponechte.
3. V **Flows and Stages → Stages** vytvořte **Email Stage** pro potvrzení adresy. Zapněte **Use global connection settings**, nastavte šablonu **Account Confirmation** a vypněte **Activate pending user on success**.
4. Vytvořte samostatný ověřovací flow s označením **Authentication**. Jeho stage bindings nastavte v pořadí:
   `default-authentication-identification` → `default-authentication-password` → Email Stage → `default-authentication-login`.
   Neměňte výchozí autentizační flow Authentiku.
5. V **Customization → Policies** vytvořte **Expression Policy** s názvem například `Record confirmed email address` a výrazem:

   ```python
   user = request.context.get("pending_user")
   token = request.context.get("is_restored")

   if user and user.pk and user.email and token and token.user_id == user.pk:
       user.attributes["email_verified_address"] = user.email
       user.save(update_fields=["attributes"])

   return True
   ```

6. V ověřovacím flow rozbalte binding `default-authentication-login` a připojte tuto policy. U bindingu zapněte **Evaluate when stage is run** a vypněte **Evaluate when flow is planned**. Policy používejte jen v tomto flow s povinnou email stage.
7. Pro každého testovacího uživatele otevřete `http://localhost:9000/if/flow/<flow-slug>/`, přihlaste se jeho jménem a heslem a potvrďte odkaz z e-mailu v Mailpitu na http://localhost:8025. Potvrzovací odkaz musí být zaslán na e-mail uložený u daného uživatele.
8. V detailu uživatele ověřte, že atribut `email_verified_address` odpovídá jeho aktuálnímu e-mailu. Atribut nenastavujte ručně. Pokud se e-mail uživatele změní, vyžaduje nové potvrzení.

### Ověření OIDC discovery a nastavení

Discovery dokument je dostupný na:

`http://localhost:9000/application/o/werko/.well-known/openid-configuration`

Ověřte, že `issuer` v dokumentu odpovídá issueru nastavenému/vrácenému pro provider a že endpointy odkazují na tuto instanci Authentiku. U providera ověřte přesné striktní callback adresy `http://localhost:3000/api/auth/callback/authentik` a `http://localhost:3000/auth/login`. Znovupoužití těchto adres není důvod povolit další adresy.

Discovery samo neobsahuje uživatelské claimy. Při dokončené OIDC integraci ověřte, že `sub` zůstává stabilní pro stejného uživatele, `email_verified` je `true` až po potvrzení adresy a `groups` obsahuje `cal-admins` pouze u příslušného testovacího uživatele. Cal.diy uděluje `ADMIN` pouze při přesné shodě `cal-admins`; ostatní a neplatné claimy znamenají `USER`. Aktuální členství ověřuje přes UserInfo nejpozději každých 15 minut, proto musí být dostupný refresh token. Pokud se ověření u Authentiku nepodaří, přístup se vyhodnotí jako `USER`.

## Konfigurace Cal.diy (`.env` v repozitáři Cal.diy)

Názvy proměnných ověř proti `.env.example` v repozitáři Cal.diy.

```env
DATABASE_URL=postgresql://calendiy:<CALDIY_DB_PASSWORD>@localhost:5432/calendiy
DATABASE_DIRECT_URL=postgresql://calendiy:<CALDIY_DB_PASSWORD>@localhost:5432/calendiy
REDIS_URL=redis://:<REDIS_PASSWORD>@localhost:6379
EMAIL_FROM=noreply@calendiy.localhost
EMAIL_SERVER_HOST=127.0.0.1
EMAIL_SERVER_PORT=1025
```

## Migrace

- **Authentik**: migruje se sám při startu serveru. Nic dalšího se nespouští.
- **Cal.diy** (Prisma), z kořene repozitáře Cal.diy:
  ```bash
  yarn                                        # závislosti
  yarn workspace @calcom/prisma db-deploy     # aplikuje existující migrace
  yarn dev
  ```
  Přesný název skriptu zkontroluj v `packages/prisma/package.json`. `yarn db-studio` otevře Prisma Studio.

## Běžné operace

```bash
docker compose -f docker-compose.dev.yml --env-file .env.dev logs -f authentik-server
docker compose -f docker-compose.dev.yml --env-file .env.dev down        # zastaví, data zůstanou
docker compose -f docker-compose.dev.yml --env-file .env.dev down -v    # SMAŽE všechna data (volumes)
```

Init skript `docker/postgres/init/01-create-databases.sh` se spouští jen při prvním vytvoření
volume. Pokud změníš hesla účtů `calendiy`/`authentik` v `.env.dev` později, spusť `down -v`
(ztráta dat) nebo změň heslo ručně přes `ALTER ROLE`.

## Upgrade Authentiku

Verze je připnutá v `docker-compose.dev.yml` (`ghcr.io/goauthentik/server:2026.8.3`, server i worker
stejná). Při upgradu porovnej oficiální `compose.yml` dané verze (závislosti, verze Postgresu)
a přečti si release notes.
