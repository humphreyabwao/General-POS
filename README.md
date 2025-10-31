# POS System

A clean and simple Point of Sale (POS) system built with HTML, CSS, JavaScript, and Firebase.

## Features

### Navigation
- **Sidebar Navigation**: Collapsible sidebar with the following modules:
  - Dashboard
  - Inventory
  - POS / Sales
  - All Sales
  - Customers
  - Expenses
  - Reports
  - Admin Panel

### Top Bar Features
- Sidebar toggle button
- Business logo and name display
- Dark/Light mode toggle
- Notification center
- Profile dropdown with user info and settings

### Design
- Clean, modern interface
- Static solid colors (Blue, Green, Red)
- Responsive design
- Dark and light mode support
- Smooth transitions and animations

## Setup Instructions

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Navigate to Project Settings > General
4. Under "Your apps", click on the web icon (</>)
5. Register your app and copy the Firebase configuration
6. Open `js/firebase-config.js` and replace the placeholder values with your Firebase credentials:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 2. Enable Firebase Services

In the Firebase Console:

1. **Authentication**:
   - Go to Authentication > Sign-in method
   - Enable Email/Password authentication

2. **Firestore Database**:
   - Go to Firestore Database
   - Create database in production or test mode
   - Set up security rules as needed

3. **Storage**:
   - Go to Storage
   - Get started and set up storage bucket

### 3. Run the Application

1. Open `index.html` in a web browser
2. Or use a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server
   ```

## Project Structure

```
POS/
├── index.html              # Main HTML file
├── css/
│   └── style.css          # Main stylesheet
├── js/
│   ├── app.js             # Main application logic
│   └── firebase-config.js # Firebase configuration
└── README.md              # This file
```

## Color Scheme

- **Blue**: `#2563eb` (Primary actions, active states)
- **Green**: `#10b981` (Success, positive actions)
- **Red**: `#ef4444` (Danger, delete actions)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Notes

- All modules are created but left blank (no demo data)
- Firebase integration is ready to use
- Dark/light mode preference is saved in localStorage
- Sidebar state (collapsed/expanded) is saved in localStorage
- Current page is saved in localStorage for persistence

## Future Development

Each module can be expanded with:
- Dashboard: Statistics, charts, and quick actions
- Inventory: Product management, stock tracking
- POS/Sales: Point of sale interface, cart management
- All Sales: Sales history, transaction details
- Customers: Customer database, loyalty programs
- Expenses: Expense tracking, categories
- Reports: Sales reports, analytics, charts
- Admin Panel: User management, system settings

## License

This project is provided as-is for development purposes.
