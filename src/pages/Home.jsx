import React, { useState } from 'react';
import './Home.css';
import { parseExcelFile, validateExcelFile } from '../utils/excelParser';
import { processOrder, processOrderHelsingborg } from '../utils/palletCalculations';
import { optimizeComboPalletsAdvanced, optimizeComboPalletsWithMixPall, calculateTotalParcels } from '../utils/comboOptimizer';
import { calculateTruckSlots } from '../utils/truckSlotCalculations';
import Results from './Results';

function Home() {
  const [kund, setKund] = useState('');
  const [datum, setDatum] = useState('');
  const [ordersnummer, setOrdersnummer] = useState('');
  const [selectedOption, setSelectedOption] = useState('combo');
  const [heightMargin, setHeightMargin] = useState(0); // Margin in percent (default 0%)
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
      
      // Process order based on selected mode
      const processed = selectedOption === 'helsingborg' 
        ? processOrderHelsingborg(orderData)
        : processOrder(orderData);
      
      // Optimize combo pallets if option is selected
      let comboPallets = [];
      let mixPallList = processed.mixPallList;
      let hasMixPall = processed.mixPallList.length > 0;
      let fullPalletsList = [...processed.fullPalletsList];
      
      if (selectedOption === 'combo') {
        // Try to optimize with mix pall included
        const optimizationResult = optimizeComboPalletsWithMixPall(
          processed.skvettpallsList,
          processed.mixPallList,
          heightMargin
        );
        
        comboPallets = optimizationResult.comboPallets;
        
        // If mix pall was combined, update the flags
        if (optimizationResult.mixPallCombined) {
          hasMixPall = false; // Mix pall is now part of a combo
          mixPallList = []; // Clear standalone mix pall
        } else if (optimizationResult.standaloneMixPall) {
          // Mix pall stays separate but as a combo pallet representation
          hasMixPall = true;
          // Keep the original mix pall list from processing
          mixPallList = processed.mixPallList;
        } else {
          // No mix pall at all or it wasn't processed
          mixPallList = processed.mixPallList;
        }
        
        // Move single-skvettpall combos that meet criteria to Full Pall list
        // Criteria: >= 75% of full pallet OR height >= 6 red box units
        const singleSkvettpallCombos = [];
        comboPallets = comboPallets.filter(combo => {
          if (combo.skvettpalls.length === 1 && !combo.skvettpalls[0].isMixPall) {
            const skvettpall = combo.skvettpalls[0];
            const boxConfig = skvettpall.boxConfig;
            
            // Calculate percentage of full pallet
            const fullPalletBoxes = boxConfig.fullPalletBoxes || (boxConfig.boxesPerRow * boxConfig.fullPalletRows);
            const percentageOfFullPallet = (skvettpall.boxCount / fullPalletBoxes) * 100;
            
            // Calculate height in red box units (excluding the pallet itself)
            const heightWithoutPallet = skvettpall.heightInRedUnits - 1;
            
            // Move to Full Pall list if: 75% or more of full pallet OR height >= 6 red box units
            if (percentageOfFullPallet >= 75 || heightWithoutPallet >= 6) {
              singleSkvettpallCombos.push(skvettpall);
              return false; // Remove from combo pallets
            }
            // Otherwise keep in combo pallets
            return true;
          }
          return true;
        });
        
        // Add single skvettpalls (meeting criteria) to full pallets list
        singleSkvettpallCombos.forEach(skvettpall => {
          fullPalletsList.push({
            artikelnummer: skvettpall.artikelnummer,
            fullPallets: 1,
            boxType: skvettpall.boxType,
            boxesPerPallet: skvettpall.boxCount,
            totalBoxes: skvettpall.boxCount,
            isSingleSkvettpall: true, // Mark as single skvettpall
          });
        });
        
        // Sort Full Pall list: regular full pallets first (by box count), then single skvettpalls
        fullPalletsList.sort((a, b) => {
          if (a.isSingleSkvettpall && !b.isSingleSkvettpall) return 1;
          if (!a.isSingleSkvettpall && b.isSingleSkvettpall) return -1;
          // Within same type, sort by total boxes (descending)
          return b.totalBoxes - a.totalBoxes;
        });
      } else if (selectedOption === 'enkel') {
        // Enkel Pall mode: each skvettpall is its own parcel, no combining
        comboPallets = processed.skvettpallsList.map(skvettpall => ({
          skvettpalls: [skvettpall],
          totalHeight: skvettpall.heightInRedUnits,
          palletCount: 1,
        }));
        
        // Sort Full Pall list by antal pallar (number of pallets) descending
        fullPalletsList.sort((a, b) => b.fullPallets - a.fullPallets);
      } else if (selectedOption === 'helsingborg') {
        // Helsingborg mode: same as Enkel, each skvettpall is its own parcel
        comboPallets = processed.skvettpallsList.map(skvettpall => ({
          skvettpalls: [skvettpall],
          totalHeight: skvettpall.heightInRedUnits,
          palletCount: 1,
        }));
        
        // Sort Full Pall list by antal pallar (number of pallets) descending
        fullPalletsList.sort((a, b) => b.fullPallets - a.fullPallets);
      } else {
        // Other modes: each skvettpall is its own parcel
        comboPallets = processed.skvettpallsList.map(skvettpall => ({
          skvettpalls: [skvettpall],
          totalHeight: skvettpall.heightInRedUnits,
          palletCount: 1,
        }));
      }

      // Calculate total parcels
      const totalFullPallets = fullPalletsList.reduce((sum, p) => sum + p.fullPallets, 0);
      const totalParcels = calculateTotalParcels(totalFullPallets, comboPallets, hasMixPall);

      // Calculate truck slots for Enkel and Helsingborg modes
      let truckSlots = null;
      if (selectedOption === 'enkel' || selectedOption === 'helsingborg') {
        truckSlots = calculateTruckSlots(fullPalletsList, processed.skvettpallsList, mixPallList);
      }

      // Update results
      const finalResults = {
        ...processed,
        fullPalletsList, // Use the updated full pallets list
        comboPallets,
        mixPallList,
        totalParcels,
        truckSlots, // Add truck slots to results
        palletMode: selectedOption, // Pass the selected mode
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
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
          <span>Combo</span>
        </label>
        <label className="radio-option">
          <input
            type="radio"
            name="palletType"
            value="enkel"
            checked={selectedOption === 'enkel'}
            onChange={(e) => setSelectedOption(e.target.value)}
          />
          <span>Enkel</span>
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

      <div className="margin-input-container" style={{
        position: 'absolute',
        bottom: '2rem',
        right: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.85rem'
      }}>
        <label htmlFor="heightMargin" style={{
          color: '#fff',
          fontWeight: '500'
        }}>
          Max Höjd Marginal:
        </label>
        <input
          id="heightMargin"
          type="number"
          min="0"
          max="20"
          step="0.5"
          value={heightMargin}
          onChange={(e) => setHeightMargin(parseFloat(e.target.value) || 0)}
          style={{
            width: '60px',
            padding: '0.4rem',
            border: '2px solid #5ba0a0',
            borderRadius: '4px',
            fontSize: '0.85rem',
            textAlign: 'center'
          }}
        />
        <span style={{
          color: '#fff'
        }}>%</span>
      </div>
    </div>
  );
}

export default Home;
