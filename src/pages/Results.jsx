import React, { useState, useEffect } from 'react';
import './Results.css';
import { getBoxType } from '../utils/constants';
import { getProductBoxType, productExists } from '../utils/productMapping';

function Results({ orderData, results, onBack, onEdit }) {
  const [fullPallets, setFullPallets] = useState(results.fullPalletsList);
  const [comboPallets, setComboPallets] = useState(results.comboPallets);
  const [mixPall, setMixPall] = useState(results.mixPallList);
  const palletMode = results.palletMode || 'combo'; // Get the pallet mode
  const [editingPallet, setEditingPallet] = useState(null);
  const [editingPalletIndex, setEditingPalletIndex] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPallet, setNewPallet] = useState({ artikelnummer: '', boxesPerPallet: '', count: 1 });
  const [editingComboProduct, setEditingComboProduct] = useState(null); // { comboIndex, productIndex, artikelnummer, boxCount }
  const [editingMixPallProduct, setEditingMixPallProduct] = useState(null); // { index, artikelnummer, boxCount }
  const [editingComboMixPallProduct, setEditingComboMixPallProduct] = useState(null); // { comboIndex, mixItemIndex, artikelnummer, boxCount }
  const [isAddingCombo, setIsAddingCombo] = useState(false);
  const [newComboProduct, setNewComboProduct] = useState({ artikelnummer: '', boxCount: '' });
  const [newComboSkvettpalls, setNewComboSkvettpalls] = useState([]); // Array of skvettpalls being built for new combo
  const [addingToComboIndex, setAddingToComboIndex] = useState(null); // Track which combo we're adding a skvettpall to
  const [newSkvettpallForCombo, setNewSkvettpallForCombo] = useState({ artikelnummer: '', boxCount: '' }); // New skvettpall data
  const [stash, setStash] = useState({ comboPallets: [], skvettpalls: [] }); // Stash for holding items
  const [draggedItem, setDraggedItem] = useState(null); // Track what's being dragged
  const [editingStashedComboProduct, setEditingStashedComboProduct] = useState(null); // { comboIndex, productIndex, artikelnummer, boxCount }
  const [editingStashedSkvettpall, setEditingStashedSkvettpall] = useState(null); // { index, artikelnummer, boxCount }
  const [showUnknownBanner, setShowUnknownBanner] = useState(false); // Show banner for unknown products

  // Show banner if there are unknown products
  useEffect(() => {
    if (results.unknownProducts && results.unknownProducts.length > 0) {
      setShowUnknownBanner(true);
    }
  }, [results.unknownProducts]);

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteFullPallet = (index) => {
    const newFullPallets = fullPallets.filter((_, i) => i !== index);
    setFullPallets(newFullPallets);
  };

  const handleEditPallet = (index) => {
    setEditingPalletIndex(index);
    setEditingPallet({
      artikelnummer: fullPallets[index].artikelnummer,
      boxesPerPallet: fullPallets[index].boxesPerPallet,
      palletCount: fullPallets[index].fullPallets
    });
  };

  const handleSaveEdit = () => {
    if (editingPalletIndex !== null && editingPallet) {
      const newFullPallets = [...fullPallets];
      const boxesPerPallet = parseInt(editingPallet.boxesPerPallet) || 0;
      const palletCount = parseInt(editingPallet.palletCount) || 0;
      
      newFullPallets[editingPalletIndex] = {
        ...newFullPallets[editingPalletIndex],
        artikelnummer: parseInt(editingPallet.artikelnummer) || newFullPallets[editingPalletIndex].artikelnummer,
        boxesPerPallet: boxesPerPallet,
        fullPallets: palletCount,
        totalBoxes: boxesPerPallet * palletCount
      };
      
      setFullPallets(newFullPallets);
      setEditingPalletIndex(null);
      setEditingPallet(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingPalletIndex(null);
    setEditingPallet(null);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setNewPallet({ artikelnummer: '', boxesPerPallet: '', count: 1 });
  };

  const handleSaveNew = () => {
    const artikelnummer = parseInt(newPallet.artikelnummer);
    const boxesPerPallet = parseInt(newPallet.boxesPerPallet);
    const count = parseInt(newPallet.count) || 1;

    if (artikelnummer && boxesPerPallet && boxesPerPallet > 0 && count > 0) {
      const newFullPallets = [...fullPallets, {
        artikelnummer,
        boxesPerPallet,
        fullPallets: count,
        boxType: 'red', // Default
        totalBoxes: boxesPerPallet * count
      }];
      
      setFullPallets(newFullPallets);
      setIsAddingNew(false);
      setNewPallet({ artikelnummer: '', boxesPerPallet: '', count: 1 });
    }
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setNewPallet({ artikelnummer: '', boxesPerPallet: '', count: 1 });
  };

  const handleDeletePalletBox = (palletIndex, boxIndex) => {
    const newFullPallets = [...fullPallets];
    const pallet = newFullPallets[palletIndex];
    
    if (pallet.fullPallets > 1) {
      // Remove one pallet
      pallet.fullPallets -= 1;
      pallet.totalBoxes = pallet.boxesPerPallet * pallet.fullPallets;
      setFullPallets(newFullPallets);
    } else {
      // Remove entire row if it's the last pallet
      handleDeleteFullPallet(palletIndex);
    }
  };

  const handleDeleteComboPallet = (index) => {
    const newComboPallets = comboPallets.filter((_, i) => i !== index);
    setComboPallets(newComboPallets);
  };

  const handleDeleteComboProduct = (comboIndex, productIndex) => {
    const newComboPallets = [...comboPallets];
    const combo = newComboPallets[comboIndex];
    
    if (combo.skvettpalls.length > 1) {
      // Remove one product from combo
      combo.skvettpalls = combo.skvettpalls.filter((_, i) => i !== productIndex);
      // Recalculate total height
      combo.totalHeight = combo.skvettpalls.reduce((sum, pall) => sum + pall.heightInRedUnits, 0);
      setComboPallets(newComboPallets);
    } else {
      // Remove entire combo if it's the last product
      handleDeleteComboPallet(comboIndex);
    }
  };

  const handleClickComboProduct = (comboIndex, productIndex) => {
    const combo = comboPallets[comboIndex];
    const product = combo.skvettpalls[productIndex];
    setEditingComboProduct({
      comboIndex,
      productIndex,
      artikelnummer: product.artikelnummer,
      boxCount: product.boxCount
    });
  };

  const handleSaveComboProduct = () => {
    if (!editingComboProduct) return;

    const { comboIndex, productIndex, artikelnummer, boxCount } = editingComboProduct;
    const parsedArtikelnummer = parseInt(artikelnummer);
    const parsedBoxCount = parseInt(boxCount);

    // Validate input
    if (!parsedArtikelnummer || parsedBoxCount <= 0) {
      alert('Vänligen ange ett giltigt artikelnummer och antal lådor.');
      return;
    }

    // Check if product exists
    if (!productExists(parsedArtikelnummer)) {
      alert(`Artikelnummer ${parsedArtikelnummer} finns inte i produktdatabasen.`);
      return;
    }

    // Get product box type
    const boxTypeName = getProductBoxType(parsedArtikelnummer);
    if (!boxTypeName) {
      alert(`Kunde inte hitta produktinformation för artikelnummer ${parsedArtikelnummer}.`);
      return;
    }

    const boxTypeData = getBoxType(boxTypeName);

    const newComboPallets = [...comboPallets];
    const combo = newComboPallets[comboIndex];
    const product = combo.skvettpalls[productIndex];
    
    // Update product data
    product.artikelnummer = parsedArtikelnummer;
    product.boxCount = parsedBoxCount;
    product.boxType = boxTypeName;
    product.boxConfig = boxTypeData;
    product.stackHeight = Math.ceil(parsedBoxCount / boxTypeData.boxesPerRow);
    product.heightInRedUnits = 1 + (product.stackHeight * boxTypeData.heightInRedBoxUnits);
    
    // Recalculate combo total height
    combo.totalHeight = combo.skvettpalls.reduce((sum, pall) => sum + pall.heightInRedUnits, 0);
    
    setComboPallets(newComboPallets);
    setEditingComboProduct(null);
  };

  const handleCancelComboProductEdit = () => {
    setEditingComboProduct(null);
  };

  const handleEditComboProduct = (comboIndex, productIndex, newBoxCount) => {
    const boxCount = parseInt(newBoxCount) || 0;
    if (boxCount <= 0) return;

    const newComboPallets = [...comboPallets];
    const combo = newComboPallets[comboIndex];
    const product = combo.skvettpalls[productIndex];
    
    // Update box count and recalculate stack height
    product.boxCount = boxCount;
    product.stackHeight = Math.ceil(boxCount / product.boxConfig.boxesPerRow);
    product.heightInRedUnits = 1 + (product.stackHeight * product.boxConfig.heightInRedBoxUnits);
    
    // Recalculate combo total height
    combo.totalHeight = combo.skvettpalls.reduce((sum, pall) => sum + pall.heightInRedUnits, 0);
    
    setComboPallets(newComboPallets);
  };

  const handleDeleteMixPallProduct = (index) => {
    const newMixPall = mixPall.filter((_, i) => i !== index);
    setMixPall(newMixPall);
  };

  const handleClickMixPallProduct = (index) => {
    const product = mixPall[index];
    setEditingMixPallProduct({
      index,
      artikelnummer: product.artikelnummer,
      boxCount: product.boxCount
    });
  };

  const handleSaveMixPallProduct = () => {
    if (!editingMixPallProduct) return;

    const { index, artikelnummer, boxCount } = editingMixPallProduct;
    const parsedArtikelnummer = parseInt(artikelnummer);
    const parsedBoxCount = parseInt(boxCount);

    if (parsedBoxCount <= 0) return;

    const newMixPall = [...mixPall];
    newMixPall[index] = {
      ...newMixPall[index],
      artikelnummer: parsedArtikelnummer || newMixPall[index].artikelnummer,
      boxCount: parsedBoxCount
    };
    
    setMixPall(newMixPall);
    setEditingMixPallProduct(null);
  };

  const handleCancelMixPallEdit = () => {
    setEditingMixPallProduct(null);
  };

  const handleEditMixPallProduct = (index, field, value) => {
    const newMixPall = [...mixPall];
    if (field === 'artikelnummer') {
      newMixPall[index].artikelnummer = parseInt(value) || newMixPall[index].artikelnummer;
    } else if (field === 'boxCount') {
      newMixPall[index].boxCount = parseInt(value) || 0;
    }
    setMixPall(newMixPall);
  };

  // Handlers for editing Mix pall items within combo pallets
  const handleClickComboMixPallProduct = (comboIndex, mixItemIndex) => {
    // Find the combo and get the mix pall item
    const combo = comboPallets[comboIndex];
    const mixPallSkvettpall = combo.skvettpalls.find(s => s.isMixPall);
    if (mixPallSkvettpall && mixPallSkvettpall.mixPallItems) {
      const mixItem = mixPallSkvettpall.mixPallItems[mixItemIndex];
      setEditingComboMixPallProduct({
        comboIndex,
        mixItemIndex,
        artikelnummer: mixItem.artikelnummer,
        boxCount: mixItem.boxCount
      });
    }
  };

  const handleSaveComboMixPallProduct = () => {
    if (!editingComboMixPallProduct) return;

    const { comboIndex, mixItemIndex, artikelnummer, boxCount } = editingComboMixPallProduct;
    const parsedArtikelnummer = parseInt(artikelnummer);
    const parsedBoxCount = parseInt(boxCount);

    // Validate input
    if (isNaN(parsedArtikelnummer) || parsedBoxCount <= 0) {
      alert('Ange ett giltigt artikelnummer och antal lådor.');
      return;
    }

    // Check if product exists
    if (!productExists(parsedArtikelnummer)) {
      alert(`Produkten med artikelnummer ${parsedArtikelnummer} finns inte i databasen.`);
      return;
    }

    // Get the correct box type for this product
    const boxType = getProductBoxType(parsedArtikelnummer);
    if (!boxType) {
      alert(`Kunde inte hitta lådtyp för artikelnummer ${parsedArtikelnummer}.`);
      return;
    }

    const newComboPallets = [...comboPallets];
    const combo = newComboPallets[comboIndex];
    const mixPallIndex = combo.skvettpalls.findIndex(s => s.isMixPall);
    
    if (mixPallIndex !== -1) {
      newComboPallets[comboIndex].skvettpalls[mixPallIndex].mixPallItems[mixItemIndex] = {
        ...newComboPallets[comboIndex].skvettpalls[mixPallIndex].mixPallItems[mixItemIndex],
        artikelnummer: parsedArtikelnummer,
        boxCount: parsedBoxCount,
        boxType: boxType
      };
      
      setComboPallets(newComboPallets);
    }
    
    setEditingComboMixPallProduct(null);
  };

  const handleCancelComboMixPallEdit = () => {
    setEditingComboMixPallProduct(null);
  };

  const handleDeleteComboMixPallProduct = (comboIndex, mixItemIndex) => {
    const newComboPallets = [...comboPallets];
    const combo = newComboPallets[comboIndex];
    const mixPallIndex = combo.skvettpalls.findIndex(s => s.isMixPall);
    
    if (mixPallIndex !== -1) {
      newComboPallets[comboIndex].skvettpalls[mixPallIndex].mixPallItems = 
        newComboPallets[comboIndex].skvettpalls[mixPallIndex].mixPallItems.filter((_, i) => i !== mixItemIndex);
      
      // If no items left in mix pall, remove the entire mix pall skvettpall
      if (newComboPallets[comboIndex].skvettpalls[mixPallIndex].mixPallItems.length === 0) {
        newComboPallets[comboIndex].skvettpalls = 
          newComboPallets[comboIndex].skvettpalls.filter((_, i) => i !== mixPallIndex);
      }
      
      setComboPallets(newComboPallets);
    }
  };

  // Handler to add a new product to Mix pall within a combo
  const handleAddProductToComboMixPall = (comboIndex) => {
    const newComboPallets = [...comboPallets];
    const combo = newComboPallets[comboIndex];
    const mixPallIndex = combo.skvettpalls.findIndex(s => s.isMixPall);
    
    if (mixPallIndex !== -1) {
      // Add a new empty product to the mix pall
      const newProduct = {
        artikelnummer: 0,
        boxCount: 1,
        boxType: 'red',
        boxConfig: { boxesPerRow: 8 }
      };
      
      newComboPallets[comboIndex].skvettpalls[mixPallIndex].mixPallItems.push(newProduct);
      setComboPallets(newComboPallets);
      
      // Automatically start editing the new product
      const newIndex = newComboPallets[comboIndex].skvettpalls[mixPallIndex].mixPallItems.length - 1;
      setEditingComboMixPallProduct({
        comboIndex,
        mixItemIndex: newIndex,
        artikelnummer: 0,
        boxCount: 1
      });
    }
  };

  // Handlers for editing Mix pall items within stashed combo pallets
  const handleClickStashedComboMixPallProduct = (comboIndex, mixItemIndex) => {
    const item = stash.comboPallets[comboIndex];
    const mixPallSkvettpall = item.combo.skvettpalls.find(s => s.isMixPall);
    if (mixPallSkvettpall && mixPallSkvettpall.mixPallItems) {
      const mixItem = mixPallSkvettpall.mixPallItems[mixItemIndex];
      setEditingComboMixPallProduct({
        comboIndex,
        mixItemIndex,
        artikelnummer: mixItem.artikelnummer,
        boxCount: mixItem.boxCount,
        isStashed: true
      });
    }
  };

  const handleAddProductToStashedComboMixPall = (comboIndex) => {
    const newStash = { ...stash };
    const item = newStash.comboPallets[comboIndex];
    const mixPallIndex = item.combo.skvettpalls.findIndex(s => s.isMixPall);
    
    if (mixPallIndex !== -1) {
      // Add a new empty product to the mix pall
      const newProduct = {
        artikelnummer: 0,
        boxCount: 1,
        boxType: 'red',
        boxConfig: { boxesPerRow: 8 }
      };
      
      newStash.comboPallets[comboIndex].combo.skvettpalls[mixPallIndex].mixPallItems.push(newProduct);
      setStash(newStash);
      
      // Automatically start editing the new product
      const newIndex = newStash.comboPallets[comboIndex].combo.skvettpalls[mixPallIndex].mixPallItems.length - 1;
      setEditingComboMixPallProduct({
        comboIndex,
        mixItemIndex: newIndex,
        artikelnummer: 0,
        boxCount: 1,
        isStashed: true
      });
    }
  };

  const handleSaveStashedComboMixPallProduct = () => {
    if (!editingComboMixPallProduct || !editingComboMixPallProduct.isStashed) return;

    const { comboIndex, mixItemIndex, artikelnummer, boxCount } = editingComboMixPallProduct;
    const parsedArtikelnummer = parseInt(artikelnummer);
    const parsedBoxCount = parseInt(boxCount);

    // Validate input
    if (isNaN(parsedArtikelnummer) || parsedBoxCount <= 0) {
      alert('Ange ett giltigt artikelnummer och antal lådor.');
      return;
    }

    // Check if product exists
    if (!productExists(parsedArtikelnummer)) {
      alert(`Produkten med artikelnummer ${parsedArtikelnummer} finns inte i databasen.`);
      return;
    }

    // Get the correct box type for this product
    const boxType = getProductBoxType(parsedArtikelnummer);
    if (!boxType) {
      alert(`Kunde inte hitta lådtyp för artikelnummer ${parsedArtikelnummer}.`);
      return;
    }

    const newStash = { ...stash };
    const item = newStash.comboPallets[comboIndex];
    const mixPallIndex = item.combo.skvettpalls.findIndex(s => s.isMixPall);
    
    if (mixPallIndex !== -1) {
      newStash.comboPallets[comboIndex].combo.skvettpalls[mixPallIndex].mixPallItems[mixItemIndex] = {
        ...newStash.comboPallets[comboIndex].combo.skvettpalls[mixPallIndex].mixPallItems[mixItemIndex],
        artikelnummer: parsedArtikelnummer,
        boxCount: parsedBoxCount,
        boxType: boxType
      };
      
      setStash(newStash);
    }
    
    setEditingComboMixPallProduct(null);
  };

  const handleDeleteStashedComboMixPallProduct = (comboIndex, mixItemIndex) => {
    const newStash = { ...stash };
    const item = newStash.comboPallets[comboIndex];
    const mixPallIndex = item.combo.skvettpalls.findIndex(s => s.isMixPall);
    
    if (mixPallIndex !== -1) {
      newStash.comboPallets[comboIndex].combo.skvettpalls[mixPallIndex].mixPallItems = 
        newStash.comboPallets[comboIndex].combo.skvettpalls[mixPallIndex].mixPallItems.filter((_, i) => i !== mixItemIndex);
      
      // If no items left in mix pall, remove the entire mix pall skvettpall
      if (newStash.comboPallets[comboIndex].combo.skvettpalls[mixPallIndex].mixPallItems.length === 0) {
        newStash.comboPallets[comboIndex].combo.skvettpalls = 
          newStash.comboPallets[comboIndex].combo.skvettpalls.filter((_, i) => i !== mixPallIndex);
      }
      
      setStash(newStash);
    }
  };

  const handleAddMixPallProduct = () => {
    const newMixPall = [...mixPall, {
      artikelnummer: 0,
      boxCount: 1,
      boxType: 'red',
      boxConfig: { boxesPerRow: 8 }
    }];
    setMixPall(newMixPall);
  };

  const handleAddSkvettpallToCombo = (comboIndex) => {
    setAddingToComboIndex(comboIndex);
    setNewSkvettpallForCombo({ artikelnummer: '', boxCount: '' });
  };

  const handleSaveSkvettpallToCombo = () => {
    if (addingToComboIndex === null) return;

    const artikelnummer = parseInt(newSkvettpallForCombo.artikelnummer);
    const boxCount = parseInt(newSkvettpallForCombo.boxCount);

    // Validate input
    if (!artikelnummer || !boxCount || boxCount <= 0) {
      alert('Vänligen ange ett giltigt artikelnummer och antal lådor.');
      return;
    }

    // Check if product exists
    if (!productExists(artikelnummer)) {
      alert(`Artikelnummer ${artikelnummer} finns inte i produktdatabasen.`);
      return;
    }

    // Get product box type
    const boxTypeName = getProductBoxType(artikelnummer);
    if (!boxTypeName) {
      alert(`Kunde inte hitta produktinformation för artikelnummer ${artikelnummer}.`);
      return;
    }

    const boxTypeData = getBoxType(boxTypeName);

    // Create a new skvettpall
    const newSkvettpall = {
      artikelnummer,
      boxCount,
      boxType: boxTypeName,
      boxConfig: boxTypeData,
      stackHeight: Math.ceil(boxCount / boxTypeData.boxesPerRow),
      heightInRedUnits: 1 + (Math.ceil(boxCount / boxTypeData.boxesPerRow) * boxTypeData.heightInRedBoxUnits)
    };

    // Add skvettpall to the combo
    const newComboPallets = [...comboPallets];
    const combo = newComboPallets[addingToComboIndex];
    combo.skvettpalls.push(newSkvettpall);
    
    // Recalculate combo height
    combo.totalHeight = combo.skvettpalls.reduce((sum, s) => sum + (s.heightInRedUnits || 0), 0);
    combo.palletCount = combo.skvettpalls.length;

    setComboPallets(newComboPallets);
    setAddingToComboIndex(null);
    setNewSkvettpallForCombo({ artikelnummer: '', boxCount: '' });
  };

  const handleCancelAddSkvettpallToCombo = () => {
    setAddingToComboIndex(null);
    setNewSkvettpallForCombo({ artikelnummer: '', boxCount: '' });
  };

  const handleAddCombo = () => {
    setIsAddingCombo(true);
    setNewComboProduct({ artikelnummer: '', boxCount: '' });
    setNewComboSkvettpalls([]);
  };

  const handleAddSkvettpallToNewCombo = () => {
    const artikelnummer = parseInt(newComboProduct.artikelnummer);
    const boxCount = parseInt(newComboProduct.boxCount);

    // Validate input
    if (!artikelnummer || !boxCount || boxCount <= 0) {
      alert('Vänligen ange ett giltigt artikelnummer och antal lådor.');
      return;
    }

    // Check if product exists
    if (!productExists(artikelnummer)) {
      alert(`Artikelnummer ${artikelnummer} finns inte i produktdatabasen.`);
      return;
    }

    // Get the box type for this artikelnummer
    const boxTypeName = getProductBoxType(artikelnummer);
    const boxConfig = getBoxType(boxTypeName);

    if (!boxConfig) {
      alert(`Kunde inte hitta boxkonfiguration för artikelnummer ${artikelnummer}.`);
      return;
    }

    // Calculate stack height and height in red units properly
    const stackHeight = Math.ceil(boxCount / boxConfig.boxesPerRow);
    const heightInRedUnits = 1 + (stackHeight * boxConfig.heightInRedBoxUnits);

    // Create a new skvettpall
    const newSkvettpall = {
      artikelnummer,
      boxCount,
      boxType: boxTypeName,
      boxConfig: { 
        boxesPerRow: boxConfig.boxesPerRow,
        heightInRedBoxUnits: boxConfig.heightInRedBoxUnits
      },
      stackHeight,
      heightInRedUnits
    };

    setNewComboSkvettpalls([...newComboSkvettpalls, newSkvettpall]);
    setNewComboProduct({ artikelnummer: '', boxCount: '' });
  };

  const handleDeleteSkvettpallFromNewCombo = (index) => {
    const updated = newComboSkvettpalls.filter((_, i) => i !== index);
    setNewComboSkvettpalls(updated);
  };

  const handleSaveNewCombo = () => {
    if (newComboSkvettpalls.length === 0) return;

    // Calculate total height
    const totalHeight = newComboSkvettpalls.reduce((sum, pall) => sum + pall.heightInRedUnits, 0);

    // Create a new combo pallet with all the skvettpalls
    const newCombo = {
      skvettpalls: newComboSkvettpalls,
      totalHeight
    };

    const newComboPallets = [...comboPallets, newCombo];
    setComboPallets(newComboPallets);
    setIsAddingCombo(false);
    setNewComboProduct({ artikelnummer: '', boxCount: '' });
    setNewComboSkvettpalls([]);
  };

  const handleCancelNewCombo = () => {
    setIsAddingCombo(false);
    setNewComboProduct({ artikelnummer: '', boxCount: '' });
    setNewComboSkvettpalls([]);
  };

  const getBoxTypeClass = (boxType) => {
    return `box-type-badge box-type-${boxType}`;
  };

  // Drag and Drop handlers
  const handleDragStart = (e, item, type) => {
    setDraggedItem({ ...item, type });
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedItem(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDropToStash = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (!draggedItem) return;

    if (draggedItem.type === 'combo') {
      // Add entire combo to stash
      setStash({
        ...stash,
        comboPallets: [...stash.comboPallets, draggedItem]
      });
      // Remove from comboPallets
      const newComboPallets = comboPallets.filter((_, i) => i !== draggedItem.comboIndex);
      setComboPallets(newComboPallets);
    } else if (draggedItem.type === 'skvettpall') {
      // Add skvettpall to stash
      setStash({
        ...stash,
        skvettpalls: [...stash.skvettpalls, draggedItem]
      });
      // Remove from combo
      const newComboPallets = [...comboPallets];
      const combo = newComboPallets[draggedItem.comboIndex];
      combo.skvettpalls = combo.skvettpalls.filter((_, i) => i !== draggedItem.productIndex);
      
      // If combo is empty, remove it
      if (combo.skvettpalls.length === 0) {
        setComboPallets(newComboPallets.filter((_, i) => i !== draggedItem.comboIndex));
      } else {
        // Recalculate total height
        combo.totalHeight = combo.skvettpalls.reduce((sum, pall) => sum + pall.heightInRedUnits, 0);
        setComboPallets(newComboPallets);
      }
    }
  };

  const handleRemoveFromStash = (type, index) => {
    if (type === 'combo') {
      const newStash = { ...stash };
      newStash.comboPallets = newStash.comboPallets.filter((_, i) => i !== index);
      setStash(newStash);
    } else if (type === 'skvettpall') {
      const newStash = { ...stash };
      newStash.skvettpalls = newStash.skvettpalls.filter((_, i) => i !== index);
      setStash(newStash);
    }
  };

  const handleMoveFromStashToCombos = (type, index) => {
    if (type === 'combo') {
      const item = stash.comboPallets[index];
      setComboPallets([...comboPallets, item.combo]);
      handleRemoveFromStash('combo', index);
    } else if (type === 'skvettpall') {
      const item = stash.skvettpalls[index];
      // Create a new combo with this skvettpall
      const newCombo = {
        skvettpalls: [item.skvettpall],
        totalHeight: item.skvettpall.heightInRedUnits
      };
      setComboPallets([...comboPallets, newCombo]);
      handleRemoveFromStash('skvettpall', index);
    }
  };

  // Handlers for editing stashed combo skvettpalls
  const handleClickStashedComboProduct = (comboIndex, productIndex) => {
    const combo = stash.comboPallets[comboIndex].combo;
    const product = combo.skvettpalls[productIndex];
    setEditingStashedComboProduct({
      comboIndex,
      productIndex,
      artikelnummer: product.artikelnummer,
      boxCount: product.boxCount
    });
  };

  const handleSaveStashedComboProduct = () => {
    if (!editingStashedComboProduct) return;

    const { comboIndex, productIndex, artikelnummer, boxCount } = editingStashedComboProduct;
    const parsedArtikelnummer = parseInt(artikelnummer);
    const parsedBoxCount = parseInt(boxCount);

    // Validate input
    if (isNaN(parsedArtikelnummer) || parsedBoxCount <= 0) {
      alert('Ange ett giltigt artikelnummer och antal lådor.');
      return;
    }

    // Check if product exists
    if (!productExists(parsedArtikelnummer)) {
      alert(`Produkten med artikelnummer ${parsedArtikelnummer} finns inte i databasen.`);
      return;
    }

    // Get the correct box type for this product
    const boxType = getProductBoxType(parsedArtikelnummer);
    if (!boxType) {
      alert(`Kunde inte hitta lådtyp för artikelnummer ${parsedArtikelnummer}.`);
      return;
    }

    const newStash = { ...stash };
    const combo = newStash.comboPallets[comboIndex].combo;
    const product = combo.skvettpalls[productIndex];

    // Get the box configuration for the new box type
    const boxConfig = getBoxType(boxType);

    // Update the product with correct box configuration
    product.artikelnummer = parsedArtikelnummer;
    product.boxCount = parsedBoxCount;
    product.boxType = boxType;
    product.boxConfig = boxConfig;
    
    // Recalculate stack height and height in red units with correct box configuration
    product.stackHeight = Math.ceil(parsedBoxCount / boxConfig.boxesPerRow);
    product.heightInRedUnits = 1 + (product.stackHeight * boxConfig.heightInRedBoxUnits);
    
    // Recalculate combo total height
    combo.totalHeight = combo.skvettpalls.reduce((sum, pall) => sum + pall.heightInRedUnits, 0);
    
    setStash(newStash);
    setEditingStashedComboProduct(null);
  };

  const handleCancelStashedComboProductEdit = () => {
    setEditingStashedComboProduct(null);
  };

  // Handlers for editing individual stashed skvettpalls
  const handleClickStashedSkvettpall = (index) => {
    const item = stash.skvettpalls[index];
    setEditingStashedSkvettpall({
      index,
      artikelnummer: item.skvettpall.artikelnummer,
      boxCount: item.skvettpall.boxCount
    });
  };

  const handleSaveStashedSkvettpall = () => {
    if (!editingStashedSkvettpall) return;

    const { index, artikelnummer, boxCount } = editingStashedSkvettpall;
    const parsedArtikelnummer = parseInt(artikelnummer);
    const parsedBoxCount = parseInt(boxCount);

    // Validate input
    if (isNaN(parsedArtikelnummer) || parsedBoxCount <= 0) {
      alert('Ange ett giltigt artikelnummer och antal lådor.');
      return;
    }

    // Check if product exists
    if (!productExists(parsedArtikelnummer)) {
      alert(`Produkten med artikelnummer ${parsedArtikelnummer} finns inte i databasen.`);
      return;
    }

    // Get the correct box type for this product
    const boxType = getProductBoxType(parsedArtikelnummer);
    if (!boxType) {
      alert(`Kunde inte hitta lådtyp för artikelnummer ${parsedArtikelnummer}.`);
      return;
    }

    const newStash = { ...stash };
    const product = newStash.skvettpalls[index].skvettpall;

    // Get the box configuration for the new box type
    const boxConfig = getBoxType(boxType);

    // Update the product with correct box configuration
    product.artikelnummer = parsedArtikelnummer;
    product.boxCount = parsedBoxCount;
    product.boxType = boxType;
    product.boxConfig = boxConfig;
    
    // Recalculate stack height and height in red units with correct box configuration
    product.stackHeight = Math.ceil(parsedBoxCount / boxConfig.boxesPerRow);
    product.heightInRedUnits = 1 + (product.stackHeight * boxConfig.heightInRedBoxUnits);
    
    setStash(newStash);
    setEditingStashedSkvettpall(null);
  };

  const handleCancelStashedSkvettpallEdit = () => {
    setEditingStashedSkvettpall(null);
  };

  // Calculate totals dynamically based on current state
  const totalFullPalletCount = fullPallets.reduce((sum, p) => sum + p.fullPallets, 0);
  const totalComboPalletCount = comboPallets.length;
  const totalMixPallCount = mixPall.length > 0 ? 1 : 0;
  const totalParcels = totalFullPalletCount + totalComboPalletCount + totalMixPallCount;
  
  // Calculate total boxes (lådor) from current state
  const totalBoxesFromFullPallets = fullPallets.reduce((sum, p) => sum + p.totalBoxes, 0);
  const totalBoxesFromComboPallets = comboPallets.reduce((sum, combo) => {
    return sum + combo.skvettpalls.reduce((s, pall) => s + pall.boxCount, 0);
  }, 0);
  const totalBoxesFromMixPall = mixPall.reduce((sum, item) => sum + item.boxCount, 0);
  const totalBoxes = totalBoxesFromFullPallets + totalBoxesFromComboPallets + totalBoxesFromMixPall;
  
  // Calculate total SRS Pallets (EU pallets) from current state
  // Each full pallet = 1 SRS pallet
  // Each skvettpall in combo pallets = 1 SRS pallet (they're stacked on top of each other)
  // Mix pall = 1 SRS pallet
  const totalEUPalletsFromFullPallets = totalFullPalletCount;
  const totalEUPalletsFromComboPallets = comboPallets.reduce((sum, combo) => {
    return sum + combo.skvettpalls.length; // Each skvettpall is on its own EU pallet
  }, 0);
  const totalEUPalletsFromMixPall = totalMixPallCount;
  const totalEUPallets = totalEUPalletsFromFullPallets + totalEUPalletsFromComboPallets + totalEUPalletsFromMixPall;

  return (
    <div className="results-container">
      <div className="results-header">
        <div className="header-layout">
          {/* Center: Title, Order Info, and Stats */}
          <div className="header-center">
            <h1>Plocklista Generator - Resultat</h1>
            
            <div className="order-info">
              <div className="info-item">
                <span className="info-label">Kund</span>
                <span className="info-value">{orderData.kund || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Datum</span>
                <span className="info-value">{orderData.datum || '-'}</span>
              </div>
              {orderData.ordersnummer && (
                <div className="info-item">
                  <span className="info-label">Ordersnummer</span>
                  <span className="info-value">{orderData.ordersnummer}</span>
                </div>
              )}
              <div className="info-item print-only">
                <span className="info-label">Lådor</span>
                <span className="info-value">{totalBoxes}</span>
              </div>
              <div className="info-item print-only">
                <span className="info-label">SRS Pall</span>
                <span className="info-value">{totalEUPallets}</span>
              </div>
              <div className="info-item print-only">
                <span className="info-label">Kolli</span>
                <span className="info-value">{totalParcels}</span>
              </div>
              {(palletMode === 'enkel' || palletMode === 'helsingborg') && results.truckSlots !== null && (
                <div className="info-item print-only">
                  <span className="info-label">Platser</span>
                  <span className="info-value">{results.truckSlots}</span>
                </div>
              )}
            </div>

            <div className="summary-stats">
              <div className="stat-card">
                <div className="stat-label">Lådor</div>
                <div className="stat-value">{totalBoxes}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">SRS Pall</div>
                <div className="stat-value">{totalEUPallets}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Kolli</div>
                <div className="stat-value">{totalParcels}</div>
              </div>
              {(palletMode === 'enkel' || palletMode === 'helsingborg') && results.truckSlots !== null && (
                <div className="stat-card">
                  <div className="stat-label">Platser</div>
                  <div className="stat-value">{results.truckSlots}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Action Buttons within header */}
        <div className="header-action-buttons">
          <button className="btn btn-secondary" onClick={onBack}>
            ← Tillbaka
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            🖨️ Skriv ut
          </button>
        </div>
      </div>

      {/* Three Column Layout - Stash (1/3) + Combo Pallar (1/3) + Fulla Pallar (1/3) */}
      <div className="pallets-grid">
        {/* Stash Section - Takes 1/3 of the page (LEFT) */}
        <div className="pallets-section">
          <div className="section-header">
            <div className="section-header-top">
              <h2 className="section-title">Stash</h2>
              <span className="section-count">
                {stash.comboPallets.length + stash.skvettpalls.length} items
              </span>
            </div>
          </div>
          
          {/* Unknown Products Banner */}
          {showUnknownBanner && results.unknownProducts && results.unknownProducts.length > 0 && (
            <div className="unknown-products-banner">
              <div className="banner-header">
                <span className="banner-icon">⚠️</span>
                <span className="banner-title">Okända produkter upptäcktes</span>
                <button 
                  className="banner-close" 
                  onClick={() => setShowUnknownBanner(false)}
                  title="Stäng"
                >
                  ✕
                </button>
              </div>
              <div className="banner-content">
                <p>Följande produkter finns inte i databasen:</p>
                <ul>
                  {results.unknownProducts.map((product, index) => (
                    <li key={index}>
                      <strong>Artikelnummer:</strong> {product.artikelnummer} 
                      <span className="product-count"> ({product.boxCount} DFP)</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          <div 
            className={`section-content stash-drop-zone ${stash.comboPallets.length === 0 && stash.skvettpalls.length === 0 ? 'stash-empty' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropToStash}
          >
            {stash.comboPallets.length === 0 && stash.skvettpalls.length === 0 ? (
              <div style={{textAlign: 'center', padding: '3rem 1rem', color: '#999'}}>
                <p>Dra combo pallar eller skvettpalls hit</p>
              </div>
            ) : (
              <>
                {/* Stashed Combo Pallets */}
                {stash.comboPallets.map((item, index) => (
                  <div key={`combo-${index}`} className="combo-pallet-item" style={{marginBottom: '1rem'}}>
                    <div className="combo-header">
                      <span className="combo-title">Stashed Pall #{index + 1}</span>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span className="combo-height" title="Höjden i röda backar enhet">
                          {(item.combo.totalHeight - 1).toFixed(2)}
                        </span>
                        <button 
                          className="btn btn-primary" 
                          onClick={() => handleMoveFromStashToCombos('combo', index)}
                          title="Flytta tillbaka"
                          style={{fontSize: '0.7rem', padding: '0.25rem 0.5rem'}}
                        >
                          ↩ Tillbaka
                        </button>
                        <button 
                          className="icon-btn delete" 
                          onClick={() => handleRemoveFromStash('combo', index)}
                          title="Ta bort"
                          style={{fontSize: '0.9rem', padding: '0.25rem'}}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div className="combo-products">
                      {item.combo.skvettpalls.map((skvettpall, pallIndex) => {
                        const isEditing = editingStashedComboProduct?.comboIndex === index && editingStashedComboProduct?.productIndex === pallIndex;
                        const isMixPall = skvettpall.isMixPall;
                        
                        return (
                          <div key={pallIndex} className={`combo-product-line ${isEditing ? 'editing' : ''}`} style={{fontSize: '0.85rem', padding: '0.4rem'}}>
                            {isMixPall ? (
                              // Display mix pall items
                              <div style={{width: '100%'}}>
                                <div style={{
                                  marginBottom: '0.5rem', 
                                  fontWeight: 600, 
                                  color: '#5ba0a0', 
                                  textAlign: 'left', 
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <span>Mix</span>
                                  <button 
                                    className="icon-btn" 
                                    onClick={() => handleAddProductToStashedComboMixPall(index)}
                                    style={{
                                      fontSize: '0.9rem', 
                                      padding: '0.15rem 0.35rem',
                                      background: '#5ba0a0',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                    title="Lägg till produkt"
                                  >
                                    +
                                  </button>
                                </div>
                                {skvettpall.mixPallItems && [...skvettpall.mixPallItems].sort((a, b) => b.boxCount - a.boxCount).map((mixItem, mixIdx) => {
                                  const isMixItemEditing = editingComboMixPallProduct?.comboIndex === index && editingComboMixPallProduct?.mixItemIndex === mixIdx && editingComboMixPallProduct?.isStashed;
                                  
                                  return (
                                    <div key={mixIdx} className={`combo-product-line ${isMixItemEditing ? 'editing' : ''}`} style={{
                                      fontSize: '0.75rem',
                                      padding: '0.25rem 0.5rem',
                                      marginBottom: '0.25rem',
                                      background: '#f8f9fa',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      {isMixItemEditing ? (
                                        <>
                                          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                            <input
                                              type="number"
                                              className="edit-input"
                                              value={editingComboMixPallProduct.artikelnummer}
                                              onChange={(e) => setEditingComboMixPallProduct({...editingComboMixPallProduct, artikelnummer: e.target.value})}
                                              placeholder="Art.nr"
                                              style={{width: '70px', padding: '0.25rem', fontSize: '0.75rem'}}
                                            />
                                            <input
                                              type="number"
                                              className="edit-input"
                                              value={editingComboMixPallProduct.boxCount}
                                              onChange={(e) => setEditingComboMixPallProduct({...editingComboMixPallProduct, boxCount: e.target.value})}
                                              placeholder="Antal"
                                              style={{width: '50px', padding: '0.25rem', fontSize: '0.75rem'}}
                                            />
                                          </div>
                                          <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                                            <button 
                                              className="icon-btn save" 
                                              onClick={handleSaveStashedComboMixPallProduct}
                                              title="Spara"
                                              style={{fontSize: '0.8rem', padding: '0.2rem'}}
                                            >
                                              ✓
                                            </button>
                                            <button 
                                              className="icon-btn cancel" 
                                              onClick={handleCancelComboMixPallEdit}
                                              title="Avbryt"
                                              style={{fontSize: '0.8rem', padding: '0.2rem'}}
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <span 
                                            onClick={() => handleClickStashedComboMixPallProduct(index, mixIdx)}
                                            style={{
                                              cursor: 'pointer',
                                              flex: 1,
                                              padding: '0.25rem',
                                              borderRadius: '4px',
                                              transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#e0e0e0'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            title="Klicka för att redigera"
                                          >
                                            <strong>{mixItem.artikelnummer}:</strong> {mixItem.boxCount}
                                          </span>
                                          <button 
                                            className="icon-btn delete small" 
                                            onClick={() => handleDeleteStashedComboMixPallProduct(index, mixIdx)}
                                            title="Ta bort"
                                            style={{fontSize: '0.7rem', padding: '0.15rem'}}
                                          >
                                            ×
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : isEditing ? (
                              <>
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                  <input
                                    type="number"
                                    className="edit-input"
                                    value={editingStashedComboProduct.artikelnummer}
                                    onChange={(e) => setEditingStashedComboProduct({...editingStashedComboProduct, artikelnummer: e.target.value})}
                                    placeholder="Art.nr"
                                    style={{width: '80px', padding: '0.3rem'}}
                                  />
                                  <input
                                    type="number"
                                    className="edit-input"
                                    value={editingStashedComboProduct.boxCount}
                                    onChange={(e) => setEditingStashedComboProduct({...editingStashedComboProduct, boxCount: e.target.value})}
                                    placeholder="Antal"
                                    style={{width: '60px', padding: '0.3rem'}}
                                  />
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                                  <button 
                                    className="icon-btn save" 
                                    onClick={handleSaveStashedComboProduct}
                                    title="Spara"
                                    style={{fontSize: '1rem'}}
                                  >
                                    ✓
                                  </button>
                                  <button 
                                    className="icon-btn cancel" 
                                    onClick={handleCancelStashedComboProductEdit}
                                    title="Avbryt"
                                    style={{fontSize: '1rem'}}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <span 
                                  onClick={() => handleClickStashedComboProduct(index, pallIndex)}
                                  style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'}}
                                >
                                  <strong>{skvettpall.artikelnummer}:</strong>
                                  <strong>{skvettpall.boxCount}</strong>
                                </span>
                                <span 
                                  onClick={() => handleClickStashedComboProduct(index, pallIndex)}
                                  style={{cursor: 'pointer'}}
                                >
                                  ({skvettpall.stackHeight}r)
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Stashed Individual Skvettpalls */}
                {stash.skvettpalls.map((item, index) => {
                  const isEditing = editingStashedSkvettpall?.index === index;
                  
                  return (
                    <div key={`skvettpall-${index}`} className="combo-pallet-item" style={{marginBottom: '1rem'}}>
                      <div className="combo-header">
                        <span className="combo-title">Stashed Skvettpall</span>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <button 
                            className="btn btn-primary" 
                            onClick={() => handleMoveFromStashToCombos('skvettpall', index)}
                            title="Flytta tillbaka"
                            style={{fontSize: '0.7rem', padding: '0.25rem 0.5rem'}}
                          >
                            ↩ Tillbaka
                          </button>
                          <button 
                            className="icon-btn delete" 
                            onClick={() => handleRemoveFromStash('skvettpall', index)}
                            title="Ta bort"
                            style={{fontSize: '0.9rem', padding: '0.25rem'}}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div className="combo-products">
                        <div className={`combo-product-line ${isEditing ? 'editing' : ''}`} style={{fontSize: '0.85rem', padding: '0.4rem'}}>
                          {isEditing ? (
                            <>
                              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <input
                                  type="number"
                                  className="edit-input"
                                  value={editingStashedSkvettpall.artikelnummer}
                                  onChange={(e) => setEditingStashedSkvettpall({...editingStashedSkvettpall, artikelnummer: e.target.value})}
                                  placeholder="Art.nr"
                                  style={{width: '80px', padding: '0.3rem'}}
                                />
                                <input
                                  type="number"
                                  className="edit-input"
                                  value={editingStashedSkvettpall.boxCount}
                                  onChange={(e) => setEditingStashedSkvettpall({...editingStashedSkvettpall, boxCount: e.target.value})}
                                  placeholder="Antal"
                                  style={{width: '60px', padding: '0.3rem'}}
                                />
                              </div>
                              <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                                <button 
                                  className="icon-btn save" 
                                  onClick={handleSaveStashedSkvettpall}
                                  title="Spara"
                                  style={{fontSize: '1rem'}}
                                >
                                  ✓
                                </button>
                                <button 
                                  className="icon-btn cancel" 
                                  onClick={handleCancelStashedSkvettpallEdit}
                                  title="Avbryt"
                                  style={{fontSize: '1rem'}}
                                >
                                  ✕
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <span 
                                onClick={() => handleClickStashedSkvettpall(index)}
                                style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'}}
                              >
                                <strong>{item.skvettpall.artikelnummer}:</strong>
                                <strong>{item.skvettpall.boxCount}</strong>
                              </span>
                              <span 
                                onClick={() => handleClickStashedSkvettpall(index)}
                                style={{cursor: 'pointer'}}
                              >
                                ({item.skvettpall.stackHeight}r)
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Combo Pallets Section - Takes 1/3 of the page (MIDDLE) */}
        <div className="pallets-section">
          <div className="section-header">
            <div className="section-header-top">
              <h2 className="section-title">
                {palletMode === 'enkel' ? 'Enkel' : palletMode === 'helsingborg' ? 'Enkel' : 'Combo'}
              </h2>
              <span className="section-count">{comboPallets.length + (mixPall.length > 0 ? 1 : 0)} pallar</span>
            </div>
            <button className="btn btn-primary" onClick={handleAddCombo} style={{padding: '0.5rem 1rem', fontSize: '0.85rem', width: '100%'}}>
              + Lägg till Combo
            </button>
          </div>
          
          <div className="section-content">
            {isAddingCombo && (
              <div className="combo-pallet-item" style={{border: '2px solid #5ba0a0'}}>
                <div className="combo-header">
                  <span className="combo-title">Ny Combo Pall</span>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    {newComboSkvettpalls.length > 0 && (
                      <span className="combo-height" title="Höjden i röda backar enhet">
                        {(newComboSkvettpalls.reduce((sum, p) => sum + p.heightInRedUnits, 0) - 1).toFixed(2)}
                      </span>
                    )}
                    <button 
                      className="btn btn-primary" 
                      onClick={handleSaveNewCombo}
                      disabled={newComboSkvettpalls.length === 0}
                      style={{padding: '0.35rem 0.75rem', fontSize: '0.8rem'}}
                    >
                      Spara Combo
                    </button>
                    <button 
                      className="icon-btn cancel" 
                      onClick={handleCancelNewCombo}
                      title="Avbryt"
                      style={{fontSize: '0.9rem', padding: '0.25rem'}}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                <div className="combo-products">
                  {/* Existing skvettpalls in the new combo */}
                  {newComboSkvettpalls.map((skvettpall, index) => (
                    <div key={index} className="combo-product-line" style={{fontSize: '0.85rem', padding: '0.4rem'}}>
                      <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <strong>{skvettpall.artikelnummer}:</strong>
                        <strong>{skvettpall.boxCount}</strong>
                      </span>
                      <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                        <span>({skvettpall.stackHeight}r)</span>
                        <button 
                          className="icon-btn delete small" 
                          onClick={() => handleDeleteSkvettpallFromNewCombo(index)}
                          title="Ta bort"
                          style={{fontSize: '0.8rem', padding: '0.2rem'}}
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  ))}
                  
                  {/* Input form to add new skvettpall */}
                  <div className="combo-product-line editing" style={{fontSize: '0.85rem', padding: '0.4rem'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                      <span>Art.</span>
                      <input
                        type="number"
                        className="edit-input"
                        value={newComboProduct.artikelnummer}
                        onChange={(e) => setNewComboProduct({...newComboProduct, artikelnummer: e.target.value})}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddSkvettpallToNewCombo();
                          }
                        }}
                        placeholder="Art.nr"
                        style={{width: '80px', padding: '0.3rem'}}
                      />
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                      <input
                        type="number"
                        className="edit-input"
                        value={newComboProduct.boxCount}
                        onChange={(e) => setNewComboProduct({...newComboProduct, boxCount: e.target.value})}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddSkvettpallToNewCombo();
                          }
                        }}
                        placeholder="Lådor"
                        style={{width: '60px', padding: '0.3rem'}}
                      />
                      <button 
                        className="icon-btn save" 
                        onClick={handleAddSkvettpallToNewCombo}
                        title="Lägg till skvettpall"
                        style={{fontSize: '1rem'}}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {comboPallets.length > 0 ? (
              <>
                {[...comboPallets]
                  .map((combo, originalIndex) => ({ combo, originalIndex }))
                  .sort((a, b) => {
                    // Check if combo contains mix pall
                    const aHasMixPall = a.combo.skvettpalls.some(s => s.isMixPall);
                    const bHasMixPall = b.combo.skvettpalls.some(s => s.isMixPall);
                    
                    // If one has mix pall and other doesn't, put mix pall last
                    if (aHasMixPall && !bHasMixPall) return 1;
                    if (!aHasMixPall && bHasMixPall) return -1;
                    
                    // Otherwise sort by height (highest to lowest)
                    return b.combo.totalHeight - a.combo.totalHeight;
                  })
                  .map(({ combo, originalIndex: comboIndex }, displayIndex) => (
                  <div 
                    key={comboIndex} 
                    className="combo-pallet-item"
                  >
                    <div 
                      className="combo-header draggable"
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, { combo, comboIndex }, 'combo')}
                      onDragEnd={handleDragEnd}
                    >
                      <span className="combo-title">Pall #{displayIndex + 1}</span>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span className="combo-height" title="Höjden i röda backar enhet">
                          {(combo.totalHeight - 1).toFixed(2)}
                        </span>
                        <button 
                          className="icon-btn add" 
                          onClick={() => handleAddSkvettpallToCombo(comboIndex)}
                          onMouseDown={(e) => e.stopPropagation()}
                          title="Lägg till skvettpall"
                          style={{fontSize: '0.9rem', padding: '0.25rem'}}
                        >
                          ➕
                        </button>
                        <button 
                          className="icon-btn delete" 
                          onClick={() => handleDeleteComboPallet(comboIndex)}
                          onMouseDown={(e) => e.stopPropagation()}
                          title="Radera"
                          style={{fontSize: '0.9rem', padding: '0.25rem'}}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div className="combo-products">
                      {[...combo.skvettpalls]
                        .sort((a, b) => {
                          // Sort so mix pall is always last
                          if (a.isMixPall && !b.isMixPall) return 1;
                          if (!a.isMixPall && b.isMixPall) return -1;
                          return 0;
                        })
                        .map((skvettpall, sortedIndex) => {
                        // Find original index for editing operations
                        const pallIndex = combo.skvettpalls.indexOf(skvettpall);
                        const isEditing = editingComboProduct?.comboIndex === comboIndex && editingComboProduct?.productIndex === pallIndex;
                        
                        // Check if this is a mix pall
                        const isMixPall = skvettpall.isMixPall;
                        
                        return (
                          <div 
                            key={pallIndex} 
                            className={`combo-product-line ${isEditing ? 'editing' : ''} ${!isMixPall ? 'draggable' : ''}`}
                            draggable={!isEditing && !isMixPall}
                            onDragStart={(e) => {
                              if (!isEditing && !isMixPall) {
                                e.stopPropagation();
                                handleDragStart(e, { skvettpall, comboIndex, productIndex: pallIndex }, 'skvettpall');
                              }
                            }}
                            onDragEnd={(e) => {
                              if (!isMixPall) {
                                e.stopPropagation();
                                handleDragEnd(e);
                              }
                            }}
                            style={{fontSize: '0.85rem', padding: '0.4rem'}}
                          >
                            {isMixPall ? (
                              // Display mix pall items
                              <div style={{width: '100%'}}>
                                <div style={{
                                  marginBottom: '0.5rem', 
                                  fontWeight: 600, 
                                  color: '#5ba0a0', 
                                  textAlign: 'left',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <span>Mix</span>
                                  <button 
                                    className="icon-btn" 
                                    onClick={() => handleAddProductToComboMixPall(comboIndex)}
                                    style={{
                                      fontSize: '1rem', 
                                      padding: '0.15rem 0.4rem',
                                      background: '#5ba0a0',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                    title="Lägg till produkt"
                                  >
                                    +
                                  </button>
                                </div>
                                {skvettpall.mixPallItems && [...skvettpall.mixPallItems].sort((a, b) => b.boxCount - a.boxCount).map((mixItem, mixIdx) => {
                                  const isMixItemEditing = editingComboMixPallProduct?.comboIndex === comboIndex && editingComboMixPallProduct?.mixItemIndex === mixIdx;
                                  
                                  return (
                                    <div key={mixIdx} className={`combo-product-line ${isMixItemEditing ? 'editing' : ''}`} style={{
                                      fontSize: '0.8rem',
                                      padding: '0.25rem 0.5rem',
                                      marginBottom: '0.25rem',
                                      background: '#f8f9fa',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      {isMixItemEditing ? (
                                        <>
                                          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                            <input
                                              type="number"
                                              className="edit-input"
                                              value={editingComboMixPallProduct.artikelnummer}
                                              onChange={(e) => setEditingComboMixPallProduct({...editingComboMixPallProduct, artikelnummer: e.target.value})}
                                              placeholder="Art.nr"
                                              style={{width: '70px', padding: '0.25rem', fontSize: '0.8rem'}}
                                            />
                                            <input
                                              type="number"
                                              className="edit-input"
                                              value={editingComboMixPallProduct.boxCount}
                                              onChange={(e) => setEditingComboMixPallProduct({...editingComboMixPallProduct, boxCount: e.target.value})}
                                              placeholder="Antal"
                                              style={{width: '50px', padding: '0.25rem', fontSize: '0.8rem'}}
                                            />
                                          </div>
                                          <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                                            <button 
                                              className="icon-btn save" 
                                              onClick={handleSaveComboMixPallProduct}
                                              title="Spara"
                                              style={{fontSize: '0.9rem', padding: '0.2rem'}}
                                            >
                                              ✓
                                            </button>
                                            <button 
                                              className="icon-btn cancel" 
                                              onClick={handleCancelComboMixPallEdit}
                                              title="Avbryt"
                                              style={{fontSize: '0.9rem', padding: '0.2rem'}}
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <span 
                                            onClick={() => handleClickComboMixPallProduct(comboIndex, mixIdx)}
                                            style={{
                                              cursor: 'pointer',
                                              flex: 1,
                                              padding: '0.25rem',
                                              borderRadius: '4px',
                                              transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#e0e0e0'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            title="Klicka för att redigera"
                                          >
                                            <strong>{mixItem.artikelnummer}:</strong> {mixItem.boxCount}
                                          </span>
                                          <button 
                                            className="icon-btn delete small" 
                                            onClick={() => handleDeleteComboMixPallProduct(comboIndex, mixIdx)}
                                            title="Ta bort"
                                            style={{fontSize: '0.7rem', padding: '0.15rem'}}
                                          >
                                            ×
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : isEditing ? (
                              <>
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                  <input
                                    type="number"
                                    className="edit-input"
                                    value={editingComboProduct.artikelnummer}
                                    onChange={(e) => setEditingComboProduct({...editingComboProduct, artikelnummer: e.target.value})}
                                    placeholder="Art.nr"
                                    style={{width: '80px', padding: '0.3rem'}}
                                  />
                                  <input
                                    type="number"
                                    className="edit-input"
                                    value={editingComboProduct.boxCount}
                                    onChange={(e) => setEditingComboProduct({...editingComboProduct, boxCount: e.target.value})}
                                    placeholder="Antal"
                                    style={{width: '60px', padding: '0.3rem'}}
                                  />
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                                  <button 
                                    className="icon-btn save" 
                                    onClick={handleSaveComboProduct}
                                    title="Spara"
                                    style={{fontSize: '1rem'}}
                                  >
                                    ✓
                                  </button>
                                  <button 
                                    className="icon-btn cancel" 
                                    onClick={handleCancelComboProductEdit}
                                    title="Avbryt"
                                    style={{fontSize: '1rem'}}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <span 
                                  onClick={() => handleClickComboProduct(comboIndex, pallIndex)}
                                  style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'}}
                                >
                                  <strong>{skvettpall.artikelnummer}:</strong>
                                  <strong>{skvettpall.boxCount}</strong>
                                </span>
                                <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                                  <span 
                                    onClick={() => handleClickComboProduct(comboIndex, pallIndex)}
                                    style={{cursor: 'pointer'}}
                                  >
                                    ({skvettpall.stackHeight}r)
                                  </span>
                                  <button 
                                    className="icon-btn delete small" 
                                    onClick={() => handleDeleteComboProduct(comboIndex, pallIndex)}
                                    title="Ta bort"
                                    style={{fontSize: '0.8rem', padding: '0.2rem'}}
                                  >
                                    ×
                                  </button>
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Add skvettpall to existing combo */}
                      {addingToComboIndex === comboIndex && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem',
                          background: '#f8f9fa',
                          borderRadius: '4px',
                          marginTop: '0.5rem'
                        }}>
                          <input
                            type="number"
                            className="edit-input"
                            value={newSkvettpallForCombo.artikelnummer}
                            onChange={(e) => setNewSkvettpallForCombo({...newSkvettpallForCombo, artikelnummer: e.target.value})}
                            placeholder="Art.nr"
                            style={{width: '80px', padding: '0.3rem', fontSize: '0.85rem'}}
                          />
                          <input
                            type="number"
                            className="edit-input"
                            value={newSkvettpallForCombo.boxCount}
                            onChange={(e) => setNewSkvettpallForCombo({...newSkvettpallForCombo, boxCount: e.target.value})}
                            placeholder="Antal"
                            style={{width: '60px', padding: '0.3rem', fontSize: '0.85rem'}}
                          />
                          <button 
                            className="icon-btn save" 
                            onClick={handleSaveSkvettpallToCombo}
                            title="Spara"
                            style={{fontSize: '1rem'}}
                          >
                            ✓
                          </button>
                          <button 
                            className="icon-btn cancel" 
                            onClick={handleCancelAddSkvettpallToCombo}
                            title="Avbryt"
                            style={{fontSize: '1rem'}}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="no-data">
                {palletMode === 'enkel' || palletMode === 'helsingborg' ? 'Inga enkel' : 'Inga combo'}
              </div>
            )}

            {/* Mix Pall for Enkel and Helsingborg modes */}
            {(palletMode === 'enkel' || palletMode === 'helsingborg') && mixPall.length > 0 && (
              <div className="combo-pallet-item mix-pall-item" style={{marginTop: '1rem'}}>
                <div className="combo-header">
                  <span className="combo-title">Mix Pall</span>
                  <button 
                    className="icon-btn" 
                    onClick={handleAddMixPallProduct} 
                    style={{
                      fontSize: '1rem', 
                      padding: '0.15rem 0.4rem',
                      background: '#5ba0a0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    title="Lägg till produkt"
                  >
                    +
                  </button>
                </div>
                
                <div className="combo-products">
                  {[...mixPall].sort((a, b) => b.boxCount - a.boxCount).map((item, index) => {
                    const isEditing = editingMixPallProduct?.index === index;
                    
                    return (
                      <div key={index} className={`combo-product-line ${isEditing ? 'editing' : ''}`} style={{fontSize: '0.85rem', padding: '0.4rem'}}>
                        {isEditing ? (
                          <>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                              <input
                                type="number"
                                className="edit-input"
                                value={editingMixPallProduct.artikelnummer}
                                onChange={(e) => setEditingMixPallProduct({...editingMixPallProduct, artikelnummer: e.target.value})}
                                placeholder="Art.nr"
                                style={{width: '80px', padding: '0.3rem'}}
                              />
                              <input
                                type="number"
                                className="edit-input"
                                value={editingMixPallProduct.boxCount}
                                onChange={(e) => setEditingMixPallProduct({...editingMixPallProduct, boxCount: e.target.value})}
                                placeholder="Antal"
                                style={{width: '60px', padding: '0.3rem'}}
                              />
                            </div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                              <button 
                                className="icon-btn save" 
                                onClick={handleSaveMixPallProduct}
                                title="Spara"
                                style={{fontSize: '1rem'}}
                              >
                                ✓
                              </button>
                              <button 
                                className="icon-btn cancel" 
                                onClick={handleCancelMixPallEdit}
                                title="Avbryt"
                                style={{fontSize: '1rem'}}
                              >
                                ✕
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span 
                              onClick={() => handleClickMixPallProduct(index)}
                              style={{
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              title="Klicka för att redigera"
                            >
                              <strong>{item.artikelnummer}:</strong>
                              <strong>{item.boxCount}</strong>
                            </span>
                            <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                              <button 
                                className="icon-btn delete small" 
                                onClick={() => handleDeleteMixPallProduct(index)}
                                title="Ta bort"
                                style={{fontSize: '0.8rem', padding: '0.2rem'}}
                              >
                                ×
                              </button>
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full Pallets Section - Takes 1/3 of the page */}
        <div className="pallets-section">
          <div className="section-header">
            <div className="section-header-top">
              <h2 className="section-title">Full Pall</h2>
              <span className="section-count">{totalFullPalletCount} pallar</span>
            </div>
            <button className="btn btn-primary" onClick={handleAddNew} style={{padding: '0.5rem 1rem', fontSize: '0.85rem', width: '100%'}}>
              + Lägg till
            </button>
          </div>
          
          <div className="section-content">
            {fullPallets.length > 0 ? (
              <table className="pallet-table">
                <thead>
                  <tr>
                    <th>Art.nr</th>
                    <th>Antal Pallar</th>
                    <th>Lådor</th>
                    <th className="edit-actions-header">⚙️</th>
                  </tr>
                </thead>
                <tbody>
                  {fullPallets.map((pallet, index) => (
                    <tr key={index} className={editingPalletIndex === index ? 'editing-row' : ''}>
                      <td>
                        {editingPalletIndex === index ? (
                          <input
                            type="number"
                            className="edit-input"
                            value={editingPallet.artikelnummer}
                            onChange={(e) => setEditingPallet({...editingPallet, artikelnummer: e.target.value})}
                            style={{width: '90px'}}
                          />
                        ) : (
                          <span onClick={() => handleEditPallet(index)} style={{cursor: 'pointer'}}>
                            <strong>{pallet.artikelnummer}</strong>
                          </span>
                        )}
                      </td>
                      <td>
                        {editingPalletIndex === index ? (
                          <div style={{display: 'flex', gap: '0.25rem', alignItems: 'center', fontSize: '0.85rem'}}>
                            <input
                              type="number"
                              className="edit-input small"
                              value={editingPallet.boxesPerPallet}
                              onChange={(e) => setEditingPallet({...editingPallet, boxesPerPallet: e.target.value})}
                              placeholder="Lådor"
                              style={{width: '50px'}}
                            />
                            <span>×</span>
                            <input
                              type="number"
                              className="edit-input small"
                              value={editingPallet.palletCount}
                              onChange={(e) => setEditingPallet({...editingPallet, palletCount: e.target.value})}
                              placeholder="Antal"
                              style={{width: '50px'}}
                            />
                          </div>
                        ) : (
                          <div className="pallet-boxes">
                            {pallet.isSingleSkvettpall ? (
                              <span 
                                className="pallet-box-badge"
                                style={{
                                  fontSize: '0.8rem', 
                                  padding: '0.3rem 0.6rem',
                                  background: '#6c757d',
                                  color: 'white',
                                  cursor: 'default'
                                }}
                                title="Skvättpall"
                              >
                                Skvättpall
                              </span>
                            ) : (
                              Array.from({ length: pallet.fullPallets }, (_, i) => (
                                <span 
                                  key={i} 
                                  className="pallet-box-badge"
                                  onClick={() => handleEditPallet(index)}
                                  style={{cursor: 'pointer', position: 'relative', fontSize: '0.8rem', padding: '0.3rem 0.6rem'}}
                                >
                                  {pallet.boxesPerPallet}
                                  <button
                                    className="delete-box-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePalletBox(index, i);
                                    }}
                                    title="Ta bort denna pall"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <strong>{pallet.totalBoxes}</strong>
                      </td>
                      <td className="edit-actions">
                        {editingPalletIndex === index ? (
                          <div style={{display: 'flex', gap: '0.25rem', alignItems: 'center'}}>
                            <button className="icon-btn save" onClick={handleSaveEdit} title="Spara" style={{fontSize: '1.2rem'}}>
                              ✓
                            </button>
                            <button className="icon-btn cancel" onClick={handleCancelEdit} title="Avbryt" style={{fontSize: '1.2rem'}}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{display: 'flex', gap: '0.25rem', alignItems: 'center'}}>
                            <button className="icon-btn edit" onClick={() => handleEditPallet(index)} title="Redigera" style={{fontSize: '1rem'}}>
                              🔧
                            </button>
                            <button 
                              className="icon-btn delete" 
                              onClick={() => handleDeleteFullPallet(index)}
                              title="Radera"
                              style={{fontSize: '1rem'}}
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  
                  {isAddingNew && (
                    <tr className="editing-row">
                      <td>
                        <input
                          type="number"
                          className="edit-input"
                          value={newPallet.artikelnummer}
                          onChange={(e) => setNewPallet({...newPallet, artikelnummer: e.target.value})}
                          placeholder="Art.nr"
                          style={{width: '90px'}}
                        />
                      </td>
                      <td>
                        <div style={{display: 'flex', gap: '0.25rem', alignItems: 'center', fontSize: '0.85rem'}}>
                          <input
                            type="number"
                            className="edit-input small"
                            value={newPallet.boxesPerPallet}
                            onChange={(e) => setNewPallet({...newPallet, boxesPerPallet: e.target.value})}
                            placeholder="Lådor"
                            style={{width: '50px'}}
                          />
                          <span>×</span>
                          <input
                            type="number"
                            className="edit-input small"
                            value={newPallet.count}
                            onChange={(e) => setNewPallet({...newPallet, count: e.target.value})}
                            placeholder="Antal"
                            style={{width: '50px'}}
                          />
                        </div>
                      </td>
                      <td>
                        <strong>{(parseInt(newPallet.boxesPerPallet) || 0) * (parseInt(newPallet.count) || 0)}</strong>
                      </td>
                      <td className="edit-actions">
                        <button className="icon-btn save" onClick={handleSaveNew} title="Spara" style={{fontSize: '1.2rem'}}>
                          ✓
                        </button>
                        <button className="icon-btn cancel" onClick={handleCancelNew} title="Avbryt" style={{fontSize: '1.2rem'}}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="no-data">Inga full pall</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Results;
