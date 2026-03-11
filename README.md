# 🍔 Food Recommendation System

An **AI-powered food recommendation engine** using **TensorFlow.js**. The system learns user preferences from order history and predicts which menu items each user is most likely to enjoy — with data persisted in a **PostgreSQL** database and served via a **Node.js/Express** REST API.

> 🎓 Academic project for the **Software Engineering with Applied AI** postgraduate program — Module 01: Fundamentals of AI & LLMs for Programmers.

---

## ✨ Features

- **Neural network-based recommendations** — A 4-layer dense network trained in real-time in the browser
- **Multi-feature encoding** — Products encoded using category, cuisine type, price, and user demographics (age + region)
- **Weighted feature importance** — Configurable weights control how much each feature influences recommendations
- **Web Worker training** — Model training runs in a separate thread, keeping the UI responsive
- **Live training visualization** — Real-time accuracy and loss charts via TensorFlow.js Visor (tfjs-vis)
- **Interactive user profiles** — Select users, view order history, add/remove purchases dynamically
- **PostgreSQL persistence** — All data stored in a relational database; purchases persist across sessions
- **REST API** — Express backend exposes `/api/products` and `/api/users` endpoints
- **Modern iFood-inspired UI** — Fully styled with the iFood design system (red #EA1D2C, Inter font, rounded cards)

---

## 🧠 How the AI Works

### Data Encoding Pipeline

Each **product** is encoded into a numerical vector:

```
[price_normalized, avg_buyer_age, ...category_one_hot, ...cuisine_one_hot]
```

Each **user** is encoded as the **mean vector** of their purchased products + a **region one-hot vector**:

```
[mean_product_features..., ...region_one_hot]
```

### Feature Weights

| Feature    | Weight | Encoding      | Description                         |
| ---------- | ------ | ------------- | ----------------------------------- |
| `category` | 0.35   | One-hot       | Food type (snacks, meals, desserts…)|
| `cuisine`  | 0.25   | One-hot       | Cuisine origin (brazilian, italian…)|
| `region`   | 0.15   | One-hot       | User's city/region                  |
| `price`    | 0.15   | Min-max norm  | Normalized price (0–1)              |
| `age`      | 0.10   | Min-max norm  | Avg buyer age per product           |

### Neural Network Architecture

```
Input (user + product vectors)
  ↓
Dense(128, relu)    ← Pattern detection
  ↓
Dense(64, relu)     ← Feature compression
  ↓
Dense(32, relu)     ← Pattern distillation
  ↓
Dense(1, sigmoid)   ← Recommendation score (0–1)
```

- **Optimizer:** Adam (lr = 0.01)
- **Loss:** Binary Cross-Entropy
- **Epochs:** 100 | **Batch size:** 32

---

## 📁 Project Structure

```
ifood_recomendations/
├── index.html                          # Main page (iFood-styled UI)
├── style.css                           # iFood design system styles
├── package.json                        # Project config & scripts
├── .env                                # Database URL and server config
├── prisma/
│   ├── schema.prisma                   # Database schema (Product, User, Purchase)
│   ├── seed.js                         # Populates DB with initial data
│   └── migrations/                     # Auto-generated SQL migrations
├── server/
│   ├── index.js                        # Express server (static files + API)
│   └── routes/
│       ├── products.js                 # GET /api/products, GET /api/products/:id
│       └── users.js                    # GET/POST /api/users, GET/PUT /api/users/:id
└── src/
    ├── index.js                        # App entry point & dependency wiring
    ├── controller/
    │   ├── ModelTrainingController.js   # Training flow orchestration
    │   ├── ProductController.js         # Product listing & purchase logic
    │   ├── TFVisorController.js         # Training visualization control
    │   ├── UserController.js            # User selection & profile logic
    │   └── WorkerController.js          # Web Worker communication bridge
    ├── events/
    │   ├── constants.js                 # Event & worker message types
    │   └── events.js                    # Custom event bus (pub/sub)
    ├── service/
    │   ├── ProductService.js            # Product data access (REST API)
    │   └── UserService.js               # User data access (REST API)
    ├── view/
    │   ├── ModelTrainingView.js         # Training UI (buttons, progress)
    │   ├── ProductView.js               # Product card rendering
    │   ├── TFVisorView.js               # tfjs-vis chart rendering
    │   ├── UserView.js                  # User profile & order history UI
    │   ├── View.js                      # Base view (template loading)
    │   └── templates/
    │       ├── product-card.html        # Product card template
    │       └── past-purchase.html       # Order history item template
    └── workers/
        └── modelTrainingWorker.js       # Neural network (runs in Web Worker)
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/) v14+ running locally

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ifood_recomendations

# Install dependencies
npm install

# Configure the database URL in .env
# Default: postgresql://USER@localhost:5432/ifood_recommendations
```

### Database Setup

```bash
# Run migrations (creates the tables)
npm run db:migrate

# Populate the database with initial data
npm run seed
```

### Running the App

```bash
npm start
# → http://localhost:3000
```

---

## 🗄️ Database

### Schema

Three tables managed by **Prisma ORM**:

```
Product          User             Purchase
────────         ────────         ─────────────────
id (PK)          id (PK)          id (PK)
name             name             userId  → User
category         age              productId → Product
price            region
cuisine
```

`Purchase` is a join table with a `@@unique([userId, productId])` constraint.

### Seed Data

Initial data is defined in [prisma/seed.js](prisma/seed.js) and mirrors the original JSON files:

- **10 products** across 5 categories and 6 cuisines
- **6 users** (5 with purchase history + 1 demo user "Josézin da Silva")

### Available Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Express server |
| `npm run seed` | Populate the database with initial data |
| `npm run db:migrate` | Run pending Prisma migrations |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

---

## 🌐 REST API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get a single product |
| GET | `/api/users` | List all users with purchases |
| GET | `/api/users/:id` | Get a single user with purchases |
| POST | `/api/users` | Create or upsert a user |
| PUT | `/api/users/:id` | Update a user's purchases |

Users are returned in the format the frontend expects:

```json
{
  "id": 1,
  "name": "Ana Lima",
  "age": 25,
  "region": "sao_paulo",
  "purchases": [
    { "id": 3, "name": "Sushi Combo 20 Pieces", "category": "meals", "price": 59.9, "cuisine": "japanese" }
  ]
}
```

---

## 🎯 Usage Walkthrough

1. **Select a user** from the dropdown — their age, region, and order history will appear
2. **Click "Train Model"** — the neural network trains on all users' order data (watch the live charts!)
3. **Click "Recommend"** — the model predicts and reorders the menu by relevance for the selected user
4. **Add orders** — click "Add to Order" on any menu item to update the user's history (saved to DB)
5. **Retrain** — after adding orders, retrain the model to see updated recommendations

---

## 🛠️ Tech Stack

| Technology | Purpose |
| --- | --- |
| **TensorFlow.js** v4.22 | Neural network training & inference in the browser |
| **tfjs-vis** v1.5.1 | Real-time training visualization (accuracy/loss charts) |
| **Express** v5 | REST API server and static file serving |
| **Prisma** v5 | ORM for database schema management and queries |
| **PostgreSQL** v14 | Relational database for products, users, and purchases |
| **Bootstrap** v5.3 | Responsive grid & base components |
| **Bootstrap Icons** | UI iconography |
| **Inter Font** | Typography (Google Fonts) |
| **Web Workers API** | Off-main-thread model training |
| **ES Modules** | Native JavaScript module system |

---

## 📊 Data Overview

### Menu Items

| ID | Name | Category | Cuisine | Price |
| --- | --- | --- | --- | --- |
| 1 | Artisan X-Burger | snacks | american | R$ 32.90 |
| 2 | Margherita Pizza | pizzas | italian | R$ 45.90 |
| 3 | Sushi Combo 20 Pieces | meals | japanese | R$ 59.90 |
| 4 | Açaí Bowl 500ml | desserts | brazilian | R$ 22.90 |
| 5 | Traditional Feijoada | meals | brazilian | R$ 38.90 |
| 6 | Shrimp Pad Thai | meals | thai | R$ 42.90 |
| 7 | Chicken Coxinha (10 pcs) | snacks | brazilian | R$ 25.90 |
| 8 | Soft Drink 600ml | beverages | american | R$ 8.90 |
| 9 | Bolognese Lasagna | meals | italian | R$ 35.90 |
| 10 | Petit Gâteau | desserts | french | R$ 28.90 |

### Users

| User | Age | Region | Taste Profile |
| --- | --- | --- | --- |
| Ana Lima | 25 | São Paulo | Asian food (japanese, thai) |
| Bruno Ferreira | 19 | Rio de Janeiro | Fast food (american, brazilian) |
| Camila Souza | 32 | Curitiba | Italian cuisine |
| Diego Almeida | 22 | Belo Horizonte | Brazilian comfort food |
| Eduarda Nunes | 28 | São Paulo | Eclectic (italian, french, japanese) |
| Josézin da Silva | 30 | São Paulo | Demo user (no purchase history) |

---

## 🏗️ Architecture

```
┌──────────────┐     Events      ┌──────────────────┐
│   Views      │ ◄─────────────► │   Controllers    │
│ (DOM/UI)     │                  │ (Business Logic) │
└──────────────┘                  └────────┬─────────┘
                                           │
                                    ┌──────┴──────┐
                                    │  Services   │
                                    │ (Data Layer)│
                                    └──────┬──────┘
                                           │ REST API
                                    ┌──────┴──────┐
                                    │   Express   │
                                    │   Server    │
                                    └──────┬──────┘
                                           │ Prisma ORM
                                    ┌──────┴──────┐
                                    │ PostgreSQL  │
                                    │  Database   │
                                    └─────────────┘

┌─────────────────────────────────────────────────┐
│              Web Worker (separate thread)         │
│  ┌─────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Encoding│→ │ Training │→ │  Prediction    │  │
│  │ Pipeline│  │ (tf.js)  │  │ (model.predict)│  │
│  └─────────┘  └──────────┘  └────────────────┘  │
└─────────────────────────────────────────────────┘
```

The app uses a **custom event bus** (`Events` class) for decoupled communication between Controllers and Views, and **Web Workers** to keep the neural network training off the main thread.

---

## 📄 License

ISC
