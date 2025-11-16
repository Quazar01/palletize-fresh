# Firebase Setup Guide for Palletize Fresh

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard (you can disable Google Analytics if you want)

## Step 2: Create Firestore Database

1. In your Firebase project, click "Firestore Database" in the left menu
2. Click "Create database"
3. Choose **"Start in production mode"** (we'll set up rules next)
4. Select a location close to your users (e.g., `europe-west` for Europe)
5. Click "Enable"

## Step 3: Configure Firestore Security Rules

1. Go to "Firestore Database" > "Rules" tab
2. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{productId} {
      // Allow anyone to read products
      allow read: if true;
      
      // Only allow authenticated users or specific conditions to write
      // For now, allow all writes (you can restrict this later with auth)
      allow write: if true;
    }
  }
}
```

3. Click "Publish"

⚠️ **Security Note**: The current rules allow anyone to read/write. For production, you should:
- Implement Firebase Authentication
- Restrict writes to authenticated admin users only

## Step 4: Get Firebase Configuration

1. Click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps"
4. Click the Web icon `</>`
5. Register your app (give it a name like "Palletize Fresh")
6. Copy the `firebaseConfig` object

## Step 5: Add Configuration to Your App

1. Open `src/firebase/firebaseConfig.js`
2. Replace the placeholder values with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "AIza...", // Your actual API key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

## Step 6: Initialize Database with Products

### Option A: Using the InitializeFirebase Component (Recommended)

1. Add the route to `App.js`:

```javascript
import InitializeFirebase from './components/InitializeFirebase';

// In your Routes:
<Route path="/init-firebase" element={<InitializeFirebase />} />
```

2. Navigate to `http://localhost:3000/init-firebase`
3. Click "Initialize Firebase" button
4. Wait for all products to upload
5. Remove the route after initialization

### Option B: Using Browser Console

1. Start your app: `npm start`
2. Open browser console (F12)
3. Run:

```javascript
// Import and initialize
import('./firebase/productService').then(({ initializeProducts }) => {
  import('./data/products.json').then(data => {
    initializeProducts(data.products).then(result => {
      console.log('Initialized!', result);
    });
  });
});
```

## Step 7: Test the Application

1. Navigate to the Products page
2. Try adding a new product
3. Refresh the page - products should persist!

## Step 8: Deploy to Netlify

Your app is now ready to deploy:

```bash
npm run build
netlify deploy --prod
```

Firebase works client-side, so no special Netlify configuration needed!

## Firestore Data Structure

```
products (collection)
  └── {productId} (document)
      ├── id: number
      ├── name: string
      ├── type: string (red, green, black, blue, half-blue, renrum)
      └── createdAt: timestamp
```

## Cost & Limits (Free Tier)

- 📊 **Storage**: 1 GB
- 📥 **Reads**: 50,000/day
- 📤 **Writes**: 20,000/day
- 🗑️ **Deletes**: 20,000/day

This is more than enough for your use case!

## Security Best Practices (Optional)

For production, consider:

1. **Add Firebase Authentication**:
   ```bash
   npm install firebase/auth
   ```

2. **Update Firestore Rules** to require auth for writes:
   ```
   allow write: if request.auth != null && request.auth.token.admin == true;
   ```

3. **Use environment variables** for Firebase config:
   - Create `.env.local`
   - Add Firebase keys as `REACT_APP_FIREBASE_*`
   - Add `.env.local` to `.gitignore`

## Troubleshooting

### "Missing or insufficient permissions"
- Check Firestore Rules (Step 3)
- Make sure rules are published

### "Firebase not configured"
- Verify firebaseConfig.js has correct values
- Check browser console for errors

### Products not showing
- Run the initialization script (Step 6)
- Check Firestore console to see if data exists

## Support

- [Firebase Documentation](https://firebase.google.com/docs/firestore)
- [Firestore Pricing](https://firebase.google.com/pricing)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
