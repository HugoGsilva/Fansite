# Requirements Document

## Introduction

RubinMarket é uma plataforma de marketplace para comércio de itens de jogos, focada na interação entre jogadores com notificações externas via Bot do Discord. O sistema facilita a negociação segura de itens in-game, com ferramentas de moderação e conformidade para prevenir RMT (Real Money Trading).

## Glossary

- **RubinMarket**: Sistema de marketplace para negociação de itens de jogos
- **Visitante**: Usuário não autenticado com acesso somente leitura
- **Player**: Usuário autenticado via E-mail/Senha com permissões completas
- **Moderador**: Administrador com poderes de auditoria, banimento e exclusão de conteúdo
- **Sistema**: Processos automáticos (Cron Jobs, validações, expiração de anúncios)
- **Bot de Notificação**: Serviço sidecar que consome filas para enviar DMs no Discord
- **RMT (Real Money Trading)**: Prática proibida de negociar itens por dinheiro real
- **Typeahead**: Componente de autocompletar para seleção de itens
- **Dataset**: Catálogo oficial de itens do jogo
- **Gold Coins**: Moeda virtual do jogo
- **Rubin Coins**: Moeda virtual premium do jogo
- **Soft Delete**: Exclusão lógica que mantém o registro no banco de dados
- **WebSocket**: Protocolo de comunicação bidirecional em tempo real
- **Throttling**: Controle de taxa de requisições para respeitar limites de API

## Requirements

### Requirement 1: Autenticação (UC01)

**User Story:** As a Visitante, I want to authenticate via email and password, so that I can access the full features of the marketplace.

#### Acceptance Criteria

1. WHEN a Visitante submits valid email and password credentials THEN the RubinMarket SHALL authenticate the Visitante and create an active session
2. WHEN a Visitante submits invalid credentials THEN the RubinMarket SHALL reject the authentication attempt and display an error message
3. WHEN a Visitante registers a new account THEN the RubinMarket SHALL store the password using a secure hash algorithm
4. WHEN a Player session expires THEN the RubinMarket SHALL require re-authentication before allowing protected actions

### Requirement 2: Gerenciamento de Perfil (UC02)

**User Story:** As a Player, I want to manage my profile and configure Discord notifications, so that I can receive alerts about my negotiations.

#### Acceptance Criteria

1. WHEN a Player accesses profile settings THEN the RubinMarket SHALL display the current profile configuration
2. WHEN a Player enters a Discord username THEN the RubinMarket SHALL display an alert about enabling DMs on the official server
3. WHEN a Player saves Discord configuration THEN the RubinMarket SHALL persist the Discord username for notification delivery
4. WHEN a Player updates profile information THEN the RubinMarket SHALL validate and save the changes immediately

### Requirement 3: Consulta e Busca de Itens (UC03)

**User Story:** As a Visitante or Player, I want to search and browse items with filters, so that I can find items I want to purchase.

#### Acceptance Criteria

1. WHEN a user performs a search query THEN the RubinMarket SHALL return matching items based on the search criteria
2. WHEN a user applies filters to search results THEN the RubinMarket SHALL refine the results according to the selected filters
3. WHEN a user requests item details THEN the RubinMarket SHALL display complete information about the selected item
4. WHEN a user sorts search results THEN the RubinMarket SHALL reorder items according to the selected sorting criteria
5. WHEN the Typeahead component receives user input THEN the RubinMarket SHALL respond with suggestions within 100 milliseconds

### Requirement 4: Criação de Anúncio (UC04)

**User Story:** As a Player, I want to create item listings with typeahead selection and currency options, so that I can sell my in-game items.

#### Acceptance Criteria

1. WHEN a Player initiates listing creation THEN the RubinMarket SHALL display the Typeahead component connected to the official Dataset
2. WHEN a Player selects an item from the Dataset THEN the RubinMarket SHALL load dynamic attributes specific to that item type (Refino, Slots, Atributos Mágicos)
3. WHEN a Player enters a price value THEN the RubinMarket SHALL accept only numeric input without real currency formatting
4. WHEN a Player selects a currency THEN the RubinMarket SHALL restrict options to Gold Coins or Rubin Coins only
5. WHEN a Player publishes a listing THEN the RubinMarket SHALL validate all required fields and create the listing with active status

### Requirement 5: Gerenciamento de Anúncios (UC05)

**User Story:** As a Player, I want to manage my listings including editing, deleting, and marking as sold, so that I can keep my offerings current.

#### Acceptance Criteria

1. WHEN a Player edits a listing THEN the RubinMarket SHALL allow modification of price and description while preventing item changes
2. WHEN a Player deletes a listing THEN the RubinMarket SHALL perform a Soft Delete preserving the record in the database
3. WHEN a Player marks a listing as sold THEN the RubinMarket SHALL remove it from public search while maintaining personal history
4. WHEN a listing reaches 15 days without update or interaction THEN the Sistema SHALL send a renewal alert to the Player
5. WHEN a listing reaches 30 days without update or interaction THEN the Sistema SHALL archive the listing automatically with Archived status
6. WHEN a listing is archived THEN the RubinMarket SHALL exclude it from public search results

### Requirement 6: Negociação via Chat (UC06)

**User Story:** As a Player (Comprador), I want to initiate negotiations through internal chat, so that I can communicate with sellers about item purchases.

#### Acceptance Criteria

1. WHEN a Player attempts to negotiate on their own listing THEN the RubinMarket SHALL prevent the action and display an error message
2. WHEN a Comprador clicks negotiate on a listing THEN the RubinMarket SHALL create a dedicated chat room between Comprador and Vendedor
3. WHEN a chat room opens THEN the RubinMarket SHALL display a fixed RMT warning message at the top of the conversation
4. WHEN Players exchange messages THEN the RubinMarket SHALL deliver messages using WebSocket with latency under 1 second
5. WHEN a message is sent in a chat room THEN the RubinMarket SHALL store the message with encryption for audit purposes

### Requirement 7: Notificações (UC07)

**User Story:** As a Player, I want to receive notifications via Discord or website, so that I can stay informed about my negotiations and sales.

#### Acceptance Criteria

1. WHEN a new message arrives in a chat room THEN the Sistema SHALL publish a notification event to the message queue
2. WHEN the Bot consumes a notification event THEN the Bot de Notificação SHALL attempt to send a DM to the Player via Discord
3. WHEN Discord delivery fails THEN the RubinMarket SHALL fall back to website notification
4. WHEN the Discord API is unavailable THEN the Sistema SHALL queue notifications for retry without affecting core functionality
5. WHEN sending notifications THEN the Bot de Notificação SHALL implement throttling to respect Discord API rate limits

### Requirement 8: Denúncias (UC08)

**User Story:** As a Player, I want to report suspicious listings or users, so that I can help maintain a safe marketplace.

#### Acceptance Criteria

1. WHEN a Player reports a listing THEN the RubinMarket SHALL require selection of a reason (Spam, Golpe, Preço Irreal, or Ofensa)
2. WHEN a Player reports a user from chat THEN the RubinMarket SHALL capture a snapshot of recent conversation records
3. WHEN a report is submitted with chat context THEN the RubinMarket SHALL attach an encrypted log to the report
4. WHEN a Player confirms a report submission THEN the RubinMarket SHALL create a moderation queue entry with all relevant data

### Requirement 9: Moderação de Conteúdo (UC09)

**User Story:** As a Moderador, I want to review reports and take action on violations, so that I can maintain marketplace integrity.

#### Acceptance Criteria

1. WHEN a Moderador accesses the admin panel THEN the RubinMarket SHALL display the queue of pending reports for listings and users
2. WHEN a Moderador reviews a listing report THEN the RubinMarket SHALL display the item data and report details
3. WHEN a Moderador reviews a chat report THEN the RubinMarket SHALL decrypt and display the associated chat log
4. WHEN a Moderador takes action THEN the RubinMarket SHALL allow Discard, Remove Listing, or Ban User operations
5. WHEN a Moderador bans a user THEN the RubinMarket SHALL revoke all active sessions and prevent future authentication

### Requirement 10: Requisitos Não-Funcionais de Resiliência

**User Story:** As a system operator, I want the platform to remain operational during external service failures, so that users can continue using core features.

#### Acceptance Criteria

1. WHILE the Discord API is unavailable THEN the RubinMarket SHALL continue operating search, listing creation, and internal chat functions normally
2. WHILE notifications are queued for retry THEN the Sistema SHALL preserve notification order and attempt delivery when service recovers
3. WHEN the notification service encounters rate limits THEN the Bot de Notificação SHALL implement intelligent throttling to avoid API blocking

### Requirement 11: Requisitos Não-Funcionais de Performance

**User Story:** As a user, I want fast and responsive interfaces, so that I can efficiently browse and negotiate items.

#### Acceptance Criteria

1. WHEN loading the main listing feed THEN the RubinMarket SHALL achieve Time to Interactive under 2 seconds on standard 4G connections
2. WHEN the Typeahead component receives input THEN the RubinMarket SHALL display suggestions within 100 milliseconds using local cache or optimized indexing
3. WHEN chat messages are sent THEN the RubinMarket SHALL deliver them with latency under 1 second using WebSocket technology

### Requirement 12: Requisitos Não-Funcionais de Segurança e Compliance

**User Story:** As a compliance officer, I want the system to prevent RMT and maintain audit trails, so that the platform remains compliant with game policies.

#### Acceptance Criteria

1. THE RubinMarket SHALL exclude real currency formatting (BRL, USD, EUR) from all numeric input fields
2. WHEN storing chat logs THEN the RubinMarket SHALL encrypt the content before database persistence
3. WHEN a Moderador requests chat logs THEN the RubinMarket SHALL decrypt logs only for reports with active status
4. WHEN chat logs reach 90 days of age THEN the Sistema SHALL delete the encrypted records permanently

### Requirement 13: Requisitos Não-Funcionais de Manutenibilidade

**User Story:** As a system administrator, I want to update the item catalog without downtime, so that the marketplace stays current with game updates.

#### Acceptance Criteria

1. WHEN an administrator uploads a new item Dataset (JSON) THEN the RubinMarket SHALL process the update without service interruption
2. WHEN the Dataset is updated THEN the RubinMarket SHALL refresh item IDs, names, and images in the Typeahead component
3. WHEN Dataset processing completes THEN the RubinMarket SHALL make new items immediately available for listing creation

### Requirement 14: Requisitos Não-Funcionais de Usabilidade

**User Story:** As a mobile user, I want fully responsive interfaces, so that I can use the marketplace on any device.

#### Acceptance Criteria

1. WHEN a user accesses the chat interface on mobile THEN the RubinMarket SHALL display a fully responsive layout optimized for touch interaction
2. WHEN a user accesses the search interface on mobile THEN the RubinMarket SHALL provide full functionality with mobile-optimized controls
