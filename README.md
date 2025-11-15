# Plocklista Generator (Palletize Fresh)

A React-based pallet optimization system that helps organize product orders into optimal EU pallet configurations.

## Features

- **Excel Order Processing**: Upload Excel files containing product orders (Artikelnummer and Beställda DFP columns)
- **Automatic Product-to-Box Mapping**: Maps products to their packaging boxes (red, green, black, blue, half-blue)
- **Full Pallet Calculation**: Automatically calculates full pallets for each product
- **Skvettpall Management**: Handles remaining boxes that don't form full pallets
- **Mix Pall Creation**: Groups products with less than one row into a mix pallet
- **Combo Pallet Optimization**: Uses Branch-and-Bound algorithm to combine skvettpalls optimally
- **Editable Results**: Add, edit, or delete pallets in the results view
- **Print Functionality**: Generate printable pallet lists

## Box Specifications

### Red Box
- Area: 1/8 of pallet | Boxes per row: 8 | Full pallet: 8 rows = 64 boxes | Height: 136mm (reference unit)

### Green Box
- Area: 1/4 of pallet | Boxes per row: 4 | Full pallet: 7 rows = 28 boxes | Height: 155mm (8/7 red units)

### Black Box
- Area: 1/8 of pallet | Boxes per row: 8 | Full pallet: 6 rows = 48 boxes | Height: 181mm (8/6 red units)

### Blue Box (Bygelläge 2)
- Area: 1/8 of pallet | Boxes per row: 8 | Full pallet: 11 rows = 88 boxes | Height: 99mm (8/11 red units)

### Half-Blue Box (Bygelläge 1)
- Area: 1/8 of pallet | Boxes per row: 8 | Full pallet: 16 rows = 128 boxes | Height: 68mm (8/16 red units)

## Usage

1. Enter order information (Kund, Datum, Ordersnummer)
2. Select pallet mode (Combo Pallets, Enkel Pall, Helsingborg)
3. Upload Excel file with Artikelnummer and Beställda DFP columns
4. View optimized results with full pallets, combo pallets, and mix pall
5. Edit and print the final pallet list

## Installation & Running

```bash
npm install
npm start
```

Opens at [http://localhost:3000](http://localhost:3000)

---

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
