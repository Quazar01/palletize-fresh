import React from 'react';
import './Results.css';

function BalstaResults({ results, onBack, kund, datum, ordersnummer }) {
  const { balstaList, axfoodList, splitPercentage } = results;

  const handlePrint = () => {
    window.print();
  };

  // Filter out "Summa" from both lists
  const filteredBalstaList = balstaList.filter(item => item.artikelnummer !== 'Summa');
  const filteredAxfoodList = axfoodList.filter(item => item.artikelnummer !== 'Summa');

  // Get all unique artikelnummer from both lists, sorted
  const allArtikelnummer = [...new Set([
    ...filteredBalstaList.map(item => item.artikelnummer),
    ...filteredAxfoodList.map(item => item.artikelnummer)
  ])].sort((a, b) => a - b);

  // Create aligned lists with empty rows for missing items
  const alignedBalstaList = allArtikelnummer.map(artikelnummer => {
    const item = filteredBalstaList.find(i => i.artikelnummer === artikelnummer);
    return item || { artikelnummer, dfp: null };
  });

  const alignedAxfoodList = allArtikelnummer.map(artikelnummer => {
    const item = filteredAxfoodList.find(i => i.artikelnummer === artikelnummer);
    return item || { artikelnummer, dfp: null };
  });

  // Calculate sums
  const balstaSum = filteredBalstaList.reduce((sum, item) => sum + (item.dfp || 0), 0);
  const axfoodSum = filteredAxfoodList.reduce((sum, item) => sum + (item.dfp || 0), 0);
  
  // Calculate real percentages
  const totalSum = balstaSum + axfoodSum;
  const realBalstaPercent = totalSum > 0 ? Math.round((balstaSum / totalSum) * 100) : 0;
  const realAxfoodPercent = totalSum > 0 ? Math.round((axfoodSum / totalSum) * 100) : 0;

  return (
    <div className="results-container">
      <div className="results-header screen-only">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Tillbaka
        </button>
        <h1>Bålsta Uppdelning</h1>
        <button className="btn btn-primary" onClick={handlePrint}>
          🖨️ Skriv ut
        </button>
      </div>

      <div className="results-content">
        {/* Print Header */}
        <div className="print-header">
          <div className="info-section">
            <div className="info-item">
              <strong>Kund:</strong>
              <span>{kund || 'Dagab'}</span>
            </div>
            <div className="info-item">
              <strong>Datum:</strong>
              <span>{datum || new Date().toLocaleDateString('sv-SE')}</span>
            </div>
            {ordersnummer && (
              <div className="info-item">
                <strong>Ordersnummer:</strong>
                <span>{ordersnummer}</span>
              </div>
            )}
            <div className="info-item">
              <strong>Uppdelning:</strong>
              <span>{realBalstaPercent}% / {realAxfoodPercent}%</span>
            </div>
          </div>
        </div>

        {/* Two Lists Side by Side */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          marginTop: '1rem',
          maxWidth: '1200px',
          margin: '1rem auto 0 auto'
        }}>
          {/* Bålsta List */}
          <div className="list-section">
            <h2 style={{color: '#5ba0a0', marginBottom: '1rem'}}>
              Bålsta ({realBalstaPercent}%)
            </h2>
            <table className="results-table balsta-table">
              <thead>
                <tr>
                  <th>Artikelnummer</th>
                  <th>Beställda DFP</th>
                </tr>
              </thead>
              <tbody>
                {alignedBalstaList.length > 0 ? (
                  alignedBalstaList.map((item, index) => (
                    <tr key={index} className={item.dfp === null ? 'empty-row' : ''}>
                      <td><strong>{item.artikelnummer}</strong></td>
                      <td>{item.dfp !== null ? item.dfp : ''}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" style={{textAlign: 'center', color: '#999'}}>
                      Inga artiklar
                    </td>
                  </tr>
                )}
                <tr className="sum-row">
                  <td><strong>Summa</strong></td>
                  <td><strong>{balstaSum}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Axfood List */}
          <div className="list-section">
            <h2 style={{color: '#5ba0a0', marginBottom: '1rem'}}>
              Axfood ({realAxfoodPercent}%)
            </h2>
            <table className="results-table balsta-table">
              <thead>
                <tr>
                  <th>Artikelnummer</th>
                  <th>Beställda DFP</th>
                </tr>
              </thead>
              <tbody>
                {alignedAxfoodList.length > 0 ? (
                  alignedAxfoodList.map((item, index) => (
                    <tr key={index} className={item.dfp === null ? 'empty-row' : ''}>
                      <td><strong>{item.artikelnummer}</strong></td>
                      <td>{item.dfp !== null ? item.dfp : ''}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" style={{textAlign: 'center', color: '#999'}}>
                      Inga artiklar
                    </td>
                  </tr>
                )}
                <tr className="sum-row">
                  <td><strong>Summa</strong></td>
                  <td><strong>{axfoodSum}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Print Footer */}
        <div className="print-footer">
          <strong>{kund || 'Kund'}</strong>
        </div>
      </div>
    </div>
  );
}

export default BalstaResults;
