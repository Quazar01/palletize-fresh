# Netlify Functions Setup

## Local Development

To test the functions locally, you need to install Netlify CLI:

```bash
npm install -g netlify-cli
```

Then run:

```bash
netlify dev
```

This will start your app with the Netlify Functions running locally at `http://localhost:8888`

## Initialize Products (First Time Setup)

After deploying to Netlify, you need to initialize the products database. You can do this by:

1. **Option 1 - Using curl:**
```bash
curl -X POST https://your-site-name.netlify.app/.netlify/functions/init-products
```

2. **Option 2 - Using browser console:**
Open your deployed site, press F12, and run:
```javascript
fetch('/.netlify/functions/init-products', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

3. **Option 3 - Create an admin page** (recommended)
Add a button in your admin area to initialize products when needed.

## API Endpoints

- **GET** `/.netlify/functions/get-products` - Fetch all products
- **POST** `/.netlify/functions/add-product` - Add a new product
- **POST** `/.netlify/functions/init-products` - Initialize products from JSON (one-time setup)

## Environment Variables

No environment variables needed! Netlify Blobs works out of the box on Netlify.

## Deployment

Simply push to your git repository connected to Netlify, or use:

```bash
netlify deploy --prod
```

After deployment, run the init-products function once to populate the database with your existing products.
