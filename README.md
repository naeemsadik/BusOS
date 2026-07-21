Here's Mermaid code for all three diagrams, based on the tightened BusOS scope (Lite ERP + Staff + Website Builder + Hosting, SaaS model).

## 1. Architecture Diagram

```mermaid
graph TB
    subgraph Client["Client Layer"]
        OwnerApp["Owner/Staff Dashboard<br/>(Web App)"]
        Storefront["Customer Storefront<br/>(Public Website)"]
        MobileApp["Mobile App<br/>(Owner/Staff - optional)"]
    end

    subgraph Gateway["API Gateway / Load Balancer"]
        APIGW["API Gateway"]
    end

    subgraph AppServices["Application Services"]
        AuthSvc["Auth & Permissions Service"]
        ShopSvc["Shop Management Service<br/>(Inventory, Sales, POS)"]
        StaffSvc["Staff Management Service<br/>(Accounts, Attendance)"]
        CMSSvc["Website Builder / CMS Service"]
        OrderSvc["Online Order Service"]
        BillingSvc["Subscription & Billing Service"]
        NotifSvc["Notification Service<br/>(SMS/WhatsApp/Email)"]
    end

    subgraph DataLayer["Data Layer"]
        MainDB[("Primary DB<br/>(Multi-tenant, PostgreSQL)")]
        FileStore[("Object Storage<br/>(Product images, assets)")]
        Cache[("Cache / Session Store<br/>(Redis)")]
    end

    subgraph Infra["Hosting Infrastructure (BusOS-managed)"]
        DeployEngine["Deployment Engine"]
        DomainMgr["Domain & SSL Manager"]
        Monitoring["Monitoring & Backups"]
    end

    subgraph External["External Integrations"]
        SMSGateway["SMS/WhatsApp Gateway"]
        PaymentGW["Payment Gateway<br/>(Phase 2)"]
    end

    OwnerApp --> APIGW
    Storefront --> APIGW
    MobileApp --> APIGW

    APIGW --> AuthSvc
    APIGW --> ShopSvc
    APIGW --> StaffSvc
    APIGW --> CMSSvc
    APIGW --> OrderSvc
    APIGW --> BillingSvc

    ShopSvc --> MainDB
    StaffSvc --> MainDB
    CMSSvc --> MainDB
    CMSSvc --> FileStore
    OrderSvc --> MainDB
    BillingSvc --> MainDB
    AuthSvc --> Cache
    AuthSvc --> MainDB

    OrderSvc --> NotifSvc
    BillingSvc --> NotifSvc
    NotifSvc --> SMSGateway
    OrderSvc -.-> PaymentGW

    CMSSvc --> DeployEngine
    DeployEngine --> DomainMgr
    DeployEngine --> Monitoring

    BillingSvc -->|"Suspends/Resumes"| AuthSvc
```

## 2. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    SHOP ||--o{ STAFF : employs
    SHOP ||--o{ PRODUCT : owns
    SHOP ||--o{ SALE : records
    SHOP ||--|| WEBSITE : has
    SHOP ||--|| SUBSCRIPTION : has

    STAFF ||--o{ ATTENDANCE : logs
    STAFF ||--o{ SALE : processes

    PRODUCT ||--o{ SALE_ITEM : "sold as"
    PRODUCT }o--|| CATEGORY : belongs_to
    PRODUCT ||--o{ ORDER_ITEM : "ordered as"
    PRODUCT ||--o{ INVENTORY_LOG : tracked_by

    SALE ||--o{ SALE_ITEM : contains
    SALE }o--|| STAFF : "handled by"

    WEBSITE ||--o{ PAGE : contains
    WEBSITE ||--o{ ONLINE_ORDER : receives

    ONLINE_ORDER ||--o{ ORDER_ITEM : contains
    ONLINE_ORDER }o--|| CUSTOMER : "placed by"

    SUBSCRIPTION }o--|| PLAN : follows
    SUBSCRIPTION ||--o{ PAYMENT : has

    SHOP {
        uuid id PK
        string name
        string owner_name
        string phone
        string address
        datetime created_at
    }

    STAFF {
        uuid id PK
        uuid shop_id FK
        string name
        string role
        string phone
        string pin_or_password
        boolean active
    }

    ATTENDANCE {
        uuid id PK
        uuid staff_id FK
        date work_date
        datetime check_in
        datetime check_out
    }

    PRODUCT {
        uuid id PK
        uuid shop_id FK
        uuid category_id FK
        string name
        string barcode
        decimal price
        int stock_qty
        int low_stock_threshold
    }

    CATEGORY {
        uuid id PK
        uuid shop_id FK
        string name
    }

    INVENTORY_LOG {
        uuid id PK
        uuid product_id FK
        int change_qty
        string reason
        datetime created_at
    }

    SALE {
        uuid id PK
        uuid shop_id FK
        uuid staff_id FK
        decimal total_amount
        string payment_method
        datetime created_at
    }

    SALE_ITEM {
        uuid id PK
        uuid sale_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }

    WEBSITE {
        uuid id PK
        uuid shop_id FK
        string subdomain
        string custom_domain
        json theme_config
        boolean is_published
    }

    PAGE {
        uuid id PK
        uuid website_id FK
        string page_type
        json content_blocks
    }

    CUSTOMER {
        uuid id PK
        string name
        string phone
        string address
    }

    ONLINE_ORDER {
        uuid id PK
        uuid website_id FK
        uuid customer_id FK
        string status
        string fulfillment_type
        decimal total_amount
        datetime created_at
    }

    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }

    PLAN {
        uuid id PK
        string name
        decimal monthly_price
        json features
    }

    SUBSCRIPTION {
        uuid id PK
        uuid shop_id FK
        uuid plan_id FK
        string status
        date next_billing_date
    }

    PAYMENT {
        uuid id PK
        uuid subscription_id FK
        decimal amount
        string status
        datetime paid_at
    }
```

## 3. Use Case Diagram

```mermaid
graph TB
    Owner((Shop Owner))
    Staff((Staff Member))
    Customer((Customer))
    Admin((BusOS Admin))

    subgraph BusOS["BusOS Platform"]
        UC1["Register Shop"]
        UC2["Manage Products & Inventory"]
        UC3["Record Sale / POS"]
        UC4["View Sales & Inventory Reports"]
        UC5["Add/Manage Staff Accounts"]
        UC6["Check In / Check Out"]
        UC7["View Attendance Report"]
        UC8["Build Website<br/>(Drag & Drop)"]
        UC9["Publish Storefront"]
        UC10["Browse Products"]
        UC11["Place Online Order"]
        UC12["Receive Order Notification"]
        UC13["Confirm/Fulfill Order"]
        UC14["Manage Subscription & Payment"]
        UC15["Suspend/Resume Shop Access"]
        UC16["Monitor Tenants<br/>(Internal Admin Panel)"]
    end

    Owner --> UC1
    Owner --> UC2
    Owner --> UC3
    Owner --> UC4
    Owner --> UC5
    Owner --> UC7
    Owner --> UC8
    Owner --> UC9
    Owner --> UC12
    Owner --> UC13
    Owner --> UC14

    Staff --> UC3
    Staff --> UC6

    Customer --> UC10
    Customer --> UC11

    Admin --> UC15
    Admin --> UC16

    UC14 -.->|"triggers"| UC15
    UC11 -.->|"triggers"| UC12
```

A few notes:
- The ERD assumes multi-tenancy via `shop_id` foreign keys on nearly every table — that's the isolation model for your SaaS setup.
- The architecture diagram keeps Payment Gateway and full automation as dotted/Phase 2 lines since they're not in MVP scope.
- Paste any of these directly into a Mermaid live editor, Notion, Obsidian, or GitHub markdown (which renders Mermaid natively) to preview them.

Want me to also render one of these as an actual visual diagram inline here, rather than just code?