import React, { useState } from 'react';
import './Home.css';
import { parseExcelFile, validateExcelFile } from '../utils/excelParser';
import { processOrder } from '../utils/palletCalculations';
import { optimizeComboPalletsAdvanced, optimizeComboPalletsWithMixPall, calculateTotalParcels } from '../utils/comboOptimizer';
import Results from './Results';

function Home() {
  const [kund, setKund] = useState('');
  const [datum, setDatum] = useState('');
  const [ordersnummer, setOrdersnummer] = useState('');
  const [selectedOption, setSelectedOption] = useState('combo');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setError(null);
      if (validateExcelFile(file)) {
        setSelectedFile(file);
      } else {
        setError('Ogiltig filtyp. Vänligen välj en Excel-fil (.xlsx, .xls)');
        setSelectedFile(null);
      }
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setError(null);
      if (validateExcelFile(file)) {
        setSelectedFile(file);
      } else {
        setError('Ogiltig filtyp. Vänligen välj en Excel-fil (.xlsx, .xls)');
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Välj en fil först');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse Excel file
      const orderData = await parseExcelFile(selectedFile);
      
      // Process order
      const processed = processOrder(orderData);
      
      // Optimize combo pallets if option is selected
      let comboPallets = [];
      let mixPallList = processed.mixPallList;
      let hasMixPall = processed.mixPallList.length > 0;
      
      if (selectedOption === 'combo') {
        // Try to optimize with mix pall included
        const optimizationResult = optimizeComboPalletsWithMixPall(
          processed.skvettpallsList,
          processed.mixPallList
        );
        
        comboPallets = optimizationResult.comboPallets;
        
        // If mix pall was combined, update the flags
        if (optimizationResult.mixPallCombined) {
          hasMixPall = false; // Mix pall is now part of a combo
          mixPallList = []; // Clear standalone mix pall
        } else if (optimizationResult.standaloneMixPall) {
          // Mix pall stays separate but as a combo pallet representation
          hasMixPall = true;
        }
      } else {
        // If not combo mode, each skvettpall is its own parcel
        comboPallets = processed.skvettpallsList.map(skvettpall => ({
          skvettpalls: [skvettpall],
          totalHeight: skvettpall.heightInRedUnits,
          palletCount: 1,
        }));
      }

      // Calculate total parcels
      const totalFullPallets = processed.fullPalletsList.reduce((sum, p) => sum + p.fullPallets, 0);
      const totalParcels = calculateTotalParcels(totalFullPallets, comboPallets, hasMixPall);

      // Update results
      const finalResults = {
        ...processed,
        comboPallets,
        mixPallList,
        totalParcels,
      };

      setResults(finalResults);
      setShowResults(true);

    } catch (err) {
      setError(err.message || 'Ett fel uppstod vid bearbetning av filen');
      console.error('Error processing file:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowResults(false);
    setResults(null);
  };

  if (showResults && results) {
    // Use today's date if no date was provided
    const displayDatum = datum || new Date().toISOString().split('T')[0];
    
    return (
      <Results 
        orderData={{ kund, datum: displayDatum, ordersnummer }}
        results={results}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="home-container">
      <h1 className="title">Plocklista Generator</h1>
      
      <div className="input-fields">
        <input
          type="text"
          className="text-field"
          placeholder="Kund"
          value={kund}
          onChange={(e) => setKund(e.target.value)}
        />
        <input
          type="text"
          className="text-field"
          placeholder="Datum"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
        />
        <input
          type="text"
          className="text-field"
          placeholder="Ordersnummer"
          value={ordersnummer}
          onChange={(e) => setOrdersnummer(e.target.value)}
        />
      </div>

      <div className="radio-group">
        <label className="radio-option">
          <input
            type="radio"
            name="palletType"
            value="combo"
            checked={selectedOption === 'combo'}
            onChange={(e) => setSelectedOption(e.target.value)}
          />
          <span>Combo Pallets</span>
        </label>
        <label className="radio-option">
          <input
            type="radio"
            name="palletType"
            value="enkel"
            checked={selectedOption === 'enkel'}
            onChange={(e) => setSelectedOption(e.target.value)}
          />
          <span>Enkel Pall</span>
        </label>
        <label className="radio-option">
          <input
            type="radio"
            name="palletType"
            value="helsingborg"
            checked={selectedOption === 'helsingborg'}
            onChange={(e) => setSelectedOption(e.target.value)}
          />
          <span>Helsingborg</span>
        </label>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div 
        className="upload-area"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput').click()}
      >
        <input
          id="fileInput"
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept=".xlsx,.xls,.csv"
        />
        {selectedFile ? (
          <p className="file-name">{selectedFile.name}</p>
        ) : (
          <p>Klicka här eller dra en fil för att ladda upp</p>
        )}
      </div>

      <button 
        className="upload-button" 
        onClick={handleUpload}
        disabled={loading || !selectedFile}
      >
        {loading ? 'Bearbetar...' : 'Ladda Upp'}
      </button>
    </div>
  );
}

export default Home;
