# Design Document: RubinMarket

## Overview

RubinMarket é uma plataforma de marketplace para comércio de itens de jogos, construída sobre uma arquitetura monorepo com Turborepo. O sistema utiliza uma stack moderna com Bun, Hono, tRPC, Drizzle ORM, PostgreSQL, React e TanStack Router.

A arquitetura segue o padrão de separação em pacotes:
- **apps/server**: API backend com Hono + tRPC
- **apps/web**: Frontend React com TanStack Router
- **packages/api**: Routers e procedures tRPC
- **packages/auth**: Autenticação com Better Auth
- **packages/db**: Schema e conexão PostgreSQL com Drizzle ORM

## Architecture

```mermaid
graph TB
    subgraph "Frontend (apps/web)"
        WEB[React + TanStack Router]
        TRPC_CLIENT[tRPC Client]
        WS_CLIENT[WebSocket Client]
    end

    subgraph "Backend (apps/server)"
        HONO[Hono Server]
        TRPC[tRPC Router]
        AUTH[Better Auth]
        WS_SERVER[WebSocket Server]
    end

    subgraph "Packages"
        API[@padrao/api]
        AUTH_PKG[@padrao/auth]
        DB[@padrao/db]
    end

    subgraph "External Services"
        PG[(PostgreSQL)]
        REDIS[(Redis - Queue)]
        DISCORD[Discord Bot]
    end

    subgraph "Background Jobs"
        CRON[Cron Jobs]
        QUEUE[Message Queue Consumer]
    end

    WEB --> TRPC_CLIENT
    WEB --> WS_CLIENT
    TRPC_CLIENT --> HONO
    WS_CLIENT --> WS_SERVER
    HONO --> TRPC
    HONO --> AUTH
    TRPC --> API
    AUTH --> AUTH_PKG
    API --> DB
    AUTH_PKG --> DB
    DB --> PG
    WS_SERVER --> REDIS
    QUEUE --> REDIS
    QUEUE --> DISCORD
    CRON --> DB
```

## Components and Interfaces

### 1. Authentication Module (@padrao/auth)

Extensão do Better Auth existente para suportar roles e Discord username.

```typescript
// Extensão do schema de usuário
interface UserProfile {
  id: string;
  name: string;
  email: string;
  discordUsername: string | null;
  role: 'player' | 'moderator';
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Listings Module

Gerenciamento de anúncios de itens.

```typescript
interface Listing {
  id: string;
  sellerId: string;
  itemId: string;
  itemName: string;
  itemImage: string | null;
  attributes: Record<string, unknown>; // Atributos dinâmicos (Refino, Slots, etc.)
  price: number;
  currency: 'gold' | 'rubin';
  description: string | null;
  status: 'active' | 'sold' | 'archived' | 'deleted';
  lastInteractionAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ListingService {
  create(data: CreateListingInput): Promise<Listing>;
  update(id: string, data: UpdateListingInput): Promise<Listing>;
  delete(id: string): Promise<void>; // Soft delete
  markAsSold(id: string): Promise<Listing>;
  search(filters: SearchFilters): Promise<PaginatedResult<Listing>>;
  getById(id: string): Promise<Listing | null>;
  getByUser(userId: string): Promise<Listing[]>;
}
```

### 3. Chat Module

Sistema de chat em tempo real via WebSocket.

```typescript
interface ChatRoom {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string; // Criptografado no banco
  createdAt: Date;
}

interface ChatService {
  createRoom(listingId: string, buyerId: string): Promise<ChatRoom>;
  sendMessage(roomId: string, senderId: string, content: string): Promise<ChatMessage>;
  getMessages(roomId: string, cursor?: string): Promise<PaginatedResult<ChatMessage>>;
  getRoomsByUser(userId: string): Promise<ChatRoom[]>;
}
```

### 4. Notification Module

Sistema de notificações com fila e fallback.

```typescript
interface Notification {
  id: string;
  userId: string;
  type: 'new_message' | 'listing_sold' | 'listing_expiring' | 'report_action';
  payload: Record<string, unknown>;
  deliveredVia: 'discord' | 'web' | null;
  status: 'pending' | 'delivered' | 'failed';
  createdAt: Date;
}

interface NotificationService {
  queue(userId: string, type: string, payload: object): Promise<void>;
  markDelivered(id: string, via: 'discord' | 'web'): Promise<void>;
  getUnread(userId: string): Promise<Notification[]>;
}
```

### 5. Report Module

Sistema de denúncias e moderação.

```typescript
interface Report {
  id: string;
  reporterId: string;
  targetType: 'listing' | 'user';
  targetId: string;
  reason: 'spam' | 'scam' | 'unrealistic_price' | 'offense';
  chatLogSnapshot: string | null; // Criptografado
  status: 'pending' | 'resolved' | 'dismissed';
  moderatorId: string | null;
  resolution: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

interface ReportService {
  create(data: CreateReportInput): Promise<Report>;
  getQueue(): Promise<Report[]>;
  resolve(id: string, moderatorId: string, action: ReportAction): Promise<Report>;
  dismiss(id: string, moderatorId: string): Promise<Report>;
}
```

### 6. Dataset Module

Gerenciamento do catálogo de itens.

```typescript
interface DatasetItem {
  id: string;
  name: string;
  category: string;
  image: string | null;
  attributeSchema: AttributeDefinition[]; // Define campos dinâmicos
  updatedAt: Date;
}

interface AttributeDefinition {
  key: string;
  label: string;
  type: 'number' | 'string' | 'select';
  options?: string[]; // Para tipo select
  required: boolean;
}

interface DatasetService {
  search(query: string, limit?: number): Promise<DatasetItem[]>;
  getById(id: string): Promise<DatasetItem | null>;
  importFromJson(data: DatasetItem[]): Promise<void>;
}
```

## Data Models

### Database Schema (Drizzle ORM)

```typescript
// packages/db/src/schema/marketplace.ts

// Extensão da tabela user existente
export const userProfile = pgTable("user_profile", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  discordUsername: text("discord_username"),
  role: text("role", { enum: ["player", "moderator"] }).default("player").notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
});

// Catálogo de itens
export const datasetItem = pgTable("dataset_item", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  image: text("image"),
  attributeSchema: jsonb("attribute_schema").notNull().$type<AttributeDefinition[]>(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("dataset_item_name_idx").on(table.name),
  index("dataset_item_category_idx").on(table.category),
]);

// Anúncios
export const listing = pgTable("listing", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id").notNull().references(() => user.id),
  itemId: text("item_id").notNull().references(() => datasetItem.id),
  attributes: jsonb("attributes").notNull().$type<Record<string, unknown>>(),
  price: integer("price").notNull(),
  currency: text("currency", { enum: ["gold", "rubin"] }).notNull(),
  description: text("description"),
  status: text("status", { enum: ["active", "sold", "archived", "deleted"] }).default("active").notNull(),
  lastInteractionAt: timestamp("last_interaction_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("listing_seller_idx").on(table.sellerId),
  index("listing_status_idx").on(table.status),
  index("listing_item_idx").on(table.itemId),
]);

// Salas de chat
export const chatRoom = pgTable("chat_room", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").notNull().references(() => listing.id),
  buyerId: text("buyer_id").notNull().references(() => user.id),
  sellerId: text("seller_id").notNull().references(() => user.id),
  status: text("status", { enum: ["active", "closed"] }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("chat_room_buyer_idx").on(table.buyerId),
  index("chat_room_seller_idx").on(table.sellerId),
  index("chat_room_listing_idx").on(table.listingId),
]);

// Mensagens de chat (conteúdo criptografado)
export const chatMessage = pgTable("chat_message", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => chatRoom.id),
  senderId: text("sender_id").notNull().references(() => user.id),
  encryptedContent: text("encrypted_content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("chat_message_room_idx").on(table.roomId),
  index("chat_message_created_idx").on(table.createdAt),
]);

// Notificações
export const notification = pgTable("notification", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  type: text("type", { enum: ["new_message", "listing_sold", "listing_expiring", "report_action"] }).notNull(),
  payload: jsonb("payload").notNull(),
  deliveredVia: text("delivered_via", { enum: ["discord", "web"] }),
  status: text("status", { enum: ["pending", "delivered", "failed"] }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("notification_user_idx").on(table.userId),
  index("notification_status_idx").on(table.status),
]);

// Denúncias
export const report = pgTable("report", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => user.id),
  targetType: text("target_type", { enum: ["listing", "user"] }).notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason", { enum: ["spam", "scam", "unrealistic_price", "offense"] }).notNull(),
  encryptedChatLog: text("encrypted_chat_log"),
  status: text("status", { enum: ["pending", "resolved", "dismissed"] }).default("pending").notNull(),
  moderatorId: text("moderator_id").references(() => user.id),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [
  index("report_status_idx").on(table.status),
  index("report_target_idx").on(table.targetType, table.targetId),
]);
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Authentication Session Creation
*For any* valid email and password combination, authenticating should create an active session that allows access to protected resources.
**Validates: Requirements 1.1**

### Property 2: Invalid Credentials Rejection
*For any* invalid credential combination (wrong password or non-existent email), authentication should be rejected without creating a session.
**Validates: Requirements 1.2**

### Property 3: Password Hash Storage
*For any* newly registered user, the stored password should be a hash (not plaintext) and should not equal the original password string.
**Validates: Requirements 1.3**

### Property 4: Expired Session Blocking
*For any* expired session token, attempting to access protected resources should result in authentication failure.
**Validates: Requirements 1.4**

### Property 5: Discord Username Round-Trip
*For any* valid Discord username, saving and then retrieving the profile should return the same Discord username.
**Validates: Requirements 2.3, 2.4**

### Property 6: Search Results Match Criteria
*For any* search query, all returned listings should contain the search term in their item name or description.
**Validates: Requirements 3.1**

### Property 7: Filter Results Satisfaction
*For any* applied filter (currency, price range, category), all returned listings should satisfy the filter conditions.
**Validates: Requirements 3.2**

### Property 8: Sort Order Correctness
*For any* sort criteria (price ascending/descending, date), the returned listings should be in the correct order.
**Validates: Requirements 3.4**

### Property 9: Dynamic Attributes Loading
*For any* item selected from the Dataset, the loaded attribute schema should match the item's defined attributeSchema.
**Validates: Requirements 4.2**

### Property 10: Currency Restriction
*For any* listing creation or update, the currency field should only accept 'gold' or 'rubin' values.
**Validates: Requirements 4.4, 12.1**

### Property 11: Listing Creation Validation
*For any* valid listing input (valid item ID, numeric price, valid currency), creating a listing should result in a listing with 'active' status.
**Validates: Requirements 4.5**

### Property 12: Listing Edit Item Immutability
*For any* listing edit operation, the itemId should remain unchanged while price and description can be modified.
**Validates: Requirements 5.1**

### Property 13: Soft Delete Preservation
*For any* deleted listing, the record should still exist in the database with 'deleted' status.
**Validates: Requirements 5.2**

### Property 14: Non-Active Listings Search Exclusion
*For any* listing with status 'sold', 'archived', or 'deleted', it should not appear in public search results.
**Validates: Requirements 5.3, 5.6**

### Property 15: Listing Expiration Alert (15 days)
*For any* listing without update or interaction for 15 days, a renewal alert notification should be created.
**Validates: Requirements 5.4**

### Property 16: Listing Auto-Archive (30 days)
*For any* listing without update or interaction for 30 days, the status should be automatically changed to 'archived'.
**Validates: Requirements 5.5**

### Property 17: Self-Negotiation Prevention
*For any* listing, the seller should not be able to create a chat room for their own listing.
**Validates: Requirements 6.1**

### Property 18: Chat Room Creation
*For any* valid negotiation request (buyer different from seller), a chat room should be created with correct buyerId and sellerId.
**Validates: Requirements 6.2**

### Property 19: Message Encryption Round-Trip
*For any* chat message, encrypting then decrypting should produce the original message content.
**Validates: Requirements 6.5, 12.2**

### Property 20: Message Notification Trigger
*For any* new message in a chat room, a notification event should be created for the recipient.
**Validates: Requirements 7.1**

### Property 21: Discord Fallback to Web
*For any* notification where Discord delivery fails, a web notification should be created as fallback.
**Validates: Requirements 7.3**

### Property 22: Notification Queue Ordering
*For any* sequence of queued notifications, they should be processed in FIFO order when the service recovers.
**Validates: Requirements 7.4, 10.2**

### Property 23: Report Reason Required
*For any* report submission, a valid reason (spam, scam, unrealistic_price, offense) must be provided.
**Validates: Requirements 8.1**

### Property 24: Chat Report Snapshot
*For any* user report from chat, the report should include an encrypted snapshot of recent messages.
**Validates: Requirements 8.2, 8.3**

### Property 25: Decrypt Only Active Reports
*For any* chat log decryption request, it should only succeed for reports with 'pending' status.
**Validates: Requirements 9.3, 12.3**

### Property 26: Ban Revokes Sessions
*For any* banned user, all their active sessions should be invalidated and new authentication attempts should fail.
**Validates: Requirements 9.5**

### Property 27: Chat Log Retention (90 days)
*For any* chat message older than 90 days, it should be permanently deleted from the database.
**Validates: Requirements 12.4**

### Property 28: Dataset Update Reflection
*For any* newly imported dataset item, it should be searchable and available for listing creation immediately after import.
**Validates: Requirements 13.2, 13.3**

## Error Handling

### Authentication Errors
- Invalid credentials: Return 401 with generic "Invalid email or password" message
- Expired session: Return 401 with "Session expired" message
- Banned user: Return 403 with "Account suspended" message

### Listing Errors
- Invalid item ID: Return 400 with "Item not found in dataset" message
- Invalid currency: Return 400 with "Invalid currency type" message
- Self-negotiation: Return 403 with "Cannot negotiate on your own listing" message
- Listing not found: Return 404 with "Listing not found" message

### Chat Errors
- Room not found: Return 404 with "Chat room not found" message
- Unauthorized access: Return 403 with "Not a participant of this chat" message
- Message encryption failure: Log error, return 500 with generic message

### Report Errors
- Missing reason: Return 400 with "Report reason is required" message
- Invalid target: Return 404 with "Target not found" message
- Duplicate report: Return 409 with "Report already submitted" message

### Notification Errors
- Discord API failure: Queue for retry, create web notification fallback
- Rate limit exceeded: Implement exponential backoff, continue processing queue
- Invalid Discord username: Mark notification as failed, create web fallback

## Testing Strategy

### Property-Based Testing Library
**fast-check** será utilizado para testes de propriedade em TypeScript/JavaScript.

### Test Configuration
- Minimum 100 iterations per property test
- Each property test must be tagged with: `**Feature: rubin-market, Property {number}: {property_text}**`

### Unit Tests
Unit tests cobrirão:
- Casos específicos de autenticação (login válido, inválido)
- Operações CRUD de listings
- Criação e gerenciamento de chat rooms
- Processamento de reports
- Integração com Discord (mocked)

### Property-Based Tests
Property tests verificarão:
- Propriedades de round-trip (encryption/decryption, save/retrieve)
- Invariantes de busca (resultados sempre satisfazem filtros)
- Restrições de domínio (currency types, status transitions)
- Comportamentos de fallback (Discord -> Web notifications)

### Integration Tests
- Fluxo completo de criação de listing
- Fluxo de negociação (chat room creation, messaging)
- Fluxo de denúncia e moderação
- Expiração automática de listings (com time mocking)

### Test Structure
```
packages/
├── api/
│   └── src/
│       └── __tests__/
│           ├── auth.test.ts
│           ├── auth.property.test.ts
│           ├── listings.test.ts
│           ├── listings.property.test.ts
│           ├── chat.test.ts
│           ├── chat.property.test.ts
│           ├── reports.test.ts
│           └── notifications.test.ts
```
