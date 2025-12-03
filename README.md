## Video Presentación

[![Ver Video Presentación](https://img.youtube.com/vi/kpCWY-ExfBU/0.jpg)](https://www.youtube.com/watch?v=kpCWY-ExfBU)

---

## Inicio Rápido

**Repositorio frontend:** [https://github.com/hdhumanez07/web-bcsocial](https://github.com/hdhumanez07/web-bcsocial)

**Nota:** Se descomentaron las .env del .gitignore para la prueba técnica

### Ejecutar con Docker

```bash
# Construir imagen
docker compose -f docker-compose.dev.yml build --no-cache app

# Levantar servicios
docker compose -f docker-compose.dev.yml up -d

# Ver logs
docker compose -f docker-compose.dev.yml logs -f app

# Frontend (sin docker)
pnpm run dev
```

**URLs:**

- API: http://localhost:3000
- Adminer: http://localhost:8080 (postgres/postgres/bcsocial)

### Detener servicios

```bash
docker compose -f docker-compose.dev.yml down
```

---

## Características Principales

### Backend (NestJS)

- Husky: no hacer git commit si falla alguno de estos comandos
  - pnpm test
  - pnpm test:e2e
  - pnpm lint
  - pnpm build
- Autenticación JWT: Access tokens (5min) + Refresh tokens (3min inactividad)
- CRUD Productos: Gestión completa con validaciones (precio, stock)
- Onboarding Seguro: Encriptación AES-256-GCM de datos PII
- Soft Delete: Eliminación lógica de registros
- Base de datos aislada para tests E2E
- Dockerizado con las últimas versiones de Postgres, Adminer y Node.js
- docker compose para desarrollo y para producción optimizado con multistages

### Frontend (Next.js 16)

- UI Moderna: Dark mode con shadcn/ui
- Dashboard Completo: Gestión de productos y onboarding
- Refresh Automático: Renovación transparente de tokens
- Diseño Responsive: Optimizado para mobile
- Estadísticas en Tiempo Real
- Sistema de Caché: Gestionado automáticamente por Next.js 16

---

## Seguridad Implementada

### Autenticación & Autorización

- JWT con refresh tokens: Sesiones seguras con expiración
- Rate Limiting: Protección anti brute-force (3 intentos/min login)
- Password Hashing: bcrypt con salt rounds=10
- Guards JWT: Protección de endpoints privados

### Encriptación de Datos

- AES-256-GCM: Encriptación de PII en onboarding (documentos)
- SHA-256 Hash: Detección de duplicados sin exponer datos
- Variables de entorno: Claves secretas en `.env`

### Validación de Datos

- DTOs con class-validator: Validación exhaustiva de inputs
- Sanitización: Prevención de inyección SQL
- Límites anti-lavado: Monto máximo $1,000,000,000 COP

### Headers de Seguridad

- Helmet: Configuración de headers HTTP seguros
- CORS: Restringido a orígenes permitidos
- HTTPS Ready: Preparado para certificados SSL

### Base de Datos

- TypeORM: ORM que previene SQL injection
- Índices optimizados: Rendimiento en queries críticas
- Transacciones: Integridad de datos garantizada

---

## Tests

```bash
# Tests unitarios
pnpm test

# Tests E2E
pnpm test:e2e
```

**Total: 55+ tests implementados**

- AuthService: 7 tests
- ProductsService: 8 tests
- OnboardingService: 9 tests
- E2E: 31 tests

---

## Postman

Importar `HomePower-Products-API.postman_collection.json` para probar la API con tests automatizados
o realiza las pruebas con los E2E tests.

---

## Autor

**Heyner Humanez Almanza**
