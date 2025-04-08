# E-Commerce Platform with Delivery Validation

This is a full-stack e-commerce platform built with Django (backend) and Angular (frontend) that includes:

- User authentication with role-based permissions (Admin, Client, Livreur)
- Product management and shopping cart
- Order processing with delivery tracking
- Secure delivery validation using unique codes

## Key Features

### Authentication System

- JWT-based authentication
- Role-based access control (Admin, Client, Livreur)
- Secure login for different user types

### Product Management

- Product catalog with categories
- Stock management
- Pricing and discounts

### Order System

- Shopping cart
- Order creation and tracking
- Promotion code support

### Delivery Management

- Unique delivery codes for order validation
- Dashboard for livreurs to manage deliveries
- Real-time tracking of delivery status
- Performance metrics for livreurs

## Architecture

### Backend (Django)

- RESTful API with Django REST Framework
- JWT authentication
- PostgreSQL database

### Frontend (Angular)

- Angular framework with TypeScript
- Material Design components
- Responsive UI

## Backend Models

### User Model

- Extended Django's User model with custom roles
- Profile models for each user type (Admin, Client, Livreur)

### Product Model

- Product details, stock management, pricing
- Category management

### Order Model

- Order details, status tracking
- Unique validation codes for delivery confirmation
- Relations to products and users

## User Workflows

### Client Workflow

1. Client logs in and adds products to cart
2. Client validates order and chooses delivery address
3. Client receives a unique validation code
4. Client gives the code to the livreur upon delivery
5. Once validated, client can rate the delivery

### Livreur Workflow

1. Livreur logs in and sees available deliveries
2. Livreur accepts deliveries and gets delivery addresses
3. Upon delivery, livreur inputs validation code from client
4. Delivery is confirmed in the system

### Admin Workflow

1. Admin manages products, categories, and users
2. Admin processes new orders
3. Admin can view delivery statistics and reports

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js and npm
- Angular CLI
- PostgreSQL database

### Installation

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run server
python manage.py runserver
```

#### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
ng serve
```

Access the application at http://localhost:4200

## Future Enhancements

- Email/SMS notifications for delivery status changes
- Payment gateway integration
- Advanced analytics and reporting
- Mobile application for delivery personnel 